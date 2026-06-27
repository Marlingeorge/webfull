import logging

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

logger = logging.getLogger(__name__)
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

# Create engine lazily and tolerate missing DB drivers during import (useful for tests)
engine = None
try:
    if DATABASE_URL:
        engine_url = DATABASE_URL.strip()
        url = make_url(engine_url)
        if url.drivername.startswith("mysql") and not url.drivername.startswith("mysql+pymysql"):
            url = url.set(drivername="mysql+pymysql")
            engine_url = str(url)

        logger.info(
            "Database connection config host=%s port=%s database=%s driver=%s",
            url.host or "localhost",
            url.port or 3306,
            url.database or "",
            url.drivername,
        )

        connect_args = {}
        if url.drivername.startswith("mysql"):
            connect_args = {"connect_timeout": 10}

        engine = create_engine(
            engine_url,
            pool_pre_ping=True,
            pool_recycle=1800,
            future=True,
            connect_args=connect_args,
        )
        # quick test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
except Exception as exc:
    logger.warning("Database engine creation failed: %s", exc)
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    if engine is None:
        raise RuntimeError(
            "Database engine is not configured. Check DATABASE_URL and ensure the MySQL driver is installed."
        )
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
