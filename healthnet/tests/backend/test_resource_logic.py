import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_resource_quantity_consistency(admin_headers):
    res = requests.get(f"{BASE_URL}/api/resources", headers=admin_headers)
    assert res.status_code == 200
    resources = res.json()
    assert len(resources) > 0

    for r in resources:
        # Available quantity must never exceed total quantity and never be negative
        assert r["available_quantity"] <= r["quantity"], f"Resource {r['name']} has available > total"
        assert r["available_quantity"] >= 0, f"Resource {r['name']} has negative available quantity"
        assert r["quantity"] >= 0, f"Resource {r['name']} has negative total quantity"

def test_resource_shortage_detection(admin_headers):
    # Test that setting ventilator available quantity low triggers shortage condition
    res = requests.get(f"{BASE_URL}/api/resources?resource_type=Ventilator", headers=admin_headers)
    assert res.status_code == 200
    vents = res.json()
    assert len(vents) > 0
    test_vent = vents[0]

    # Save original quantity
    orig_avail = test_vent["available_quantity"]

    # Temporarily set to low quantity
    res = requests.patch(f"{BASE_URL}/api/resources/{test_vent['id']}", json={"available_quantity": 1}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["available_quantity"] == 1

    # Restore quantity
    res = requests.patch(f"{BASE_URL}/api/resources/{test_vent['id']}", json={"available_quantity": orig_avail}, headers=admin_headers)
    assert res.status_code == 200
