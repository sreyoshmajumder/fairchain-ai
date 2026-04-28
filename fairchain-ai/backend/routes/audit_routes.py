import os
import traceback
import pandas as pd
import numpy as np
from io import StringIO

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from config.domains import DOMAINS
from services.fairness_engine import (
    run_dataset_audit,
    train_baseline,
    compute_group_metrics,
    compute_fairness_metrics,
    apply_reweighing,
    _detect_target,
)
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import accuracy_score

router   = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ── Shared audit logic — works for both pre-existing and uploaded data ─────────
def _run_fairness_engine(df: pd.DataFrame, domain_id: str,
                          sensitive_column: str, use_sample: bool = True) -> dict:
    cfg = DOMAINS.get(domain_id, {})

    if use_sample and len(df) > 1000:
        df = df.sample(1000, random_state=42)
    df = df.reset_index(drop=True)

    # Resolve label column
    label_col = cfg.get("label_column") or _detect_target(df)
    if label_col not in df.columns:
        raise HTTPException(
            status_code=422,
            detail=f"Could not find target/label column '{label_col}'. "
                   f"Available columns: {list(df.columns)}"
        )

    if sensitive_column not in df.columns:
        raise HTTPException(
            status_code=422,
            detail=f"Sensitive column '{sensitive_column}' not found. "
                   f"Available: {list(df.columns)}"
        )

    feat_cols = [c for c in df.columns if c != label_col]

    # Dataset audit
    sensitive_cols = cfg.get("sensitive_columns", [sensitive_column])
    dataset_audit  = run_dataset_audit(df, sensitive_cols, label_col)

    # Baseline model
    model, X_te, y_te, y_pred_base, y_prob, idx_te = train_baseline(df, feat_cols, label_col)
    df_test       = df.loc[idx_te].reset_index(drop=True)
    base_accuracy = round(accuracy_score(y_te, y_pred_base) * 100, 1)

    grp_base  = compute_group_metrics(df_test.copy(), y_te, y_pred_base, sensitive_column)
    fair_base = compute_fairness_metrics(grp_base)
    fair_base["model_accuracy"] = base_accuracy
    fair_base["target_column"]  = label_col

    # Mitigated model
    train_idx = df.index.difference(idx_te)
    df_train  = df.loc[train_idx].reset_index(drop=True)
    weights   = apply_reweighing(df_train, sensitive_column, label_col)

    df_enc = df.copy()
    for col in df_enc.select_dtypes(include="object").columns:
        df_enc[col] = LabelEncoder().fit_transform(df_enc[col].astype(str))
    df_enc = df_enc.fillna(0)

    scaler = StandardScaler()
    X_all  = scaler.fit_transform(df_enc[feat_cols])
    y_all  = df[label_col].values

    mit_model = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
    mit_model.fit(X_all[train_idx], y_all[train_idx], sample_weight=weights)
    y_pred_mit   = mit_model.predict(X_all[idx_te])
    mit_accuracy = round(accuracy_score(y_all[idx_te], y_pred_mit) * 100, 1)

    grp_mit  = compute_group_metrics(df_test.copy(), y_all[idx_te], y_pred_mit, sensitive_column)
    fair_mit = compute_fairness_metrics(grp_mit)
    fair_mit["model_accuracy"] = mit_accuracy

    # Selection rates
    all_groups = set(list(grp_base.keys()) + list(grp_mit.keys()))
    selection_rates = {
        g: {
            "baseline":  round(grp_base.get(g, {}).get("selection_rate", 0) * 100, 2),
            "mitigated": round(grp_mit.get(g,  {}).get("selection_rate", 0) * 100, 2),
            "count":     grp_base.get(g, {}).get("count", 0),
        }
        for g in all_groups
    }

    return {
        "domain_id":        domain_id,
        "sensitive_column": sensitive_column,
        "target_column":    label_col,
        "dataset_audit":    dataset_audit,
        "baseline":         fair_base,
        "mitigated":        fair_mit,
        "group_metrics":    {"baseline": grp_base, "mitigated": grp_mit},
        "selection_rates":  selection_rates,
        "delta": {
            "spd_reduction":   round(fair_base["statistical_parity_diff"] - fair_mit["statistical_parity_diff"], 4),
            "eod_reduction":   round(fair_base["equal_opportunity_diff"]  - fair_mit["equal_opportunity_diff"],  4),
            "accuracy_change": round(mit_accuracy - base_accuracy, 1),
        },
        "groups_analyzed": len(grp_base),
        "features_used":   feat_cols,
        "total_rows":      len(df),
    }


