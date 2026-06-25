from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from .config import DATABASE_URL

# Create engine lazily and tolerate missing DB drivers during import (useful for tests)
engine = None
try:
    if DATABASE_URL:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
except Exception:
    engine = None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
