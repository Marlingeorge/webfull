from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request, status
from sqlalchemy.orm import Session
from typing import Optional
from . import services, schemas
from .database import get_db
from .config import UPLOAD_DIR
import shutil
import os
import uuid

router = APIRouter()


@router.post("/persons", response_model=schemas.PersonOut)
def create_person_endpoint(
    full_name: str = Form(...),
    assign_number: str = Form(...),
    faculty_name: str = Form(...),
    photo: UploadFile = File(None),
    db: Session = Depends(get_db),
):
    photo_path = None
    if photo:
        filename = os.path.basename(photo.filename or "")
        extension = os.path.splitext(filename)[1].lower()
        if extension not in {".jpg", ".jpeg", ".png", ".gif"}:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type.")
        safe_name = f"{uuid.uuid4().hex}{extension}"
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        dest_path = UPLOAD_DIR / safe_name
        with dest_path.open("wb") as f:
            shutil.copyfileobj(photo.file, f)
        photo_path = f"/uploads/{safe_name}"
    person_in = schemas.PersonCreate(full_name=full_name, assign_number=assign_number, faculty_name=faculty_name)
    return services.create_person(db, person_in, photo_path=photo_path)

@router.get("/persons")
def list_persons_endpoint(active: Optional[bool] = None, db: Session = Depends(get_db)):
    # allow public listing of persons; optionally filter by active status
    return services.list_persons(db, active=active)


@router.delete("/persons")
def delete_all_persons(db: Session = Depends(get_db)):
    services.delete_all_persons(db)
    return {"ok": True}


@router.post("/presences")
def set_presence_endpoint(pres: schemas.PresenceUpdate, db: Session = Depends(get_db)):
    return services.set_presence(db, pres.person_id, pres.present)


@router.post("/generate")
def generate_endpoint(db: Session = Depends(get_db)):
    dist = services.generate_distribution(db)
    if not dist:
        raise HTTPException(status_code=400, detail="No active persons or invalid distribution day")
    return {
        "ok": True,
        "distribution": dist,
    }


@router.get("/generate-test")
def generate_test_endpoint(n: int = 4):
    """Return a preview distribution for `n` people without saving to DB."""
    return services.preview_distribution(n)


@router.get("/persons/{person_id}")
def get_person(person_id: int, db: Session = Depends(get_db)):
    p = services.get_person(db, person_id)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return p


@router.put("/persons/{person_id}")
async def update_person(person_id: int, request: Request, db: Session = Depends(get_db)):
    data = {}
    photo_path = None
    content_type = request.headers.get("content-type", "")

    if "multipart/form-data" in content_type:
        form = await request.form()
        full_name = form.get("full_name")
        assign_number = form.get("assign_number")
        faculty_name = form.get("faculty_name")
        active = form.get("active")
        photo = form.get("photo")

        if full_name is not None:
            data["full_name"] = str(full_name)
        if assign_number is not None:
            data["assign_number"] = str(assign_number)
        if faculty_name is not None:
            data["faculty_name"] = str(faculty_name)
        if active is not None:
            value = str(active).lower()
            if value in {"1", "true", "yes", "on"}:
                data["active"] = True
            elif value in {"0", "false", "no"}:
                data["active"] = False
        if isinstance(photo, UploadFile) and photo.filename:
            filename = os.path.basename(photo.filename or "")
            extension = os.path.splitext(filename)[1].lower()
            if extension not in {".jpg", ".jpeg", ".png", ".gif"}:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type.")
            safe_name = f"{uuid.uuid4().hex}{extension}"
            UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
            dest_path = UPLOAD_DIR / safe_name
            with dest_path.open("wb") as f:
                shutil.copyfileobj(photo.file, f)
            data["photo_path"] = f"/uploads/{safe_name}"
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}

        if body.get("full_name") is not None:
            data["full_name"] = body.get("full_name")
        if body.get("assign_number") is not None:
            data["assign_number"] = body.get("assign_number")
        if body.get("faculty_name") is not None:
            data["faculty_name"] = body.get("faculty_name")
        if body.get("active") is not None:
            data["active"] = body.get("active")

    p = services.update_person(db, person_id, data)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return p


@router.delete("/persons/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    ok = services.delete_person(db, person_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}


@router.get("/presences")
def list_presences(db: Session = Depends(get_db)):
    return services.list_presences(db)


@router.get("/distributions")
def list_distributions(db: Session = Depends(get_db)):
    d = services.list_distributions(db, limit=10)
    return d


@router.get("/histories")
def list_histories(db: Session = Depends(get_db)):
    h = services.list_histories(db, limit=2)
    return h



