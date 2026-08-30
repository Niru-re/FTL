import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_valid_and_invalid_bed_transitions(admin_headers):
    # Find a test bed in AVAILABLE status
    res = requests.get(f"{BASE_URL}/api/beds?hospital_id=1&status=AVAILABLE", headers=admin_headers)
    assert res.status_code == 200
    beds = res.json()
    assert len(beds) > 0
    test_bed = beds[0]
    bed_id = test_bed["id"]

    # 1. Valid: AVAILABLE -> RESERVED
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "RESERVED"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "RESERVED"

    # 2. Invalid: RESERVED -> CLEANING (Must be rejected)
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "CLEANING"}, headers=admin_headers)
    assert res.status_code == 400

    # 3. Valid: RESERVED -> OCCUPIED
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "OCCUPIED"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "OCCUPIED"

    # 4. Invalid: OCCUPIED -> AVAILABLE (Must be rejected directly without cleaning)
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "AVAILABLE"}, headers=admin_headers)
    assert res.status_code == 400

    # 5. Valid: OCCUPIED -> CLEANING
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "CLEANING"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "CLEANING"

    # 6. Valid: CLEANING -> AVAILABLE
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "AVAILABLE"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "AVAILABLE"

    # 7. Valid: AVAILABLE -> MAINTENANCE
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "MAINTENANCE"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "MAINTENANCE"

    # 8. Invalid: MAINTENANCE -> OCCUPIED (Must be rejected)
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "OCCUPIED"}, headers=admin_headers)
    assert res.status_code == 400

    # 9. Valid: MAINTENANCE -> AVAILABLE
    res = requests.patch(f"{BASE_URL}/api/beds/{bed_id}/status", json={"status": "AVAILABLE"}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["status"] == "AVAILABLE"

def test_mathematical_bed_consistency(admin_headers):
    # Verify mathematical sum: Total == Available + Occupied + Reserved + Cleaning + Maintenance (+ Out of service)
    res = requests.get(f"{BASE_URL}/api/hospitals/1/summary", headers=admin_headers)
    assert res.status_code == 200
    data = res.json()
    total = data["total_beds"]
    avail = data["available_beds"]
    occ = data["occupied_beds"]
    resv = data["reserved_beds"]
    clean = data["cleaning_beds"]

    # Sum of known states must not exceed total
    subtotal = avail + occ + resv + clean
    assert subtotal <= total, f"Bed subtotal {subtotal} exceeds total beds {total}"

    # Overall occupancy calculation consistency
    if total > 0:
        expected_occ_rate = round((occ / total) * 100, 1)
        assert abs(data["overall_occupancy_rate"] - expected_occ_rate) <= 1.0, "Occupancy rate calculation mismatch"
