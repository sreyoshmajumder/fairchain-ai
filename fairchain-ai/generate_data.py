import os
import pandas as pd
import numpy as np

np.random.seed(42)
N = 2000

# ── Always resolve to backend/data/ — regardless of where you run this from ──
# This file lives at: backend/data/generate_data.py
# So __file__ → backend/data/generate_data.py
# dirname(__file__) → backend/data/
DATA_DIR = os.path.dirname(os.path.abspath(__file__))

def mkpath(domain_folder, filename):
    """Create backend/data/<domain_folder>/ and return full CSV path."""
    folder = os.path.join(DATA_DIR, domain_folder)
    os.makedirs(folder, exist_ok=True)
    full_path = os.path.join(folder, filename)
    return full_path

print(f"📁 Writing all datasets to: {DATA_DIR}\n")


# ══════════════════════════════════════════════════════════════════
# 1. HIRING
# ══════════════════════════════════════════════════════════════════
gender       = np.random.choice(["Male","Female","Non-binary"], N, p=[0.55,0.40,0.05])
age_band     = np.random.choice(["20-30","31-40","41-50","51+"], N)
college_tier = np.random.choice(["Tier1","Tier2","Tier3"], N, p=[0.2,0.45,0.35])
experience   = np.random.randint(0, 20, N)
tech_score   = np.random.randint(40, 100, N)
comm_score   = np.random.randint(40, 100, N)
hired_prob   = np.clip(
    0.65*(gender=="Male") + 0.45*(gender=="Female") + 0.50*(gender=="Non-binary") +
    0.003*experience + 0.002*tech_score + 0.05*(college_tier=="Tier1"), 0, 1)
hired = (np.random.rand(N) < hired_prob).astype(int)

