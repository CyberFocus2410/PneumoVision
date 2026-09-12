"""
PneumoVision FastAPI Backend Server
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from src.config import STATIC_DIR, HEATMAPS_DIR, REPORTS_DIR, BASE_DIR
from backend.routes.health import router as health_router
from backend.routes.analyze import router as analyze_router
from backend.routes.report import router as report_router
from backend.routes.compare import router as compare_router
from backend.routes.feedback import router as feedback_router
from backend.routes.blockchain import router as blockchain_router

app = FastAPI(
    title="PneumoVision API",
    description="Explainable Multi-Label Chest X-Ray Screening & Decision Support Backend",
    version="1.0.0"
)

# Enable CORS for local dev / frontend workstations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure static directories exist
STATIC_DIR.mkdir(parents=True, exist_ok=True)
HEATMAPS_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# Mount static asset folders
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Register API routers first
app.include_router(health_router)
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