# ── Request model ──────────────────────────────────────────────────────────────
class AuditRequest(BaseModel):
    domain_id:        str
    sensitive_column: str
    use_sample:       bool = True


# ── POST /audit/run — pre-existing dataset ─────────────────────────────────────
@router.post("/run")
async def run_audit(req: AuditRequest):
    try:
        if req.domain_id not in DOMAINS:
            raise HTTPException(
                status_code=404,
                detail=f"Domain '{req.domain_id}' not found. Available: {list(DOMAINS.keys())}"
            )

        cfg  = DOMAINS[req.domain_id]
        path = os.path.join(BASE_DIR, os.path.normpath(cfg["sample_dataset"]))

        if not os.path.exists(path):
            # Try to auto-generate
            try:
                gen_path = os.path.join(BASE_DIR, "data", "generate_data.py")
                import importlib.util
                spec = importlib.util.spec_from_file_location("generate_data", gen_path)
                mod  = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
            except Exception as gen_err:
                raise HTTPException(status_code=500,
                    detail=f"Dataset missing and auto-gen failed: {gen_err}")

        if not os.path.exists(path):
            raise HTTPException(status_code=500,
                detail=f"Dataset file not found: {path}. Run: python data/generate_data.py")

        df     = pd.read_csv(path)
        result = _run_fairness_engine(df, req.domain_id, req.sensitive_column, req.use_sample)
        result["dataset_source"] = "preexisting"
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")


# ── POST /audit/run-upload — user-uploaded CSV ─────────────────────────────────
@router.post("/run-upload")
async def run_audit_upload(
    domain_id:        str        = Form(...),
    sensitive_column: str        = Form(...),
    file:             UploadFile = File(...),
):
    try:
        # Validate file type
        if not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only .csv files are supported.")

        # Read uploaded CSV
        contents = await file.read()
        try:
            text = contents.decode('utf-8')
        except UnicodeDecodeError:
            text = contents.decode('latin-1')   # fallback for Windows-encoded files

        try:
            df = pd.read_csv(StringIO(text))
        except Exception as parse_err:
            raise HTTPException(status_code=400,
                detail=f"Could not parse CSV: {parse_err}")

        if df.empty or len(df.columns) < 2:
            raise HTTPException(status_code=400,
                detail="Uploaded CSV must have at least 2 columns and at least 1 data row.")

        if len(df) < 20:
            raise HTTPException(status_code=400,
                detail=f"Dataset too small ({len(df)} rows). Need at least 20 rows for analysis.")

        # domain_id can be 'unknown' for uploaded files — we still run the engine
        if domain_id not in DOMAINS:
            # Use a generic domain config — just auto-detect the target column
            domain_id_safe = list(DOMAINS.keys())[0]  # fallback domain for config
        else:
            domain_id_safe = domain_id

        result = _run_fairness_engine(df, domain_id_safe, sensitive_column, use_sample=True)
        result["dataset_source"] = "uploaded"
        result["uploaded_filename"] = file.filename
        result["domain_id"] = domain_id  # return the original domain_id

        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500,
            detail=f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}")


# ── GET /audit/history ─────────────────────────────────────────────────────────
_history = []

@router.get("/history")
def get_history():
    return _history

@router.post("/save")
def save_to_history(data: dict):
    _history.insert(0, data)
    if len(_history) > 50:
        _history.pop()
    return {"status": "saved"}
