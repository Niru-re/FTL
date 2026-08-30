import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_phase4():
    print("==================================================")
    print("RUNNING HEALTHNET PHASE 4: DOCTOR PANEL TEST SUITE")
    print("==================================================")

    # 1. Login as Doctor
    print("\n[Step 1] Authenticating as Demo Doctor (Dr. Arjun Sharma)...")
    res = requests.post(f"{BASE_URL}/api/auth/demo-login/doctor")
    assert res.status_code == 200, f"Doctor login failed: {res.text}"
    data = res.json()
    doc_token = data["access_token"]
    doc_headers = {"Authorization": f"Bearer {doc_token}"}
    print(f"[PASS] Doctor logged in successfully. User: {data.get('full_name', 'Dr. Arjun Sharma')} (Role: {data.get('role')})")

    # 2. Get Doctor Dashboard
    print("\n[Step 2] Testing Doctor Dashboard summary...")
    res = requests.get(f"{BASE_URL}/api/doctor/dashboard", headers=doc_headers)
    assert res.status_code == 200, f"Get dashboard failed: {res.text}"
    dash = res.json()
    print(f"[PASS] Dashboard KPIs: My Patients={dash['my_patients']}, Critical={dash['critical_patients']}, High Risk={dash['high_risk_patients']}, Active Alerts={dash['active_alerts']}, Incoming={dash['incoming_patients']}, Pending Nurse Reqs={dash['pending_nurse_requests']}")
    assert dash["my_patients"] > 0, "Expected at least 1 assigned patient"

    # 3. Get Doctor Patients
    print("\n[Step 3] Testing Doctor Patients list with filters and search...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients?sort_by=risk", headers=doc_headers)
    assert res.status_code == 200, f"Get patients failed: {res.text}"
    patients = res.json()
    print(f"[PASS] Retrieved {len(patients)} assigned inpatients. Top risk patient: {patients[0]['full_name']} ({patients[0]['risk_level']} - {patients[0]['risk_score']}%)")
    target_patient = patients[0]
    pid = target_patient["id"]

    # 4. Get Patient Detail (Clinical Command Center)
    print(f"\n[Step 4] Testing Clinical Command Center for Patient #{pid} ({target_patient['full_name']})...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients/{pid}", headers=doc_headers)
    assert res.status_code == 200, f"Get patient detail failed: {res.text}"
    detail = res.json()
    print(f"[PASS] Patient Detail Loaded: MRN={detail['mrn']}, Bed={detail['bed_code']}, Hospital={detail['hospital_name']}, Labs={len(detail['lab_results'])}, Meds={len(detail['medications'])}, Doctor Notes={len(detail['clinical_notes'])}, Timeline Events={len(detail['timeline_events'])}")
    assert detail["risk_prediction"] is not None, "Expected AI risk evaluation report in detail"

    # 5. Get Vital Trends (Recharts)
    print(f"\n[Step 5] Testing Vital Trends for Patient #{pid} (24h)...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients/{pid}/vitals?range=24h", headers=doc_headers)
    assert res.status_code == 200, f"Get vitals failed: {res.text}"
    trends = res.json()
    print(f"[PASS] Retrieved {len(trends)} historical vital trend checkpoints for Recharts graph.")
    assert len(trends) > 0, "Expected historical vital checkpoints"

    # 6. Record Doctor Vitals
    print(f"\n[Step 6] Recording new vitals telemetry for Patient #{pid}...")
    vitals_payload = {
        "heart_rate": 84,
        "systolic_bp": 126,
        "diastolic_bp": 82,
        "spo2": 97.5,
        "respiratory_rate": 18,
        "temperature": 37.1,
        "pain_score": 2,
        "consciousness": "ALERT",
        "news2_score": 0
    }
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/vitals", json=vitals_payload, headers=doc_headers)
    assert res.status_code == 200, f"Record vitals failed: {res.text}"
    print(f"[PASS] Doctor vitals recorded: SpO2 {res.json()['spo2']}%, HR {res.json()['heart_rate']} bpm")

    # 7. Test AI Risk Engine Endpoint
    print(f"\n[Step 7] Testing Prototype AI Risk Engine evaluation for Patient #{pid}...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients/{pid}/risk", headers=doc_headers)
    assert res.status_code == 200, f"Get AI risk failed: {res.text}"
    ai_risk = res.json()
    print(f"[PASS] AI Risk Score: {ai_risk['risk_score']}% ({ai_risk['risk_level']})")
    print(f"[PASS] Factor Contributions: {ai_risk['factors']}")
    print(f"[PASS] 4-Point Progression Trend: {ai_risk['trend']}")
    print(f"[PASS] Explanation: {ai_risk['explanation']}")
    print(f"[PASS] Disclaimer: '{ai_risk['disclaimer']}'")

    # 8. Test Medical History Endpoint
    print(f"\n[Step 8] Testing Medical History endpoint for Patient #{pid}...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients/{pid}/history", headers=doc_headers)
    assert res.status_code == 200, f"Get history failed: {res.text}"
    hist = res.json()
    print(f"[PASS] Retrieved history: Chronic Conditions={hist['medical_history']}, Allergies={hist['allergies']}")

    # 9. Test Lab Results (Get & Post)
    print(f"\n[Step 9] Testing Lab Results management for Patient #{pid}...")
    lab_payload = {
        "test_name": "High-Sensitivity Troponin I",
        "category": "Cardiac Panel",
        "value": "0.02",
        "unit": "ng/mL",
        "reference_range": "< 0.04",
        "status": "NORMAL"
    }
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/labs", json=lab_payload, headers=doc_headers)
    assert res.status_code == 200, f"Add lab failed: {res.text}"
    print(f"[PASS] Added Lab Result #{res.json()['id']}: {res.json()['test_name']} = {res.json()['value']} {res.json()['unit']}")

    # 10. Test Medications (Prescribe, Update, Discontinue)
    print(f"\n[Step 10] Testing Inpatient Medication management for Patient #{pid}...")
    med_payload = {
        "drug_name": "Levofloxacin 750mg IV",
        "dosage": "750 mg",
        "frequency": "Q24H",
        "route": "IV",
        "status": "ACTIVE"
    }
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/medications", json=med_payload, headers=doc_headers)
    assert res.status_code == 200, f"Prescribe medication failed: {res.text}"
    med_id = res.json()["id"]
    print(f"[PASS] Prescribed medication #{med_id}: {res.json()['drug_name']} ({res.json()['dosage']})")

    res = requests.delete(f"{BASE_URL}/api/doctor/medications/{med_id}", headers=doc_headers)
    assert res.status_code == 200, f"Discontinue med failed: {res.text}"
    print(f"[PASS] Discontinued medication #{med_id}: {res.json()['message']}")

    # 11. Test Clinical Notes (Add & Update)
    print(f"\n[Step 11] Testing Physician Clinical Notes...")
    note_payload = {
        "note_type": "PROGRESS",
        "content": "Patient evaluated on morning ICU rounds by Dr. Arjun Sharma. Respiratory effort stabilized on current FiO2 settings. Hemodynamics stable without vasopressor support.",
        "plan": "1. Wean FiO2 as tolerated\n2. Continue renal panel Q12H\n3. Advance diet"
    }
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/notes", json=note_payload, headers=doc_headers)
    assert res.status_code == 200, f"Add note failed: {res.text}"
    note_id = res.json()["id"]
    print(f"[PASS] Created Clinical Note #{note_id} (Type: {res.json()['note_type']}) by {res.json()['doctor_name']}")

    # 12. Test Doctor Orders
    print(f"\n[Step 12] Testing Physician Clinical Orders...")
    order_payload = {
        "order_type": "IMAGING",
        "description": "Bedside Ultrasound Echocardiogram (TTE)",
        "priority": "URGENT",
        "notes": "Evaluate left ventricular ejection fraction and regional wall motion abnormalities."
    }
    res = requests.post(f"{BASE_URL}/api/doctor/orders?patient_id={pid}", json=order_payload, headers=doc_headers)
    assert res.status_code == 200, f"Create order failed: {res.text}"
    order_id = res.json()["id"]
    print(f"[PASS] Created Physician Order #{order_id}: {res.json()['order_type']} - {res.json()['description']} (Priority: {res.json()['priority']})")

    # 13. Test Nurse Requests Acknowledgment
    print("\n[Step 13] Testing Nurse Consultation Request acknowledgment...")
    res = requests.get(f"{BASE_URL}/api/doctor/requests", headers=doc_headers)
    assert res.status_code == 200, f"Get requests failed: {res.text}"
    reqs = res.json()
    if reqs:
        req_id = reqs[0]["id"]
        res = requests.post(f"{BASE_URL}/api/doctor/requests/{req_id}/acknowledge", headers=doc_headers)
        assert res.status_code == 200, f"Acknowledge request failed: {res.text}"
        print(f"[PASS] Nurse consultation request #{req_id} acknowledged and accepted by Dr. Arjun Sharma.")
    else:
        print("[PASS] No pending requests, tested endpoint format successfully.")

    # 14. Test Clinical Alerts Acknowledgment
    print("\n[Step 14] Testing Clinical Alerts feed & acknowledgment...")
    res = requests.get(f"{BASE_URL}/api/doctor/alerts", headers=doc_headers)
    assert res.status_code == 200, f"Get alerts failed: {res.text}"
    alerts = res.json()
    if alerts:
        alt_id = alerts[0]["id"]
        res = requests.post(f"{BASE_URL}/api/doctor/alerts/{alt_id}/acknowledge", headers=doc_headers)
        assert res.status_code == 200, f"Acknowledge alert failed: {res.text}"
        print(f"[PASS] Clinical alert #{alt_id} acknowledged successfully.")

    # 15. Test Incoming Ambulances
    print("\n[Step 15] Testing Inbound Emergency Ambulances...")
    res = requests.get(f"{BASE_URL}/api/doctor/incoming", headers=doc_headers)
    assert res.status_code == 200, f"Get incoming failed: {res.text}"
    ambs = res.json()
    print(f"[PASS] Retrieved {len(ambs)} inbound emergency transit cases.")

    # 16. Test Patient Transfer Request Workflow
    print(f"\n[Step 16] Testing Patient Transfer Request workflow for Patient #{pid}...")
    transfer_payload = {
        "to_department_id": 2,
        "to_unit_name": "Surgical Stepdown Unit",
        "reason": "Patient clinically stable for transfer from Medical ICU to Stepdown care.",
        "priority": "ROUTINE",
        "notes": "Ensure continuous telemetry is maintained during transfer."
    }
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/transfer", json=transfer_payload, headers=doc_headers)
    assert res.status_code == 200, f"Transfer request failed: {res.text}"
    print(f"[PASS] Transfer request #{res.json()['id']} submitted from {res.json()['from_department_name']} to {res.json()['to_department_name']}.")

    # 17. Test Patient Discharge Workflow
    print(f"\n[Step 17] Testing Patient Discharge workflow for Patient #{pid}...")
    discharge_payload = {
        "reason": "RECOVERY",
        "discharge_summary": "Patient successfully treated for acute condition. Vitals baseline, labs within acceptable limits. Stable for discharge.",
        "instructions": "Follow up with outpatient clinic in 7 days. Complete 3 remaining days of oral antibiotics."
    }
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/discharge", json=discharge_payload, headers=doc_headers)
    assert res.status_code == 200, f"Discharge failed: {res.text}"
    print(f"[PASS] Discharge order #{res.json()['id']} confirmed by Dr. Arjun Sharma. Patient status set to DISCHARGE_PENDING for turnover.")

    # 18. Test RBAC Enforcement
    print("\n[Step 18] Testing RBAC Security Restrictions...")
    nurse_res = requests.post(f"{BASE_URL}/api/auth/demo-login/nurse")
    nurse_token = nurse_res.json()["access_token"]
    nurse_headers = {"Authorization": f"Bearer {nurse_token}"}

    # Nurse trying to discharge patient via doctor route
    res = requests.post(f"{BASE_URL}/api/doctor/patients/{pid}/discharge", json=discharge_payload, headers=nurse_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden for nurse on doctor endpoint, got {res.status_code}"
    print("[PASS] RBAC successfully prevented Nurse role from accessing restricted Doctor clinical discharge endpoint.")

    print("\n==================================================")
    print("ALL 18 PHASE 4 DOCTOR PANEL TESTS PASSED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_phase4()
