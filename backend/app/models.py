from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Person(Base):
    __tablename__ = "persons"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(200), nullable=False)
    assign_number = Column(String(50), unique=True, nullable=False)
    faculty_name = Column(String(200), nullable=False, default="")
    photo_path = Column(String(300), nullable=True)
    last_task = Column(String(50), nullable=True)
    last_task_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    active = Column("is_active", Boolean, nullable=False, default=True)

    presences = relationship("Presence", back_populates="person")

class Presence(Base):
    __tablename__ = "presences"
    id = Column(Integer, primary_key=True, index=True)
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    present = Column(Boolean, default=True)

    person = relationship("Person", back_populates="presences")

class Distribution(Base):
    __tablename__ = "distributions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.utcnow)
    assignments = Column(Text)  # JSON string of assignments

class History(Base):
    __tablename__ = "histories"
    id = Column(Integer, primary_key=True, index=True)
    distribution_id = Column(Integer, ForeignKey("distributions.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

class Administrator(Base):
    __tablename__ = "administrators"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(200), nullable=False)
