import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

@pytest.fixture(scope="module")
def admin_headers():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}

def test_get_resources(admin_headers):
    res = requests.get(f"{BASE_URL}/api/resources", headers=admin_headers)
    assert res.status_code == 200
    res_list = res.json()
    assert len(res_list) > 0
    assert "resource_type" in res_list[0]
    assert "quantity" in res_list[0]

def test_filter_resources_by_type(admin_headers):
    res = requests.get(f"{BASE_URL}/api/resources?resource_type=Ventilator", headers=admin_headers)
    assert res.status_code == 200
    for r in res.json():
        assert r["resource_type"] == "Ventilator"

def test_update_resource_quantity(admin_headers):
    res = requests.get(f"{BASE_URL}/api/resources", headers=admin_headers)
    target = res.json()[0]
    orig_avail = target["available_quantity"]

    # Update
    res = requests.patch(f"{BASE_URL}/api/resources/{target['id']}", json={"available_quantity": orig_avail}, headers=admin_headers)
    assert res.status_code == 200
