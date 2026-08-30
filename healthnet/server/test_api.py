import sys
sys.path.insert(0, r'd:\FTL2\healthnet')
from fastapi.testclient import TestClient
from server.main import app

client = TestClient(app)

# 1. Root
res = client.get('/')
print('Root:', res.status_code, res.json()['system'])

# 2. Demo logins
for role in ['ADMIN', 'DOCTOR', 'NURSE']:
    res = client.post(f'/api/auth/demo-login/{role}')
    assert res.status_code == 200, f'Failed login for {role}'
    data = res.json()
    print(f'Login {role}: Success! Token role={data["role"]}, User={data["full_name"]}')

# 3. Hospitals
res = client.get('/api/hospitals')
assert res.status_code == 200
hospitals = res.json()
print(f'Hospitals count: {len(hospitals)}, First: {hospitals[0]["name"]} (Total Beds: {hospitals[0]["total_beds"]}, Avail: {hospitals[0]["available_beds"]})')

# 4. Beds
res = client.get('/api/beds?bed_type=ICU')
assert res.status_code == 200
icu_beds = res.json()
print(f'ICU Beds count: {len(icu_beds)}, Sample: {icu_beds[0]["code"]} status={icu_beds[0]["status"]}')

# 5. Routing engine test
intake_payload = {
    'patient_name': 'Test Emergency',
    'patient_age': 55,
    'patient_gender': 'Male',
    'condition_summary': 'Suspected acute MI, chest pain, diaphoresis',
    'priority': 'RED',
    'required_icu': True,
    'required_ventilator': True,
    'required_oxygen': True,
    'required_specialist': 'Cardiologist',
    'required_er': True,
    'pickup_lat': 40.7300,
    'pickup_lng': -73.9900
}
res = client.post('/api/emergency/find-best-hospital', json=intake_payload)
assert res.status_code == 200
rankings = res.json()
print(f'Hospital Rankings count: {len(rankings)}')
print(f'Top Ranked Hospital: {rankings[0]["hospital_name"]} (Score: {rankings[0]["suitability_score"]}/100, ETA: {rankings[0]["eta_minutes"]}m)')

# 6. Reserve and dispatch
reserve_payload = {
    'intake': intake_payload,
    'selected_hospital_id': rankings[0]['hospital_id'],
    'selected_bed_id': rankings[0]['recommended_bed_id']
}
res = client.post('/api/emergency/reserve-and-dispatch', json=reserve_payload)
assert res.status_code == 200
res_data = res.json()
print('Reservation Success:', res_data['message'])
print(f'Reserved Bed Code: {res_data["reserved_bed"]["code"]}, Status: {res_data["reserved_bed"]["status"]}')

# 7. Analytics
res = client.get('/api/analytics/summary')
assert res.status_code == 200
print('Analytics Summary: Total Beds =', res.json()['total_beds'], 'Active Ambulances =', res.json()['active_ambulances'])
