import pytest


def test_create_and_cancel_booking(client, student_headers):
    booking_payload = {
        "resource_id": "study_room_a",
        "start_time": "2026-10-07T14:00:00",
        "end_time": "2026-10-07T16:00:00",
        "number_of_seats": 2
    }

    # Create
    res = client.post("/api/bookings", json=booking_payload, headers=student_headers)
    assert res.status_code == 201
    created = res.json()
    assert created["resource_id"] == "study_room_a"
    assert created["number_of_seats"] == 2
    assert created["status"] == "confirmed"
    booking_id = created["booking_id"]

    # Retrieve
    get_res = client.get(f"/api/bookings/{booking_id}", headers=student_headers)
    assert get_res.status_code == 200

    # List
    list_res = client.get("/api/bookings", headers=student_headers)
    assert list_res.status_code == 200
    assert any(b["booking_id"] == booking_id for b in list_res.json())

    # Cancel
    cancel_res = client.delete(f"/api/bookings/{booking_id}", headers=student_headers)
    assert cancel_res.status_code == 200


def test_booking_invalid_time(client, student_headers):
    # End time before start time
    invalid_payload = {
        "resource_id": "study_room_a",
        "start_time": "2026-10-07T16:00:00",
        "end_time": "2026-10-07T14:00:00",
        "number_of_seats": 1
    }
    res = client.post("/api/bookings", json=invalid_payload, headers=student_headers)
    assert res.status_code == 400


def test_booking_exceeds_capacity(client, student_headers):
    # Requesting 999 seats in a 20-seat room
    excess_payload = {
        "resource_id": "study_room_a",
        "start_time": "2026-10-07T10:00:00",
        "end_time": "2026-10-07T11:00:00",
        "number_of_seats": 999
    }
    res = client.post("/api/bookings", json=excess_payload, headers=student_headers)
    assert res.status_code in [400, 409]
