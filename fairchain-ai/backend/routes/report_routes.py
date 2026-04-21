from fastapi import APIRouter
from pydantic import BaseModel
import hashlib, json

router = APIRouter()

class ReportRequest(BaseModel):
    audit_id: str
    domain: str
    sensitive_column: str
    baseline_metrics: dict
    mitigated_metrics: dict
    explanation: dict
    improvement: dict

@router.post("/generate")
def generate_report(req: ReportRequest):
    report = {
        "fairchain_version":  "1.0.0",
        "audit_id":           req.audit_id,
        "domain":             req.domain,
        "sensitive_column":   req.sensitive_column,
        "baseline_fairness":  req.baseline_metrics,
        "mitigated_fairness": req.mitigated_metrics,
        "improvement":        req.improvement,
        "executive_summary":  req.explanation.get("summary", ""),
        "recommended_steps":  req.explanation.get("recommended_steps", []),
        "risk_level":         req.baseline_metrics.get("severity", "unknown"),
        "overall_status":     (
            "pass"    if req.baseline_metrics.get("severity") == "low"    else
            "warning" if req.baseline_metrics.get("severity") == "medium" else
            "fail"
        )
    }
    report_str       = json.dumps(report, sort_keys=True)
    report["report_hash"] = hashlib.sha256(report_str.encode()).hexdigest()
    return report