from app.enums import Role

from .conftest import auth

ICTU_LOCATION = {"latitude": 21.58662, "longitude": 105.80570, "accuracy": 15.5}


def test_every_role_can_update_own_location(client, tokens):
    for key, role in (
        ("student", Role.STUDENT),
        ("staff", Role.STAFF),
        ("dispatcher", Role.DISPATCHER),
        ("admin", Role.ADMIN),
    ):
        response = client.patch(
            "/api/users/me/location",
            headers=auth(tokens[key]),
            json=ICTU_LOCATION,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["role"] == role.value
        assert body["current_latitude"] == ICTU_LOCATION["latitude"]
        assert body["location_updated_at"] is not None


def test_only_dispatcher_and_admin_can_list_device_locations(client, tokens):
    client.patch(
        "/api/users/me/location", headers=auth(tokens["student"]), json=ICTU_LOCATION
    )
    for key in ("admin", "dispatcher"):
        response = client.get("/api/users/locations", headers=auth(tokens[key]))
        assert response.status_code == 200
        assert any(item["role"] == "STUDENT" for item in response.json())
    for key in ("student", "staff"):
        response = client.get("/api/users/locations", headers=auth(tokens[key]))
        assert response.status_code == 403


def test_device_location_must_be_inside_ictu_scope(client, tokens):
    response = client.patch(
        "/api/users/me/location",
        headers=auth(tokens["student"]),
        json={"latitude": 10.7769, "longitude": 106.7009},
    )
    assert response.status_code == 422
    assert "ngoài phạm vi" in response.json()["detail"]
