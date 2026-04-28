import os
import json
import pandas as pd
from fastapi import APIRouter, HTTPException
from config.domains import DOMAINS

router = APIRouter()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _get_stats(domain_id: str) -> dict:
    cfg      = DOMAINS.get(domain_id, {})
    rel_path = os.path.normpath(cfg.get("sample_dataset", ""))
    path     = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(path):
        return {"rows": 0, "columns": 0}
    try:
        df = pd.read_csv(path)
        return {"rows": len(df), "columns": len(df.columns)}
    except Exception:
        return {"rows": 0, "columns": 0}


@router.get("/list")
def list_domains():
    return [
        {
            "id":                k,
            "name":              v["name"],
            "description":       v["description"],
            "icon":              v.get("icon", "📊"),
            "color":             v.get("color", "#444"),
            "sensitive_columns": v["sensitive_columns"],
            "label_column":      v["label_column"],
            "stats":             _get_stats(k),
        }
        for k, v in DOMAINS.items()
    ]


@router.get("/{domain_id}/config")
def get_domain_config(domain_id: str):
    if domain_id not in DOMAINS:
        raise HTTPException(status_code=404, detail=f"Domain '{domain_id}' not found")
    cfg = DOMAINS[domain_id].copy()
    cfg["stats"] = _get_stats(domain_id)
    return cfg


@router.get("/{domain_id}/sample-preview")
def sample_preview(domain_id: str):
    if domain_id not in DOMAINS:
        raise HTTPException(status_code=404, detail=f"Domain '{domain_id}' not found")
    cfg      = DOMAINS[domain_id]
    rel_path = os.path.normpath(cfg["sample_dataset"])
    path     = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Dataset not found: {path}")
    try:
        df = pd.read_csv(path)
        return {
            "columns":            list(df.columns),
            "shape":              list(df.shape),
            "preview":            json.loads(df.head(10).to_json(orient="records")),
            "label_distribution": {
                str(k): int(v)
                for k, v in df[cfg["label_column"]].value_counts().items()
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))