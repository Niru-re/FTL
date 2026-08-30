import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_get_network_health_score(admin_headers):
    res = requests.get(f"{BASE_URL}/api/network/health", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "network_health_score" in data
    assert 0 <= data["network_health_score"] <= 100
    assert data["status"] in ["STABLE", "WATCH", "PRESSURE", "CRITICAL"]

def test_global_network_search(admin_headers):
    res = requests.get(f"{BASE_URL}/api/network/search?q=Central", headers=admin_headers)
    assert res.status_code == 200
    results = res.json()
    assert "hospitals" in results
    assert "beds" in results
    assert "ambulances" in results
    assert "patients" in results

def test_get_audit_logs(admin_headers):
    res = requests.get(f"{BASE_URL}/api/audit-logs?limit=10", headers=admin_headers)
    assert res.status_code == 200
    logs = res.json()
    assert isinstance(logs, list)
