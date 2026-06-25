from os import getenv
from pathlib import Path

DATABASE_URL = getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:@localhost:3306/dormitory?charset=utf8mb4",
)

JWT_SECRET = getenv("JWT_SECRET") or getenv("SECRET_KEY")
JWT_ALGORITHM = "HS256"

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
