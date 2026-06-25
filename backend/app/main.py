from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from .database import engine, Base
from . import routes
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from .services import generate_distribution, get_admin_by_username, create_admin
from .database import SessionLocal
from .config import UPLOAD_DIR, ALLOWED_ORIGINS
import os

app = FastAPI(title="Distribution des Tâches du Dortoir")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


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