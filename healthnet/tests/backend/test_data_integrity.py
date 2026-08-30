import pytest
from server.database import SessionLocal
from server.models import Hospital, Branch, Department, Bed, Resource, Patient, Ambulance, EmergencyCase

def test_database_referential_integrity():
    db = SessionLocal()
    try:
        # Check all branches have a valid hospital
        branches = db.query(Branch).all()
        for b in branches:
            assert b.hospital_id is not None
            hosp = db.query(Hospital).filter(Hospital.id == b.hospital_id).first()
            assert hosp is not None, f"Orphan branch {b.name} references non-existent hospital {b.hospital_id}"

        # Check all departments have a valid branch
        departments = db.query(Department).all()
        for d in departments:
            assert d.branch_id is not None
            br = db.query(Branch).filter(Branch.id == d.branch_id).first()
            assert br is not None, f"Orphan department {d.name} references non-existent branch {d.branch_id}"

        # Check all beds have a valid department
        beds = db.query(Bed).all()
        for bed in beds:
            assert bed.department_id is not None
            dept = db.query(Department).filter(Department.id == bed.department_id).first()
            assert dept is not None, f"Orphan bed {bed.code} references non-existent department {bed.department_id}"

        # Check no negative bed counts or resources
        resources = db.query(Resource).all()
        for r in resources:
            assert r.quantity >= 0
            assert r.available_quantity >= 0

        # Check no patients have invalid hospital links
        patients = db.query(Patient).all()
        for p in patients:
            if p.hospital_id:
                h = db.query(Hospital).filter(Hospital.id == p.hospital_id).first()
                assert h is not None, f"Patient {p.full_name} references invalid hospital {p.hospital_id}"

    finally:
        db.close()
