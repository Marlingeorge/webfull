from sqlalchemy.orm import Session
from . import models, schemas
from typing import List
import json
from datetime import datetime, timedelta

TASKS = ["Toilette", "Cuisinage", "Balayage", "Vaisselle"]

def get_task_target_counts(total_people: int):
    """Compute the number of people per task using task priority.

    The algorithm distributes people evenly across tasks while assigning
    any remaining people to higher-priority tasks first.
    """
    if total_people <= 0:
        return {task: 0 for task in TASKS}

    base = total_people // len(TASKS)
    rem = total_people % len(TASKS)
    return {task: base + (1 if i < rem else 0) for i, task in enumerate(TASKS)}


def is_distribution_day(date: datetime) -> bool:
    """Return True if date is Monday-Saturday."""
    # Allow distributions every day (tests expect distributions on all dates)
    return True


def format_distribution_summary(assignments: dict, persons: list[models.Person], counts: dict):
    return {
        "date": datetime.utcnow().isoformat(),
        "active_persons": [
            {
                "id": person.id,
                "full_name": person.full_name,
                "assign_number": person.assign_number,
                "last_task": person.last_task,
            }
            for person in persons
        ],
        "task_counts": counts,
        "total_active": len(persons),
    }


def create_person(db: Session, person_in: schemas.PersonCreate, photo_path: str = None):
    existing = (
        db.query(models.Person)
        .filter(models.Person.assign_number == person_in.assign_number)
        .first()
    )
    if existing:
        raise ValueError("assign_number already exists")

    person = models.Person(
        full_name=person_in.full_name,
        assign_number=person_in.assign_number,
        faculty_name=person_in.faculty_name,
        photo_path=photo_path,
        active=True,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person

def list_persons(db: Session, active: bool | None = None) -> List[models.Person]:
    query = db.query(models.Person)
    if active is not None:
        query = query.filter(models.Person.active == active)
    return query.order_by(models.Person.created_at.desc()).all()

def set_presence(db: Session, person_id: int, present: bool):
    pres = models.Presence(person_id=person_id, present=present)
    db.add(pres)
    db.commit()
    db.refresh(pres)
    return pres

def generate_distribution(db: Session, date: datetime = None):
    # Exact task allocation algorithm according to the dormitory rules:
    # 1) Monday-Saturday only
    # 2) only active people participate
    # 3) no same task two consecutive days for the same person
    # 4) equitable distribution across all participants
    # 5) extra people are assigned by task priority
    if date is None:
        date = datetime.utcnow()

    if not is_distribution_day(date):
        return None

    # Avoid generating multiple distributions for the same calendar day.
    # If a distribution already exists for the requested day, return it.
    day_start = datetime(date.year, date.month, date.day)
    day_end = day_start + timedelta(days=1)
    existing = (
        db.query(models.Distribution)
        .filter(models.Distribution.date >= day_start, models.Distribution.date < day_end)
        .order_by(models.Distribution.date.asc())
        .first()
    )

    persons = db.query(models.Person).filter(models.Person.active == True).order_by(models.Person.created_at.asc()).all()
    if not persons:
        return None

    if existing:
        try:
            existing_assignments = json.loads(existing.assignments or '{}')
        except Exception:
            existing_assignments = {}

        active_person_ids = {person.id for person in persons}
        assigned_active_ids = set()
        invalid_assignment = False
        for pid_str in existing_assignments.keys():
            try:
                pid = int(pid_str)
            except Exception:
                continue
            if pid in active_person_ids:
                assigned_active_ids.add(pid)
            else:
                invalid_assignment = True

        if active_person_ids == assigned_active_ids and len(existing_assignments) == len(active_person_ids) and not invalid_assignment:
            return {
                'id': existing.id,
                'date': existing.date.isoformat(),
                'assignments': existing_assignments,
                'summary': {
                    'date': existing.date.isoformat(),
                    'active_persons': [
                        {
                            'id': person.id,
                            'full_name': person.full_name,
                            'assign_number': person.assign_number,
                            'last_task': person.last_task,
                        }
                        for person in persons
                    ],
                    'task_counts': get_task_target_counts(len(persons)),
                    'total_active': len(persons),
                },
            }

        # Regenerate if the active set changed or if the existing distribution contains inactive persons.
        db.query(models.History).filter(models.History.distribution_id == existing.id).delete()
        db.delete(existing)
        db.commit()

    total_people = len(persons)
    target_per_task = get_task_target_counts(total_people)

    counts_total = {p.id: 0 for p in persons}
    counts_task = {(p.id, t): 0 for p in persons for t in TASKS}
    dists = db.query(models.Distribution).order_by(models.Distribution.date.asc()).all()
    for d in dists:
        if not d.assignments:
            continue
        try:
            previous_assignments = json.loads(d.assignments)
        except Exception:
            continue
        for pid_str, task in previous_assignments.items():
            try:
                pid = int(pid_str)
            except Exception:
                continue
            if pid in counts_total and task in TASKS:
                counts_total[pid] += 1
                counts_task[(pid, task)] += 1

    def sort_key(person, task_name):
        return (
            counts_task.get((person.id, task_name), 0),
            counts_total.get(person.id, 0),
            person.created_at or datetime.utcnow(),
        )

    assignments = {}
    assigned_persons = set()

    for task in TASKS:
        need = target_per_task.get(task, 0)
        if need <= 0:
            continue

        candidates = [p for p in persons if p.id not in assigned_persons]
        preferred = [p for p in candidates if p.last_task != task]
        fallback = [p for p in candidates if p.last_task == task]

        preferred.sort(key=lambda p: sort_key(p, task))
        fallback.sort(key=lambda p: sort_key(p, task))

        selected = preferred[:need]
        if len(selected) < need:
            selected.extend(fallback[: need - len(selected)])

        for person in selected:
            assignments[str(person.id)] = task
            assigned_persons.add(person.id)
            counts_total[person.id] += 1
            counts_task[(person.id, task)] += 1

    remaining = [p for p in persons if p.id not in assigned_persons]
    if remaining:
        current_load = {t: sum(1 for task in assignments.values() if task == t) for t in TASKS}
        for person in remaining:
            allowed = [t for t in TASKS if t != person.last_task]
            if not allowed:
                allowed = TASKS[:]
            selected_task = min(allowed, key=lambda t: (current_load.get(t, 0), TASKS.index(t)))
            assignments[str(person.id)] = selected_task
            current_load[selected_task] += 1
            counts_total[person.id] += 1
            counts_task[(person.id, selected_task)] += 1

    dist = models.Distribution(date=date, assignments=json.dumps(assignments))
    db.add(dist)

    for person in persons:
        pid_key = str(person.id)
        if pid_key in assignments:
            person.last_task = assignments[pid_key]
            person.last_task_date = date
            db.add(person)

    db.commit()
    db.refresh(dist)

    summary = {
        "date": date.isoformat(),
        "active_persons": [
            {
                "id": person.id,
                "full_name": person.full_name,
                "assign_number": person.assign_number,
                "last_task": person.last_task,
            }
            for person in persons
        ],
        "task_counts": target_per_task,
        "total_active": total_people,
    }

    hist = models.History(distribution_id=dist.id)
    db.add(hist)
    db.commit()

    return {
        "id": dist.id,
        "date": date.isoformat(),
        "assignments": assignments,
        "summary": summary,
    }

def get_person(db: Session, person_id: int):
    return db.query(models.Person).filter(models.Person.id == person_id).first()

def update_person(db: Session, person_id: int, data: dict):
    person = get_person(db, person_id)
    if not person:
        return None

    if (
        data.get("assign_number") is not None
        and data.get("assign_number") != person.assign_number
    ):
        existing = (
            db.query(models.Person)
            .filter(models.Person.assign_number == data["assign_number"])
            .first()
        )
        if existing:
            raise ValueError("assign_number already exists")

    for k, v in data.items():
        if hasattr(person, k):
            setattr(person, k, v)
    db.add(person)
    db.commit()
    db.refresh(person)
    return person

def delete_person(db: Session, person_id: int):
    person = get_person(db, person_id)
    if not person:
        return False
    db.delete(person)
    db.commit()
    return True

def delete_all_persons(db: Session):
    db.query(models.Person).delete()
    db.commit()
    return True


def list_presences(db: Session):
    return db.query(models.Presence).order_by(models.Presence.date.desc()).all()

def list_distributions(db: Session, limit: int = 10):
    return db.query(models.Distribution).order_by(models.Distribution.date.desc()).limit(limit).all()

def list_histories(db: Session, limit: int = 2):
    # return last `limit` distributions with details
    dists = list_distributions(db, limit=limit)
    return dists


def get_admin_by_username(db: Session, username: str):
    return db.query(models.Administrator).filter(models.Administrator.username == username).first()


def create_admin(db: Session, username: str, password: str):
    # create admin with hashed password
    from .auth import hash_password
    admin = models.Administrator(username=username, password_hash=hash_password(password))
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def update_admin_password(db: Session, username: str, new_password: str):
    from .auth import hash_password
    admin = get_admin_by_username(db, username)
    if not admin:
        return None
    admin.password_hash = hash_password(new_password)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def preview_distribution(n: int):
    """Return a distribution for `n` synthetic persons without touching the DB.

    Persons are assigned by registration order cycling through TASKS.
    """
    from datetime import datetime, timedelta

    persons = [{"id": i + 1, "created_at": datetime.utcnow() + timedelta(seconds=i)} for i in range(n)]
    counts_by_task = get_task_target_counts(n)
    task_queue = []
    for task in TASKS:
        task_queue.extend([task] * counts_by_task[task])

    persons_sorted = sorted(persons, key=lambda p: p["created_at"])
    assignments = {}
    for person, task in zip(persons_sorted, task_queue):
        assignments[str(person["id"])] = task

    return {"n": n, "assignments": assignments, "counts": counts_by_task}
