from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

# Create engine lazily and tolerate missing DB drivers during import (useful for tests)
engine = None
try:
    if DATABASE_URL:
        # guard connect_args for different drivers
        connect_args = {}
        if DATABASE_URL.startswith("mysql"):
            connect_args = {"connect_timeout": 10}

        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=1800,
            future=True,
            connect_args=connect_args,
        )
        # quick test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
except Exception as exc:
    print("Warning: database engine creation failed:", exc)
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
