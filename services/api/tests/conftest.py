from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.dependencies import limiter
from app.enums import AccountType, LocationKind, Role
from app.main import app
from app.models import IncidentCategory, Location, User
from app.security import hash_password


@pytest.fixture()
def db() -> Generator[Session, None, None]:
    limiter.hits.clear()
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    local_session = sessionmaker(bind=engine, expire_on_commit=False)
    with local_session() as session:
        users = [
            User(
                email="admin@example.com",
                full_name="Admin",
                role=Role.ADMIN,
                account_type=AccountType.ADMIN,
                email_verified=True,
                password_hash=hash_password("TestPassword@Admin1"),
            ),
            User(
                email="dispatcher@example.com",
                full_name="Điều phối",
                role=Role.DISPATCHER,
                account_type=AccountType.DISPATCHER,
                email_verified=True,
                password_hash=hash_password("TestPassword@Dispatch1"),
            ),
            User(
                email="staff@example.com",
                full_name="Nhân viên",
                role=Role.STAFF,
                account_type=AccountType.STAFF,
                email_verified=True,
                password_hash=hash_password("TestPassword@Staff1"),
            ),
            User(
                email="student@example.com",
                full_name="Sinh viên",
                role=Role.STUDENT,
                account_type=AccountType.STUDENT,
                email_verified=True,
                password_hash=hash_password("TestPassword@Student1"),
            ),
            User(
                email="other@example.com",
                full_name="Sinh viên khác",
                role=Role.STUDENT,
                account_type=AccountType.LECTURER,
                email_verified=True,
                password_hash=hash_password("TestPassword@Student2"),
            ),
        ]
        session.add_all(users)
        category = IncidentCategory(name="Thiết bị", sla_minutes=120)
        area = Location(name="Khu chính", code="MAIN", kind=LocationKind.AREA)
        session.add_all([category, area])
        session.flush()
        building = Location(name="Tòa A", code="A", kind=LocationKind.BUILDING, parent_id=area.id)
        session.add(building)
        session.flush()
        floor = Location(name="Tầng 1", code="A1", kind=LocationKind.FLOOR, parent_id=building.id)
        session.add(floor)
        session.flush()
        room = Location(
            name="Phòng A101",
            code="A101",
            kind=LocationKind.ROOM,
            parent_id=floor.id,
            latitude=21.58662,
            longitude=105.80570,
        )
        session.add(room)
        session.commit()

        def override_db():
            yield session

        app.dependency_overrides[get_db] = override_db
        yield session
        app.dependency_overrides.clear()
    Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db: Session) -> TestClient:
    return TestClient(app)


def login(client: TestClient, email: str, password: str) -> dict:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.fixture()
def tokens(client: TestClient) -> dict[str, dict]:
    return {
        "admin": login(client, "admin@example.com", "TestPassword@Admin1"),
        "dispatcher": login(client, "dispatcher@example.com", "TestPassword@Dispatch1"),
        "staff": login(client, "staff@example.com", "TestPassword@Staff1"),
        "student": login(client, "student@example.com", "TestPassword@Student1"),
        "other": login(client, "other@example.com", "TestPassword@Student2"),
    }


def auth(token: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {token['access_token']}"}
