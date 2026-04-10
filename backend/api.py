import joblib
import json
import pandas as pd
import numpy as np
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
import chromadb
import hashlib
from sklearn.base import BaseEstimator, TransformerMixin

# ──────────────────────────────────────────────────────────
# 1. YOUR EXACT FEATURE ENGINEER
# ──────────────────────────────────────────────────────────
class FeatureEngineer(BaseEstimator, TransformerMixin):
    """Custom transformer for all feature engineering steps"""
    def __init__(self):
        pass

    def fit(self, X, y=None):
        self.ltv_median_ = X['ltv_ratio'].median()  # Store median for transform
        return self

    def transform(self, X):
        X = X.copy()
        X['ltv_is_missing'] = X['ltv_ratio'].isna().astype(int)
        X['ltv_ratio'] = X['ltv_ratio'].fillna(self.ltv_median_)
        X['is_home_loan'] = (X['loan_type'] == 'Home_Loan').astype(int)

        for col in ['missed_payments_2y', 'bureau_enquiries_6m', 'num_existing_loans']:
            if col in X.columns:
                lo, hi = X[col].quantile([0.01, 0.99])
                X[col] = X[col].clip(lo, hi)

        X['loan_to_income_ratio'] = X['loan_amount_inr'] / (X['annual_income_inr'] + 1)
        X['dti_credit_risk'] = X['dti_ratio'] / (X['credit_score'] / 700)
        X['income_per_year_employed'] = X['annual_income_inr'] / (X['employment_years'] + 1)

        r = X['interest_rate_pct'] / 12 / 100
        n = X['loan_tenure_months']
        X['emi_estimate'] = X['loan_amount_inr'] * r * (1 + r)**n / ((1 + r)**n - 1 + 1e-9)
        X['emi_to_income_ratio'] = X['emi_estimate'] / (X['annual_income_inr'] + 1)

        X['financial_stress'] = X['dti_ratio'] * X['num_existing_loans']
        X['loan_stacking_risk'] = X['num_existing_loans'] * X['bureau_enquiries_6m']
        X['behavior_risk'] = X['missed_payments_2y'] * X['bureau_enquiries_6m']

        X['high_risk_flag'] = (
            (X['credit_score'] < 650) &
            (X['dti_ratio'] > 0.4) &
            (X['missed_payments_2y'] > 0)
        ).astype(int)

        X['savings_to_loan'] = X['savings_account_balance_inr'] / (X['loan_amount_inr'] + 1)
        X['income_minus_emi'] = X['annual_income_inr'] - (X['emi_estimate'] * 12)

        return X

# ──────────────────────────────────────────────────────────
# 2. YOUR EXACT CACHE SYSTEM
# ──────────────────────────────────────────────────────────
class SafeSemanticCache:
    def __init__(self):
        self.chroma_client = chromadb.PersistentClient(path="./indus_chat_cache")
        self.cache = self.chroma_client.get_or_create_collection(name="qa_cache")
        self.similarity_threshold = 0.3 

    def _normalize(self, text):
        return str(text).strip().lower()

    def get_cached_answer(self, query, loan_id):
        clean_query = self._normalize(query)
        results = self.cache.query(
            query_texts=[clean_query], n_results=1,
            where={"loan_id": str(loan_id)}, include=["metadatas", "distances"]
        )
        if results['distances'] and len(results['distances'][0]) > 0:
            distance = results['distances'][0][0]
            print(f"  [Debug] Cache hit! Distance: {distance:.4f}")
            if distance < self.similarity_threshold:
                print("⚡ [Cache Hit] Saved an API call!")
                return results['metadatas'][0][0]['answer']
        return None

    def save_answer(self, query, answer, loan_id):
        clean_query = self._normalize(query)
        doc_id = hashlib.md5((clean_query + str(loan_id)).encode()).hexdigest()
        self.cache.upsert(
            documents=[clean_query], metadatas=[{"answer": answer, "loan_id": str(loan_id)}], ids=[doc_id]
        )

