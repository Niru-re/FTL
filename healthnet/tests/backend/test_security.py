import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_invalid_jwt_token_rejection():
    # Tampered token
    bad_headers = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.signature"}
    res = requests.get(f"{BASE_URL}/api/network/health", headers=bad_headers)
    assert res.status_code in [401, 403]

def test_sql_injection_resilience():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo' OR '1'='1", "password": "password"})
    assert res.status_code == 401

def test_xss_input_resilience():
    # Attempt logging vitals or note with script tag
    r_nurse = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nurse@healthnet.demo", "password": "nurse123"})
    assert r_nurse.status_code == 200
    headers = {"Authorization": f"Bearer {r_nurse.json()['access_token']}"}

    # Creating note with HTML script
    payload = {
        "content": "<script>alert('xss')</script> Safe patient checkup note",
        "note_type": "PROGRESS"
    }
    res = requests.post(f"{BASE_URL}/api/nurse/patients/1/notes", json=payload, headers=headers)
    # Must succeed cleanly or store as string without breaking backend
    assert res.status_code in [200, 201]
