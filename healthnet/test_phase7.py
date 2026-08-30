import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    print("=" * 60)
    print("RUNNING HEALTHNET PHASE 7: AI INTELLIGENCE TEST SUITE")
    print("=" * 60)

    # 1. Authenticate as Doctor
    print("\n[Step 1] Authenticating as Demo Doctor (Dr. Arjun Sharma)...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "doctor@healthnet.demo", "password": "doctor123"})
    assert res.status_code == 200, f"Doctor auth failed: {res.text}"
    doctor_token = res.json()["access_token"]
    doctor_headers = {"Authorization": f"Bearer {doctor_token}"}
    print("[PASS] Doctor authenticated.")

    # 2. Authenticate as Admin
    print("\n[Step 2] Authenticating as Demo Admin (Dr. Arthur Vance)...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200, f"Admin auth failed: {res.text}"
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Admin authenticated.")

    # 3. Test Doctor AI Risk Registry Endpoint (Section 12)
    print("\n[Step 3] Querying Doctor AI Risk Registry (GET /api/doctor/ai-risk)...")
    res = requests.get(f"{BASE_URL}/api/doctor/ai-risk", headers=doctor_headers)
    assert res.status_code == 200, f"Get AI risk list failed: {res.text}"
    risk_list = res.json()
    assert len(risk_list) > 0, "Expected at least 1 patient in AI risk list"
    top_patient = risk_list[0]
    print(f"[PASS] Retrieved {len(risk_list)} patients ranked by AI risk.")
    print(f"       Top Ranked: {top_patient['full_name']} ({top_patient['mrn']}) | Bed: {top_patient['bed_code']}")
    print(f"       Risk Score: {top_patient['risk_score']}% ({top_patient['risk_level']}) | Velocity: {top_patient['risk_velocity']} ({top_patient['risk_velocity_status']})")
    print(f"       Primary Driver: {top_patient['primary_factor']}")

    # 4. Test Patient Detailed AI Risk Evaluation (Section 1 - 10)
    print(f"\n[Step 4] Querying Patient Detailed AI Risk (GET /api/doctor/patients/{top_patient['patient_id']}/ai-risk)...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients/{top_patient['patient_id']}/ai-risk", headers=doctor_headers)
    assert res.status_code == 200, f"Get AI detail failed: {res.text}"
    ai_detail = res.json()
    assert "risk_score" in ai_detail
    assert "risk_velocity" in ai_detail
    assert "contributing_factors" in ai_detail
    assert "explanation" in ai_detail
    assert "model_metadata" in ai_detail
    print(f"[PASS] Detailed AI Diagnostic Loaded:")
    print(f"       Model: {ai_detail['model_metadata']['model_name']} (v{ai_detail['model_metadata']['model_version']})")
    print(f"       Risk Level: {ai_detail['risk_level']} (NEWS2: {ai_detail['risk_score']})")
    print(f"       Contributing Factors ({len(ai_detail['contributing_factors'])} items):")
    for f in ai_detail['contributing_factors'][:3]:
        print(f"         - {f['parameter']}: {f['value']} ({f['impact']}) -> {f['description']}")
    print(f"       Explanation: {ai_detail['explanation']}")

    # 5. Test Risk History Timeline (Section 6)
    print(f"\n[Step 5] Querying Patient Risk Trend History (GET /api/doctor/patients/{top_patient['patient_id']}/ai-risk/history)...")
    res = requests.get(f"{BASE_URL}/api/doctor/patients/{top_patient['patient_id']}/ai-risk/history", headers=doctor_headers)
    assert res.status_code == 200
    history_pts = res.json()
    assert len(history_pts) > 0
    print(f"[PASS] Retrieved {len(history_pts)} chronological risk checkpoints for Recharts line chart.")

    # 6. Test Admin Network AI Clinical & Capacity Overview (Section 14, 21, 22)
    print("\n[Step 6] Querying Admin Network AI Overview (GET /api/admin/ai/network)...")
    res = requests.get(f"{BASE_URL}/api/admin/ai/network", headers=admin_headers)
    assert res.status_code == 200, f"Get admin network failed: {res.text}"
    net_ai = res.json()
    assert "clinical_status" in net_ai
    assert "network_capacity" in net_ai
    cs = net_ai["clinical_status"]
    nc = net_ai["network_capacity"]
    print(f"[PASS] Network Clinical Status:")
    print(f"       Critical: {cs['critical_patients']} | Very High: {cs['very_high_risk']} | High: {cs['high_risk']} | Rapid Deterioration: {cs['rapid_deterioration_count']}")
    print(f"[PASS] City Health Network Capacity:")
    print(f"       Total Hospitals: {nc['total_hospitals']} | Total Beds: {nc['total_beds']} (Avail: {nc['available_beds']})")
    print(f"       Current ICU Load: {nc['current_icu_occupancy']}% -> Projected 24h: {nc['projected_24h_icu_occupancy']}%")
    print(f"       Network Capacity Pressure Score: {nc['capacity_pressure_score']}/100")

    # 7. Test Hospital Capacity Pressure Rankings (Section 20 & 21)
    print("\n[Step 7] Querying Hospital Capacity Projections (GET /api/admin/ai/hospitals)...")
    res = requests.get(f"{BASE_URL}/api/admin/ai/hospitals", headers=admin_headers)
    assert res.status_code == 200
    hosp_forecasts = res.json()
    assert len(hosp_forecasts) > 0
    h1 = hosp_forecasts[0]
    print(f"[PASS] Evaluated {len(hosp_forecasts)} connected hospitals:")
    print(f"       Sample: {h1['hospital_name']} ({h1['branch_name']})")
    print(f"       Current ICU: {h1['current_metrics']['icu_occupancy_pct']}% -> 24h Projected: {h1['forecast_24h']['projected_icu_occupancy']}%")
    print(f"       Available ICU: {h1['current_metrics']['available_icu']} -> 24h Projected: {h1['forecast_24h']['projected_available_icu']}")
    print(f"       Pressure Score: {h1['forecast_24h']['capacity_pressure_score']}/100 ({h1['forecast_24h']['capacity_outlook']})")

    # 8. Test Multi-Horizon Projections (6h, 12h, 24h, 48h) (Section 15 & 16)
    print("\n[Step 8] Testing Multi-Horizon Forecasts (6h, 12h, 24h, 48h)...")
    windows = h1.get("windows", {})
    assert "6h" in windows and "12h" in windows and "24h" in windows and "48h" in windows
    print(f"[PASS] Horizon Progression for {h1['hospital_name']}:")
    print(f"       Current: {h1['current_metrics']['icu_occupancy_pct']}% ICU")
    print(f"       +6h:  {windows['6h']['projected_icu_occupancy']}% (Pressure: {windows['6h']['capacity_pressure_score']})")
    print(f"       +12h: {windows['12h']['projected_icu_occupancy']}% (Pressure: {windows['12h']['capacity_pressure_score']})")
    print(f"       +24h: {windows['24h']['projected_icu_occupancy']}% (Pressure: {windows['24h']['capacity_pressure_score']})")
    print(f"       +48h: {windows['48h']['projected_icu_occupancy']}% (Pressure: {windows['48h']['capacity_pressure_score']})")

    # 9. Test Emergency Routing 24h Capacity Outlook Integration (Section 24 & 25)
    print("\n[Step 9] Testing Emergency Routing with 24h Capacity Outlook...")
    routing_payload = {
        "patient_name": "AI Test Emergency Patient",
        "patient_age": 59,
        "patient_gender": "Male",
        "priority": "CRITICAL",
        "emergency_type": "CARDIAC",
        "condition_summary": "Acute substernal chest pain with ST changes",
        "required_department": "ICU",
        "required_resources": ["ICU bed", "Ventilator", "Oxygen", "Cardiologist"],
        "vitals_heart_rate": 130,
        "vitals_systolic_bp": 85,
        "vitals_diastolic_bp": 55,
        "vitals_spo2": 88.0,
        "vitals_respiratory_rate": 28,
        "vitals_temperature": 37.2,
        "pickup_address": "Financial District Pier 11",
        "pickup_lat": 40.7128,
        "pickup_lng": -74.0060
    }
    res = requests.post(f"{BASE_URL}/api/emergency", json=routing_payload, headers=admin_headers)
    assert res.status_code == 200, f"Routing evaluate failed: {res.text}"
    case_data = res.json()
    matches = case_data.get("matches", [])
    assert len(matches) > 0
    top_match = matches[0]
    metrics = top_match.get("breakdown_details", {}).get("metrics", {})
    assert "capacity_outlook" in metrics or any("Capacity outlook" in str(e) for e in top_match.get("explanation", []))
    print(f"[PASS] Emergency Match Top Pick: {top_match['hospital_name']}")
    print(f"       Suitability Score: {top_match['suitability_score']}% (Distance: {top_match['distance_km']} km, ETA: {top_match['eta_minutes']} min)")
    print(f"       Capacity Outlook: {metrics.get('capacity_outlook', 'EVALUATED')}")
    print(f"       Explainability Items: {len(top_match['explanation'])} checklist items verified.")

    # 10. Test AI Alerts Query (Section 9)
    print("\n[Step 10] Querying AI Specific Clinical & Capacity Alerts (GET /api/admin/ai/alerts)...")
    res = requests.get(f"{BASE_URL}/api/admin/ai/alerts", headers=admin_headers)
    assert res.status_code == 200
    ai_alerts = res.json()
    print(f"[PASS] Retrieved {len(ai_alerts)} recent AI alerts.")

    # 11. Test Mass Casualty Disaster Scenario Simulation (Section 32 & 33)
    print("\n[Step 11] Executing Mass Casualty Disaster Scenario (POST /api/admin/ai/simulation/start)...")
    res = requests.post(
        f"{BASE_URL}/api/admin/ai/simulation/start",
        json={"scenario": "MASS_CASUALTY"},
        headers=admin_headers
    )
    assert res.status_code == 200, f"Mass casualty sim failed: {res.text}"
    mce_res = res.json()
    assert mce_res["success"] is True
    print(f"[PASS] Mass Casualty Simulation Triggered:")
    print(f"       Message: {mce_res['message']}")
    print(f"       Cases Injected: {mce_res['cases_count']}")

    # 12. Verify Post-Surge Capacity Impact
    print("\n[Step 12] Verifying Post-Surge Network Impact...")
    res = requests.get(f"{BASE_URL}/api/admin/ai/network", headers=admin_headers)
    assert res.status_code == 200
    post_net = res.json()["network_capacity"]
    print(f"[PASS] Active In-Transit Emergencies post-surge: {post_net['active_emergencies']}")

    # 13. Test Capacity Simulation Reset (Section 35)
    print("\n[Step 13] Resetting Simulation State (POST /api/admin/ai/simulation/reset)...")
    res = requests.post(f"{BASE_URL}/api/admin/ai/simulation/reset", headers=admin_headers)
    assert res.status_code == 200
    print("[PASS] Simulation state reset cleanly.")

    print("\n" + "=" * 60)
    print("ALL 13 PHASE 7 AI INTELLIGENCE TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_test()
