# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from feature_engineering import FeatureEngineer
from typing import Optional
import joblib
import json
import numpy as np
import pandas as pd
import shap

# ─────────────────────────────────────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="IndusCredit Risk API",
    description="Credit risk scoring, SHAP explainability, and portfolio analytics",
    version="1.0.0"
)

# Allow React (localhost:3000) to call this API.
# Without this, browsers will block the request entirely.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# LOAD ARTIFACTS AT STARTUP
# These are loaded ONCE when the server starts — not on every request.
# Loading a pkl file on every request would make the API ~10x slower.
# ─────────────────────────────────────────────────────────────────────────────
print("Loading model artifacts...")

import sys
from feature_engineering import FeatureEngineer

# 🔥 Inject into __main__
sys.modules['__main__'].FeatureEngineer = FeatureEngineer

pipeline = joblib.load("final_pipeline.pkl")
explainer = joblib.load("shap_explainer.pkl")

with open("feature_names.json") as f:
    feature_names: list = json.load(f)

with open("model_config.json") as f:
    model_config: dict = json.load(f)

with open("column_config.json") as f:
    col_config: dict = json.load(f)

with open("portfolio_stats.json") as f:
    portfolio_stats_data: dict = json.load(f)

OPTIMAL_THRESHOLD = model_config["optimal_threshold"]
CAT_COLS = col_config["cat_cols_raw"]
NUM_COLS = col_config["num_cols_raw"]

print(f"Model loaded. Threshold={OPTIMAL_THRESHOLD:.4f}, Features={len(feature_names)}")

# ─────────────────────────────────────────────────────────────────────────────
# INPUT SCHEMA
# This defines exactly what JSON the React frontend must send.
# Every field matches a column in loan_train.csv (minus loan_id, 
# application_date, default_flag which the API doesn't need).
# Optional fields have defaults — this allows the simulator to work
# with partial inputs.
# ─────────────────────────────────────────────────────────────────────────────
class ApplicantInput(BaseModel):
    age: int = Field(..., ge=21, le=65, description="Applicant age")
    gender: str = Field(..., description="Male or Female")
    education: str = Field(..., description="Graduate/Post_Graduate/Undergraduate/Diploma/No_Formal")
    state: str = Field(..., description="2-letter state code e.g. MH, DL, KA")
    urban_rural: str = Field(..., description="Urban/Semi_Urban/Rural")
    employment_type: str = Field(..., description="Salaried/Self_Employed/Business_Owner/Government/Retired")
    employment_years: int = Field(..., ge=0)
    annual_income_inr: int = Field(..., gt=0)
    loan_type: str = Field(..., description="Home_Loan/Personal_Loan/Auto_Loan/Education_Loan/MSME_Loan/Gold_Loan")
    loan_purpose: str = Field(..., description="Purpose of the loan")
    loan_amount_inr: int = Field(..., gt=0)
    loan_tenure_months: int = Field(..., gt=0)
    interest_rate_pct: float = Field(..., gt=0)
    credit_score: int = Field(..., ge=550, le=900)
    num_existing_loans: int = Field(..., ge=0)
    dti_ratio: float = Field(..., ge=0.0, le=0.65)
    ltv_ratio: Optional[float] = Field(None, description="Only for Home Loans. Leave null for others.")
    has_collateral: int = Field(..., description="1=yes, 0=no")
    bureau_enquiries_6m: int = Field(..., ge=0)
    missed_payments_2y: int = Field(..., ge=0)
    savings_account_balance_inr: int = Field(..., ge=0)


