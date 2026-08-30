import sys
import os
sys.path.insert(0, r'd:\FTL2\healthnet')

from fastapi.testclient import TestClient
from server.main import app
from server.auth import create_access_token
from server.database import SessionLocal
from server.models import User, Bed, Resource, Hospital

client = TestClient(app)
token = create_access_token(data={'sub': 'admin@healthnet.demo', 'role': 'ADMIN'})
headers = {'Authorization': f'Bearer {token}'}

print('=== 1. NETWORK SUMMARY ===')
res = client.get('/api/network/summary', headers=headers)
assert res.status_code == 200, f'Expected 200, got {res.status_code}: {res.text}'
summary = res.json()
print(f"Total Hospitals: {summary['total_hospitals']}, Total Beds: {summary['total_beds']}, Available Beds: {summary['available_beds']}, Occupied: {summary['occupied_beds']}, ICU Occ: {summary['icu_occupancy_rate']}%")

print('=== 2. HOSPITALS & SUMMARY ===')
res = client.get('/api/hospitals', headers=headers)
assert res.status_code == 200
hospitals = res.json()
assert len(hospitals) >= 12
hosp1_id = hospitals[0]['id']

res = client.get(f'/api/hospitals/{hosp1_id}', headers=headers)
assert res.status_code == 200
hosp1 = res.json()
print(f"Hospital 1: {hosp1['name']} - {hosp1['branch_name']} ({hosp1['code']})")

res = client.get(f'/api/hospitals/{hosp1_id}/summary', headers=headers)
assert res.status_code == 200
hosp1_summary = res.json()
print(f"Hospital 1 Summary: Total Beds: {hosp1_summary['total_beds']}, ICU Capacity: {hosp1_summary['total_icu_beds']}, Occ: {hosp1_summary['overall_occupancy_rate']}%")

print('=== 3. BRANCHES & DEPARTMENTS ===')
res = client.get('/api/branches', headers=headers)
assert res.status_code == 200
branches = res.json()
print(f'Retrieved {len(branches)} branches')

res = client.get('/api/departments', headers=headers)
assert res.status_code == 200
departments = res.json()
print(f'Retrieved {len(departments)} departments')

print('=== 4. ICUs & WARDS ===')
res = client.get('/api/icus', headers=headers)
assert res.status_code == 200
icus = res.json()
print(f'Retrieved {len(icus)} ICU units')

res = client.get('/api/wards', headers=headers)
assert res.status_code == 200
wards = res.json()
print(f'Retrieved {len(wards)} Inpatient Wards')

print('=== 5. BEDS & STATE TRANSITION ENGINE ===')
res = client.get(f'/api/beds?hospital_id={hosp1_id}&status=OCCUPIED', headers=headers)
assert res.status_code == 200
occupied_beds = res.json()
assert len(occupied_beds) > 0
test_bed = occupied_beds[0]
print(f"Test Bed: {test_bed['code']} (Status: {test_bed['status']})")

# Attempt Illegal Transition: OCCUPIED -> AVAILABLE (Must fail with 400)
bad_trans = client.patch(f"/api/beds/{test_bed['id']}/status", json={'status': 'AVAILABLE', 'reason': 'Testing illegal jump'}, headers=headers)
assert bad_trans.status_code == 400, f'Expected 400 for illegal transition, got {bad_trans.status_code}: {bad_trans.text}'
print('Blocked illegal transition OCCUPIED -> AVAILABLE (HTTP 400 as expected)')

# Valid Transition 1: OCCUPIED -> CLEANING
good_trans1 = client.patch(f"/api/beds/{test_bed['id']}/status", json={'status': 'CLEANING', 'reason': 'Patient discharged'}, headers=headers)
assert good_trans1.status_code == 200, f"Expected 200, got {good_trans1.status_code}: {good_trans1.text}"
assert good_trans1.json()['status'] == 'CLEANING'
print('Valid transition OCCUPIED -> CLEANING successful')

# Valid Transition 2: CLEANING -> AVAILABLE
good_trans2 = client.patch(f"/api/beds/{test_bed['id']}/status", json={'status': 'AVAILABLE', 'reason': 'Sanitization finished'}, headers=headers)
assert good_trans2.status_code == 200
assert good_trans2.json()['status'] == 'AVAILABLE'
print('Valid transition CLEANING -> AVAILABLE successful')

# Valid Transition 3: AVAILABLE -> RESERVED
good_trans3 = client.patch(f"/api/beds/{test_bed['id']}/status", json={'status': 'RESERVED', 'reason': 'Inbound trauma patient'}, headers=headers)
assert good_trans3.status_code == 200
assert good_trans3.json()['status'] == 'RESERVED'
print('Valid transition AVAILABLE -> RESERVED successful')

# Return to OCCUPIED
good_trans4 = client.patch(f"/api/beds/{test_bed['id']}/status", json={'status': 'OCCUPIED', 'reason': 'Patient admitted to bed'}, headers=headers)
assert good_trans4.status_code == 200
assert good_trans4.json()['status'] == 'OCCUPIED'
print('Valid transition RESERVED -> OCCUPIED successful')

print('=== 6. RESOURCE MANAGEMENT ===')
res = client.get('/api/resources?resource_type=Ventilator', headers=headers)
assert res.status_code == 200
vents = res.json()
assert len(vents) > 0
test_vent = vents[0]
print(f"Test Ventilator: {test_vent['name']} (ID: {test_vent['id']}, Qty: {test_vent['quantity']}, Avail: {test_vent['available_quantity']})")

# Update ventilator available quantity
new_avail = max(1, test_vent['available_quantity'] - 1)
res_patch = client.patch(f"/api/resources/{test_vent['id']}", json={'available_quantity': new_avail}, headers=headers)
assert res_patch.status_code == 200
assert res_patch.json()['available_quantity'] == new_avail
print(f'Updated ventilator available quantity to {new_avail}')

# Verify hospital summary reflects change
hosp_res = client.get(f"/api/hospitals/{test_vent['hospital_id']}/summary", headers=headers)
assert hosp_res.status_code == 200
print(f"Hospital ventilators after update: {hosp_res.json()['ventilators_available']}/{hosp_res.json()['ventilators_total']}")

print('=== ALL PHASE 2 TESTS COMPLETED SUCCESSFULLY! ===')
