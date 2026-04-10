# backend/feature_engineering.py

from sklearn.base import BaseEstimator, TransformerMixin
import pandas as pd

class FeatureEngineer(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self

    def transform(self, X):
        df = X.copy()

        df["loan_to_income_ratio"] = df["loan_amount_inr"] / (df["annual_income_inr"] + 1)
        df["dti_credit_risk"] = df["dti_ratio"] / (df["credit_score"] / 700)
        df["income_per_year_employed"] = df["annual_income_inr"] / (df["employment_years"] + 1)

        df["emi_estimate"] = df["loan_amount_inr"] * (df["interest_rate_pct"]/100) / (df["loan_tenure_months"] + 1)
        df["emi_to_income_ratio"] = df["emi_estimate"] / (df["annual_income_inr"] + 1)

        df["loan_stacking_risk"] = df["num_existing_loans"] * df["bureau_enquiries_6m"]
        df["behavior_risk"] = df["missed_payments_2y"] * df["bureau_enquiries_6m"]

        df["high_risk_flag"] = (
            (df["credit_score"] < 650) &
            (df["dti_ratio"] > 0.4) &
            (df["missed_payments_2y"] > 0)
        ).astype(int)

        return df