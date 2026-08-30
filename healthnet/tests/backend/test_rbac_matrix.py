import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def tokens():
    # Admin
    r_admin = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    # Doctor
    r_doc = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "doctor@healthnet.demo", "password": "doctor123"})
    # Nurse
    r_nurse = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nurse@healthnet.demo", "password": "nurse123"})

    return {
        "admin": {"Authorization": f"Bearer {r_admin.json()['access_token']}"},
        "doctor": {"Authorization": f"Bearer {r_doc.json()['access_token']}"},
        "nurse": {"Authorization": f"Bearer {r_nurse.json()['access_token']}"}
    }

def test_admin_routes_rbac(tokens):
    # Admin allowed to access network health
    res = requests.get(f"{BASE_URL}/api/network/health", headers=tokens["admin"])
    assert res.status_code == 200

    # Nurse cannot create hospitals
    res = requests.post(f"{BASE_URL}/api/hospitals", json={"name": "Forbidden Hosp"}, headers=tokens["nurse"])
    assert res.status_code == 403

    # Doctor cannot create hospitals
    res = requests.post(f"{BASE_URL}/api/hospitals", json={"name": "Forbidden Hosp"}, headers=tokens["doctor"])
    assert res.status_code == 403

def test_clinical_routes_rbac(tokens):
    # Doctor allowed to access doctor dashboard
    res = requests.get(f"{BASE_URL}/api/doctor/dashboard", headers=tokens["doctor"])
    assert res.status_code == 200

    # Nurse blocked from doctor clinical discharge endpoint
    res = requests.post(f"{BASE_URL}/api/doctor/patients/1/discharge", json={"summary": "Discharged"}, headers=tokens["nurse"])
    assert res.status_code == 403

def test_nurse_routes_rbac(tokens):
    # Nurse allowed to access nurse dashboard
    res = requests.get(f"{BASE_URL}/api/nurse/dashboard", headers=tokens["nurse"])
    assert res.status_code == 200

def test_unauthenticated_request():
    # Request without token is rejected
    res = requests.get(f"{BASE_URL}/api/network/health")
    assert res.status_code in [401, 403]
