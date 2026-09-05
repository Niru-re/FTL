"""
Indian Localization Verification Test Suite (Phase 11)
Tests:
- Hospital coordinates within Indian boundaries (Lat: 8°N-35°N, Lng: 68°E-97°E)
- Phone numbers follow Indian format (+91)
- Ambulance vehicle registrations follow Indian RTO format (e.g. MH-01, DL-01, KA-03)
- Patient accounts contain Indian demographics and languages (English, Hindi, Marathi)
"""

import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from server.database import SessionLocal
from server.models import Hospital, Staff, Ambulance, PatientAccount, Patient

def test_hospital_coordinates():
    db = SessionLocal()
    try:
        hospitals = db.query(Hospital).all()
        assert len(hospitals) >= 12, f"Expected at least 12 hospitals, found {len(hospitals)}"
        
        for h in hospitals:
            # India bounding box roughly: Lat 8 to 36 N, Lng 68 to 98 E
            assert 8.0 <= h.lat <= 36.0, f"Hospital {h.name} lat {h.lat} outside India"
            assert 68.0 <= h.lng <= 98.0, f"Hospital {h.name} lng {h.lng} outside India"
            assert h.contact_phone.startswith("+91"), f"Hospital {h.name} phone {h.contact_phone} does not start with +91"
        print(f"PASS: All {len(hospitals)} hospitals have valid Indian coordinates and +91 contact numbers.")
    finally:
        db.close()

def test_staff_phone_numbers():
    db = SessionLocal()
    try:
        staff_list = db.query(Staff).all()
        assert len(staff_list) > 0, "No staff members found"
        for s in staff_list:
            assert s.phone.startswith("+91"), f"Staff {s.name} phone {s.phone} does not start with +91"
        print(f"PASS: All {len(staff_list)} staff members have +91 Indian contact numbers.")
    finally:
        db.close()

def test_ambulance_registrations_and_phones():
    db = SessionLocal()
    try:
        amb_list = db.query(Ambulance).all()
        assert len(amb_list) >= 10, f"Expected at least 10 ambulances, found {len(amb_list)}"
        indian_rto_prefixes = ("MH-", "DL-", "KA-", "GJ-", "TS-")
        for a in amb_list:
            assert any(a.vehicle_number.startswith(prefix) for prefix in indian_rto_prefixes), \
                f"Ambulance {a.code} reg {a.vehicle_number} does not match Indian state RTO prefix"
            assert a.phone.startswith("+91"), f"Ambulance {a.code} phone {a.phone} does not start with +91"
        print(f"PASS: All {len(amb_list)} ambulances have Indian state RTO plates and +91 phone numbers.")
    finally:
        db.close()

def test_patient_account_localization():
    db = SessionLocal()
    try:
        raj_acct = db.query(PatientAccount).filter(PatientAccount.patient_identifier == "PT-1042").first()
        assert raj_acct is not None, "Raj Mehta patient account not found"
        assert raj_acct.emergency_contact_phone.startswith("+91"), \
            f"Emergency contact phone {raj_acct.emergency_contact_phone} does not start with +91"
        assert raj_acct.preferred_language in ["Hindi", "English", "Marathi"], \
            f"Unexpected preferred language: {raj_acct.preferred_language}"
        print(f"PASS: Patient account localized with language '{raj_acct.preferred_language}' and emergency phone '{raj_acct.emergency_contact_phone}'.")
    finally:
        db.close()

if __name__ == "__main__":
    print("Running Indian Localization Tests...")
    test_hospital_coordinates()
    test_staff_phone_numbers()
    test_ambulance_registrations_and_phones()
    test_patient_account_localization()
    print("All Indian localization verification tests passed successfully!")
