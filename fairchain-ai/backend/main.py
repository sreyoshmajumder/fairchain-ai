import os
import importlib

# Safe dotenv — not needed on Cloud Run (secrets via Secret Manager)
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.audit_routes  import router as audit_router
from routes.domain_routes import router as domain_router
from routes.report_routes import router as report_router
from routes.chain_routes  import router as chain_router
from routes.chat_routes   import router as chat_router

try:
    from routes.history_routes import router as history_router
    HAS_HISTORY = True
except ImportError:
    HAS_HISTORY = False

app = FastAPI(title="FairChain AI", version="3.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://fairchain-ai.web.app",       # ← your Firebase URL
        "https://fairchain-ai.firebaseapp.com", # ← Firebase alt URL
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(domain_router, prefix="/domain")
app.include_router(audit_router,  prefix="/audit")
app.include_router(report_router, prefix="/report")
app.include_router(chain_router,  prefix="/chain")
app.include_router(chat_router,   prefix="/chat")
if HAS_HISTORY:
    app.include_router(history_router, prefix="/history")


# ── Auto-generate datasets on startup ────────────────────────────────────────
@app.on_event("startup")
async def auto_generate_datasets():
    BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
    DATA_DIR   = os.path.join(BASE_DIR, "data")
    GEN_SCRIPT = os.path.join(DATA_DIR, "generate_data.py")

    REQUIRED = [
        ("hiring",           "hiring_data.csv"),
        ("lending",          "lending_data.csv"),
        ("healthcare",       "healthcare_data.csv"),
        ("insurance",        "insurance_data.csv"),
        ("education",        "education_data.csv"),
        ("criminal_justice", "criminal_justice_data.csv"),
        ("housing",          "housing_data.csv"),
        ("retail_credit",    "retail_credit_data.csv"),
    ]

    missing = [
        os.path.join(DATA_DIR, folder, fname)
        for folder, fname in REQUIRED
        if not os.path.exists(os.path.join(DATA_DIR, folder, fname))
    ]

    if missing:
        print(f"⚠️  {len(missing)} dataset(s) missing — auto-generating...")
        if os.path.exists(GEN_SCRIPT):
            try:
                spec = importlib.util.spec_from_file_location("generate_data", GEN_SCRIPT)
                mod  = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
                print("✅  All datasets generated.")
            except Exception as e:
                print(f"❌  Dataset generation failed: {e}")
        else:
            print(f"❌  generate_data.py not found at: {GEN_SCRIPT}")
    else:
        print("✅  All 8 datasets present.")

    # ── Confirm API key was loaded ────────────────────────────────────────────
    key = os.getenv("GEMINI_API_KEY", "")
    if key:
        print(f"✅  GEMINI_API_KEY loaded ({key[:8]}…)")
    else:
        print("⚠️  GEMINI_API_KEY not found — check backend/.env")


# ── Root ──────────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return JSONResponse({
        "service":   "FairChain AI Backend",
        "version":   "3.0.0",
        "status":    "running",
        "docs":      "https://fairchain-ai-backend-286156139636.asia-south1.run.app/docs",
        "endpoints": ["/domain/list", "/audit/run", "/chain/upload", "/chat/message", "/health"],
    })


# ── Health & ping ─────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status":          "ok",
        "service":         "FairChain AI",
        "version":         "3.0.0",
        "gemini_key_set":  bool(os.getenv("GEMINI_API_KEY", "")),
    }

@app.get("/ping")
def ping():
    return {"pong": True}