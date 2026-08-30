import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def nurse_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nurse@healthnet.demo", "password": "nurse123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

@pytest.fixture(scope="module")
def doctor_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "doctor@healthnet.demo", "password": "doctor123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_get_patients_list(nurse_headers):
    res = requests.get(f"{BASE_URL}/api/nurse/patients", headers=nurse_headers)
    assert res.status_code == 200
    pts = res.json()
    assert len(pts) > 0
    assert "mrn" in pts[0]
    assert "full_name" in pts[0]

def test_record_patient_vitals(nurse_headers):
    payload = {
        "heart_rate": 82,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "spo2": 98.5,
        "respiratory_rate": 16,
        "temperature": 37.0,
        "pain_score": 2,
        "consciousness": "ALERT"
    }
    res = requests.post(f"{BASE_URL}/api/nurse/patients/1/vitals", json=payload, headers=nurse_headers)
    assert res.status_code == 200
    assert res.json()["spo2"] == 98.5

def test_doctor_clinical_note_and_order(doctor_headers):
    # Note
    res = requests.post(f"{BASE_URL}/api/doctor/patients/1/notes", json={
        "content": "Routine morning clinical examination. Patient hemodynamically stable.",
        "note_type": "PROGRESS"
    }, headers=doctor_headers)
    assert res.status_code == 200

    # Clinical Order
    res = requests.post(f"{BASE_URL}/api/doctor/orders?patient_id=1", json={
        "order_type": "LAB",
        "description": "Complete Blood Count (CBC) with Differential",
        "notes": "Stat morning draw",
        "priority": "ROUTINE"
    }, headers=doctor_headers)
    assert res.status_code == 200
