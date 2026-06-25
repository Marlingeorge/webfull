import sys, os
sys.path.insert(0, os.getcwd())
from backend.app.database import SessionLocal
from backend.app import models

if __name__ == '__main__':
    db = SessionLocal()
    try:
        people = db.query(models.Person).order_by(models.Person.id).all()
        print('COUNT', len(people))
        for p in people:
            print(p.id, p.full_name, p.assign_number, p.active)
    except Exception as e:
        print('ERROR', e)
    finally:
        db.close()
