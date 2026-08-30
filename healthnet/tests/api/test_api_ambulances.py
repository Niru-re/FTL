import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_get_ambulances_fleet(admin_headers):
    res = requests.get(f"{BASE_URL}/api/ambulances", headers=admin_headers)
    assert res.status_code == 200
    fleet = res.json()
    assert len(fleet) >= 10
    assert "code" in fleet[0]
    assert "status" in fleet[0]
    assert "lat" in fleet[0]
    assert "lng" in fleet[0]

def test_step_ambulance_simulation(admin_headers):
    res = requests.post(f"{BASE_URL}/api/ambulances/1/step-simulation", headers=admin_headers)
    assert res.status_code == 200
    assert "lat" in res.json()
    assert "eta_minutes" in res.json()
