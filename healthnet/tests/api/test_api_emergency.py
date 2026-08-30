import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_emergency_intake_and_routing_flow(admin_headers):
    # 1. Create emergency case
    payload = {
        "patient_name": "QA Emergency Intake Test Patient",
        "patient_age": 54,
        "patient_gender": "Male",
        "emergency_type": "CARDIAC",
        "priority": "CRITICAL",
        "condition_summary": "Acute substernal chest pressure, diaphoresis",
        "required_department": "ICU",
        "required_resources": ["ICU bed", "Ventilator", "Cardiologist"],
        "vitals_heart_rate": 120,
        "vitals_systolic_bp": 90,
        "vitals_diastolic_bp": 60,
        "vitals_spo2": 91.0,
        "vitals_respiratory_rate": 24,
        "vitals_temperature": 37.2,
        "pickup_address": "Broadway & 42nd St",
        "pickup_lat": 40.7128,
        "pickup_lng": -74.0060
    }
    res = requests.post(f"{BASE_URL}/api/emergency", json=payload, headers=admin_headers)
    assert res.status_code == 200
    case_data = res.json()
    case_id = case_data["id"]
    assert case_id is not None

    # 2. Get suitability rankings for case
    res = requests.get(f"{BASE_URL}/api/emergency/{case_id}/matches", headers=admin_headers)
    assert res.status_code == 200
    rankings = res.json()
    assert len(rankings) > 0
    top_hospital = rankings[0]
    assert "suitability_score" in top_hospital
    assert "eta_minutes" in top_hospital

    # 3. Clean up / reset simulation state
    requests.post(f"{BASE_URL}/api/simulation/reset", headers=admin_headers)
