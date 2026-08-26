from fastapi.testclient import TestClient

from tests.conftest import auth, login


def test_login_and_profile(client: TestClient):
    token = login(client, "student@example.com", "TestPassword@Student1")
    response = client.get("/api/auth/me", headers=auth(token))
    assert response.status_code == 200
    assert response.json()["role"] == "STUDENT"


def test_login_rejects_bad_password(client: TestClient):
    response = client.post(
        "/api/auth/login", json={"email": "student@example.com", "password": "WrongPassword1"}
    )
    assert response.status_code == 401


def request_and_verify(client: TestClient, monkeypatch, payload: dict):
    sent: dict[str, str] = {}
    monkeypatch.setattr(
        "app.api.auth.send_registration_otp",
        lambda email, code: sent.update(email=email, code=code),
    )
    response = client.post(
        "/api/auth/register/request-otp",
        json=payload,
    )
    assert response.status_code == 200, response.text
    return client.post(
        "/api/auth/register/verify-otp",
        json={"email": payload["email"], "code": sent["code"]},
    )


def test_student_registers_with_school_email_and_is_logged_in(client: TestClient, monkeypatch):
    response = request_and_verify(
        client,
        monkeypatch,
        {
            "email": "dtc225201510@ictu.edu.vn",
            "full_name": "Sinh viên ICTU",
            "password": "MatKhauAnToan@2026",
            "account_type": "STUDENT",
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "ACTIVE"
    assert body["session"]["user"]["role"] == "STUDENT"
    assert body["session"]["user"]["account_type"] == "STUDENT"
    assert body["session"]["access_token"]


def test_register_rejects_non_school_email_and_duplicate(client: TestClient, monkeypatch):
    outside = client.post(
        "/api/auth/register/request-otp",
        json={
            "email": "student@gmail.com",
            "full_name": "Sinh viên",
            "password": "MatKhauAnToan@2026",
            "account_type": "STUDENT",
        },
    )
    assert outside.status_code == 400

    payload = {
        "email": "duplicate@ictu.edu.vn",
        "full_name": "Sinh viên",
        "password": "MatKhauAnToan@2026",
        "account_type": "STUDENT",
    }
    assert request_and_verify(client, monkeypatch, payload).status_code == 201
    assert client.post("/api/auth/register/request-otp", json=payload).status_code == 409


def test_register_rejects_weak_password(client: TestClient):
    response = client.post(
        "/api/auth/register/request-otp",
        json={
            "email": "weak@ictu.edu.vn",
            "full_name": "Sinh viên",
            "password": "onlylowercase",
            "account_type": "STUDENT",
        },
    )
    assert response.status_code == 422


def test_dispatcher_requires_gmail_otp_and_admin_approval(
    client: TestClient, monkeypatch, tokens: dict
):
    payload = {
        "email": "new.dispatcher@gmail.com",
        "full_name": "Điều phối mới",
        "password": "MatKhauAnToan@2026",
        "account_type": "DISPATCHER",
    }
    response = request_and_verify(client, monkeypatch, payload)
    assert response.status_code == 201
    assert response.json()["status"] == "PENDING_APPROVAL"
    assert response.json()["session"] is None
    assert (
        client.post(
            "/api/auth/login", json={"email": payload["email"], "password": payload["password"]}
        ).status_code
        == 403
    )

    users = client.get("/api/users", headers=auth(tokens["admin"])).json()
    created = next(item for item in users if item["email"] == payload["email"])
    approved = client.patch(
        f"/api/users/{created['id']}",
        json={"is_active": True},
        headers=auth(tokens["admin"]),
    )
    assert approved.status_code == 200
    assert approved.json()["approved_at"] is not None
    assert (
        client.post(
            "/api/auth/login", json={"email": payload["email"], "password": payload["password"]}
        ).status_code
        == 200
    )


def test_staff_requires_gmail_otp_and_admin_approval(client: TestClient, monkeypatch, tokens: dict):
    payload = {
        "email": "new.technician@gmail.com",
        "full_name": "Kỹ thuật viên mới",
        "password": "MatKhauAnToan@2026",
        "account_type": "STAFF",
    }
    response = request_and_verify(client, monkeypatch, payload)
    assert response.status_code == 201
    assert response.json()["status"] == "PENDING_APPROVAL"
    users = client.get("/api/users", headers=auth(tokens["admin"])).json()
    created = next(item for item in users if item["email"] == payload["email"])
    approved = client.patch(
        f"/api/users/{created['id']}",
        json={"is_active": True},
        headers=auth(tokens["admin"]),
    )
    assert approved.status_code == 200
    assert approved.json()["role"] == "STAFF"
    assert approved.json()["approved_at"] is not None


def test_public_registration_cannot_create_admin(client: TestClient):
    response = client.post(
        "/api/auth/register/request-otp",
        json={
            "email": "second.admin@gmail.com",
            "full_name": "Quản trị thứ hai",
            "password": "MatKhauAnToan@2026",
            "account_type": "ADMIN",
        },
    )
    assert response.status_code == 403


def test_existing_admin_cannot_create_second_admin(client: TestClient, tokens: dict):
    response = client.post(
        "/api/users",
        json={
            "email": "second.admin@gmail.com",
            "full_name": "Quản trị thứ hai",
            "password": "MatKhauAnToan@2026",
            "role": "ADMIN",
            "account_type": "ADMIN",
        },
        headers=auth(tokens["admin"]),
    )
    assert response.status_code == 403


def test_refresh_rotates_and_revokes_old_token(client: TestClient):
    original = login(client, "student@example.com", "TestPassword@Student1")
    response = client.post("/api/auth/refresh", json={"refresh_token": original["refresh_token"]})
    assert response.status_code == 200
    rotated = response.json()
    assert rotated["access_token"] != original["access_token"]
    replay = client.post("/api/auth/refresh", json={"refresh_token": original["refresh_token"]})
    assert replay.status_code == 401


def test_backend_rbac_blocks_student_user_management(client: TestClient, tokens: dict):
    response = client.get("/api/users", headers=auth(tokens["student"]))
    assert response.status_code == 403
    allowed = client.get("/api/users?role=STAFF", headers=auth(tokens["dispatcher"]))
    assert allowed.status_code == 200
    assert len(allowed.json()) == 1
    forbidden = client.get("/api/users?role=ADMIN", headers=auth(tokens["dispatcher"]))
    assert forbidden.status_code == 403
