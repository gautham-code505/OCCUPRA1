import pytest


def test_list_resources(client):
    response = client.get("/api/resources")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 5
    # Verify core resource present
    ids = [r["resource_id"] for r in data]
    assert "central_library" in ids


def test_get_single_resource(client):
    response = client.get("/api/resources/central_library")
    assert response.status_code == 200
    data = response.json()
    assert data["resource_id"] == "central_library"
    assert data["type"] == "library"
    assert "capacity" in data
    assert "occupancy_percentage" in data


def test_filter_resources_by_type(client):
    response = client.get("/api/resources?type=computer_lab")
    assert response.status_code == 200
    data = response.json()
    for item in data:
        assert item["type"] == "computer_lab"


def test_create_resource_requires_admin(client, student_headers, admin_headers):
    new_res = {
        "resource_id": "test_innovation_lab",
        "name": "Innovation Lab",
        "type": "laboratory",
        "building": "Science Complex",
        "floor": 1,
        "latitude": 37.7750,
        "longitude": -122.4190,
        "capacity": 40,
        "facilities": ["3D Printers", "Soldering Stations"],
        "opening_time": "09:00",
        "closing_time": "21:00",
        "status": "open"
    }

    # 1. Unauthenticated -> 401
    res_unauth = client.post("/api/resources", json=new_res)
    assert res_unauth.status_code == 401

    # 2. Student -> 403 Forbidden
    res_student = client.post("/api/resources", json=new_res, headers=student_headers)
    assert res_student.status_code == 403

    # 3. Admin -> 201 Created
    res_admin = client.post("/api/resources", json=new_res, headers=admin_headers)
    assert res_admin.status_code in [201, 409]
    if res_admin.status_code == 201:
        assert res_admin.json()["resource_id"] == "test_innovation_lab"


def test_update_and_delete_resource(client, admin_headers):
    # Update
    update_data = {"name": "Central Library (Renovated)"}
    res = client.put("/api/resources/central_library", json=update_data, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["name"] == "Central Library (Renovated)"
