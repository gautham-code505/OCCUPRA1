import sys
import os
import pytest
from fastapi.testclient import TestClient

# Ensure backend directory is in path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.main import app
from app.core.security import create_access_token


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def admin_headers():
    token = create_access_token({
        "sub": "admin_test",
        "user_id": "admin_test",
        "email": "admin@campuspulse.ai",
        "role": "ADMIN",
        "name": "Admin Tester"
    })
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def student_headers():
    token = create_access_token({
        "sub": "student_test",
        "user_id": "student_test",
        "email": "student@campuspulse.ai",
        "role": "STUDENT",
        "name": "Student Tester"
    })
    return {"Authorization": f"Bearer {token}"}
