import logging
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.routing import Match
from sqlalchemy import inspect, text

from .config import ALLOWED_ORIGINS, UPLOAD_DIR
from .database import Base, SessionLocal, engine
from . import routes
from .services import create_admin, generate_distribution, get_admin_by_username
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)


app = FastAPI(title="Distribution des Tâches du Dortoir")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# expose uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Include API routes before mounting the frontend so `/api/*` is handled by FastAPI
app.include_router(routes.router, prefix="/api")

# --- Static SPA serving -------------------------------------------------
# Detect possible frontend build folders, prefer an explicit env var.
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST = os.getenv("FRONTEND_DIST_PATH")
POSSIBLE_DIRS = [
    Path(FRONTEND_DIST) if FRONTEND_DIST else None,
    BASE_DIR / "frontend" / "dist",
    BASE_DIR.parent / "web" / "frontend" / "dist",
    BASE_DIR / "dist",
    BASE_DIR / "build",
]

FRONTEND_DIR = None
for p in POSSIBLE_DIRS:
    if not p:
        continue
    if p.exists() and p.is_dir():
        FRONTEND_DIR = p
        break

if FRONTEND_DIR:
    INDEX_FILE = FRONTEND_DIR / "index.html"
else:
    INDEX_FILE = None

# ------------------------------------------------------------------------


@app.on_event("startup")
async def startup_event():
    try:
        if engine is not None:
            logger.info(
                "Database connection available: host=%s port=%s database=%s driver=%s",
                engine.url.host or "localhost",
                engine.url.port or 0,
                engine.url.database or "",
                engine.url.drivername,
            )
        else:
            logger.warning("No database engine available at startup. Verify DATABASE_URL is configured.")
    except Exception as e:
        logger.warning("Database connectivity check failed: %s", e)

    # ensure uploads folder
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # create admin user if environment variables are provided
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_password = os.getenv("ADMIN_PASSWORD")
    if admin_username and admin_password:
        db = SessionLocal()
        try:
            existing_admin = get_admin_by_username(db, admin_username)
            if not existing_admin:
                create_admin(db, admin_username, admin_password)
                print(f"Created admin user: {admin_username}")
        finally:
            db.close()

    # start scheduler
    scheduler = AsyncIOScheduler()

    def job_func():
        db = SessionLocal()
        try:
            generate_distribution(db)
        finally:
            db.close()

    # schedule daily at 04:00
    scheduler.add_job(job_func, "cron", hour=4, minute=0)
    scheduler.start()

@app.get("/")
def home():
    return {"message": "Bienvenue MERLIN"}


@app.get("/health")
def health():
    """Simple health check. Returns DB status if engine is available."""
    status = {"ok": True}
    try:
        if engine is not None:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            status["db"] = "ok"
        else:
            status["db"] = "unavailable"
    except Exception as e:
        status["db"] = f"error: {e}"
    return status


@app.get("/db-config")
def db_config():
    """Return database connection info without exposing a password."""
    if engine is None:
        raise HTTPException(status_code=503, detail="Database engine unavailable")

    url = engine.url
    return {
        "host": url.host,
        "port": url.port,
        "database": url.database,
        "driver": url.drivername,
    }


# SPA catch-all: return index.html for non-API, non-static paths to support client-side routing
@app.middleware("http")
async def spa_redirect_middleware(request: Request, call_next):
    # Let /api/* and /uploads/* and any mounted static files pass through
    path = request.url.path
    if path.startswith("/api") or path.startswith("/uploads"):
        return await call_next(request)

    # If frontend is mounted, and the requested path corresponds to a file, let StaticFiles handle it.
    if INDEX_FILE is None:
        # no frontend build present: proceed normally
        return await call_next(request)

    # If the path looks like it requests a file (has an extension), try to serve it or 404.
    if Path(path).suffix:
        target = FRONTEND_DIR.joinpath(path.lstrip("/"))
        if target.exists():
            return FileResponse(str(target))
        # let the next handlers (which may be 404) run
        return await call_next(request)

    # Otherwise return index.html so the SPA can handle the client route
    return FileResponse(str(INDEX_FILE))