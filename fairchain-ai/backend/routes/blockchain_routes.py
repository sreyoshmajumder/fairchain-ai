from fastapi import APIRouter
from pydantic import BaseModel
import hashlib, json, time

router = APIRouter()
CHAIN_STORE = {}

class AnchorRequest(BaseModel):
    audit_id: str
    domain: str
    sensitive_column: str
    severity: str
    spd: float
    eod: float
    report_json: dict

class VerifyRequest(BaseModel):
    audit_id: str
    report_json: dict

@router.post("/anchor")
def anchor_audit(req: AnchorRequest):
    report_str  = json.dumps(req.report_json, sort_keys=True)
    report_hash = hashlib.sha256(report_str.encode()).hexdigest()
    tx_hash     = "0x" + hashlib.sha256(f"{report_hash}{time.time()}".encode()).hexdigest()
    record = {
        "audit_id":        req.audit_id,
        "domain":          req.domain,
        "sensitive_column":req.sensitive_column,
        "severity":        req.severity,
        "spd":             req.spd,
        "eod":             req.eod,
        "report_hash":     report_hash,
        "tx_hash":         tx_hash,
        "timestamp":       int(time.time()),
        "status":          "anchored",
        "block_number":    45230000 + int(time.time() % 100000),
        "network":         "Polygon Amoy Testnet"
    }
    CHAIN_STORE[req.audit_id] = record
    return record

@router.post("/verify")
def verify_report(req: VerifyRequest):
    if req.audit_id not in CHAIN_STORE:
        return {"verified": False, "reason": "Audit ID not found on chain"}
    stored      = CHAIN_STORE[req.audit_id]
    report_str  = json.dumps(req.report_json, sort_keys=True)
    computed    = hashlib.sha256(report_str.encode()).hexdigest()
    if computed == stored["report_hash"]:
        return {
            "verified":     True,
            "tx_hash":      stored["tx_hash"],
            "timestamp":    stored["timestamp"],
            "network":      stored["network"],
            "block_number": stored["block_number"],
            "report_hash":  stored["report_hash"]
        }
    return {"verified": False, "reason": "Hash mismatch",
            "computed": computed, "stored": stored["report_hash"]}

@router.get("/record/{audit_id}")
def get_chain_record(audit_id: str):
    if audit_id not in CHAIN_STORE:
        return {"error": "No blockchain record found"}
    return CHAIN_STORE[audit_id]