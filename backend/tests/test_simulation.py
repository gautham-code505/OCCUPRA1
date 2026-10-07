import pytest


def test_simulation_status(client):
    response = client.get("/api/simulation/status")
    assert response.status_code == 200
    data = response.json()
    assert "is_running" in data
    assert "active_scenario" in data
    assert "interval_seconds" in data
    assert "total_ticks" in data


def test_simulation_scenario_switch(client, admin_headers):
    # Switch scenario to exam_day
    res = client.post(
        "/api/simulation/scenario",
        json={"scenario": "exam_day"},
        headers=admin_headers
    )
    assert res.status_code == 200
    assert res.json()["status"]["active_scenario"] == "exam_day"

    # Switch to lunch_peak
    res2 = client.post(
        "/api/simulation/scenario",
        json={"scenario": "lunch_peak"},
        headers=admin_headers
    )
    assert res2.status_code == 200
    assert res2.json()["status"]["active_scenario"] == "lunch_peak"


def test_simulation_speed_adjustment(client, admin_headers):
    res = client.post(
        "/api/simulation/speed",
        json={"interval_seconds": 5.0},
        headers=admin_headers
    )
    assert res.status_code == 200
    assert res.json()["status"]["interval_seconds"] == 5.0


def test_simulation_controls_require_admin(client, student_headers):
    res = client.post("/api/simulation/start", headers=student_headers)
    assert res.status_code == 403

    res2 = client.post("/api/simulation/stop", headers=student_headers)
    assert res2.status_code == 403
