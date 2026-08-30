import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_simulation_status(admin_headers):
    res = requests.get(f"{BASE_URL}/api/simulation/status", headers=admin_headers)
    assert res.status_code == 200
    assert "is_running" in res.json()

def test_simulation_scenario_triggers(admin_headers):
    # Test triggering ICU_SURGE scenario
    res = requests.post(f"{BASE_URL}/api/simulation/scenario", json={"scenario": "ICU_SURGE"}, headers=admin_headers)
    assert res.status_code == 200
    assert "message" in res.json()

    # Test triggering NORMAL_OPERATION scenario
    res = requests.post(f"{BASE_URL}/api/simulation/scenario", json={"scenario": "NORMAL_OPERATION"}, headers=admin_headers)
    assert res.status_code == 200

    # Reset
    res = requests.post(f"{BASE_URL}/api/simulation/reset", headers=admin_headers)
    assert res.status_code == 200
