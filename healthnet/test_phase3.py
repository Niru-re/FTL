import sys
import os
sys.path.insert(0, r'd:\FTL2\healthnet')

from fastapi.testclient import TestClient
from server.main import app

def run_tests():
    client = TestClient(app)
    print("=== STARTING PHASE 3 NURSE SUITE AUTOMATED VERIFICATION ===")

    # 1. Login as Nurse
    login_resp = client.post("/api/auth/login", json={
        "email": "nurse@healthnet.demo",
        "password": "nurse123"
    })
    assert login_resp.status_code == 200, f"Nurse login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("1. Nurse Authentication: SUCCESS (JWT token received)")

    # 2. Nurse Dashboard Summary
    dash_resp = client.get("/api/nurse/dashboard", headers=headers)
    assert dash_resp.status_code == 200, f"Dashboard failed: {dash_resp.text}"
    dash_data = dash_resp.json()
    print(f"2. Nurse Dashboard: Assigned={dash_data['assigned_patients']}, Critical={dash_data['critical_patients']}, HighRisk={dash_data['high_risk_patients']}, Tasks={dash_data['pending_tasks']}, ICU Beds={dash_data['available_icu_beds']}, Incoming Amb={dash_data['incoming_ambulances']}, Alerts={dash_data['active_alerts']}")
    assert dash_data['assigned_patients'] >= 8, "Expected at least 8 assigned patients for demo nurse"
    assert dash_data['incoming_ambulances'] >= 0, "Expected non-negative incoming ambulances"

    # 3. View Patients List
    patients_resp = client.get("/api/nurse/patients", headers=headers)
    assert patients_resp.status_code == 200, f"Patients list failed: {patients_resp.text}"
    patients = patients_resp.json()
    print(f"3. Nurse Patients Roster: Retrieved {len(patients)} patients")
    test_patient = patients[0]
    print(f"   Selected Test Patient: {test_patient['full_name']} (MRN: {test_patient['mrn']}) - Status: {test_patient['status']}, Risk: {test_patient['risk_level']}")

    # 4. View Ambulances & Find Incoming AMB-108
    amb_resp = client.get("/api/nurse/ambulances", headers=headers)
    assert amb_resp.status_code == 200, f"Ambulances failed: {amb_resp.text}"
    ambs = amb_resp.json()
    incoming_amb = next((a for a in ambs if a["code"] == "AMB-108"), ambs[0])
    print(f"4. Incoming Ambulance: {incoming_amb['code']} - Status: {incoming_amb['status']}, ETA: {incoming_amb['eta_minutes']}m, Patient: {incoming_amb['current_patient_name']}")

    # 5. Prepare Bed for Ambulance
    prep_resp = client.post(f"/api/nurse/ambulances/{incoming_amb['id']}/prepare", headers=headers)
    assert prep_resp.status_code == 200, f"Prepare bed failed: {prep_resp.text}"
    prep_data = prep_resp.json()
    print(f"5. Prepare Bed Result: Bed {prep_data['bed_code']} -> Status: {prep_data['bed_status']} ({prep_data['message']})")

    # 6. Confirm Ambulance Arrival & Patient Reception
    arrival_resp = client.post(f"/api/nurse/ambulances/{incoming_amb['id']}/arrival", headers=headers)
    assert arrival_resp.status_code == 200, f"Confirm arrival failed: {arrival_resp.text}"
    arr_data = arrival_resp.json()
    print(f"6. Confirm Arrival Result: Amb: {arr_data['ambulance_status']}, Bed: {arr_data['bed_status']}, Patient: {arr_data['patient_name']} ({arr_data['message']})")

    # 7. Patient Detail (Nurse Scoped)
    detail_resp = client.get(f"/api/nurse/patients/{test_patient['id']}", headers=headers)
    assert detail_resp.status_code == 200, f"Patient detail failed: {detail_resp.text}"
    detail_data = detail_resp.json()
    print(f"7. Nurse Scoped Patient Detail: {detail_data['full_name']} | Notes={len(detail_data['nursing_notes'])}, Meds={len(detail_data['medications'])}, Tasks={len(detail_data['nurse_tasks'])}")

    # 8. Record Vitals (Trigger Critical Threshold Alert)
    vitals_resp = client.post(f"/api/nurse/patients/{test_patient['id']}/vitals", json={
        "heart_rate": 128,
        "spo2": 88.0,
        "systolic_bp": 94,
        "diastolic_bp": 58,
        "respiratory_rate": 30,
        "temperature": 39.2,
        "pain_score": 8,
        "consciousness": "VOICE",
        "recorded_by_nurse_name": "Nurse Elena Rostova"
    }, headers=headers)
    assert vitals_resp.status_code == 200, f"Record vitals failed: {vitals_resp.text}"
    v_data = vitals_resp.json()
    print(f"8. Vitals Recorded: SpO2={v_data['spo2']}%, HR={v_data['heart_rate']} bpm, RR={v_data['respiratory_rate']} /min, Temp={v_data['temperature']}°C")

    # 9. Add Nursing Progress Note
    note_resp = client.post(f"/api/nurse/patients/{test_patient['id']}/notes", json={
        "content": "Patient developed acute respiratory distress and desaturation to 88% on room air. High-flow O2 applied via non-rebreather. Attending physician paged stat.",
        "nurse_name": "Nurse Elena Rostova"
    }, headers=headers)
    assert note_resp.status_code == 200, f"Add note failed: {note_resp.text}"
    print(f"9. Nursing Progress Note Logged: ID={note_resp.json()['id']}")

    # 10. Request Doctor Bedside Consultation
    doc_req_resp = client.post("/api/nurse/doctors/request", json={
        "patient_id": test_patient['id'],
        "reason": "Acute tachypnea and desaturation down to 88% SpO2. Urgent bedside pulmonary review requested.",
        "priority": "STAT"
    }, headers=headers)
    assert doc_req_resp.status_code == 200, f"Doctor request failed: {doc_req_resp.text}"
    print(f"10. Doctor Consultation Requested: Priority={doc_req_resp.json()['priority']}, Status={doc_req_resp.json()['status']}")

    # 11. Medication Administration
    meds_resp = client.get("/api/nurse/medications", headers=headers)
    assert meds_resp.status_code == 200
    meds = meds_resp.json()
    if meds:
        target_med = meds[0]
        admin_resp = client.post(f"/api/nurse/medications/{target_med['id']}/administer", json={
            "status": "ADMINISTERED",
            "notes": "Verified five rights of medication administration. Dose infused."
        }, headers=headers)
        assert admin_resp.status_code == 200
        print(f"11. Medication Administered: {admin_resp.json()['drug_name']} -> {admin_resp.json()['status']}")

    # 12. Complete Nursing Task
    tasks_resp = client.get("/api/nurse/tasks", headers=headers)
    assert tasks_resp.status_code == 200
    tasks = tasks_resp.json()
    if tasks:
        t_id = tasks[0]["id"]
        t_patch = client.patch(f"/api/nurse/tasks/{t_id}", json={"is_completed": True}, headers=headers)
        assert t_patch.status_code == 200
        print(f"12. Nursing Task Completed: ID {t_id} (is_completed={t_patch.json()['is_completed']})")

    # 13. Acknowledge Alert
    alerts_resp = client.get("/api/nurse/alerts", headers=headers)
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()
    if alerts:
        a_id = alerts[0]["id"]
        ack_resp = client.post(f"/api/nurse/alerts/{a_id}/acknowledge", headers=headers)
        assert ack_resp.status_code == 200
        print(f"13. Alert Acknowledged: ID {a_id} (is_read={ack_resp.json()['is_read']})")

    # 14. Create Shift Handover
    handover_resp = client.post("/api/nurse/handover", json={
        "incoming_nurse_name": "Nurse Maya Lin",
        "shift": "MORNING_TO_EVENING",
        "general_notes": "All 10 Medical ICU patients accounted for. Emergency intake AMB-108 safely received in Bed 12. PT-1042 vitals stabilized after O2 titration.",
        "pending_tasks_summary": "Re-check ABG at 16:00 for Bed 01; Antibiotic infusion due at 17:30.",
        "critical_observations": "Patient PT-1042 on strict respiratory monitoring."
    }, headers=headers)
    assert handover_resp.status_code == 200, f"Handover failed: {handover_resp.text}"
    print(f"14. Shift Handover Created: ID {handover_resp.json()['id']} ({handover_resp.json()['shift']})")

    # 15. Security Verification: Nurse cannot access admin-only endpoints
    sec_resp = client.post("/api/hospitals", json={"name": "Illegal Hospital"}, headers=headers)
    assert sec_resp.status_code in [401, 403], f"Expected 403/401 for Nurse accessing Admin endpoint, got {sec_resp.status_code}"
    print("15. Security RBAC Enforcement: Nurse blocked from admin actions (HTTP 403 Forbidden)")

    print("\n=== ALL PHASE 3 NURSE PANEL TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    run_tests()
