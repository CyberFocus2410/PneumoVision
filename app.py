"""
PneumoVision Root Application Launcher
Starts FastAPI backend server and serves clinical decision support workstation.
"""

import uvicorn
import webbrowser
import threading
import time
from pathlib import Path

def open_browser():
    time.sleep(1.5)
    print("\n[PneumoVision] Opening clinical workstation in browser at http://localhost:8000 ...")
    try:
        webbrowser.open("http://localhost:8000")
    except Exception:
        pass

if __name__ == "__main__":
    print("=" * 65)
    print("  PNEUMOVISION — Explainable AI Chest Radiograph Screening Platform")
    print("  Clinical Decision Support & Explainability Workstation")
    print("=" * 65)
    print("  REST API Docs: http://localhost:8000/docs")
    print("  Workstation UI: http://localhost:3000 (Vite) or http://localhost:8000")
    print("=" * 65)

    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
