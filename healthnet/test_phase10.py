import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_phase10():
    print("=========================================================")
    print("RUNNING HEALTHNET PHASE 10: PATIENT & FAMILY TEST SUITE")
    print("=========================================================")

    # 1. Patient Login (MRN or Email)
    print("\n[Step 1] Authenticating as Demo Patient (Raj Mehta / PT-1042)...")
    res = requests.post(f"{BASE_URL}/api/auth/demo-login/patient")
    assert res.status_code == 200, f"Patient login failed: {res.text}"
    p_data = res.json()
    p_token = p_data["access_token"]
    p_headers = {"Authorization": f"Bearer {p_token}"}
    print(f"[PASS] Patient logged in: {p_data.get('full_name')} (Role: {p_data.get('role')})")

    # 2. Family Member Login
    print("\n[Step 2] Authenticating as Demo Family Member (Sarah Mehta)...")
    res = requests.post(f"{BASE_URL}/api/auth/demo-login/family")
    assert res.status_code == 200, f"Family login failed: {res.text}"
    f_data = res.json()
    f_token = f_data["access_token"]
    f_headers = {"Authorization": f"Bearer {f_token}"}
    print(f"[PASS] Family logged in: {f_data.get('full_name')} (Role: {f_data.get('role')})")

    # 3. Patient Identity & Authorized Scope
    print("\n[Step 3] Testing /api/patient/me identity endpoint...")
    res = requests.get(f"{BASE_URL}/api/patient/me", headers=f_headers)
    assert res.status_code == 200, f"Failed /api/patient/me: {res.text}"
    me = res.json()
    print(f"[PASS] Family user authorized patients count: {len(me['authorized_patients'])}, active ID: {me['active_patient_id']}")
    assert len(me['authorized_patients']) > 0, "Expected at least 1 authorized patient for Sarah Mehta"
    patient_id = me['active_patient_id']

    # 4. Patient Dashboard Data & Anti-Leakage Verification
    print("\n[Step 4] Testing /api/patient/dashboard with data isolation check...")
    res = requests.get(f"{BASE_URL}/api/patient/dashboard", headers=p_headers)
    assert res.status_code == 200, f"Failed /api/patient/dashboard: {res.text}"
    dash = res.json()
    print(f"[PASS] Patient Dashboard: Name={dash['full_name']}, MRN={dash['mrn']}, Location={dash['department_name']} ({dash['room_unit']} {dash['bed_code']}), Care Status={dash['care_status']}")
    
    # ANTI-LEAKAGE VERIFICATION: Ensure internal operations, AI scores, or doctor notes are never in the payload
    assert "risk_score" not in dash, "SECURITY LEAK: risk_score must not be exposed to patient portal"
    assert "news2_score" not in dash, "SECURITY LEAK: news2_score must not be exposed to patient portal"
    assert "icu_capacity" not in dash, "SECURITY LEAK: internal hospital capacity must not be exposed"
    assert "ai_explanation" not in dash, "SECURITY LEAK: AI clinical reasoning must not be exposed"
    print("[PASS] Security anti-leakage verified: No AI risk scores, NEWS2, or hospital capacities exposed.")

    # 5. Care Team Profile (Safe Disclosure)
    print("\n[Step 5] Testing /api/patient/care-team safe contact disclosure...")
    res = requests.get(f"{BASE_URL}/api/patient/care-team", headers=p_headers)
    assert res.status_code == 200, f"Failed care team: {res.text}"
    team = res.json()
    print(f"[PASS] Care Team: Doctor={team['doctor']['name'] if team['doctor'] else 'None'}, Nurse={team['nurse']['name'] if team['nurse'] else 'None'}")
    if team['doctor']:
        assert "private_phone" not in team['doctor'], "Doctor personal phone must not be exposed"
        assert "email" not in team['doctor'], "Doctor direct email must not be exposed"

    # 6. Friendly Updates Stream
    print("\n[Step 6] Testing /api/patient/updates non-clinical feed...")
    res = requests.get(f"{BASE_URL}/api/patient/updates", headers=p_headers)
    assert res.status_code == 200, f"Failed updates: {res.text}"
    updates = res.json()
    print(f"[PASS] Retrieved {len(updates)} plain-language care updates.")
    assert len(updates) > 0, "Expected at least 1 seeded care update"

    # 7. Timeline & Milestones
    print("\n[Step 7] Testing /api/patient/timeline milestone progression...")
    res = requests.get(f"{BASE_URL}/api/patient/timeline", headers=p_headers)
    assert res.status_code == 200, f"Failed timeline: {res.text}"
    timeline = res.json()
    print(f"[PASS] Retrieved {len(timeline)} milestone timeline items.")

    # 8. Medications (Informational Disclaimer check)
    print("\n[Step 8] Testing /api/patient/medications...")
    res = requests.get(f"{BASE_URL}/api/patient/medications", headers=p_headers)
    assert res.status_code == 200, f"Failed medications: {res.text}"
    meds = res.json()
    print(f"[PASS] Retrieved {len(meds)} medication entries. Disclaimer: '{meds[0]['disclaimer'] if meds else 'N/A'}'")

    # 9. Requests & Care Team Interactive Cycle
    print("\n[Step 9] Testing Patient Request submission and Doctor/Nurse response cycle...")
    # 9a. Submit request as family member
    req_payload = {
        "request_type": "UPDATE",
        "message": "Family would like to know if dad can have physical therapy this afternoon.",
        "priority": "NORMAL"
    }
    res = requests.post(f"{BASE_URL}/api/patient/requests", json=req_payload, headers=f_headers)
    assert res.status_code == 200, f"Failed to submit request: {res.text}"
    new_req = res.json()
    req_id = new_req["id"]
    print(f"[PASS] Request #{req_id} created with status='{new_req['status']}'.")

    # 9b. Login as Doctor and Respond
    res = requests.post(f"{BASE_URL}/api/auth/demo-login/doctor")
    doc_headers = {"Authorization": f"Bearer {res.json()['access_token']}"}
    
    # Check doctor requests list
    res = requests.get(f"{BASE_URL}/api/doctor/patient-requests", headers=doc_headers)
    assert res.status_code == 200, f"Failed doctor get requests: {res.text}"
    doc_reqs = res.json()
    assert any(r["id"] == req_id for r in doc_reqs), "Created request should appear in doctor list"

    # Action: Complete with response message
    res = requests.post(
        f"{BASE_URL}/api/doctor/patient-requests/{req_id}/action",
        json={"action": "COMPLETE", "response_message": "Yes, physical therapy is cleared for 3:00 PM today."},
        headers=doc_headers
    )
    assert res.status_code == 200, f"Failed doctor action: {res.text}"
    updated_req = res.json()
    assert updated_req["current_status"] == "COMPLETED", f"Expected COMPLETED, got {updated_req['current_status']}"
    print(f"[PASS] Doctor responded and completed request #{req_id}: status='{updated_req['current_status']}'")


    # 10. Family Authorizations & Revocation (Strict 403 Enforcement)
    print("\n[Step 10] Testing Family Authorization Management & RBAC Revocation...")
    res = requests.get(f"{BASE_URL}/api/patient/family", headers=p_headers)
    assert res.status_code == 200, f"Failed to get family members: {res.text}"
    fam_list = res.json()
    print(f"[PASS] Current authorized family count: {len(fam_list)}")

    # Invite a temporary family member to test revocation
    invite_res = requests.post(
        f"{BASE_URL}/api/patient/family",
        json={
            "full_name": "Test Relative",
            "relationship": "Brother",
            "email": "relative.test@demo.com",
            "phone": "+1-555-0999",
            "access_level": "BASIC"
        },
        headers=p_headers
    )
    assert invite_res.status_code == 200, f"Failed invite: {invite_res.text}"
    temp_auth = invite_res.json()
    temp_auth_id = temp_auth["id"]
    print(f"[PASS] Invited Test Relative (Auth ID: {temp_auth_id})")

    # Log in as the new relative
    rel_login = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "relative.test@demo.com", "password": "demo123"})
    assert rel_login.status_code == 200, f"Failed relative login: {rel_login.text}"
    rel_headers = {"Authorization": f"Bearer {rel_login.json()['access_token']}"}

    # Relative can access dashboard
    res = requests.get(f"{BASE_URL}/api/patient/dashboard?patient_id={patient_id}", headers=rel_headers)
    assert res.status_code == 200, f"Relative should have access before revoke: {res.text}"
    print("[PASS] Relative successfully accessed dashboard with active authorization.")

    # Now revoke authorization
    revoke_res = requests.delete(f"{BASE_URL}/api/patient/family/{temp_auth_id}", headers=p_headers)
    assert revoke_res.status_code == 200, f"Failed revoke: {revoke_res.text}"
    print(f"[PASS] Successfully revoked authorization #{temp_auth_id}.")

    # Relative must now be immediately blocked with HTTP 403
    blocked_res = requests.get(f"{BASE_URL}/api/patient/dashboard?patient_id={patient_id}", headers=rel_headers)
    assert blocked_res.status_code == 403, f"Expected HTTP 403 Forbidden after revocation, got {blocked_res.status_code}"
    print(f"[PASS] Revocation verified: Relative immediately received HTTP 403 Forbidden: {blocked_res.json()['detail']}")

    print("\n=========================================================")
    print("ALL PHASE 10 PATIENT & FAMILY BACKEND INTEGRATION TESTS PASSED!")
    print("=========================================================")

if __name__ == "__main__":
    try:
        test_phase10()
    except Exception as e:
        print(f"\n[FAIL] Test suite error: {e}")
        sys.exit(1)
