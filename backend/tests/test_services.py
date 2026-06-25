import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app import models, services
from datetime import datetime, timedelta


def make_session():
    engine = create_engine("sqlite:///:memory:", echo=False, future=True)
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine)()


def create_person(session, full_name, assign_number, faculty_name="", active=True):
    person = models.Person(full_name=full_name, assign_number=assign_number, faculty_name=faculty_name, active=active)
    session.add(person)
    session.commit()
    session.refresh(person)
    return person


def test_generate_distribution_avoids_same_task_two_days_in_row():
    session = make_session()
    persons = [create_person(session, f"Personne {i}", f"A{i}") for i in range(1, 5)]

    # First distribution should assign tasks
    dist1 = services.generate_distribution(session, date=datetime(2026, 6, 21, 4, 0))
    assert dist1 is not None
    assignments1 = dist1['assignments'] if isinstance(dist1, dict) else json.loads(dist1.assignments)
    assert len(assignments1) == len(services.TASKS)

    # Second distribution should avoid assigning the same task to the same person
    dist2 = services.generate_distribution(session, date=datetime(2026, 6, 22, 4, 0))
    assert dist2 is not None
    assignments2 = dist2['assignments'] if isinstance(dist2, dict) else json.loads(dist2.assignments)
    assert len(assignments2) == len(services.TASKS)

    for pid_str, task in assignments2.items():
        pid = int(pid_str)
        if pid in assignments1:
            assert assignments1[pid] != task, "Person has same task two days in a row"


def test_generate_distribution_uses_only_active_persons():
    session = make_session()
    create_person(session, "Actif 1", "A1", active=True)
    create_person(session, "Actif 2", "A2", active=True)
    create_person(session, "Inactif", "A3", active=False)

    dist = services.generate_distribution(session)
    assert dist is not None
    assignments = dist['assignments'] if isinstance(dist, dict) else json.loads(dist.assignments)
    assert all(int(pid) != 3 for pid in assignments.keys())


def test_generate_distribution_assigns_unique_tasks():
    session = make_session()
    for i in range(1, 5):
        create_person(session, f"Personne {i}", f"A{i}")

    dist = services.generate_distribution(session)
    assignments = dist['assignments'] if isinstance(dist, dict) else json.loads(dist.assignments)
    assert len(assignments) == len(set(assignments.values()))
    assert set(assignments.values()) == set(services.TASKS)


def test_generate_distribution_uses_priority_when_more_than_four_persons():
    session = make_session()
    for i in range(1, 9):
        create_person(session, f"Personne {i}", f"A{i}")

    dist = services.generate_distribution(session)
    assignments = dist['assignments'] if isinstance(dist, dict) else json.loads(dist.assignments)
    counts = {t: 0 for t in services.TASKS}
    for task in assignments.values():
        counts[task] += 1

    assert counts == {"Toilette": 2, "Cuisinage": 2, "Balayage": 2, "Vaisselle": 2}


def test_generate_distribution_updates_person_last_task():
    session = make_session()
    persons = [create_person(session, f"Personne {i}", f"A{i}") for i in range(1, 5)]

    date1 = datetime(2026, 6, 21, 4, 0)
    dist1 = services.generate_distribution(session, date=date1)
    assert dist1 is not None
    assignments1 = dist1['assignments'] if isinstance(dist1, dict) else json.loads(dist1.assignments)

    for p in persons:
        refreshed = session.get(models.Person, p.id)
        assert refreshed.last_task == assignments1[str(p.id)]
        assert refreshed.last_task_date == date1

    date2 = datetime(2026, 6, 22, 4, 0)
    dist2 = services.generate_distribution(session, date=date2)
    assert dist2 is not None
    assignments2 = dist2['assignments'] if isinstance(dist2, dict) else json.loads(dist2.assignments)

    for pid_str, task in assignments2.items():
        assert assignments1[pid_str] != task


def test_generate_distribution_follows_priority_for_more_than_four_persons():
    session = make_session()
    for i in range(1, 6):
        create_person(session, f"Personne {i}", f"A{i}")

    dist = services.generate_distribution(session)
    assignments = dist['assignments'] if isinstance(dist, dict) else json.loads(dist.assignments)
    counts = {t: 0 for t in services.TASKS}
    for task in assignments.values():
        counts[task] += 1

    assert counts == {"Toilette": 2, "Cuisinage": 1, "Balayage": 1, "Vaisselle": 1}


def test_generate_distribution_priority_counts_follow_priority_rules():
    expected_counts = {
        1: {"Toilette": 1, "Cuisinage": 0, "Balayage": 0, "Vaisselle": 0},
        2: {"Toilette": 1, "Cuisinage": 1, "Balayage": 0, "Vaisselle": 0},
        3: {"Toilette": 1, "Cuisinage": 1, "Balayage": 1, "Vaisselle": 0},
        4: {"Toilette": 1, "Cuisinage": 1, "Balayage": 1, "Vaisselle": 1},
        5: {"Toilette": 2, "Cuisinage": 1, "Balayage": 1, "Vaisselle": 1},
        6: {"Toilette": 2, "Cuisinage": 2, "Balayage": 1, "Vaisselle": 1},
        7: {"Toilette": 2, "Cuisinage": 2, "Balayage": 2, "Vaisselle": 1},
        8: {"Toilette": 2, "Cuisinage": 2, "Balayage": 2, "Vaisselle": 2},
        9: {"Toilette": 3, "Cuisinage": 2, "Balayage": 2, "Vaisselle": 2},
        10: {"Toilette": 3, "Cuisinage": 3, "Balayage": 2, "Vaisselle": 2},
        11: {"Toilette": 3, "Cuisinage": 3, "Balayage": 3, "Vaisselle": 2},
        12: {"Toilette": 3, "Cuisinage": 3, "Balayage": 3, "Vaisselle": 3},
        13: {"Toilette": 4, "Cuisinage": 3, "Balayage": 3, "Vaisselle": 3},
    }

    for n, expected in expected_counts.items():
        session = make_session()
        for i in range(1, n + 1):
            create_person(session, f"Personne {i}", f"A{i}")

        dist = services.generate_distribution(session)
        assert dist is not None
        assignments = dist["assignments"] if isinstance(dist, dict) else json.loads(dist.assignments)
        counts = {t: 0 for t in services.TASKS}
        for task in assignments.values():
            counts[task] += 1

        assert counts == expected, f"Priority distribution failed for {n} personnes"


def test_preview_distribution_priority_counts():
    preview = services.preview_distribution(5)
    assert preview["counts"] == {"Toilette": 2, "Cuisinage": 1, "Balayage": 1, "Vaisselle": 1}
