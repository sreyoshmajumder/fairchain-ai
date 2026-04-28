import os
import time

# ── Safety net: load .env in case this module is imported before main.py ──────
from dotenv import load_dotenv
load_dotenv(override=True)

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Any, List

router = APIRouter()

# ── Safe genai import ─────────────────────────────────────────────────────────
try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False
    print("⚠️  google-generativeai not installed. Run: pip install google-generativeai")

# ── Read key AFTER dotenv is loaded ──────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

if GEMINI_API_KEY and GENAI_AVAILABLE:
    genai.configure(api_key=GEMINI_API_KEY)
    print(f"✅  Gemini configured with key: {GEMINI_API_KEY[:8]}…")
elif not GEMINI_API_KEY:
    print("⚠️  GEMINI_API_KEY is empty — chat will return errors until set in backend/.env")

# ── Model fallback chain ──────────────────────────────────────────────────────
MODEL_CHAIN = [
    "gemini-2.0-flash-lite",   # highest free-tier quota
    "gemini-1.5-flash-8b",     # very high quota, ultra-fast
    "gemini-1.5-flash",        # solid free-tier fallback
    "gemini-2.0-flash",        # original — last resort
]

GEN_CONFIG = {
    "temperature":       0.7,
    "top_p":             0.9,
    "max_output_tokens": 1024,
}

SYSTEM_PROMPT = """You are FairBot, an expert AI assistant built into FairChain AI —
an algorithmic fairness auditing platform. You help users understand:

- Fairness metrics: Statistical Parity Difference, Equal Opportunity Difference, False Positive Rate Difference
- Bias mitigation techniques: Reweighing, Adversarial Debiasing, Calibrated Equalized Odds
- Audit results interpretation: what the numbers mean, which groups are affected
- Regulatory compliance: EU AI Act, GDPR Article 22, US ECOA, IEEE 7003, ISO/IEC 42001
- How to act on audit findings to reduce discrimination in AI systems

Keep responses concise, clear, and actionable. Use bullet points where helpful.
If shown audit data (domain, sensitive attribute, metrics), reference it specifically."""


class HistoryItem(BaseModel):
    role:    str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryItem]] = []
    context: Optional[Any] = None


def _call_with_fallback(prompt: str, history: list) -> tuple:
    if not GENAI_AVAILABLE:
        raise ValueError(
            "google-generativeai package is not installed.\n"
            "Fix: pip install google-generativeai  then restart uvicorn."
        )

    # Re-read key at call time (handles hot-reload scenarios)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set in backend/.env\n\n"
            "Steps to fix:\n"
            "1. Open  backend/.env  (create it if missing)\n"
            "2. Add the line:  GEMINI_API_KEY=AIza...your_key_here\n"
            "3. Save the file\n"
            "4. Restart uvicorn:  python -m uvicorn main:app --reload --port 8000"
        )

    # Reconfigure if key changed since module load
    genai.configure(api_key=api_key)

    last_error = None

    for model_name in MODEL_CHAIN:
        try:
            model = genai.GenerativeModel(
                model_name,
                system_instruction=SYSTEM_PROMPT,
                generation_config=GEN_CONFIG,
            )

            chat_history = []
            for h in (history or [])[-10:]:
                role = "user" if h.get("role") == "user" else "model"
                chat_history.append({
                    "role":  role,
                    "parts": [h.get("content", "")],
                })

            if chat_history:
                chat     = model.start_chat(history=chat_history)
                response = chat.send_message(prompt)
            else:
                response = model.generate_content(prompt)

            return response.text.strip(), model_name

        except Exception as e:
            err = str(e)
            is_quota     = any(x in err for x in ["429", "RESOURCE_EXHAUSTED", "quota", "rate limit"])
            is_not_found = any(x in err for x in ["404", "NOT_FOUND", "not found", "deprecated"])

            if is_quota or is_not_found:
                label = "Quota exceeded" if is_quota else "Model unavailable"
                print(f"⚠️  [{model_name}] {label} — trying next model…")
                last_error = err
                if is_quota:
                    time.sleep(0.5)
                continue

            # API key invalid, permission denied, etc. — fail immediately
            if any(x in err for x in ["400", "401", "403", "API_KEY_INVALID", "API key"]):
                raise ValueError(
                    f"Gemini API key is invalid or lacks permissions.\n"
                    f"Error: {err}\n\n"
                    f"Fix: Get a new key from https://aistudio.google.com/app/apikey\n"
                    f"then update GEMINI_API_KEY in backend/.env and restart uvicorn."
                )
            raise

    raise Exception(
        "QUOTA_EXHAUSTED||All Gemini models have hit their free-tier quota for today. "
        "Quota resets at midnight Pacific Time. "
        "To fix permanently: create a NEW Google Cloud project at console.cloud.google.com, "
        "generate a new API key from that project, paste it in backend/.env."
    )


