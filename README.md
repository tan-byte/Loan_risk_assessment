# IndusCredit Risk Platform

A full-stack credit risk decision platform for loan officers and credit analysts. Built on a trained XGBoost model with SHAP explainability, a FastAPI backend, React frontend, and a Gemini-powered AI assistant.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Setup & Installation](#setup--installation)
7. [Running the Application](#running-the-application)
8. [Model Details](#model-details)


---

## Project Overview

IndusCredit Risk Platform is a loan risk scoring system designed for banking teams. It allows loan officers to:

- Score any new loan applicant in real time using a trained ML model
- Understand *why* a decision was made (SHAP explainability)
- Chat with an AI assistant to explore portfolio risk and interpret model outputs
- Monitor portfolio-level NPA, high-risk segments, and behavioural risk trends on a live dashboard

The model was trained on a labelled portfolio of Indian retail loans and achieves an **AUC-ROC of 0.9067**.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  Dashboard │ Simulator │ AI Assistant │ Early Warning    │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP (Vite dev proxy / direct)
┌────────────────────────▼────────────────────────────────┐
│                  FastAPI Backend (main.py)                │
│                                                          │
│  /predict_risk   /explain   /portfolio_stats             │
│  /loan_recommendation   /early_warning                   │
│  /api/chat   /api/simulator_summary                      │
└──────┬───────────────────────┬───────────────────────────┘
       │                       │
┌──────▼──────┐      ┌─────────▼──────────────────────────┐
│  ML Pipeline │      │  Gemini 2.5 Flash API               │
│  XGBoost +  │      │  + ChromaDB semantic cache          │
│  SHAP       │      │  + ChromaDB knowledge base          │
└─────────────┘      └─────────────────────────────────────┘
```

---

## Features

### Dashboard
- Portfolio NPA (overall default rate)
- Default rate breakdown by financial stress level and behaviour risk band
- Credit score vs default rate chart
- Top 5 highest-risk portfolio segments by loan type, geography, and employment

### Loan Simulator
- Adjust 20+ applicant parameters via sliders and dropdowns
- Live XGBoost prediction — probability of default, risk category, decision (Approve / Review / Decline)
- Derived risk metrics: loan-to-income ratio, DTI credit risk
- AI-generated plain-English summary of the decision (powered by Gemini + SHAP)
- Visual risk factor bars

### AI Assistant
- Conversational interface powered by Gemini 2.5 Flash
- Context-aware: the AI is injected with live SHAP factors for the selected loan
- Semantic caching via ChromaDB — repeated or similar questions are served instantly without hitting the Gemini API
- Suggested query shortcuts for common analyst questions
- Switchable Loan ID — banker can change the applicant context mid-conversation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, Uvicorn |
| ML Model | XGBoost, scikit-learn pipeline |
| Explainability | SHAP (TreeExplainer) |
| AI Chat | Google Gemini 2.5 Flash via `google-genai` |
| Vector Cache | ChromaDB (persistent, local) |
| Knowledge Base | ChromaDB + sentence-transformers |
| Data | pandas, NumPy |
| Serialisation | joblib (pipeline + explainer), JSON configs |

---

## Project Structure

```
final_loan_risk/
├── backend/
│   ├── main.py                  # FastAPI app — all endpoints
│   ├── feature_engineering.py   # FeatureEngineer custom transformer
│   ├── build_knowledge_base.py  # One-time script to populate ChromaDB
│   ├── final_pipeline.pkl       # Trained sklearn pipeline (XGBoost)
│   ├── shap_explainer.pkl       # SHAP TreeExplainer
│   ├── feature_names.json       # Feature names after OHE
│   ├── model_config.json        # Optimal threshold and metadata
│   ├── column_config.json       # Raw column names (cat + num)
│   ├── portfolio_stats.json     # Pre-computed dashboard aggregations
│   ├── loan_train.csv           # Training data (used for dashboard)
│   ├── datasets/
│   │   └── loan_test.csv        # Test data (used by AI chat endpoint)
│   ├── indus_knowledge_db/      # ChromaDB: bank policy knowledge base (auto-created)
│   └── indus_chat_cache/        # ChromaDB: semantic answer cache (auto-created)
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── SimulatorPage.jsx
    │   │   ├── AIAssistantPage.jsx
    │   │   └── EarlyWarningPage.jsx
    │   ├── components/
    │   │   ├── Simulator.jsx
    │   │   ├── MetricCard.jsx
    │   │   ├── LoanChart.jsx
    │   │   ├── EmploymentChart.jsx
    │   │   ├── CreditChart.jsx
    │   │   └── RiskTable.jsx
    │   └── main.jsx
    ├── .env                     # VITE_API_BASE_URL
    └── vite.config.js
```

---

## Setup & Installation

### Prerequisites

- Python 3.11
- Node.js 18+
- A Google Gemini API key ([get one here](https://aistudio.google.com/app/apikey))

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd final_loan_risk
```

### 2. Set up the Python virtual environment

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac / Linux
source .venv/bin/activate
```

### 3. Install Python dependencies

```bash
pip install fastapi uvicorn joblib pandas numpy scikit-learn xgboost shap \
            google-genai chromadb sentence-transformers python-dotenv \
            pydantic pydantic-settings
```

> **Note for Windows users:** If `chromadb` fails to import with a `dotenv` error, run:
> ```bash
> pip install --force-reinstall python-dotenv
> pip install "pydantic-settings==2.3.4"
> ```

### 4. Set your Gemini API key

```bash
# Mac / Linux
export GEMINI_API_KEY="your_key_here"

# Windows PowerShell
$env:GEMINI_API_KEY="your_key_here"
```

### 5. Build the knowledge base (one-time only)

```bash
cd backend
python build_knowledge_base.py
```

This creates `indus_knowledge_db/` — a ChromaDB collection with IndusCredit lending policies. Only needs to run once.

### 6. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 7. Configure the frontend API URL (optional)

Create `frontend/.env` if the backend runs on a non-default port:

```
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## Running the Application

### Start the backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

You should see:

```
Loading model artifacts...
Model loaded. Threshold=0.XXXX, Features=XX
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Start the frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Model Details

| Metric | Value |
|---|---|
| Algorithm | XGBoost (via scikit-learn pipeline) |
| AUC-ROC | 0.9067 |
| F1-score | 0.723 |
| KS Statistic | 0.512 |
| AUC-PR | 0.842 |
| Threshold | Optimised on PR curve (not default 0.5) |

#App Screenshots:

<img width="1763" height="1320" alt="Screenshot_14-6-2026_153853_localhost" src="https://github.com/user-attachments/assets/0e67b63c-2eb5-425f-ba35-525ae7386f76" />
<img width="1763" height="1799" alt="Screenshot_14-6-2026_153841_localhost" src="https://github.com/user-attachments/assets/94fcf3b8-1ebe-4d82-bfa6-9090b2c65f90" />

