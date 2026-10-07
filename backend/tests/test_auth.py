import pytest


def test_login_default_admin(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@campuspulse.ai",
        "password": "AdminPass123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"


def test_login_default_student(client):
    res = client.post("/api/auth/login", json={
        "email": "student@campuspulse.ai",
        "password": "StudentPass123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "STUDENT"


def test_register_new_student(client):
    res = client.post("/api/auth/register", json={
        "email": "freshman_alex@campuspulse.ai",
        "password": "MySecretPass2026!",
        "name": "Alex Smith",
        "role": "STUDENT"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["email"] == "freshman_alex@campuspulse.ai"
    assert data["role"] == "STUDENT"


def test_get_me(client, student_headers):
    res = client.get("/api/auth/me", headers=student_headers)
    assert res.status_code == 200
    assert res.json()["role"] == "STUDENT"


def test_invalid_login(client):
    res = client.post("/api/auth/login", json={
        "email": "admin@campuspulse.ai",
        "password": "WrongPassword!"
    })
    assert res.status_code == 401
