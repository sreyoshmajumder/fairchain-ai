import os

# Always resolve paths relative to this file (backend/config/domains.py)
# So BASE_DIR = backend/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def _data(path):
    return os.path.join(BASE_DIR, "data", path)

DOMAINS = {
    "lending": {
        "name": "Lending",
        "description": "Loan approval and credit recommendation systems",
        "color": "#0d6f73",
        "label_column": "approved",
        "sensitive_columns": ["gender", "region", "age_group"],
        "feature_columns": [
            "annual_income", "credit_score", "debt_to_income_ratio",
            "employment_years", "loan_amount", "gender", "region", "age_group"
        ],
        "sample_dataset": _data(os.path.join("lending", "lending_data.csv")),
        "gemini_context": "loan approval system",
    },
    "hiring": {
        "name": "Hiring",
        "description": "Candidate shortlisting and recruitment screening",
        "color": "#6f52c8",
        "label_column": "shortlisted",
        "sensitive_columns": ["gender", "age_band", "college_tier"],
        "feature_columns": [
            "experience_years", "tech_score", "communication_score",
            "gender", "age_band", "college_tier"
        ],
        "sample_dataset": _data(os.path.join("hiring", "hiring_data.csv")),
        "gemini_context": "hiring and recruitment system",
    },
    "healthcare": {
        "name": "Healthcare",
        "description": "Patient triage and treatment prioritization",
        "color": "#a85f16",
        "label_column": "high_priority",
        "sensitive_columns": ["sex", "age_group", "insurance_status", "region"],
        "feature_columns": [
            "symptom_severity", "vitals_score", "wait_time_minutes",
            "sex", "age_group", "insurance_status", "region"
        ],
        "sample_dataset": _data(os.path.join("healthcare", "healthcare_data.csv")),
        "gemini_context": "healthcare triage and treatment system",
    },
    "insurance": {
        "name": "Insurance",
        "description": "Insurance risk scoring and claim approval",
        "color": "#3d7a2a",
        "label_column": "approved",
        "sensitive_columns": ["age_group", "locality", "income_bracket"],
        "feature_columns": [
            "claim_history", "vehicle_age", "credit_score",
            "age_group", "locality", "income_bracket"
        ],
        "sample_dataset": _data(os.path.join("insurance", "insurance_data.csv")),
        "gemini_context": "insurance risk scoring and approval system",
    },
}