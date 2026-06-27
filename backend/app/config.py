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
JWT_ALGORITHM = "HS256"

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

UPLOAD_DIR = BASE_DIR / "uploads"
