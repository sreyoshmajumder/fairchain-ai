from fastapi import APIRouter
router = APIRouter()

# In-memory store (resets on server restart — fine for demo)
_history = []

@router.get("/history")
def get_history():
    return _history

@router.post("/save")
def save_audit(data: dict):
    _history.insert(0, data)
    return {"status": "saved"}