def applicant_to_dataframe(applicant: ApplicantInput) -> pd.DataFrame:
    """
    Convert the Pydantic input object into a single-row DataFrame
    with the exact same column names and order that the pipeline expects.
    
    IMPORTANT: The pipeline's FeatureEngineer.transform() and the 
    ColumnTransformer both reference specific column names by string.
    This function must produce those exact names.
    """
    data = {
        'age': [applicant.age],
        'gender': [applicant.gender],
        'education': [applicant.education],
        'state': [applicant.state],
        'urban_rural': [applicant.urban_rural],
        'employment_type': [applicant.employment_type],
        'employment_years': [applicant.employment_years],
        'annual_income_inr': [applicant.annual_income_inr],
        'loan_type': [applicant.loan_type],
        'loan_purpose': [applicant.loan_purpose],
        'loan_amount_inr': [applicant.loan_amount_inr],
        'loan_tenure_months': [applicant.loan_tenure_months],
        'interest_rate_pct': [applicant.interest_rate_pct],
        'credit_score': [applicant.credit_score],
        'num_existing_loans': [applicant.num_existing_loans],
        'dti_ratio': [applicant.dti_ratio],
        'ltv_ratio': [applicant.ltv_ratio],   # None becomes NaN in pandas — FeatureEngineer handles this
        'has_collateral': [applicant.has_collateral],
        'bureau_enquiries_6m': [applicant.bureau_enquiries_6m],
        'missed_payments_2y': [applicant.missed_payments_2y],
        'savings_account_balance_inr': [applicant.savings_account_balance_inr],
    }
    return pd.DataFrame(data)


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 1: Health check
# React can call this on load to confirm the API is alive.
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "threshold": OPTIMAL_THRESHOLD,
        "n_features": len(feature_names)
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 2: Predict risk
# POST /predict_risk
# React sends applicant JSON, gets back PD score + decision.
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/predict_risk")
def predict_risk(applicant: ApplicantInput):
    try:
        row = applicant_to_dataframe(applicant)
        
        # The full pipeline handles everything:
        # FeatureEngineer → ColumnTransformer(OHE + impute) → XGBoost
        pd_score = float(pipeline.predict_proba(row)[0][1])
        
        # Use the PR-curve optimal threshold, not default 0.5
        if pd_score > OPTIMAL_THRESHOLD * 1.3:       # clearly high
            risk_category = "High"
            decision = "Decline"
        elif pd_score > OPTIMAL_THRESHOLD * 0.85:    # borderline
            risk_category = "Medium"
            decision = "Review"
        else:
            risk_category = "Low"
            decision = "Approve"
        
        # Derived metrics (already computed inside FeatureEngineer,
        # but we recompute here for the response payload so React
        # can display them without a separate call)
        lti = round(applicant.loan_amount_inr / (applicant.annual_income_inr + 1), 3)
        dti_cr = round(applicant.dti_ratio / (applicant.credit_score / 700), 3)
        
        return {
            "probability_of_default": round(pd_score, 4),
            "pd_percent": round(pd_score * 100, 2),
            "risk_category": risk_category,
            "decision": decision,
            "optimal_threshold": round(OPTIMAL_THRESHOLD, 4),
            "derived_metrics": {
                "loan_to_income_ratio": lti,
                "dti_credit_risk": dti_cr,
            }
        }
    
    except Exception as e:
        # Return the actual error so the frontend can show it
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 3: SHAP explanation
# POST /explain
# React calls this for the customer view SHAP bars.
# Returns top-10 features with their SHAP values.
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/explain")
def explain(applicant: ApplicantInput):
    try:
        row = applicant_to_dataframe(applicant)
        
        # Step 1: Run the two preprocessing steps manually
        # (FeatureEngineer, then ColumnTransformer)
        # We need the transformed array to pass to shap_explainer.
        # We cannot pass the raw row directly to the explainer
        # because the explainer expects the same transformed format
        # that the XGBoost model sees.
        fe_step = pipeline.named_steps['features']
        pre_step = pipeline.named_steps['preprocess']
        
        row_fe = fe_step.transform(row)           # after FeatureEngineer
        row_transformed = pre_step.transform(row_fe)  # after OHE + impute
        
        # Step 2: Get SHAP values for this single row
        # shap_values shape: (1, n_features)
        shap_vals = explainer.shap_values(row_transformed)
        
        # shap_vals is a 2D array: 1 row × n_features columns
        # We take [0] to get the single row's values as a flat list
        shap_row = shap_vals[0].tolist()
        
        # Step 3: Pair each feature name with its SHAP value
        shap_dict = dict(zip(feature_names, shap_row))
        
        # Step 4: Sort by absolute value (most impactful first), take top 10
        top10 = sorted(shap_dict.items(), key=lambda x: abs(x[1]), reverse=True)[:10]
        
        # Step 5: Format for React
        # Positive SHAP = pushes toward default (risk-increasing)
        # Negative SHAP = pushes away from default (protective)
        formatted = [
            {
                "feature": name,
                "shap_value": round(val, 4),
                "direction": "risk" if val > 0 else "protective",
                "magnitude": round(abs(val), 4)
            }
            for name, val in top10
        ]
        
        return {
            "shap_values": formatted,
            "base_value": round(float(explainer.expected_value), 4),
            "n_features_total": len(feature_names)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 4: Portfolio stats
# GET /portfolio_stats
# Returns pre-computed aggregations from loan_train.csv.
# React uses this to render all the dashboard charts.
# This is fast because we loaded portfolio_stats.json at startup.
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/portfolio_stats")
def portfolio_stats():
    return portfolio_stats_data


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 5: Loan recommendation
# POST /loan_recommendation
# For borderline applicants (Medium risk), try reducing loan amount
# and extending tenure to find a combination that drops PD below threshold.
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/loan_recommendation")
def loan_recommendation(applicant: ApplicantInput):
    try:
        # Get original PD
        row_original = applicant_to_dataframe(applicant)
        pd_original = float(pipeline.predict_proba(row_original)[0][1])
        
        recommendations = []
        
        # Option 1: Reduce loan amount to 65%
        applicant_r1 = applicant.model_copy()
        applicant_r1.loan_amount_inr = int(applicant.loan_amount_inr * 0.65)
        row_r1 = applicant_to_dataframe(applicant_r1)
        pd_r1 = float(pipeline.predict_proba(row_r1)[0][1])
        recommendations.append({
            "option": "Reduce loan amount to 65%",
            "suggested_loan_amount_inr": applicant_r1.loan_amount_inr,
            "suggested_tenure_months": applicant.loan_tenure_months,
            "new_pd": round(pd_r1, 4),
            "new_pd_percent": round(pd_r1 * 100, 2),
            "decision": "Approve" if pd_r1 <= OPTIMAL_THRESHOLD * 0.85 else
                        "Review" if pd_r1 <= OPTIMAL_THRESHOLD * 1.3 else "Decline"
        })
        
        # Option 2: Extend tenure to 84 months (7 years) if not already longer
        if applicant.loan_tenure_months < 84:
            applicant_r2 = applicant.model_copy()
            applicant_r2.loan_tenure_months = 84
            row_r2 = applicant_to_dataframe(applicant_r2)
            pd_r2 = float(pipeline.predict_proba(row_r2)[0][1])
            recommendations.append({
                "option": "Extend tenure to 84 months",
                "suggested_loan_amount_inr": applicant.loan_amount_inr,
                "suggested_tenure_months": 84,
                "new_pd": round(pd_r2, 4),
                "new_pd_percent": round(pd_r2 * 100, 2),
                "decision": "Approve" if pd_r2 <= OPTIMAL_THRESHOLD * 0.85 else
                            "Review" if pd_r2 <= OPTIMAL_THRESHOLD * 1.3 else "Decline"
            })
        
        # Option 3: Both — reduce loan + extend tenure
        applicant_r3 = applicant.model_copy()
        applicant_r3.loan_amount_inr = int(applicant.loan_amount_inr * 0.65)
        applicant_r3.loan_tenure_months = max(applicant.loan_tenure_months, 84)
        row_r3 = applicant_to_dataframe(applicant_r3)
        pd_r3 = float(pipeline.predict_proba(row_r3)[0][1])
        recommendations.append({
            "option": "Reduce loan to 65% AND extend tenure",
            "suggested_loan_amount_inr": applicant_r3.loan_amount_inr,
            "suggested_tenure_months": applicant_r3.loan_tenure_months,
            "new_pd": round(pd_r3, 4),
            "new_pd_percent": round(pd_r3 * 100, 2),
            "decision": "Approve" if pd_r3 <= OPTIMAL_THRESHOLD * 0.85 else
                        "Review" if pd_r3 <= OPTIMAL_THRESHOLD * 1.3 else "Decline"
        })
        
        return {
            "original_pd": round(pd_original, 4),
            "original_pd_percent": round(pd_original * 100, 2),
            "original_decision": "Approve" if pd_original <= OPTIMAL_THRESHOLD * 0.85 else
                                  "Review" if pd_original <= OPTIMAL_THRESHOLD * 1.3 else "Decline",
            "recommendations": recommendations
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT 6: Batch score — for the Early Warning Watchlist feature
# POST /batch_score
# React sends a list of loan_ids. API scores them all and returns 
# the ones above the high-risk threshold, sorted by PD descending.
# Reads from loan_train.csv using the loan_ids provided.
# ─────────────────────────────────────────────────────────────────────────────

# Load training data at startup for batch scoring
df_train = pd.read_csv("loan_train.csv")


def _label_financial_stress(row):
    if row["missed_payments_2y"] >= 5 or row["dti_ratio"] >= 0.55:
        return "Severe"
    if row["missed_payments_2y"] >= 3 or row["dti_ratio"] >= 0.40:
        return "High"
    if row["missed_payments_2y"] >= 1 or row["dti_ratio"] >= 0.25:
        return "Moderate"
    return "Low"


def _label_behaviour_risk(row):
    if row["missed_payments_2y"] >= 4 or row["bureau_enquiries_6m"] >= 5:
        return "High"
    if row["missed_payments_2y"] >= 2 or row["bureau_enquiries_6m"] >= 3:
        return "Medium"
    return "Low"


def _segment_risk_label(rate):
    if rate >= 0.33:
        return "Critical"
    if rate >= 0.28:
        return "High"
    return "Elevated"

# Precompute portfolio-level chart data using real training data
raw_score_data = df_train.drop(columns=["loan_id", "default_flag", "application_date"])
pd_scores = pipeline.predict_proba(raw_score_data)[:, 1]
df_train["pd_score"] = pd_scores

df_train["financial_stress"] = df_train.apply(_label_financial_stress, axis=1)
df_train["behaviour_risk"] = df_train.apply(_label_behaviour_risk, axis=1)

portfolio_stats_data["default_by_financial_stress"] = (
    df_train.groupby("financial_stress")["default_flag"]
    .mean()
    .reindex(["Low", "Moderate", "High", "Severe"])
    .dropna()
    .round(4)
    .to_dict()
)

portfolio_stats_data["default_by_behaviour_risk"] = (
    df_train.groupby("behaviour_risk")["default_flag"]
    .mean()
    .reindex(["Low", "Medium", "High"])
    .dropna()
    .round(4)
    .to_dict()
)

portfolio_stats_data["high_risk_account_count"] = int((pd_scores >= OPTIMAL_THRESHOLD * 1.3).sum())
portfolio_stats_data["predicted_npa"] = round(float(portfolio_stats_data["high_risk_account_count"] / len(df_train)), 4)
portfolio_stats_data["high_risk_threshold"] = round(OPTIMAL_THRESHOLD * 1.3, 4)

segment_df = df_train.copy()
segment_df["segment"] = (
    segment_df["loan_type"] + " · " + segment_df["urban_rural"] + " · " + segment_df["employment_type"]
)
segment_stats = (
    segment_df.groupby("segment")
    .agg(
        exposure=("loan_amount_inr", "sum"),
        default_rate=("default_flag", "mean"),
        accounts=("loan_id", "count"),
    )
    .reset_index()
)
segment_stats = segment_stats.sort_values("default_rate", ascending=False).head(5)
portfolio_stats_data["high_risk_segments"] = [
    {
        "segment": row["segment"],
        "exposure": int(row["exposure"]),
        "default_rate": round(row["default_rate"], 4),
        "risk": _segment_risk_label(row["default_rate"]),
    }
    for _, row in segment_stats.iterrows()
]

@app.get("/early_warning")
def early_warning(top_n: int = 20):
    """
    Return the top N highest-risk accounts from the training portfolio.
    Used by the Early Warning Watchlist feature on the dashboard.
    """
    try:
        # Drop columns the pipeline doesn't need
        df_score = df_train.drop(columns=['loan_id', 'default_flag', 'application_date'])
        
        # Score all rows
        pds = pipeline.predict_proba(df_score)[:, 1]
        
        # Build result
        result_df = df_train[['loan_id', 'credit_score', 'dti_ratio',
                               'annual_income_inr', 'loan_type',
                               'employment_type', 'missed_payments_2y']].copy()
        result_df['pd_score'] = pds
        result_df['pd_percent'] = (pds * 100).round(2)
        
        # Filter high risk only, sort descending
        high_risk = result_df[result_df['pd_score'] >= OPTIMAL_THRESHOLD * 1.3]
        high_risk = high_risk.sort_values('pd_score', ascending=False).head(top_n)
        
        return {
            "count": len(high_risk),
            "threshold_used": round(OPTIMAL_THRESHOLD * 1.3, 4),
            "accounts": high_risk.to_dict(orient='records')
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))