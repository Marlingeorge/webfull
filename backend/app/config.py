from os import getenv
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = getenv("DATABASE_URL")
if DATABASE_URL:
    DATABASE_URL = DATABASE_URL.strip()
    if DATABASE_URL.startswith("mysql://"):
        DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)
else:
    db_host = getenv("DB_HOST", "localhost")
    db_port = getenv("DB_PORT", "3306")
    db_user = getenv("DB_USER", "root")
    db_password = quote_plus(getenv("DB_PASSWORD", ""))
    db_name = getenv("DB_NAME", "dormitory")
    DATABASE_URL = (
        f"mysql+pymysql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"
    )

JWT_SECRET = getenv("JWT_SECRET") or getenv("SECRET_KEY")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable must be set")
JWT_ALGORITHM = "HS256"

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
]

origins_value = getenv("ALLOWED_ORIGINS")
if origins_value:
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in origins_value.split(",")
        if origin.strip()
    ]
else:
    ALLOWED_ORIGINS = DEFAULT_ALLOWED_ORIGINS

UPLOAD_DIR = BASE_DIR / "uploads"
