from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class PersonCreate(BaseModel):
    full_name: str = Field(..., max_length=200)
    assign_number: str = Field(..., max_length=50)
    faculty_name: str = Field(..., max_length=200)

class PersonOut(BaseModel):
    id: int
    full_name: str
    assign_number: str
    faculty_name: str
    photo_path: Optional[str]
    last_task: Optional[str] = None
    last_task_date: Optional[datetime] = None
    created_at: datetime
    active: bool

    class Config:
        orm_mode = True

class PersonUpdate(BaseModel):
    full_name: Optional[str] = None
    assign_number: Optional[str] = None
    faculty_name: Optional[str] = None
    active: Optional[bool] = None

    class Config:
        from_attributes = True

class PresenceUpdate(BaseModel):
    person_id: int
    present: bool

class DistributionOut(BaseModel):
    id: int
    date: datetime
    assignments: Dict[str, Any]

    class Config:
        orm_mode = True

class PresenceOut(BaseModel):
    id: int
    person_id: int
    date: datetime
    present: bool

    class Config:
        orm_mode = True


class AdminLogin(BaseModel):
    username: str
    password: str