def _build_prompt(message: str, context: Any) -> str:
    if not context:
        return message
    try:
        lines     = []
        domain    = context.get("domain_id") or context.get("domain", {}).get("id", "")
        sensitive = context.get("sensitive_column", "")
        target    = context.get("target_column", "")
        base      = context.get("baseline", {})
        mit       = context.get("mitigated", {})
        delta     = context.get("delta", {})

        if domain:    lines.append(f"Domain: {domain}")
        if sensitive: lines.append(f"Sensitive attribute: {sensitive}")
        if target:    lines.append(f"Target outcome: {target}")
        if base:
            lines.append(
                f"Baseline — SPD: {round(base.get('statistical_parity_diff', 0), 4)}, "
                f"EOD: {round(base.get('equal_opportunity_diff', 0), 4)}, "
                f"Accuracy: {base.get('model_accuracy', '?')}%, "
                f"Severity: {str(base.get('severity', '?')).upper()}"
            )
        if mit:
            lines.append(
                f"After mitigation — SPD: {round(mit.get('statistical_parity_diff', 0), 4)}, "
                f"EOD: {round(mit.get('equal_opportunity_diff', 0), 4)}, "
                f"Accuracy: {mit.get('model_accuracy', '?')}%"
            )
        if delta:
            lines.append(
                f"Improvement — SPD reduction: {delta.get('spd_reduction', 0)}, "
                f"Accuracy change: {delta.get('accuracy_change', 0)}%"
            )
        if lines:
            return "[Current audit context]\n" + "\n".join(lines) + "\n\nUser question: " + message
    except Exception:
        pass
    return message


@router.post("/message")
async def chat_message(req: ChatRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    try:
        prompt       = _build_prompt(req.message.strip(), req.context)
        history      = [h.dict() for h in (req.history or [])]
        reply, model = _call_with_fallback(prompt, history)
        return JSONResponse({"reply": reply, "model": model, "status": "ok"})

    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        err = str(e)
        if "QUOTA_EXHAUSTED" in err:
            raise HTTPException(status_code=429, detail=err.replace("QUOTA_EXHAUSTED||", ""))
        raise HTTPException(status_code=500, detail=f"Chat error: {err}")


@router.get("/models")
def list_models():
    return {
        "fallback_chain":  MODEL_CHAIN,
        "api_key_set":     bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "genai_installed": GENAI_AVAILABLE,
    }


@router.get("/health")
def chat_health():
    issues = []
    if not GENAI_AVAILABLE:
        issues.append("google-generativeai not installed — run: pip install google-generativeai")
    if not os.getenv("GEMINI_API_KEY", "").strip():
        issues.append("GEMINI_API_KEY not set — add it to backend/.env")
    return {
        "status":          "ok" if not issues else "degraded",
        "genai_installed": GENAI_AVAILABLE,
        "api_key_set":     bool(os.getenv("GEMINI_API_KEY", "").strip()),
        "issues":          issues,
    }