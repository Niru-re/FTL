import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture(scope="module")
def doctor_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "doctor@healthnet.demo", "password": "doctor123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_doctor_ai_risk_registry(doctor_headers):
    res = requests.get(f"{BASE_URL}/api/doctor/ai-risk", headers=doctor_headers)
    assert res.status_code == 200
    risk_list = res.json()
    assert len(risk_list) > 0
    assert "risk_score" in risk_list[0]
    assert "risk_level" in risk_list[0]
    assert "risk_velocity" in risk_list[0]

def test_admin_network_ai_overview(admin_headers):
    res = requests.get(f"{BASE_URL}/api/admin/ai/network", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    assert "clinical_status" in data
    assert "network_capacity" in data

def test_hospital_capacity_forecasts(admin_headers):
    res = requests.get(f"{BASE_URL}/api/admin/ai/forecast?hospital_id=1", headers=admin_headers)
    assert res.status_code == 200
    forecast = res.json()
    assert "current_metrics" in forecast
    assert "forecast_24h" in forecast
    assert "windows" in forecast
    assert "6h" in forecast["windows"]
    assert "12h" in forecast["windows"]
    assert "24h" in forecast["windows"]
    assert "48h" in forecast["windows"]
