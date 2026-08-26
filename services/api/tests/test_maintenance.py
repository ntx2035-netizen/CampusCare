from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.maintenance import clear_operational_data
from app.models import Incident, IncidentCategory, Location, RefreshToken, User
from tests.conftest import auth


def test_cleanup_keeps_only_selected_admin_and_baseline_data(client, db: Session, tokens: dict):
    category = db.scalar(select(IncidentCategory))
    room = db.scalar(select(Location).where(Location.code == "A101"))
    assert category is not None
    assert room is not None
    response = client.post(
        "/api/incidents",
        json={
            "title": "Dữ liệu cần dọn",
            "description": "Sự cố chỉ phục vụ kiểm tra quy trình dọn dữ liệu.",
            "category_id": str(category.id),
            "priority": "LOW",
            "location_id": str(room.id),
            "idempotency_key": "cleanup-test-key",
        },
        headers=auth(tokens["student"]),
    )
    assert response.status_code == 201

    summary = clear_operational_data(db, "admin@example.com")

    assert summary["incidents"] == 1
    assert db.scalar(select(func.count()).select_from(Incident)) == 0
    assert list(db.scalars(select(User.email))) == ["admin@example.com"]
    assert db.scalar(select(func.count()).select_from(IncidentCategory)) == 1
    assert db.scalar(select(func.count()).select_from(Location)) == 4
    assert db.scalar(select(func.count()).select_from(RefreshToken)) == 1
