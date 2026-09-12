"""
PneumoVision FastAPI Backend Server
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from src.config import STATIC_DIR, HEATMAPS_DIR, REPORTS_DIR, BASE_DIR
from backend.db.database import init_db, SessionLocal
from backend.db.models import User, UserRole
from backend.auth.security import hash_password
from backend.blockchain.client import get_blockchain_client
from backend.routes.health import router as health_router
from backend.routes.analyze import router as analyze_router
from backend.routes.report import router as report_router
from backend.routes.compare import router as compare_router
from backend.routes.feedback import router as feedback_router
from backend.routes.blockchain import router as blockchain_router
from backend.routes.auth import router as auth_router
from backend.routes.providers import router as providers_router


def seed_default_admin():
    """Initializes default admin account if not already present."""
    init_db()
    db = SessionLocal()
    try:
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@pneumovision.ai")
        admin_pwd = os.environ.get("ADMIN_PASSWORD", "AdminPassword2026!")
        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            client = get_blockchain_client()
            admin = User(
                email=admin_email,
                hashed_password=hash_password(admin_pwd),
                role=UserRole.ADMIN.value,
                full_name="PneumoVision Chief Medical Administrator",
                wallet_address=client.admin_account,
                is_verified=True
            )
            db.add(admin)
            db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure directories and database initialized
    STATIC_DIR.mkdir(parents=True, exist_ok=True)
    HEATMAPS_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    seed_default_admin()
    yield


app = FastAPI(
    title="PneumoVision API",
    description="Explainable Multi-Label Chest X-Ray Screening & Decision Support Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local dev / frontend workstations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static asset folders
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Register API routers
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(providers_router)
app.include_router(analyze_router)
app.include_router(report_router)
app.include_router(compare_router)
app.include_router(feedback_router)
app.include_router(blockchain_router)

# Mount frontend build directory if present at root
frontend_dist = BASE_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
