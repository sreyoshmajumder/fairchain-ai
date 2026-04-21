from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
import pandas as pd, numpy as np, os, uuid, io
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score
from config.domains import DOMAINS
from services.fairness_engine import (
    run_dataset_audit, train_baseline,
    compute_group_metrics, compute_fairness_metrics, apply_reweighing
)
from services.gemini_service import get_gemini_explanation

router = APIRouter()
AUDIT_STORE = {}

@router.post("/run")
async def run_audit(
    domain_id: str = Form(...),
    sensitive_column: str = Form(...),
    use_sample: bool = Form(True),
    file: Optional[UploadFile] = File(None)
):
    if domain_id not in DOMAINS:
        return {"error": "Invalid domain"}

    cfg = DOMAINS[domain_id]
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    if use_sample or file is None:
        path = os.path.join(base_dir, cfg["sample_dataset"])
        df = pd.read_csv(path)
    else:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode("utf-8")))

    if sensitive_column not in df.columns:
        return {"error": f"Column '{sensitive_column}' not found in dataset"}

    label_col = cfg["label_column"]
    feat_cols  = [f for f in cfg["feature_columns"] if f in df.columns]
    sens_cols  = cfg["sensitive_columns"]

    # Dataset audit
    data_audit = run_dataset_audit(df, sens_cols, label_col)

    # Baseline model
    model, X_test, y_test, y_pred, y_prob, idx_test = train_baseline(df, feat_cols, label_col)
    df_test = df.loc[idx_test].reset_index(drop=True)
    baseline_groups  = compute_group_metrics(df_test, y_test, y_pred, sensitive_column)
    baseline_metrics = compute_fairness_metrics(baseline_groups)
    overall_acc = round(accuracy_score(y_test, y_pred), 4)

    # Mitigation via reweighing
    weights = apply_reweighing(df, sensitive_column, label_col)
    X_all = df[feat_cols].copy()
    for col in X_all.select_dtypes(include="object").columns:
        X_all[col] = LabelEncoder().fit_transform(X_all[col].astype(str))
    X_s   = StandardScaler().fit_transform(X_all)
    y_all = df[label_col].values

    X_tr, X_te, y_tr, y_te, w_tr, _, i_tr, i_te = train_test_split(
        X_s, y_all, weights, df.index, test_size=0.3, random_state=42
    )
    m2 = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    m2.fit(X_tr, y_tr, sample_weight=w_tr)
    y_pred2 = m2.predict(X_te)
    df_test2 = df.loc[i_te].reset_index(drop=True)

    mit_groups  = compute_group_metrics(df_test2, y_te, y_pred2, sensitive_column)
    mit_metrics = compute_fairness_metrics(mit_groups)
    mit_acc     = round(accuracy_score(y_te, y_pred2), 4)

    # Gemini / rule-based explanation
    explanation = get_gemini_explanation(
        cfg["gemini_context"], baseline_metrics, baseline_groups, sensitive_column
    )

    audit_id = str(uuid.uuid4())[:8]
    result = {
        "audit_id": audit_id,
        "domain": domain_id,
        "sensitive_column": sensitive_column,
        "dataset_shape": list(df.shape),
        "data_audit": data_audit,
        "baseline": {
            "group_metrics": baseline_groups,
            "fairness_metrics": baseline_metrics,
            "overall_accuracy": overall_acc
        },
        "mitigated": {
            "group_metrics": mit_groups,
            "fairness_metrics": mit_metrics,
            "overall_accuracy": mit_acc
        },
        "explanation": explanation,
        "improvement": {
            "spd_reduction": round(
                baseline_metrics.get("statistical_parity_diff", 0) -
                mit_metrics.get("statistical_parity_diff", 0), 4),
            "eod_reduction": round(
                baseline_metrics.get("equal_opportunity_diff", 0) -
                mit_metrics.get("equal_opportunity_diff", 0), 4),
            "accuracy_change": round(mit_acc - overall_acc, 4)
        }
    }
    AUDIT_STORE[audit_id] = result
    return result


@router.get("/history")
def audit_history():
    return [
        {
            "audit_id": k,
            "domain": v["domain"],
            "sensitive_column": v["sensitive_column"],
            "severity": v["baseline"]["fairness_metrics"].get("severity", "unknown")
        }
        for k, v in AUDIT_STORE.items()
    ]


@router.get("/{audit_id}")
def get_audit(audit_id: str):
    if audit_id not in AUDIT_STORE:
        return {"error": "Audit not found"}
    return AUDIT_STORE[audit_id]