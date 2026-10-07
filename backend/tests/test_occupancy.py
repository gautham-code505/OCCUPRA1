import pytest


def test_get_all_occupancies(client):
    response = client.get("/api/occupancy")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "resource_id" in first
    assert "current_occupancy" in first
    assert "occupancy_percentage" in first
    assert "entry_count" in first
    assert "exit_count" in first
    assert "available_capacity" in first


def test_get_single_occupancy(client):
    response = client.get("/api/occupancy/central_library")
    assert response.status_code == 200
    data = response.json()
    assert data["resource_id"] == "central_library"
    assert data["capacity"] >= data["current_occupancy"]


def test_campus_summary(client):
    response = client.get("/api/campus/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_resources" in data
    assert "total_campus_capacity" in data
    assert "total_current_occupancy" in data
    assert "overall_occupancy_percentage" in data
    assert "quiet_resources_count" in data
    assert "moderate_resources_count" in data
    assert "crowded_resources_count" in data
    assert data["total_resources"] > 0
    assert data["total_campus_capacity"] >= data["total_current_occupancy"]


def test_heatmap_data(client):
    response = client.get("/api/heatmap")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    item = data[0]
    assert "latitude" in item
    assert "longitude" in item
    assert "occupancy_percentage" in item
    assert "crowd_status" in item
    assert item["crowd_status"] in ["LOW", "MEDIUM", "HIGH"]
