import pytest


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "CampusAI Backend"


def test_firebase_connection_endpoint(client):
    response = client.get("/api/test/firebase")
    assert response.status_code == 200
    data = response.json()
    assert "connected" in data
    # Verified against live Firebase or reports status
    assert "collections_configured" in data or "message" in data
