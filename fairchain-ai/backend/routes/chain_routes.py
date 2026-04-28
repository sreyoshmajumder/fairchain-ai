from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import hashlib, time
router = APIRouter()

_chain_store = {}

class AnchorRequest(BaseModel):
    domain_id:        str
    sensitive_column: str
    spd:              Optional[float] = None

@router.post("/anchor")
def anchor_audit(req: AnchorRequest):
    record_id = hashlib.md5(f"{req.domain_id}{req.sensitive_column}{time.time()}".encode()).hexdigest()[:12]
    _chain_store[record_id] = {"id": record_id, "domain_id": req.domain_id,
                                "sensitive_column": req.sensitive_column, "spd": req.spd,
                                "timestamp": int(time.time())}
    return {"status": "anchored", "record_id": record_id, "tx_hash": "0x" + record_id}

@router.get("/{audit_id}")
def get_chain_record(audit_id: str):
    return _chain_store.get(audit_id, {"status": "not_found", "audit_id": audit_id})