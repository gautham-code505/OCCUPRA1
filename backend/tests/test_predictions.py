import pytest


def test_campus_wide_predictions(client):
    response = client.get("/api/predictions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "resource_id" in first
    assert "current_occupancy" in first
    assert "predictions" in first
    preds = first["predictions"]
    assert "30_minutes" in preds
    assert "1_hour" in preds
    assert "2_hours" in preds
    assert "4_hours" in preds


def test_single_resource_prediction(client):
    response = client.get("/api/predictions/central_library")
    assert response.status_code == 200
    data = response.json()
    assert data["resource_id"] == "central_library"
    assert "predictions" in data
    assert "predicted_percentages" in data
    assert "predicted_crowd_levels" in data
    assert data["predictions"]["30_minutes"] <= data["capacity"]
    assert data["predictions"]["30_minutes"] >= 0
