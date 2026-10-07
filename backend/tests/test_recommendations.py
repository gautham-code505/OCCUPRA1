import pytest


def test_recommendations_default(client):
    response = client.get("/api/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert "total_matches" in data
    assert "recommendations" in data
    recs = data["recommendations"]
    assert len(recs) > 0

    first = recs[0]
    assert "resource_id" in first
    assert "name" in first
    assert "match_score" in first
    assert "current_occupancy" in first
    assert "available_seats" in first
    assert "distance_meters" in first
    assert "predicted_occupancy_1hr" in first

    # Ensure ranked in descending order of match_score
    scores = [r["match_score"] for r in recs]
    assert scores == sorted(scores, reverse=True)


def test_recommendations_with_filter(client):
    response = client.get("/api/recommendations?resource_type=study_room&min_available_seats=2")
    assert response.status_code == 200
    data = response.json()
    for rec in data["recommendations"]:
        assert rec["type"] == "study_room"
        assert rec["available_seats"] >= 2
