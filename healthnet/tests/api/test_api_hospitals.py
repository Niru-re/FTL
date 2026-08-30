import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_get_all_hospitals(admin_headers):
    res = requests.get(f"{BASE_URL}/api/hospitals", headers=admin_headers)
    assert res.status_code == 200
    hosps = res.json()
    assert len(hosps) >= 12
    assert "name" in hosps[0]
    assert "lat" in hosps[0]
    assert "lng" in hosps[0]

def test_get_hospital_detail(admin_headers):
    res = requests.get(f"{BASE_URL}/api/hospitals/1", headers=admin_headers)
    assert res.status_code == 200
    hosp = res.json()
    assert hosp["id"] == 1

def test_get_hospital_summary(admin_headers):
    res = requests.get(f"{BASE_URL}/api/hospitals/1/summary", headers=admin_headers)
    assert res.status_code == 200
    summary = res.json()
    assert "total_beds" in summary
    assert "overall_occupancy_rate" in summary

def test_update_hospital_emergency_status(admin_headers):
    # Transition to DIVERT
    res = requests.patch(f"{BASE_URL}/api/hospitals/1/emergency-status", json={"status": "DIVERT"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["emergency_status"] == "DIVERT"

    # Restore to NORMAL
    res = requests.patch(f"{BASE_URL}/api/hospitals/1/emergency-status", json={"status": "NORMAL"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["emergency_status"] == "NORMAL"

def test_get_network_icus(admin_headers):
    res = requests.get(f"{BASE_URL}/api/network/icus", headers=admin_headers)
    assert res.status_code == 200
    icus = res.json()
    assert len(icus) > 0
    assert "icu_name" in icus[0]
    assert "occupancy_rate" in icus[0]

def test_get_branches_departments_wards(admin_headers):
    r_br = requests.get(f"{BASE_URL}/api/branches", headers=admin_headers)
    assert r_br.status_code == 200
    assert len(r_br.json()) > 0

    r_dept = requests.get(f"{BASE_URL}/api/departments", headers=admin_headers)
    assert r_dept.status_code == 200
    assert len(r_dept.json()) > 0

    r_ward = requests.get(f"{BASE_URL}/api/wards", headers=admin_headers)
    assert r_ward.status_code == 200
    assert len(r_ward.json()) > 0
