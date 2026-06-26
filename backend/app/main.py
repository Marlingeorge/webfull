from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import inspect, text
from .database import engine, Base
from . import routes
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .services import generate_distribution, get_admin_by_username, create_admin
from .database import SessionLocal
from .config import UPLOAD_DIR, ALLOWED_ORIGINS
from pathlib import Path
import os

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
    # Mount the built frontend at root. API routes (prefix /api) are included before,
    # so they take precedence. `html=True` helps serve index.html for directories.
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
    INDEX_FILE = FRONTEND_DIR / "index.html"
else:
    INDEX_FILE = None

# ------------------------------------------------------------------------


@app.on_event("startup")
async def startup_event():
    # create DB tables and ensure schema matches local models
    # Surround DB initialization with try/except so the app doesn't crash
    # on startup if the configured DB (e.g. MySQL) is unreachable.
    try:
        if engine is not None:
            Base.metadata.create_all(bind=engine)

            inspector = inspect(engine)
            if inspector.has_table("persons"):
                columns = [col["name"] for col in inspector.get_columns("persons")]
                with engine.connect() as conn:
                    if "last_task" not in columns:
                        conn.execute(text("ALTER TABLE persons ADD COLUMN last_task VARCHAR(50) NULL"))
                    if "last_task_date" not in columns:
                        conn.execute(text("ALTER TABLE persons ADD COLUMN last_task_date DATETIME NULL"))
                    if "active" not in columns:
                        conn.execute(text("ALTER TABLE persons ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1"))
                    if "faculty_name" not in columns:
                        conn.execute(text("ALTER TABLE persons ADD COLUMN faculty_name VARCHAR(200) NOT NULL DEFAULT ''"))
                    conn.commit()

                with engine.connect() as conn:
                    conn.execute(text("UPDATE persons SET active = 1 WHERE active IS NULL"))
                    conn.commit()
    except Exception as e:
        print("Warning: database initialization skipped due to error:", e)

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


app.include_router(routes.router, prefix="/api")

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