# ──────────────────────────────────────────────────────────
# 3. LOAD YOUR LIVE ML ARTIFACTS GLOBALLY
# ──────────────────────────────────────────────────────────
print("Loading ML Pipeline and Artifacts...")
try:
    import __main__
    __main__.FeatureEngineer = FeatureEngineer
    
    pipeline = joblib.load('final_pipeline.pkl')
    explainer = joblib.load('shap_explainer.pkl')
    with open('feature_names.json', 'r') as f:
        feature_names = json.load(f)
    with open('model_config.json', 'r') as f:
        config = json.load(f)
    df_test = pd.read_csv('datasets/loan_test.csv')
    print(f"✅ Loaded test dataset with {len(df_test)} records.")
except FileNotFoundError as e:
    print(f"Error: Missing file {e}. Ensure all ML files and the dataset are in this folder.")

client = genai.Client(api_key="AIzaSyC1_xrvXE4pl7QE9Id5TcsdQp0ET1-5EHg")
chat_cache = SafeSemanticCache()

def get_model_explanation(applicant_row):
    """Calculates SHAP impacts and maps them to real feature names."""
    features_step = pipeline.named_steps['features']
    preprocess_step = pipeline.named_steps['preprocess']
    transformed_data = preprocess_step.transform(features_step.transform(applicant_row))
    
    shap_values = explainer.shap_values(transformed_data)[0]
    shap_dict = dict(zip(feature_names, shap_values))
    sorted_shap = sorted(shap_dict.items(), key=lambda x: x[1], reverse=True)
    
    risk_factors = [f"{k} (+{v:.2f})" for k, v in sorted_shap[:3] if v > 0]
    safety_factors = [f"{k} ({v:.2f})" for k, v in sorted_shap[-2:] if v < 0]
    
    return {
        "risk": risk_factors,
        "safety": safety_factors,
        "prob": float(pipeline.predict_proba(applicant_row)[0][1])
    }

# ──────────────────────────────────────────────────────────
# 4. FASTAPI INITIALIZATION & ENDPOINTS
# ──────────────────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    loan_id: str

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    user_input = req.message
    current_loan_id = req.loan_id

    # STEP 1: Check Cache First
    cached_response = chat_cache.get_cached_answer(user_input, current_loan_id)
    if cached_response:
        return {"reply": cached_response, "source": "cache"}

    # STEP 2: Extract LIVE Applicant Data from dataset
    applicant_row = df_test[df_test['loan_id'] == current_loan_id]
    if applicant_row.empty:
        # Fallback to the first row if loan ID is invalid/mocked
        print(f"Warning: Loan ID {current_loan_id} not found. Defaulting to first applicant.")
        applicant_row = df_test.iloc[[0]]

    # Run the live SHAP math!
    exp = get_model_explanation(applicant_row)
    threshold = config.get('optimal_threshold', 0.5)
    decision = "REJECT" if exp['prob'] >= threshold else "APPROVE"

    # STEP 3: Create the dynamic chat session with LIVE context
    chat = client.chats.create(
        model="gemini-2.5-flash",
        config=types.GenerateContentConfig(
            system_instruction=f"""
            You are a Banking Risk Analyst. 
            Model Decision: {decision} (Probability: {exp['prob']:.2%}, Threshold: {threshold:.2%})
            SHAP RISK FACTORS: {", ".join(exp['risk'])}
            SHAP SAFETY FACTORS: {", ".join(exp['safety'])}
            
            RULES:
            1. Explain ONLY using the provided SHAP factors. 
            2. If a banker asks 'Why?', cite the factor and its impact score.
            3. Temperature is 0.2. Help explain the banker in human sentences but strictly using SHAP factors.
            """,
            temperature=0.2
        )
    )

    # STEP 4: Call Gemini with your exact Exponential Backoff
    max_retries = 5
    print(f"  [Thinking...] Sending to Gemini API for {current_loan_id}...")
    for attempt in range(max_retries):
        try:
            response = chat.send_message(user_input)
            final_answer = response.text
            
            # Save the new response to cache
            chat_cache.save_answer(user_input, final_answer, current_loan_id)
            
            return {"reply": final_answer, "source": "gemini"}
            
        except Exception as e:
            err = str(e)
            if any(code in err for code in ["503", "429", "UNAVAILABLE"]):
                if attempt < max_retries - 1:
                    wait = 2 ** attempt
                    print(f"  [Traffic Jam] AI servers busy. Retrying in {wait}s...")
                    time.sleep(wait)
                else:
                    return {"reply": "Server timed out due to high traffic. Please try again in a minute.", "source": "error"}
            else:
                return {"reply": f"An API Error Occurred: {err}", "source": "error"}