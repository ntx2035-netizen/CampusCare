from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import IncidentCategory, Location, User
from tests.conftest import auth


def payload(db: Session, key: str = "offline-test-0001") -> dict:
    category = db.scalar(select(IncidentCategory))
    location = db.scalar(select(Location).where(Location.code == "A101"))
    assert category is not None, "Lỗi: Không tìm thấy category!"
    assert location is not None, "Lỗi: Không tìm thấy location!"

    return {
        "title": "Máy chiếu không hoạt động",
        "description": "Máy chiếu không thể bật dù đã kiểm tra nguồn điện.",
        "category_id": str(category.id),
        "priority": "HIGH",
        "location_id": str(location.id),
        "idempotency_key": key,
    }


def create_incident(
    client: TestClient, db: Session, tokens: dict, key: str = "offline-test-0001"
) -> dict:
    response = client.post("/api/incidents", json=payload(db, key), headers=auth(tokens["student"]))
    assert response.status_code == 201, response.text
    return response.json()


def test_create_incident_and_prevent_idor(client: TestClient, db: Session, tokens: dict):
    incident = create_incident(client, db, tokens)
    own = client.get(f"/api/incidents/{incident['id']}", headers=auth(tokens["student"]))
    assert own.status_code == 200
    hidden = client.get(f"/api/incidents/{incident['id']}", headers=auth(tokens["other"]))
    assert hidden.status_code == 404


def test_archived_reporter_remains_serializable(client: TestClient, db: Session, tokens: dict):
    incident = create_incident(client, db, tokens, "archived-reporter-key")
    reporter = db.scalar(select(User).where(User.email == "student@example.com"))
    assert reporter is not None
    reporter.email = f"archived.{reporter.id.hex}@archive.campuscare.vn"
    reporter.is_active = False
    db.commit()

    response = client.get(
        f"/api/incidents/{incident['id']}",
        headers=auth(tokens["admin"]),
    )
    assert response.status_code == 200, response.text
    assert response.json()["reporter"]["email"].endswith("@archive.campuscare.vn")


def test_offline_idempotency_returns_same_incident(client: TestClient, db: Session, tokens: dict):
    first = create_incident(client, db, tokens, "same-offline-key")
    second_response = client.post(
        "/api/incidents", json=payload(db, "same-offline-key"), headers=auth(tokens["student"])
    )
    assert second_response.status_code == 201
    assert second_response.json()["id"] == first["id"]


def test_create_rejects_partial_device_coordinates(client: TestClient, db: Session, tokens: dict):
    data = payload(db, "partial-location-key")
    data["latitude"] = 21.594
    response = client.post("/api/incidents", json=data, headers=auth(tokens["student"]))
    assert response.status_code == 422


def test_create_rejects_location_outside_ictu(client: TestClient, db: Session, tokens: dict):
    data = payload(db, "outside-campus-key")
    data["latitude"] = 10.7628
    data["longitude"] = 106.6825
    response = client.post("/api/incidents", json=data, headers=auth(tokens["student"]))
    assert response.status_code == 422
    assert "ngoài phạm vi" in response.json()["detail"]


def test_accept_assign_and_valid_staff_transitions(client: TestClient, db: Session, tokens: dict):
    incident = create_incident(client, db, tokens, "assign-flow-key")
    accepted = client.patch(
        f"/api/incidents/{incident['id']}/status",
        json={"status": "ACCEPTED", "note": "Đã xác minh thông tin"},
        headers=auth(tokens["dispatcher"]),
    )
    assert accepted.status_code == 200, accepted.text
    staff = db.scalar(select(User).where(User.email == "staff@example.com"))
    assert staff is not None, "Fixture kiểm thử thiếu tài khoản STAFF"
    assigned = client.post(
        f"/api/incidents/{incident['id']}/assign",
        json={"staff_id": str(staff.id), "note": "Ưu tiên xử lý trong buổi sáng"},
        headers=auth(tokens["dispatcher"]),
    )
    assert assigned.status_code == 200, assigned.text
    assert assigned.json()["status"] == "ASSIGNED"
    progressing = client.patch(
        f"/api/incidents/{incident['id']}/status",
        json={"status": "IN_PROGRESS", "note": "Đã đến phòng"},
        headers=auth(tokens["staff"]),
    )
    assert progressing.status_code == 200
    resolved = client.patch(
        f"/api/incidents/{incident['id']}/status",
        json={"status": "RESOLVED", "resolution": "Đã thay dây nguồn máy chiếu bị hỏng."},
        headers=auth(tokens["staff"]),
    )
    assert resolved.status_code == 200
    assert len(resolved.json()["histories"]) == 5


def test_invalid_transition_is_rejected(client: TestClient, db: Session, tokens: dict):
    incident = create_incident(client, db, tokens, "invalid-transition-key")
    response = client.patch(
        f"/api/incidents/{incident['id']}/status",
        json={"status": "RESOLVED", "resolution": "Cố gắng bỏ qua các bước xử lý."},
        headers=auth(tokens["dispatcher"]),
    )
    assert response.status_code == 409


def test_upload_rejects_wrong_file_type(client: TestClient, db: Session, tokens: dict):
    incident = create_incident(client, db, tokens, "upload-test-key")
    response = client.post(
        f"/api/incidents/{incident['id']}/images",
        data={"kind": "REPORT"},
        files={"file": ("payload.exe", b"not-an-image", "application/octet-stream")},
        headers=auth(tokens["student"]),
    )
    assert response.status_code == 415
