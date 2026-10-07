import pytest


def test_daily_analytics(client):
    res = client.get("/api/analytics/daily?resource_id=central_library")
    assert res.status_code == 200
    data = res.json()
    assert "hourly_data" in data
    assert len(data["hourly_data"]) == 24


def test_weekly_analytics(client):
    res = client.get("/api/analytics/weekly?resource_id=central_library")
    assert res.status_code == 200
    data = res.json()
    assert "weekly_trends" in data
    assert len(data["weekly_trends"]) == 7


def test_admin_insights(client, admin_headers):
    res = client.get("/api/admin/insights", headers=admin_headers)
    assert res.status_code == 200
    insights = res.json()
    assert isinstance(insights, list)


def test_admin_utilization(client, admin_headers):
    res = client.get("/api/admin/utilization", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