df_hiring = pd.DataFrame({
    "gender": gender, "age_band": age_band, "college_tier": college_tier,
    "experience_years": experience, "tech_score": tech_score,
    "communication_score": comm_score, "shortlisted": hired
})
df_hiring.to_csv(mkpath("hiring", "hiring_data.csv"), index=False)
print(f"✅  hiring_data.csv → {mkpath('hiring','hiring_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 2. LENDING
# ══════════════════════════════════════════════════════════════════
race     = np.random.choice(["White","Black","Hispanic","Asian"], N, p=[0.55,0.20,0.15,0.10])
age      = np.random.randint(22, 70, N)
income   = np.random.randint(20000, 120000, N)
credit   = np.random.randint(300, 850, N)
loan_amt = np.random.randint(5000, 50000, N)
dti      = np.round(np.random.uniform(0.1, 0.6, N), 2)
emp_yrs  = np.random.randint(0, 20, N)
gender_l = np.random.choice(["Male","Female"], N)
region_l = np.random.choice(["Urban","Suburban","Rural"], N)
ap       = np.clip(
    0.70*(race=="White")+0.50*(race=="Asian")+0.42*(race=="Hispanic")+0.38*(race=="Black")+
    0.0003*(credit-300), 0, 1)
approved = (np.random.rand(N) < ap).astype(int)
age_grp  = pd.cut(age, bins=[21,30,45,60,100],
                  labels=["22-30","31-45","46-60","60+"]).astype(str)

df_lending = pd.DataFrame({
    "annual_income": income, "credit_score": credit, "debt_to_income_ratio": dti,
    "employment_years": emp_yrs, "loan_amount": loan_amt, "gender": gender_l,
    "region": region_l, "age_group": age_grp, "approved": approved
})
df_lending.to_csv(mkpath("lending", "lending_data.csv"), index=False)
print(f"✅  lending_data.csv → {mkpath('lending','lending_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 3. HEALTHCARE
# ══════════════════════════════════════════════════════════════════
sex2      = np.random.choice(["Male","Female"], N)
age2      = np.random.randint(18, 80, N)
insurance = np.random.choice(["Private","Public","Uninsured"], N, p=[0.50,0.35,0.15])
severity  = np.random.randint(1, 10, N)
vitals    = np.random.randint(50, 100, N)
wait_time = np.random.randint(5, 240, N)
region2   = np.random.choice(["Urban","Rural","Suburban"], N)
tp        = np.clip(
    0.80*(insurance=="Private")+0.65*(insurance=="Public")+
    0.40*(insurance=="Uninsured")+0.03*severity, 0, 1)
treatment = (np.random.rand(N) < tp).astype(int)
age_grp2  = pd.cut(age2, bins=[17,30,45,60,100],
                   labels=["18-30","31-45","46-60","60+"]).astype(str)

df_health = pd.DataFrame({
    "symptom_severity": severity, "vitals_score": vitals,
    "wait_time_minutes": wait_time, "sex": sex2, "age_group": age_grp2,
    "insurance_status": insurance, "region": region2, "high_priority": treatment
})
df_health.to_csv(mkpath("healthcare", "healthcare_data.csv"), index=False)
print(f"✅  healthcare_data.csv → {mkpath('healthcare','healthcare_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 4. INSURANCE
# ══════════════════════════════════════════════════════════════════
gender3  = np.random.choice(["Male","Female"], N)
age3     = np.random.randint(18, 75, N)
region3  = np.random.choice(["Urban","Suburban","Rural"], N)
premium  = np.random.randint(500, 5000, N)
history  = np.random.randint(0, 5, N)
vehicle  = np.random.choice(["New","Used","Old"], N)
cp       = np.clip(
    0.72*(region3=="Urban")+0.65*(region3=="Suburban")+
    0.48*(region3=="Rural")+0.02*(5-history), 0, 1)
claim    = (np.random.rand(N) < cp).astype(int)
age_grp3 = pd.cut(age3, bins=[17,30,45,60,100],
                  labels=["18-30","31-45","46-60","60+"]).astype(str)

df_ins = pd.DataFrame({
    "gender": gender3, "age_group": age_grp3, "region": region3,
    "annual_premium": premium, "claim_history": history,
    "vehicle_type": vehicle, "claim_approved": claim
})
df_ins.to_csv(mkpath("insurance", "insurance_data.csv"), index=False)
print(f"✅  insurance_data.csv → {mkpath('insurance','insurance_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 5. EDUCATION
# ══════════════════════════════════════════════════════════════════
gender4     = np.random.choice(["Male","Female","Non-binary"], N, p=[0.48,0.47,0.05])
race2       = np.random.choice(["White","Black","Hispanic","Asian","Other"], N,
                                p=[0.45,0.18,0.17,0.15,0.05])
school_type = np.random.choice(["Public","Private","Charter"], N, p=[0.60,0.30,0.10])
gpa         = np.round(np.random.uniform(2.0, 4.0, N), 2)
sat_score   = np.random.randint(900, 1600, N)
extracurr   = np.random.randint(0, 10, N)
first_gen   = np.random.choice([0, 1], N, p=[0.65, 0.35])
income_band = np.random.choice(["Low","Middle","High"], N, p=[0.30,0.45,0.25])
adm_p = np.clip(
    0.70*(race2=="White")+0.68*(race2=="Asian")+0.50*(race2=="Hispanic")+
    0.45*(race2=="Black")+0.55*(race2=="Other")+
    0.08*(income_band=="High")+0.03*(income_band=="Middle")+
    0.005*(sat_score-900)/700+0.10*(gpa/4.0), 0, 1)
admitted = (np.random.rand(N) < adm_p).astype(int)

df_edu = pd.DataFrame({
    "gender": gender4, "race": race2, "school_type": school_type,
    "gpa": gpa, "sat_score": sat_score,
    "extracurricular_activities": extracurr,
    "first_generation": first_gen, "income_band": income_band,
    "admitted": admitted
})
df_edu.to_csv(mkpath("education", "education_data.csv"), index=False)
print(f"✅  education_data.csv → {mkpath('education','education_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 6. CRIMINAL JUSTICE
# ══════════════════════════════════════════════════════════════════
race3       = np.random.choice(["White","Black","Hispanic","Asian"], N,
                                p=[0.42,0.33,0.20,0.05])
gender5     = np.random.choice(["Male","Female"], N, p=[0.78, 0.22])
age4        = np.random.randint(18, 60, N)
prior       = np.random.randint(0, 8, N)
charge_type = np.random.choice(["Misdemeanor","Felony","Violent"], N,
                                p=[0.45,0.35,0.20])
employed    = np.random.choice([0, 1], N, p=[0.45, 0.55])
edu_lvl     = np.random.choice(["No HS","HS Diploma","College"], N,
                                p=[0.25,0.50,0.25])
rp = np.clip(
    0.55*(race3=="Black")+0.50*(race3=="Hispanic")+
    0.35*(race3=="White")+0.30*(race3=="Asian")+
    0.08*prior+0.15*(charge_type=="Violent")+
    0.10*(charge_type=="Felony")-0.10*employed, 0, 1)
high_risk = (np.random.rand(N) < rp).astype(int)
age_grp4  = pd.cut(age4, bins=[17,25,35,45,70],
                   labels=["18-25","26-35","36-45","46+"]).astype(str)

df_cj = pd.DataFrame({
    "race": race3, "gender": gender5, "age_group": age_grp4,
    "prior_offenses": prior, "charge_severity": charge_type,
    "employed": employed, "education_level": edu_lvl,
    "high_risk_score": high_risk
})
df_cj.to_csv(mkpath("criminal_justice", "criminal_justice_data.csv"), index=False)
print(f"✅  criminal_justice_data.csv → {mkpath('criminal_justice','criminal_justice_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 7. HOUSING
# ══════════════════════════════════════════════════════════════════
race4       = np.random.choice(["White","Black","Hispanic","Asian"], N,
                                p=[0.50,0.20,0.18,0.12])
gender6     = np.random.choice(["Male","Female","Non-binary"], N, p=[0.48,0.47,0.05])
age5        = np.random.randint(18, 70, N)
income2     = np.random.randint(15000, 100000, N)
credit2     = np.random.randint(300, 850, N)
rental_hist = np.random.randint(0, 10, N)
num_occ     = np.random.randint(1, 5, N)
has_pets    = np.random.choice([0, 1], N, p=[0.60, 0.40])
hpp = np.clip(
    0.78*(race4=="White")+0.58*(race4=="Asian")+
    0.52*(race4=="Hispanic")+0.45*(race4=="Black")+
    0.0003*(credit2-300)+0.000005*income2-
    0.05*(num_occ > 2)-0.05*has_pets, 0, 1)
approved2 = (np.random.rand(N) < hpp).astype(int)
age_grp5  = pd.cut(age5, bins=[17,30,45,60,100],
                   labels=["18-30","31-45","46-60","60+"]).astype(str)

df_housing = pd.DataFrame({
    "race": race4, "gender": gender6, "age_group": age_grp5,
    "annual_income": income2, "credit_score": credit2,
    "rental_history_years": rental_hist, "num_occupants": num_occ,
    "has_pets": has_pets, "rental_approved": approved2
})
df_housing.to_csv(mkpath("housing", "housing_data.csv"), index=False)
print(f"✅  housing_data.csv → {mkpath('housing','housing_data.csv')}")


# ══════════════════════════════════════════════════════════════════
# 8. RETAIL CREDIT
# ══════════════════════════════════════════════════════════════════
gender7   = np.random.choice(["Male","Female"], N)
age6      = np.random.randint(18, 70, N)
race5     = np.random.choice(["White","Black","Hispanic","Asian"], N,
                              p=[0.50,0.20,0.18,0.12])
income3   = np.random.randint(10000, 150000, N)
credit3   = np.random.randint(300, 850, N)
debt      = np.random.randint(0, 50000, N)
employ    = np.random.choice(["Employed","Self-employed","Unemployed"], N,
                              p=[0.60,0.20,0.20])
num_cards = np.random.randint(0, 5, N)
ccp = np.clip(
    0.65*(gender7=="Male")+0.55*(gender7=="Female")+
    0.10*(race5=="White")+0.08*(race5=="Asian")+
    0.04*(race5=="Hispanic")+0.02*(race5=="Black")+
    0.0003*(credit3-300)+
    0.10*(employ=="Employed")-0.15*(employ=="Unemployed"), 0, 1)
cc_approved = (np.random.rand(N) < ccp).astype(int)
age_grp6  = pd.cut(age6, bins=[17,30,45,60,100],
                   labels=["18-30","31-45","46-60","60+"]).astype(str)

df_rc = pd.DataFrame({
    "gender": gender7, "age_group": age_grp6, "race": race5,
    "annual_income": income3, "credit_score": credit3,
    "existing_debt": debt, "employment_status": employ,
    "existing_cards": num_cards, "credit_approved": cc_approved
})
df_rc.to_csv(mkpath("retail_credit", "retail_credit_data.csv"), index=False)
print(f"✅  retail_credit_data.csv → {mkpath('retail_credit','retail_credit_data.csv')}")


print("\n🎉 All 8 datasets generated successfully!")

# ── Verify all files exist and print sizes ──────────────────────────────────
print("\n📋 Verification:")
expected = [
    ("hiring",          "hiring_data.csv"),
    ("lending",         "lending_data.csv"),
    ("healthcare",      "healthcare_data.csv"),
    ("insurance",       "insurance_data.csv"),
    ("education",       "education_data.csv"),
    ("criminal_justice","criminal_justice_data.csv"),
    ("housing",         "housing_data.csv"),
    ("retail_credit",   "retail_credit_data.csv"),
]
all_ok = True
for domain_folder, fname in expected:
    fpath = os.path.join(DATA_DIR, domain_folder, fname)
    if os.path.exists(fpath):
        size_kb = os.path.getsize(fpath) // 1024
        print(f"  ✅ {domain_folder}/{fname} ({size_kb} KB)")
    else:
        print(f"  ❌ MISSING: {domain_folder}/{fname}")
        all_ok = False

if all_ok:
    print("\n✅ All files confirmed in backend/data/")
else:
    print("\n⚠️  Some files are missing — check errors above")