from fastapi import APIRouter
from config.domains import DOMAINS
import pandas as pd, os, json

router = APIRouter()

@router.get("/list")
def list_domains():
    return [
        {
            "id": k,
            "name": v["name"],
            "description": v["description"],
            "color": v["color"],
            "sensitive_columns": v["sensitive_columns"],
            "label_column": v["label_column"]
        }
        for k, v in DOMAINS.items()
    ]

@router.get("/{domain_id}/config")
def get_domain_config(domain_id: str):
    if domain_id not in DOMAINS:
        return {"error": "Domain not found"}
    return DOMAINS[domain_id]

@router.get("/{domain_id}/sample-preview")
def sample_preview(domain_id: str):
    if domain_id not in DOMAINS:
        return {"error": "Domain not found"}
    cfg = DOMAINS[domain_id]
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, cfg["sample_dataset"])
    if not os.path.exists(path):
        return {"error": f"Dataset not found at {path}"}
    df = pd.read_csv(path)
    return {
        "columns": list(df.columns),
        "shape": list(df.shape),
        "preview": json.loads(df.head(10).to_json(orient="records")),
        "label_distribution": df[cfg["label_column"]].value_counts().to_dict()
    }