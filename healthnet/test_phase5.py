import requests
import sys

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def safe_str(s):
    if not isinstance(s, str):
        return str(s)
    return s.encode('ascii', 'replace').decode('ascii')

def test_phase5():
    print("==================================================")
    print("RUNNING HEALTHNET PHASE 5: EMERGENCY & AMBULANCE INTELLIGENCE TEST SUITE")
    print("==================================================")

    # 1. Login as Admin
    print("\n[Step 1] Authenticating as Demo Admin...")
    res = requests.post(f"{BASE_URL}/api/auth/demo-login/admin")
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    data = res.json()
    admin_token = data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f"[PASS] Admin logged in successfully: {data.get('full_name')} (Role: {data.get('role')})")

    # 2. Login as Nurse
    print("\n[Step 2] Authenticating as Demo Nurse...")
    res = requests.post(f"{BASE_URL}/api/auth/demo-login/nurse")
    assert res.status_code == 200, f"Nurse login failed: {res.text}"
    nurse_token = res.json()["access_token"]
    nurse_headers = {"Authorization": f"Bearer {nurse_token}"}
    print(f"[PASS] Nurse logged in successfully.")

    # 3. Create Emergency Intake with Critical Cardiac Scenario
    print("\n[Step 3] Creating Emergency Case #1: Critical STEMI Cardiac Emergency...")
    cardiac_payload = {
        "patient_name": "Arthur Pendelton",
        "patient_age": 62,
        "patient_gender": "Male",
        "emergency_type": "CARDIAC",
        "priority": "CRITICAL",
        "condition_summary": "Severe acute crushing substernal chest pain with diaphoresis and ST elevation in leads V1-V4.",
        "required_department": "ICU",
        "required_resources": ["ICU bed", "Ventilator", "Oxygen", "Cardiologist"],
        "vitals_heart_rate": 135,
        "vitals_systolic_bp": 85,
        "vitals_diastolic_bp": 50,
        "vitals_spo2": 89.0,
        "vitals_respiratory_rate": 28,
        "vitals_temperature": 37.4,
        "pickup_address": "Downtown Financial Hub Gate 3",
        "pickup_lat": 40.7150,
        "pickup_lng": -74.0020
    }

    res = requests.post(f"{BASE_URL}/api/emergency", json=cardiac_payload, headers=admin_headers)
    assert res.status_code == 200, f"Create emergency failed: {res.text}"
    case1 = res.json()
    case1_id = case1["id"]
    print(f"[PASS] Emergency Case Created: Case #{case1['case_number']} (ID: {case1_id}) for {case1['patient_name']}")
    assert len(case1["matches"]) > 0, "Expected ranked hospital matches from routing engine"

    # 4. Verify 5-Pillar Routing Engine Calculations & Explainability
    print("\n[Step 4] Verifying Multi-Criteria Hospital Routing Engine & Suitability Scores...")
    matches = case1["matches"]
    best_match = matches[0]
    print(f"[PASS] Best Matched Hospital: {safe_str(best_match['hospital_name'])} (Branch: {safe_str(best_match['branch_name'])})")
    print(f"       Suitability Score: {best_match['suitability_score']}% (Distance: {best_match['distance_km']} km, ETA: {best_match['eta_minutes']} mins)")
    print(f"       Score Breakdown: Resources={best_match['resource_score']}/30, Clinical={best_match['clinical_score']}/25, ETA={best_match['eta_score']}/20, Capacity={best_match['capacity_score']}/15, Readiness={best_match['readiness_score']}/10")
    print(f"       ICU Beds: {best_match['icu_available']}/{best_match['icu_total']} (Occ: {best_match['icu_occupancy']}%), Ventilators: {best_match['ventilators_available']}")
    print(f"       Reasoning Checklist Count: {len(best_match['explanation'])} items")
    assert best_match["suitability_score"] > 0, "Expected non-zero suitability score"
    assert len(best_match["explanation"]) >= 3, "Expected explainable AI reasoning bullet points"

    # 5. Re-run Routing Engine on existing emergency
    print(f"\n[Step 5] Re-evaluating routing engine on Emergency Case #{case1_id}...")
    res = requests.post(f"{BASE_URL}/api/emergency/{case1_id}/find-hospitals", headers=admin_headers)
    assert res.status_code == 200, f"Find hospitals failed: {res.text}"
    re_matches = res.json()
    print(f"[PASS] Successfully re-computed {len(re_matches)} candidate hospital matches.")

    # 6. Select Target Hospital
    print(f"\n[Step 6] Selecting Target Hospital #{best_match['hospital_id']} ({safe_str(best_match['hospital_name'])})...")
    res = requests.post(
        f"{BASE_URL}/api/emergency/{case1_id}/select-hospital",
        json={"hospital_id": best_match["hospital_id"]},
        headers=admin_headers
    )
    assert res.status_code == 200, f"Select hospital failed: {res.text}"
    case1 = res.json()
    print(f"[PASS] Hospital selected: {safe_str(case1['assigned_hospital_name'])}. Status: {case1['status']}")
    assert case1["status"] == "HOSPITAL_SELECTED"

    # 7. Get Candidate Inpatient Beds
    print(f"\n[Step 7] Querying available ICU beds at {safe_str(best_match['hospital_name'])}...")
    res = requests.get(f"{BASE_URL}/api/emergency/{case1_id}/beds", headers=admin_headers)
    assert res.status_code == 200, f"Get beds failed: {res.text}"
    beds = res.json()
    assert len(beds) > 0, "Expected at least 1 available ICU bed"
    target_bed = beds[0]
    print(f"[PASS] Retrieved {len(beds)} available candidate beds. Selected Bed: {target_bed['code']} ({target_bed['unit_name']} - Vent: {target_bed['has_ventilator']}, Monitor: {target_bed['has_monitor']})")

    # 8. Safe Atomic Bed Reservation
    print(f"\n[Step 8] Locking Bed #{target_bed['id']} ({target_bed['code']}) for Emergency #{case1['case_number']}...")
    res = requests.post(
        f"{BASE_URL}/api/emergency/{case1_id}/reserve-bed",
        json={"bed_id": target_bed["id"]},
        headers=admin_headers
    )
    assert res.status_code == 200, f"Reserve bed failed: {res.text}"
    res_bed = res.json()
    print(f"[PASS] Bed Reserved successfully: Bed {res_bed['bed_code']} locked at {safe_str(res_bed['hospital_name'])}. Status: {res_bed['status']}")
    assert res_bed["status"] == "ACTIVE"

    # 9. Test Double-Reservation Rejection
    print(f"\n[Step 9] Testing Double-Reservation safety guard on already reserved bed #{target_bed['id']}...")
    res = requests.post(
        f"{BASE_URL}/api/emergency/{case1_id}/reserve-bed",
        json={"bed_id": target_bed["id"]},
        headers=admin_headers
    )
    assert res.status_code == 400, "Expected rejection for already reserved bed"
    print(f"[PASS] Double reservation successfully rejected by backend safety gate (HTTP 400: {safe_str(res.json()['detail'])})")

    # 10. Query Ranked Candidate Ambulances
    print(f"\n[Step 10] Querying candidate transit ambulances for pickup...")
    res = requests.get(f"{BASE_URL}/api/emergency/{case1_id}/ambulances", headers=admin_headers)
    assert res.status_code == 200, f"Get ambulances failed: {res.text}"
    ambs = res.json()
    assert len(ambs) > 0, "Expected candidate ambulances"
    target_amb = ambs[0]
    print(f"[PASS] Retrieved {len(ambs)} candidate ambulances. Top unit: {target_amb['code']} ({target_amb['vehicle_number']} - Paramedic: {safe_str(target_amb['paramedic_name'])}, Dist: {target_amb['distance_km']} km, ETA: {target_amb['eta_minutes']} mins)")

    # 11. Assign & Dispatch Ambulance
    print(f"\n[Step 11] Dispatching Ambulance #{target_amb['id']} ({target_amb['code']})...")
    res = requests.post(
        f"{BASE_URL}/api/emergency/{case1_id}/assign-ambulance",
        json={"ambulance_id": target_amb["id"]},
        headers=admin_headers
    )
    assert res.status_code == 200, f"Assign ambulance failed: {res.text}"
    case1 = res.json()
    print(f"[PASS] Ambulance Dispatched! Emergency Status: {case1['status']}, Assigned Ambulance: {case1['assigned_ambulance_code']}, ETA: {case1['eta_minutes']} mins")
    assert case1["status"] == "EN_ROUTE"

    # 12. Verify Multi-Role Targeted Receiving Hospital Notifications
    print(f"\n[Step 12] Verifying targeted notifications sent to receiving hospital staff (ADMIN, NURSE, DOCTOR)...")
    res = requests.get(f"{BASE_URL}/api/emergency/{case1_id}/notifications", headers=admin_headers)
    assert res.status_code == 200, f"Get notifications failed: {res.text}"
    notifications = res.json()
    print(f"[PASS] Generated {len(notifications)} role-targeted notifications:")
    for n in notifications:
        print(f"       -> [{n['recipient_role']}] {safe_str(n['title'])}: {safe_str(n['message'])[:80]}...")
    assert len(notifications) >= 3, "Expected notifications for ADMIN, NURSE, and DOCTOR roles"

    # 13. Step Ambulance GPS Simulation
    print(f"\n[Step 13] Stepping Simulated GPS position and ETA countdown for Ambulance #{target_amb['id']}...")
    res = requests.post(f"{BASE_URL}/api/ambulances/{target_amb['id']}/step-simulation", headers=admin_headers)
    assert res.status_code == 200, f"Step simulation failed: {res.text}"
    stepped_amb = res.json()
    print(f"[PASS] Simulation step applied. New ETA: {stepped_amb['eta_minutes']} mins, Lat: {stepped_amb['lat']}, Lng: {stepped_amb['lng']}, Status: {stepped_amb['status']}")

    # 14. Trigger Ambulance Arrival
    print(f"\n[Step 14] Triggering immediate arrival of Ambulance #{target_amb['id']} at hospital bay...")
    res = requests.post(f"{BASE_URL}/api/ambulances/{target_amb['id']}/arrive", headers=admin_headers)
    assert res.status_code == 200, f"Ambulance arrive failed: {res.text}"
    arrived_amb = res.json()
    print(f"[PASS] Ambulance Arrived! Status: {arrived_amb['status']}, ETA: {arrived_amb['eta_minutes']} mins")
    assert arrived_amb["status"] == "ARRIVED"

    # 15. Confirm Patient Received & Clinical Inpatient Admission
    print(f"\n[Step 15] Nurse / Doctor confirming patient received and admitted to Bed {target_bed['code']}...")
    res = requests.post(f"{BASE_URL}/api/emergency/{case1_id}/patient-received", headers=nurse_headers)
    assert res.status_code == 200, f"Patient received failed: {res.text}"
    received_case = res.json()
    print(f"[PASS] Patient handover completed! Status: {received_case['status']}, Admitted Inpatient ID: {received_case['assigned_patient_id']}")
    assert received_case["status"] == "PATIENT_RECEIVED"

    # 16. Verify Audit Event Timeline Stream
    print(f"\n[Step 16] Verifying Emergency Audit Timeline Stream for Case #{case1['case_number']}...")
    res = requests.get(f"{BASE_URL}/api/emergency/{case1_id}/timeline", headers=admin_headers)
    assert res.status_code == 200, f"Get timeline failed: {res.text}"
    timeline = res.json()
    print(f"[PASS] Retrieved {len(timeline)} chronological audit events:")
    for t in timeline:
        print(f"       -> [{t['timestamp']}] {t['event_type']}: {safe_str(t['title'])} ({safe_str(t['actor_name'])})")
    assert len(timeline) >= 5, "Expected full lifecycle audit event trace"

    # 17. Return Ambulance to Fleet
    print(f"\n[Step 17] Returning Ambulance #{target_amb['id']} to available fleet status...")
    res = requests.post(f"{BASE_URL}/api/ambulances/{target_amb['id']}/return", headers=admin_headers)
    assert res.status_code == 200, f"Return ambulance failed: {res.text}"
    freed_amb = res.json()
    print(f"[PASS] Ambulance returned to fleet. Status: {freed_amb['status']}, Assigned Case: {freed_amb['assigned_emergency_case_id']}")
    assert freed_amb["status"] == "AVAILABLE"

    # 18. Emergency Cases Registry Listing & Filters
    print("\n[Step 18] Testing Emergency Registry filters & search...")
    res = requests.get(f"{BASE_URL}/api/emergency?status=PATIENT_RECEIVED", headers=admin_headers)
    assert res.status_code == 200, f"Get emergency cases failed: {res.text}"
    cases = res.json()
    print(f"[PASS] Retrieved {len(cases)} emergency cases with status=PATIENT_RECEIVED.")
    assert len(cases) > 0, "Expected at least 1 emergency case in registry"

    print("\n==================================================")
    print("ALL 18 PHASE 5 EMERGENCY & AMBULANCE TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    try:
        test_phase5()
    except Exception as e:
        print(f"\n[FAIL] Test suite encountered an error: {e}")
        sys.exit(1)
