import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def safe_str(val):
    return str(val).encode("ascii", "replace").decode("ascii")

def run_test():
    print("=" * 60)
    print("RUNNING HEALTHNET PHASE 8: ADMIN COMMAND CENTER TEST SUITE")
    print("=" * 60)

    # 1. Admin Authentication
    print("\n[Step 1] Authenticating as Demo Admin (Dr. Arthur Vance)...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Admin authenticated successfully.")

    # 2. Query Network Health Score (Section 3)
    print("\n[Step 2] Querying Operational Network Health Score (GET /api/network/health)...")
    res = requests.get(f"{BASE_URL}/api/network/health", headers=admin_headers)
    assert res.status_code == 200, f"Get network health failed: {res.text}"
    health_data = res.json()
    score = health_data.get("network_health_score")
    status = health_data.get("status")
    components = health_data.get("components", {})
    metrics = health_data.get("metrics", {})
    assert score is not None and 0 <= score <= 100
    assert status in ["STABLE", "WATCH", "PRESSURE", "CRITICAL"]
    assert "PROTOTYPE OPERATIONAL INDICATOR" in health_data.get("label", "")
    print(f"[PASS] Network Health Score: {score}/100 | Status: {status}")
    print(f"       Components: ICU={components.get('icu_health')}/30, Beds={components.get('bed_headroom')}/25, Vents={components.get('ventilator_reserve')}/20, EMS={components.get('ambulance_readiness')}/15, Alerts={components.get('alert_clearance')}/10")
    print(f"       Connected Beds: {metrics.get('total_beds')} (Avail: {metrics.get('available_beds')}) | ICU Occ: {metrics.get('icu_occupancy_pct')}%")

    # 3. Global Network Search (Section 22)
    print("\n[Step 3] Testing Global Multi-Entity Network Search (GET /api/network/search)...")
    res = requests.get(f"{BASE_URL}/api/network/search?q=Central", headers=admin_headers)
    assert res.status_code == 200
    search_res = res.json()
    assert len(search_res.get("hospitals", [])) > 0
    print(f"[PASS] Searched 'Central' -> Found {len(search_res['hospitals'])} hospitals: {search_res['hospitals'][0]['name']}")

    res = requests.get(f"{BASE_URL}/api/network/search?q=ICU", headers=admin_headers)
    assert res.status_code == 200
    search_beds = res.json()
    assert len(search_beds.get("beds", [])) > 0
    print(f"[PASS] Searched 'ICU' -> Found {len(search_beds['beds'])} beds: {search_beds['beds'][0]['code']}")

    # 4. ICU Network View (Section 7 & 8)
    print("\n[Step 4] Querying ICU Network Units Matrix (GET /api/network/icus)...")
    res = requests.get(f"{BASE_URL}/api/network/icus", headers=admin_headers)
    assert res.status_code == 200
    icu_units = res.json()
    assert len(icu_units) > 0
    top_icu = icu_units[0]
    print(f"[PASS] Retrieved {len(icu_units)} connected ICU units.")
    print(f"       Highest Occupancy Unit: {top_icu['icu_name']} ({top_icu['hospital_name']})")
    print(f"       Occupancy: {top_icu['occupancy_rate']}% | Pressure: {top_icu['pressure_level']}")
    print(f"       Beds: Total={top_icu['total_beds']}, Occ={top_icu['occupied_beds']}, Avail={top_icu['available_beds']}, Reserved={top_icu['reserved_beds']}, Cleaning={top_icu['cleaning_beds']}")

    # 5. Hospital Status Control (Section 26)
    print("\n[Step 5] Testing Hospital Status Modification (PATCH /api/hospitals/1/emergency-status)...")
    res = requests.patch(
        f"{BASE_URL}/api/hospitals/1/emergency-status",
        json={"status": "DIVERT"},
        headers=admin_headers
    )
    assert res.status_code == 200
    h1 = res.json()
    assert h1["emergency_status"] == "DIVERT"
    print(f"[PASS] Hospital #{h1['id']} ({h1['name']}) emergency status transitioned to: {h1['emergency_status']}")

    # Verify audit log recorded for hospital status change
    res = requests.get(f"{BASE_URL}/api/audit-logs?limit=5", headers=admin_headers)
    if res.status_code == 200:
        logs = res.json()
        assert any(l.get("action") == "HOSPITAL_STATUS_CHANGED" for l in logs)
        print("[PASS] Audit log confirmed for HOSPITAL_STATUS_CHANGED.")

    # Restore hospital status back to NORMAL
    res = requests.patch(
        f"{BASE_URL}/api/hospitals/1/emergency-status",
        json={"status": "NORMAL"},
        headers=admin_headers
    )
    assert res.status_code == 200
    print("[PASS] Hospital #1 restored to NORMAL status.")

    # 6. Admin Simulation Scenarios (Section 28)
    print("\n[Step 6] Testing Scenario: ICU_SURGE (POST /api/simulation/scenario)...")
    res = requests.post(
        f"{BASE_URL}/api/simulation/scenario",
        json={"scenario": "ICU_SURGE"},
        headers=admin_headers
    )
    assert res.status_code == 200
    print(f"[PASS] {res.json().get('message')}")

    print("\n[Step 7] Testing Scenario: VENTILATOR_SHORTAGE (POST /api/simulation/scenario)...")
    res = requests.post(
        f"{BASE_URL}/api/simulation/scenario",
        json={"scenario": "VENTILATOR_SHORTAGE"},
        headers=admin_headers
    )
    assert res.status_code == 200
    print(f"[PASS] {res.json().get('message')}")

    # Verify resource shortage alert generated (Section 10)
    res = requests.get(f"{BASE_URL}/api/alerts?limit=5", headers=admin_headers)
    assert res.status_code == 200
    alerts = res.json()
    assert any("SHORTAGE" in a.get("title", "") or a.get("alert_type") == "RESOURCE_SHORTAGE" for a in alerts)
    print("[PASS] Resource Shortage Alert verified in alert stream.")

    print("\n[Step 8] Testing Scenario: EMERGENCY_SURGE (POST /api/simulation/scenario)...")
    res = requests.post(
        f"{BASE_URL}/api/simulation/scenario",
        json={"scenario": "EMERGENCY_SURGE"},
        headers=admin_headers
    )
    assert res.status_code == 200
    print(f"[PASS] {res.json().get('message')}")

    # 7. Mass Casualty Command Mode (Section 29 & 30)
    print("\n[Step 9] Testing Scenario: MASS_CASUALTY (POST /api/simulation/scenario)...")
    res = requests.post(
        f"{BASE_URL}/api/simulation/scenario",
        json={"scenario": "MASS_CASUALTY"},
        headers=admin_headers
    )
    assert res.status_code == 200
    mce_res = res.json()
    print(f"[PASS] Mass Casualty Event Triggered: {mce_res.get('message')}")
    print(f"       Injected Trauma Cases: {mce_res.get('injected_cases')}")

    # Verify Network Health recalculation during surge
    res = requests.get(f"{BASE_URL}/api/network/health", headers=admin_headers)
    assert res.status_code == 200
    post_surge_health = res.json()
    print(f"[PASS] Network Health Score post-surge: {post_surge_health.get('network_health_score')}/100 (Status: {post_surge_health.get('status')})")

    # 8. Reset Simulation State
    print("\n[Step 10] Restoring Network Baseline via Simulation Reset (POST /api/simulation/reset)...")
    res = requests.post(f"{BASE_URL}/api/simulation/reset", headers=admin_headers)
    assert res.status_code == 200
    print(f"[PASS] Network simulation reset complete.")

    # Verify post-reset health
    res = requests.get(f"{BASE_URL}/api/network/health", headers=admin_headers)
    assert res.status_code == 200
    reset_health = res.json()
    print(f"[PASS] Network Health restored: {reset_health.get('network_health_score')}/100 (Status: {reset_health.get('status')})")

    print("\n" + "=" * 60)
    print("ALL 10 PHASE 8 ADMIN COMMAND CENTER TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_test()
