from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import audit_routes, blockchain_routes, report_routes, domain_routes

app = FastAPI(title="FairChain AI Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(domain_routes.router,     prefix="/domain",     tags=["Domain"])
app.include_router(audit_routes.router,      prefix="/audit",      tags=["Audit"])
app.include_router(blockchain_routes.router, prefix="/blockchain",  tags=["Blockchain"])
app.include_router(report_routes.router,     prefix="/report",     tags=["Report"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "FairChain AI"}