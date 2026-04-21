# generate_data.py — run once from fairchain-ai/ root
import pandas as pd
import numpy as np
import os

np.random.seed(42)
N = 600

# ── Lending ─────────────────────────────────────────────────
os.makedirs("data/lending", exist_ok=True)
df = pd.DataFrame({
    "annual_income":        np.random.randint(25000, 120000, N),
    "credit_score":         np.random.randint(500, 850, N),
    "debt_to_income_ratio": np.round(np.random.uniform(0.1, 0.6, N), 2),
    "employment_years":     np.random.randint(0, 20, N),
    "loan_amount":          np.random.randint(5000, 50000, N),
    "gender":               np.random.choice(["Male","Female"], N, p=[0.55,0.45]),
    "region":               np.random.choice(["Urban","Suburban","Rural"], N),
    "age_group":            np.random.choice(["18-30","31-45","46-60","60+"], N),
})
bias = np.where(df["gender"]=="Female", -0.15, 0.1)
bias += np.where(df["region"]=="Rural", -0.12, 0)
prob = np.clip((df["credit_score"]-500)/350 * 0.8 + bias + 0.2, 0.1, 0.95)
df["approved"] = (np.random.rand(N) < prob).astype(int)
df.to_csv("data/lending/lending_data.csv", index=False)

# ── Hiring ───────────────────────────────────────────────────
os.makedirs("data/hiring", exist_ok=True)
df = pd.DataFrame({
    "experience_years":    np.random.randint(0, 15, N),
    "tech_score":          np.random.randint(40, 100, N),
    "communication_score": np.random.randint(40, 100, N),
    "gender":              np.random.choice(["Male","Female","Non-binary"], N, p=[0.5,0.4,0.1]),
    "age_band":            np.random.choice(["Under25","25-35","35-45","45+"], N),
    "college_tier":        np.random.choice(["Tier1","Tier2","Tier3"], N, p=[0.2,0.5,0.3]),
})
bias = np.where(df["gender"]=="Female", -0.14, 0.08)
bias += np.where(df["college_tier"]=="Tier3", -0.1, 0.05)
prob = np.clip((df["tech_score"]-40)/60 * 0.7 + bias + 0.2, 0.05, 0.95)
df["shortlisted"] = (np.random.rand(N) < prob).astype(int)
df.to_csv("data/hiring/hiring_data.csv", index=False)

# ── Healthcare ───────────────────────────────────────────────
os.makedirs("data/healthcare", exist_ok=True)
df = pd.DataFrame({
    "symptom_severity":    np.random.randint(1, 10, N),
    "vitals_score":        np.random.randint(50, 100, N),
    "wait_time_minutes":   np.random.randint(5, 180, N),
    "sex":                 np.random.choice(["Male","Female"], N),
    "age_group":           np.random.choice(["0-18","19-40","41-65","65+"], N),
    "insurance_status":    np.random.choice(["Insured","Uninsured","Government"], N, p=[0.5,0.3,0.2]),
    "region":              np.random.choice(["Urban","Rural"], N, p=[0.65,0.35]),
})
bias = np.where(df["insurance_status"]=="Uninsured", -0.18, 0.08)
bias += np.where(df["region"]=="Rural", -0.1, 0)
prob = np.clip(df["symptom_severity"]/10 * 0.75 + bias + 0.15, 0.05, 0.97)
df["high_priority"] = (np.random.rand(N) < prob).astype(int)
df.to_csv("data/healthcare/healthcare_data.csv", index=False)

# ── Insurance ────────────────────────────────────────────────
os.makedirs("data/insurance", exist_ok=True)
df = pd.DataFrame({
    "claim_history":   np.random.randint(0, 5, N),
    "vehicle_age":     np.random.randint(0, 20, N),
    "credit_score":    np.random.randint(450, 850, N),
    "age_group":       np.random.choice(["18-25","26-40","41-60","60+"], N),
    "locality":        np.random.choice(["Metro","Town","Village"], N, p=[0.4,0.4,0.2]),
    "income_bracket":  np.random.choice(["Low","Middle","High"], N, p=[0.3,0.5,0.2]),
})
bias = np.where(df["locality"]=="Village", -0.15, 0.05)
bias += np.where(df["income_bracket"]=="Low", -0.12, 0)
prob = np.clip((df["credit_score"]-450)/400 * 0.7 + bias + 0.25, 0.08, 0.95)
df["approved"] = (np.random.rand(N) < prob).astype(int)
df.to_csv("data/insurance/insurance_data.csv", index=False)

print("✅ All 4 datasets generated successfully.")