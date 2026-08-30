import json
import datetime
import random
from sqlalchemy.orm import Session
from .database import engine, Base, SessionLocal
from .models import (
    HospitalNetwork, Role, User, Hospital, Branch, Department, Unit,
    Bed, Resource, Staff, Patient, PatientVital, ClinicalNote, NursingNote, LabResult,
    Medication, MedicationAdministration, NurseTask, DoctorRequest, DoctorOrder,
    PatientTransfer, PatientDischarge, RiskPrediction, ShiftHandover,
    Ambulance, EmergencyCase, Alert, AuditLog
)
from .auth import hash_password

# 12 Metro Hospitals with realistic geographical distribution (approx. 20km metro area)
HOSPITAL_DATA = [
    {
        "name": "HealthNet Central Hospital",
        "branch_name": "Downtown Medical Campus",
        "code": "HNC-01",
        "address": "100 Medical Center Blvd, Downtown",
        "lat": 40.7128,
        "lng": -74.0060,
        "total_beds": 60,
        "icu_capacity": 20,
        "ward_capacity": 30,
        "er_capacity": 10,
        "ventilators_total": 16,
        "ventilators_available": 6,
        "ecmo_available": True,
        "trauma_level": "Level 1 Comprehensive",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0100"
    },
    {
        "name": "HealthNet North Pavilion",
        "branch_name": "North Metro Campus",
        "code": "HNN-02",
        "address": "450 Northern Parkway, Northside",
        "lat": 40.7589,
        "lng": -73.9851,
        "total_beds": 50,
        "icu_capacity": 16,
        "ward_capacity": 24,
        "er_capacity": 10,
        "ventilators_total": 12,
        "ventilators_available": 4,
        "ecmo_available": True,
        "trauma_level": "Level 1 Comprehensive",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0200"
    },
    {
        "name": "HealthNet East Medical Center",
        "branch_name": "East River Campus",
        "code": "HNE-03",
        "address": "880 Sunrise Blvd, East District",
        "lat": 40.7282,
        "lng": -73.9442,
        "total_beds": 45,
        "icu_capacity": 14,
        "ward_capacity": 22,
        "er_capacity": 9,
        "ventilators_total": 10,
        "ventilators_available": 3,
        "ecmo_available": False,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0300"
    },
    {
        "name": "HealthNet South Memorial",
        "branch_name": "South Bay Branch",
        "code": "HNS-04",
        "address": "320 Harbor View Dr, South Bay",
        "lat": 40.6782,
        "lng": -74.0150,
        "total_beds": 40,
        "icu_capacity": 12,
        "ward_capacity": 20,
        "er_capacity": 8,
        "ventilators_total": 8,
        "ventilators_available": 2,
        "ecmo_available": False,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "SURGE",
        "contact_phone": "+1-555-0400"
    },
    {
        "name": "HealthNet Westside Academic",
        "branch_name": "Uptown Academic Center",
        "code": "HNW-05",
        "address": "1200 University Ave, Uptown",
        "lat": 40.8075,
        "lng": -73.9626,
        "total_beds": 55,
        "icu_capacity": 18,
        "ward_capacity": 27,
        "er_capacity": 10,
        "ventilators_total": 14,
        "ventilators_available": 5,
        "ecmo_available": True,
        "trauma_level": "Level 1 Comprehensive",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0500"
    },
    {
        "name": "HealthNet Metro General",
        "branch_name": "Midtown Metro Wing",
        "code": "HNM-06",
        "address": "620 Lexington Ave, Midtown",
        "lat": 40.7580,
        "lng": -73.9720,
        "total_beds": 48,
        "icu_capacity": 15,
        "ward_capacity": 23,
        "er_capacity": 10,
        "ventilators_total": 11,
        "ventilators_available": 4,
        "ecmo_available": False,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0600"
    },
    {
        "name": "HealthNet CityCare Center",
        "branch_name": "Central Midtown Wing",
        "code": "HNC-07",
        "address": "510 5th Avenue, Central",
        "lat": 40.7527,
        "lng": -73.9818,
        "total_beds": 40,
        "icu_capacity": 10,
        "ward_capacity": 22,
        "er_capacity": 8,
        "ventilators_total": 8,
        "ventilators_available": 1,
        "ecmo_available": False,
        "trauma_level": "Level 3 Community",
        "emergency_status": "DIVERT",
        "contact_phone": "+1-555-0700"
    },
    {
        "name": "HealthNet Riverside Health",
        "branch_name": "West River Park",
        "code": "HNR-08",
        "address": "250 Riverside Blvd, West End",
        "lat": 40.7760,
        "lng": -73.9890,
        "total_beds": 35,
        "icu_capacity": 10,
        "ward_capacity": 18,
        "er_capacity": 7,
        "ventilators_total": 7,
        "ventilators_available": 3,
        "ecmo_available": False,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0800"
    },
    {
        "name": "HealthNet Heights Pavilion",
        "branch_name": "Northern Heights",
        "code": "HNH-09",
        "address": "140 Fort Washington Ave, Heights",
        "lat": 40.8400,
        "lng": -73.9400,
        "total_beds": 38,
        "icu_capacity": 12,
        "ward_capacity": 18,
        "er_capacity": 8,
        "ventilators_total": 9,
        "ventilators_available": 4,
        "ecmo_available": False,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-0900"
    },
    {
        "name": "HealthNet Queensview Medical",
        "branch_name": "Queens Plaza Hub",
        "code": "HNQ-10",
        "address": "28-01 Queens Blvd, Long Island City",
        "lat": 40.7490,
        "lng": -73.9380,
        "total_beds": 42,
        "icu_capacity": 13,
        "ward_capacity": 21,
        "er_capacity": 8,
        "ventilators_total": 9,
        "ventilators_available": 3,
        "ecmo_available": True,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-1000"
    },
    {
        "name": "HealthNet Harborview Hospital",
        "branch_name": "Red Hook Waterfront",
        "code": "HNH-11",
        "address": "400 Van Brunt St, Red Hook",
        "lat": 40.6750,
        "lng": -74.0120,
        "total_beds": 32,
        "icu_capacity": 8,
        "ward_capacity": 18,
        "er_capacity": 6,
        "ventilators_total": 6,
        "ventilators_available": 2,
        "ecmo_available": False,
        "trauma_level": "Level 3 Community",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-1100"
    },
    {
        "name": "HealthNet Gateway Medical",
        "branch_name": "Airport Medical Corridor",
        "code": "HNG-12",
        "address": "90-01 Grand Central Pkwy, Eastside",
        "lat": 40.7700,
        "lng": -73.8700,
        "total_beds": 36,
        "icu_capacity": 10,
        "ward_capacity": 18,
        "er_capacity": 8,
        "ventilators_total": 7,
        "ventilators_available": 2,
        "ecmo_available": False,
        "trauma_level": "Level 2 Regional",
        "emergency_status": "NORMAL",
        "contact_phone": "+1-555-1200"
    }
]

DEPARTMENT_TEMPLATES = [
    {"name": "Intensive Care Unit", "code": "ICU", "floor": "Floor 4"},
    {"name": "Emergency Department", "code": "ER", "floor": "Ground Floor"},
    {"name": "General Ward", "code": "WRD", "floor": "Floor 2"},
    {"name": "Cardiology Department", "code": "CARD", "floor": "Floor 3"},
    {"name": "Neurology Department", "code": "NEUR", "floor": "Floor 3"},
    {"name": "Trauma & Orthopedic Surgery", "code": "TRMA", "floor": "Floor 1"},
    {"name": "Pulmonology & Respiratory Care", "code": "PULM", "floor": "Floor 4"},
    {"name": "General & Laparoscopic Surgery", "code": "SURG", "floor": "Floor 2"}
]

RESOURCE_TEMPLATES = [
    {"type": "Ventilator", "name": "Hamilton-C6 High-Performance Ventilator", "base_qty": 8},
    {"type": "Patient Monitor", "name": "Philips IntelliVue MX800 Multi-Parameter Monitor", "base_qty": 18},
    {"type": "Infusion Pump", "name": "Alaris MedSystem III Multi-Channel Pump", "base_qty": 24},
    {"type": "Oxygen Concentrator", "name": "Drive DeVilbiss 10L High-Flow Concentrator", "base_qty": 10},
    {"type": "Oxygen Cylinder", "name": "Medical Grade E-Type Oxygen Cylinder (680L)", "base_qty": 35},
    {"type": "Defibrillator", "name": "Zoll R Series ALS Biphasic Defibrillator", "base_qty": 6},
    {"type": "Wheelchair", "name": "Drive Medical Heavy-Duty Transport Wheelchair", "base_qty": 15},
    {"type": "ICU Equipment", "name": "Getinge RotaFlow ECMO Emergency Console", "base_qty": 4}
]

from sqlalchemy import text as sa_text

def seed_database():
    with engine.connect() as conn:
        conn.execute(sa_text("PRAGMA foreign_keys = OFF;"))
        conn.commit()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()
    try:
        print("Initializing HealthNet Database...")

        # 1. Seed Hospital Network
        network = HospitalNetwork(
            name="HealthNet Medical Group",
            code="HN-GRP",
            description="Metropolitan Integrated Healthcare & Resource Orchestration Network"
        )
        db.add(network)
        db.commit()
        db.refresh(network)

        # 2. Seed Roles
        roles = [
            Role(name="ADMIN", description="System Administrator & Network Dispatcher"),
            Role(name="DOCTOR", description="Attending Physician & Clinical Specialist"),
            Role(name="NURSE", description="Ward Charge Nurse & Nursing Officer")
        ]
        db.add_all(roles)
        db.commit()

        # 3. Seed Hospitals and Branches
        hospitals = []
        branches = []
        for i, hdata in enumerate(HOSPITAL_DATA):
            hosp = Hospital(
                network_id=network.id,
                name=hdata["name"],
                branch_name=hdata["branch_name"],
                code=hdata["code"],
                address=hdata["address"],
                lat=hdata["lat"],
                lng=hdata["lng"],
                total_beds=hdata["total_beds"],
                icu_capacity=hdata["icu_capacity"],
                ward_capacity=hdata["ward_capacity"],
                er_capacity=hdata["er_capacity"],
                ventilators_total=hdata["ventilators_total"],
                ventilators_available=hdata["ventilators_available"],
                ecmo_available=hdata["ecmo_available"],
                trauma_level=hdata["trauma_level"],
                emergency_status=hdata["emergency_status"],
                contact_phone=hdata["contact_phone"]
            )
            db.add(hosp)
            db.commit()
            db.refresh(hosp)
            hospitals.append(hosp)

            # Create corresponding Branch entry
            branch = Branch(
                network_id=network.id,
                hospital_id=hosp.id,
                name=f"{hosp.name} - {hosp.branch_name}",
                code=f"{hosp.code}-BR",
                address=hosp.address,
                lat=hosp.lat,
                lng=hosp.lng,
                contact_phone=hosp.contact_phone,
                emergency_status=hosp.emergency_status
            )
            db.add(branch)
            db.commit()
            db.refresh(branch)
            branches.append(branch)

        print(f"Seeded {len(hospitals)} hospitals and {len(branches)} branches.")
        primary_hospital = hospitals[0]

        # 4. Seed Departments & Units
        all_departments = []
        for hosp in hospitals:
            for dept_tmpl in DEPARTMENT_TEMPLATES:
                dept = Department(
                    hospital_id=hosp.id,
                    branch_id=hosp.id,
                    name=dept_tmpl["name"],
                    code=f"{hosp.code}-{dept_tmpl['code']}",
                    floor=dept_tmpl["floor"],
                    head_doctor_name="Dr. Ananya Mehta" if dept_tmpl["code"] == "CARD" else "Dr. David Cho"
                )
                db.add(dept)
                db.commit()
                db.refresh(dept)
                all_departments.append(dept)

                # Seed Units (ICU & Wards)
                unit_name_a = f"{dept.name} Unit A"
                unit_name_b = f"{dept.name} Unit B"
                unit_type = "ICU" if dept_tmpl["code"] == "ICU" else ("ER" if dept_tmpl["code"] == "ER" else "WARD")
                
                if dept_tmpl["code"] == "ICU":
                    unit_name_a = f"{hosp.code} Medical ICU"
                    unit_name_b = f"{hosp.code} Surgical ICU"
                elif dept_tmpl["code"] == "WRD":
                    unit_name_a = f"{hosp.code} General Inpatient Ward"
                    unit_name_b = f"{hosp.code} Semi-Private Ward"

                unit1 = Unit(
                    department_id=dept.id,
                    name=unit_name_a,
                    unit_type=unit_type,
                    capacity=10
                )
                unit2 = Unit(
                    department_id=dept.id,
                    name=unit_name_b,
                    unit_type=unit_type,
                    capacity=10
                )
                db.add_all([unit1, unit2])
                db.commit()

        print(f"Seeded {len(all_departments)} departments.")

        # 5. Seed Resources
        total_resources = 0
        for hosp in hospitals:
            for res_tmpl in RESOURCE_TEMPLATES:
                avail = max(1, res_tmpl["base_qty"] - random.randint(1, 3))
                stat = "AVAILABLE" if avail > 0 else "IN_USE"
                res = Resource(
                    resource_id=f"RES-{hosp.code}-{res_tmpl['type'][:3].upper()}-{random.randint(100, 999)}",
                    hospital_id=hosp.id,
                    branch_id=hosp.id,
                    resource_type=res_tmpl["type"],
                    name=res_tmpl["name"],
                    quantity=res_tmpl["base_qty"],
                    available_quantity=avail,
                    status=stat
                )
                db.add(res)
                total_resources += 1
        db.commit()
        print(f"Seeded {total_resources} equipment resources across all hospitals (target: 100+ units).")

        # 6. Seed 300+ Beds across the network with realistic occupancy ratios
        all_beds = []
        bed_counter = 1

        # Target ICU Occupancy Ratios for realistic variance
        icu_ratios = [0.70, 0.67, 0.43, 0.92, 0.55, 0.88, 0.75, 0.40, 0.60, 0.85, 0.38, 0.50]

        for idx, hosp in enumerate(hospitals):
            ratio = icu_ratios[idx % len(icu_ratios)]
            hosp_depts = [d for d in all_departments if d.hospital_id == hosp.id]
            icu_dept = next((d for d in hosp_depts if "Intensive Care" in d.name), hosp_depts[0])
            er_dept = next((d for d in hosp_depts if "Emergency" in d.name), hosp_depts[1])
            wrd_dept = next((d for d in hosp_depts if "General Ward" in d.name), hosp_depts[2])
            surg_dept = next((d for d in hosp_depts if "Surgery" in d.name), hosp_depts[3])

            # Seed ICU Beds
            occ_count = int(hosp.icu_capacity * ratio)
            for b_idx in range(1, hosp.icu_capacity + 1):
                if b_idx <= occ_count:
                    status_choice = "OCCUPIED"
                elif b_idx == hosp.icu_capacity:
                    status_choice = "RESERVED"
                elif b_idx == hosp.icu_capacity - 1 and hosp.icu_capacity > 4:
                    status_choice = "CLEANING"
                else:
                    status_choice = "AVAILABLE"

                bed = Bed(
                    code=f"{hosp.code}-ICU-{b_idx:02d}",
                    hospital_id=hosp.id,
                    department_id=icu_dept.id,
                    bed_type="ICU",
                    status=status_choice,
                    equipment=json.dumps(["Ventilator", "Oxygen Port", "Telemetry Monitor", "Infusion Pump"]),
                    notes="Equipped with Class 1 Negative Pressure Filter"
                )
                db.add(bed)
                all_beds.append(bed)
                bed_counter += 1

            # Seed Emergency Beds
            for b_idx in range(1, hosp.er_capacity + 1):
                status_choice = "OCCUPIED" if b_idx <= int(hosp.er_capacity * 0.5) else "AVAILABLE"
                bed = Bed(
                    code=f"{hosp.code}-ER-{b_idx:02d}",
                    hospital_id=hosp.id,
                    department_id=er_dept.id,
                    bed_type="EMERGENCY",
                    status=status_choice,
                    equipment=json.dumps(["Defibrillator", "Oxygen Port", "Monitor"]),
                    notes="Rapid assessment resuscitation bay"
                )
                db.add(bed)
                all_beds.append(bed)
                bed_counter += 1

            # Seed General Ward Beds
            for b_idx in range(1, hosp.ward_capacity + 1):
                status_choice = "OCCUPIED" if b_idx <= int(hosp.ward_capacity * 0.6) else "AVAILABLE"
                bed = Bed(
                    code=f"{hosp.code}-WRD-{b_idx:02d}",
                    hospital_id=hosp.id,
                    department_id=wrd_dept.id,
                    bed_type="GENERAL",
                    status=status_choice,
                    equipment=json.dumps(["Oxygen Port", "IV Stand"]),
                    notes="Standard inpatient observation"
                )
                db.add(bed)
                all_beds.append(bed)
                bed_counter += 1

            # Seed OT Recovery Beds
            for b_idx in range(1, 5):
                bed = Bed(
                    code=f"{hosp.code}-OT-{b_idx:02d}",
                    hospital_id=hosp.id,
                    department_id=surg_dept.id,
                    bed_type="SURGICAL_STEPDOWN",
                    status="AVAILABLE" if b_idx % 2 == 0 else "OCCUPIED",
                    equipment=json.dumps(["Cardiac Monitor", "Oxygen Port", "Suction Unit"]),
                    notes="Post-anesthesia care bay"
                )
                db.add(bed)
                all_beds.append(bed)
                bed_counter += 1

        db.commit()
        print(f"Seeded {len(all_beds)} total beds across {len(hospitals)} hospitals (target: 300+).")

        # 7. Seed Staff (Doctors and Nurses)
        staff_members = [
            # Primary Hospital Doctors
            Staff(
                name="Dr. Arjun Sharma",
                employee_code="DOC-101",
                staff_type="DOCTOR",
                specialization="Critical Care",
                hospital_id=primary_hospital.id,
                department_id=all_departments[0].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone="+1-555-0181"
            ),
            Staff(
                name="Dr. Michael Chen",
                employee_code="DOC-102",
                staff_type="DOCTOR",
                specialization="Neurology",
                hospital_id=primary_hospital.id,
                department_id=all_departments[4].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone="+1-555-0182"
            ),
            Staff(
                name="Dr. Sarah Jenkins",
                employee_code="DOC-103",
                staff_type="DOCTOR",
                specialization="Trauma Surgery",
                hospital_id=primary_hospital.id,
                department_id=all_departments[5].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone="+1-555-0183"
            ),
            Staff(
                name="Dr. Rajiv Patel",
                employee_code="DOC-104",
                staff_type="DOCTOR",
                specialization="Intensive Care",
                hospital_id=primary_hospital.id,
                department_id=all_departments[0].id,
                shift="NIGHT",
                on_duty_status="ON_CALL",
                phone="+1-555-0184"
            ),
            # Primary Hospital Nurses
            Staff(
                name="Nurse Elena Rostova",
                employee_code="NUR-201",
                staff_type="NURSE",
                specialization="ICU Critical Care",
                hospital_id=primary_hospital.id,
                department_id=all_departments[0].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone="+1-555-0191"
            ),
            Staff(
                name="Nurse Jack Collins",
                employee_code="NUR-202",
                staff_type="NURSE",
                specialization="Emergency Care",
                hospital_id=primary_hospital.id,
                department_id=all_departments[1].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone="+1-555-0192"
            ),
            Staff(
                name="Nurse Maya Lin",
                employee_code="NUR-203",
                staff_type="NURSE",
                specialization="Cardiac Care",
                hospital_id=primary_hospital.id,
                department_id=all_departments[3].id,
                shift="EVENING",
                on_duty_status="ON_DUTY",
                phone="+1-555-0193"
            ),
            Staff(
                name="Nurse David Rossi",
                employee_code="NUR-204",
                staff_type="NURSE",
                specialization="Surgical Ward",
                hospital_id=primary_hospital.id,
                department_id=all_departments[7].id,
                shift="NIGHT",
                on_duty_status="ON_DUTY",
                phone="+1-555-0194"
            )
        ]

        # Add staff for remaining hospitals
        for h_idx, hosp in enumerate(hospitals[1:], start=2):
            h_depts = [d for d in all_departments if d.hospital_id == hosp.id]
            staff_members.append(Staff(
                name=f"Dr. Attending {hosp.code}",
                employee_code=f"DOC-{hosp.code}-01",
                staff_type="DOCTOR",
                specialization="General Medicine",
                hospital_id=hosp.id,
                department_id=h_depts[0].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone=f"+1-555-01{h_idx:02d}"
            ))
            staff_members.append(Staff(
                name=f"Nurse Charge {hosp.code}",
                employee_code=f"NUR-{hosp.code}-01",
                staff_type="NURSE",
                specialization="Ward Nursing",
                hospital_id=hosp.id,
                department_id=h_depts[0].id,
                shift="MORNING",
                on_duty_status="ON_DUTY",
                phone=f"+1-555-02{h_idx:02d}"
            ))

        db.add_all(staff_members)
        db.commit()
        print(f"Seeded {len(staff_members)} clinical staff members (Doctors & Nurses).")

        # 8. Seed Demo Users (Password: admin123, doctor123, nurse123)
        demo_users = [
            User(
                email="admin@healthnet.demo",
                hashed_password=hash_password("admin123"),
                full_name="Dr. Arthur Vance",
                role="ADMIN",
                hospital_id=primary_hospital.id,
                branch_id=primary_hospital.id,
                department="Hospital Operations & Dispatch",
                is_active=True
            ),
            User(
                email="doctor@healthnet.demo",
                hashed_password=hash_password("doctor123"),
                full_name="Dr. Arjun Sharma",
                role="DOCTOR",
                hospital_id=primary_hospital.id,
                branch_id=primary_hospital.id,
                department="Medical ICU",
                is_active=True
            ),
            User(
                email="nurse@healthnet.demo",
                hashed_password=hash_password("nurse123"),
                full_name="Nurse Elena Rostova",
                role="NURSE",
                hospital_id=primary_hospital.id,
                branch_id=primary_hospital.id,
                department="Intensive Care Unit",
                is_active=True
            )
        ]
        db.add_all(demo_users)
        db.commit()
        print("Seeded 3 demo authentication accounts (Admin, Doctor, Nurse).")

        # 9. Seed Inpatients (25+ patients across the network, 10 assigned to demo nurse)
        # 9. Seed Inpatients (35+ patients across the network, 12 assigned to demo doctor Dr. Arjun Sharma)
        doc_arjun = staff_members[0]
        nurse_elena = staff_members[4]
        primary_hosp_beds = [b for b in all_beds if b.hospital_id == primary_hospital.id]

        all_patient_templates = [
            # Demo Doctor & Nurse Assigned Patients in Central Hospital (12 Patients)
            {"mrn": "PT-1042", "name": "Raj Mehta", "age": 62, "gender": "Male", "blood": "O+", "status": "CRITICAL", "triage": "RED", "diag": "Severe Bilateral Pneumonia & Acute Hypoxemia", "bed_idx": 0, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Penicillin", "Sulfa Drugs"], "history": ["Essential Hypertension (10y)", "COPD (5y)", "Type 2 Diabetes (7y)"]},
            {"mrn": "PT-1043", "name": "Sarah Jenkins", "age": 45, "gender": "Female", "blood": "A+", "status": "CRITICAL", "triage": "RED", "diag": "Acute Septic Shock with Multiorgan Dysfunction", "bed_idx": 1, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Latex"], "history": ["Urosepsis (2023)", "Systemic Lupus Erythematosus (2019)"]},
            {"mrn": "PT-1044", "name": "Arthur Pendelton", "age": 64, "gender": "Male", "blood": "O+", "status": "HIGH_RISK", "triage": "RED", "diag": "Post-Anterior STEMI with Cardiogenic Shock", "bed_idx": 2, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Aspirin", "Ibuprofen (NSAIDs)"], "history": ["Coronary Artery Disease", "Previous PCI with DES (2021)", "Hyperlipidemia"]},
            {"mrn": "PT-1045", "name": "Eleanor Vance", "age": 58, "gender": "Female", "blood": "A+", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Acute Exacerbation of COPD on BiPAP", "bed_idx": 3, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Codeine"], "history": ["Severe Emphysema", "Chronic Respiratory Failure", "Tobacco Use Disorder (40 pack-years)"]},
            {"mrn": "PT-1046", "name": "Carlos Mendez", "age": 42, "gender": "Male", "blood": "B+", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Post-Op Day 1 Open Abdominal Aortic Repair", "bed_idx": 4, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Morphine"], "history": ["Abdominal Aortic Aneurysm 5.8cm", "Refractory Hypertension"]},
            {"mrn": "PT-1047", "name": "Grace Hopper", "age": 71, "gender": "Female", "blood": "AB-", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Acute Ischemic Stroke on IV Heparin Protocol", "bed_idx": 5, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["None Known"], "history": ["Atrial Fibrillation on Anticoagulation", "Previous TIA (2022)"]},
            {"mrn": "PT-1048", "name": "David Wallace", "age": 53, "gender": "Male", "blood": "O-", "status": "STABLE", "triage": "YELLOW", "diag": "Hypertensive Urgency with Mild Renal Impairment", "bed_idx": 6, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["ACE Inhibitors (Angioedema)"], "history": ["Chronic Kidney Disease Stage 2", "Essential Hypertension"]},
            {"mrn": "PT-1049", "name": "Maria Gonzales", "age": 36, "gender": "Female", "blood": "B+", "status": "STABLE", "triage": "GREEN", "diag": "Post-Thrombolysis DVT Observation", "bed_idx": 7, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Ciprofloxacin"], "history": ["Deep Vein Thrombosis Right Lower Extremity", "Factor V Leiden Heterozygote"]},
            {"mrn": "PT-1050", "name": "Vikram Sethi", "age": 49, "gender": "Male", "blood": "A-", "status": "STABLE", "triage": "GREEN", "diag": "Uncomplicated Acute Pancreatitis on IV Hydration", "bed_idx": 8, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["None Known"], "history": ["Cholelithiasis", "Alcohol-induced Pancreatitis Episode (2021)"]},
            {"mrn": "PT-1051", "name": "Chloe Bennett", "age": 29, "gender": "Female", "blood": "O+", "status": "STABLE", "triage": "GREEN", "diag": "Diabetic Ketoacidosis Resolved - Transition to SubQ", "bed_idx": 9, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Sulfa"], "history": ["Type 1 Diabetes Mellitus (Onset age 14)", "Continuous Glucose Monitor User"]},
            {"mrn": "PT-1052", "name": "Leonard Hofstadter", "age": 44, "gender": "Male", "blood": "O+", "status": "STABLE", "triage": "GREEN", "diag": "Severe Persistent Asthma under Maintenance", "bed_idx": 10, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["Lactose", "Tree Nuts"], "history": ["Childhood Asthma", "Allergic Rhinitis"]},
            {"mrn": "PT-1053", "name": "Beverly Crusher", "age": 56, "gender": "Female", "blood": "A+", "status": "STABLE", "triage": "GREEN", "diag": "Post-Pacemaker Implantation Routine Telemetry", "bed_idx": 11, "nurse": nurse_elena, "doc": doc_arjun, "hosp": primary_hospital, "dept": all_departments[0], "allergies": ["None Known"], "history": ["Symptomatic Sinus Node Dysfunction", "Hypothyroidism"]},

            # Other Network Patients (25 Patients across network)
            {"mrn": "PT-2001", "name": "James Wilson", "age": 68, "gender": "Male", "blood": "A+", "status": "CRITICAL", "triage": "RED", "diag": "Severe Traumatic Brain Injury", "bed_idx": 0, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[1], "dept": all_departments[8], "allergies": ["None Known"], "history": ["Hypertension"]},
            {"mrn": "PT-2002", "name": "Emily Clarke", "age": 34, "gender": "Female", "blood": "B-", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Post-Partum Hemorrhage", "bed_idx": 1, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[1], "dept": all_departments[8], "allergies": ["Penicillin"], "history": ["Gestational Diabetes"]},
            {"mrn": "PT-2003", "name": "Robert Langdon", "age": 55, "gender": "Male", "blood": "AB+", "status": "STABLE", "triage": "GREEN", "diag": "Fractured Femur Post-ORIF", "bed_idx": 2, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[1], "dept": all_departments[8], "allergies": ["None Known"], "history": ["None"]},
            {"mrn": "PT-3001", "name": "Sophia Turner", "age": 61, "gender": "Female", "blood": "O+", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Acute Decompensated Heart Failure", "bed_idx": 0, "nurse": staff_members[6], "doc": staff_members[2], "hosp": hospitals[2], "dept": all_departments[16], "allergies": ["Latex"], "history": ["Ischemic Cardiomyopathy EF 30%"]},
            {"mrn": "PT-3002", "name": "Daniel Craig", "age": 50, "gender": "Male", "blood": "A+", "status": "CRITICAL", "triage": "RED", "diag": "Acute Respiratory Distress Syndrome (ARDS)", "bed_idx": 1, "nurse": staff_members[6], "doc": staff_members[2], "hosp": hospitals[2], "dept": all_departments[16], "allergies": ["None Known"], "history": ["Aspiration Pneumonia"]},
            {"mrn": "PT-4001", "name": "Lucas Scott", "age": 28, "gender": "Male", "blood": "O+", "status": "STABLE", "triage": "GREEN", "diag": "Asthma Exacerbation Controlled", "bed_idx": 0, "nurse": staff_members[7], "doc": staff_members[3], "hosp": hospitals[3], "dept": all_departments[24], "allergies": ["Dust Mites"], "history": ["Mild Intermittent Asthma"]},
            {"mrn": "PT-5001", "name": "Hannah Abbott", "age": 41, "gender": "Female", "blood": "A+", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Complicated Pyelonephritis on IV Antibiotics", "bed_idx": 0, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[4], "dept": all_departments[32], "allergies": ["Cephalosporins"], "history": ["Recurrent Nephrolithiasis"]},
            {"mrn": "PT-5002", "name": "Oliver Twist", "age": 67, "gender": "Male", "blood": "B+", "status": "CRITICAL", "triage": "RED", "diag": "Acute Mesenteric Ischemia Post-Embolectomy", "bed_idx": 1, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[4], "dept": all_departments[32], "allergies": ["None Known"], "history": ["Peripheral Vascular Disease", "Atrial Fibrillation"]},
            {"mrn": "PT-6001", "name": "Fiona Gallagher", "age": 33, "gender": "Female", "blood": "O-", "status": "STABLE", "triage": "GREEN", "diag": "Cholecystitis Post-Laparoscopic Cholecystectomy", "bed_idx": 0, "nurse": staff_members[6], "doc": staff_members[2], "hosp": hospitals[5], "dept": all_departments[40], "allergies": ["None Known"], "history": ["Biliary Colic"]},
            {"mrn": "PT-6002", "name": "Liam Dunbar", "age": 75, "gender": "Male", "blood": "AB+", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Aspiration Pneumonia with Dysphagia", "bed_idx": 1, "nurse": staff_members[6], "doc": staff_members[2], "hosp": hospitals[5], "dept": all_departments[40], "allergies": ["Penicillin"], "history": ["Parkinson's Disease", "Dementia"]},
            {"mrn": "PT-7001", "name": "Zoe Saldana", "age": 47, "gender": "Female", "blood": "A-", "status": "STABLE", "triage": "GREEN", "diag": "Acute Diverticulitis Medical Management", "bed_idx": 0, "nurse": staff_members[7], "doc": staff_members[3], "hosp": hospitals[6], "dept": all_departments[48], "allergies": ["Metronidazole"], "history": ["IBS"]},
            {"mrn": "PT-7002", "name": "Ethan Hunt", "age": 52, "gender": "Male", "blood": "O+", "status": "CRITICAL", "triage": "RED", "diag": "Multiple Trauma with Rib Fractures and Flail Chest", "bed_idx": 1, "nurse": staff_members[7], "doc": staff_members[3], "hosp": hospitals[6], "dept": all_departments[48], "allergies": ["None Known"], "history": ["Prior Clavicle Fracture"]},
            {"mrn": "PT-8001", "name": "Natasha Romanoff", "age": 39, "gender": "Female", "blood": "B-", "status": "HIGH_RISK", "triage": "YELLOW", "diag": "Acute Renal Failure secondary to Rhabdomyolysis", "bed_idx": 0, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[7], "dept": all_departments[56], "allergies": ["None Known"], "history": ["Heat Exhaustion"]},
            {"mrn": "PT-8002", "name": "Steve Rogers", "age": 82, "gender": "Male", "blood": "O+", "status": "STABLE", "triage": "GREEN", "diag": "Syncope Evaluation and Permanent Pacemaker Placement", "bed_idx": 1, "nurse": staff_members[5], "doc": staff_members[1], "hosp": hospitals[7], "dept": all_departments[56], "allergies": ["None Known"], "history": ["Sick Sinus Syndrome"]},
            {"mrn": "PT-9001", "name": "Bruce Wayne", "age": 45, "gender": "Male", "blood": "AB-", "status": "CRITICAL", "triage": "RED", "diag": "Intracranial Hemorrhage under ICP Telemetry", "bed_idx": 0, "nurse": staff_members[6], "doc": staff_members[2], "hosp": hospitals[8], "dept": all_departments[64], "allergies": ["None Known"], "history": ["Cranial Trauma"]},
            {"mrn": "PT-9002", "name": "Diana Prince", "age": 38, "gender": "Female", "blood": "O+", "status": "STABLE", "triage": "GREEN", "diag": "Elective Thyroidectomy Observation", "bed_idx": 1, "nurse": staff_members[6], "doc": staff_members[2], "hosp": hospitals[8], "dept": all_departments[64], "allergies": ["None Known"], "history": ["Euthyroid Multinodular Goiter"]}
        ]

        seeded_patients = []
        for pdata in all_patient_templates:
            target_hosp_beds = [b for b in all_beds if b.hospital_id == pdata["hosp"].id]
            assigned_bed = target_hosp_beds[min(pdata["bed_idx"], len(target_hosp_beds)-1)]

            patient = Patient(
                mrn=pdata["mrn"],
                full_name=pdata["name"],
                age=pdata["age"],
                gender=pdata["gender"],
                blood_group=pdata["blood"],
                admission_date=datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 4)),
                status=pdata["status"],
                triage_priority=pdata["triage"],
                assigned_doctor_id=pdata["doc"].id,
                assigned_nurse_id=pdata["nurse"].id,
                assigned_bed_id=assigned_bed.id,
                hospital_id=pdata["hosp"].id,
                department_id=pdata["dept"].id,
                diagnosis=pdata["diag"],
                medical_history=json.dumps(pdata.get("history", ["Hypertension", "Hyperlipidemia"])),
                allergies=json.dumps(pdata.get("allergies", ["None Known"]))
            )
            db.add(patient)
            db.commit()
            db.refresh(patient)
            seeded_patients.append(patient)

            # Assign bed
            assigned_bed.patient_id = patient.id
            assigned_bed.status = "OCCUPIED"

            # 1. Seed Multi-Point Historical Vitals (for 1h, 6h, 12h, 24h trend analytics)
            is_crit = pdata["status"] == "CRITICAL"
            is_high = pdata["status"] == "HIGH_RISK"

            base_hr = 124 if is_crit else (108 if is_high else 76)
            base_spo2 = 89.0 if is_crit else (92.0 if is_high else 98.0)
            base_rr = 29 if is_crit else (22 if is_high else 16)
            base_temp = 38.8 if is_crit else (37.8 if is_high else 36.9)
            base_sbp = 92 if is_crit else (138 if is_high else 120)
            base_dbp = 58 if is_crit else (88 if is_high else 80)

            # Generate 8 historical checkpoints spanning 24 hours
            for offset_hours in [24, 18, 12, 8, 6, 4, 2, 0]:
                jitter_hr = random.randint(-4, 4)
                jitter_spo2 = round(random.uniform(-0.8, 0.8), 1)
                jitter_rr = random.randint(-2, 2)
                jitter_sbp = random.randint(-5, 5)

                vital = PatientVital(
                    patient_id=patient.id,
                    heart_rate=max(45, min(160, base_hr + jitter_hr)),
                    systolic_bp=max(80, min(190, base_sbp + jitter_sbp)),
                    diastolic_bp=max(50, min(110, base_dbp + jitter_sbp // 2)),
                    spo2=max(75.0, min(100.0, base_spo2 + jitter_spo2)),
                    respiratory_rate=max(8, min(40, base_rr + jitter_rr)),
                    temperature=round(base_temp + random.uniform(-0.2, 0.2), 1),
                    pain_score=7 if is_crit else (4 if is_high else 1),
                    consciousness="ALERT" if not is_crit else "VOICE",
                    news2_score=7 if is_crit else (4 if is_high else 0),
                    recorded_by_nurse_name=pdata["nurse"].name,
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=offset_hours)
                )
                db.add(vital)

            # 2. Seed Comprehensive Lab Panel
            labs_to_seed = [
                {"test": "Hemoglobin", "cat": "Hematology", "val": "11.2" if is_crit else "14.5", "unit": "g/dL", "ref": "13.5 - 17.5", "stat": "LOW" if is_crit else "NORMAL"},
                {"test": "White Blood Cells (WBC)", "cat": "Hematology", "val": "16.8" if (is_crit or is_high) else "7.4", "unit": "10^3/uL", "ref": "4.5 - 11.0", "stat": "HIGH" if (is_crit or is_high) else "NORMAL"},
                {"test": "Platelets", "cat": "Hematology", "val": "185" if is_crit else "260", "unit": "10^3/uL", "ref": "150 - 450", "stat": "NORMAL"},
                {"test": "Serum Lactate", "cat": "Biochemistry", "val": "3.8" if is_crit else ("2.2" if is_high else "1.1"), "unit": "mmol/L", "ref": "0.5 - 2.0", "stat": "CRITICAL" if is_crit else ("HIGH" if is_high else "NORMAL")},
                {"test": "Serum Creatinine", "cat": "Renal Panel", "val": "2.1" if is_crit else ("1.4" if is_high else "0.9"), "unit": "mg/dL", "ref": "0.7 - 1.3", "stat": "HIGH" if (is_crit or is_high) else "NORMAL"},
                {"test": "Blood Glucose", "cat": "Biochemistry", "val": "184" if is_crit else "110", "unit": "mg/dL", "ref": "70 - 99", "stat": "HIGH" if is_crit else "NORMAL"},
                {"test": "Serum Sodium", "cat": "Electrolytes", "val": "137", "unit": "mEq/L", "ref": "135 - 145", "stat": "NORMAL"},
                {"test": "Serum Potassium", "cat": "Electrolytes", "val": "4.9" if is_crit else "4.2", "unit": "mEq/L", "ref": "3.5 - 5.0", "stat": "NORMAL"},
                {"test": "C-Reactive Protein (CRP)", "cat": "Inflammatory", "val": "92.4" if is_crit else ("48.0" if is_high else "3.2"), "unit": "mg/L", "ref": "< 5.0", "stat": "HIGH" if (is_crit or is_high) else "NORMAL"},
                {"test": "Troponin I", "cat": "Cardiac Panel", "val": "0.45" if "STEMI" in pdata["diag"] else "0.01", "unit": "ng/mL", "ref": "< 0.04", "stat": "HIGH" if "STEMI" in pdata["diag"] else "NORMAL"}
            ]

            for l in labs_to_seed:
                lab_rec = LabResult(
                    patient_id=patient.id,
                    test_name=l["test"],
                    category=l["cat"],
                    value=l["val"],
                    unit=l["unit"],
                    reference_range=l["ref"],
                    status=l["stat"],
                    timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(2, 10))
                )
                db.add(lab_rec)

            # 3. Seed Clinical Notes by Doctor
            doc_note1 = ClinicalNote(
                patient_id=patient.id,
                doctor_id=pdata["doc"].id,
                doctor_name=pdata["doc"].name,
                note_type="PROGRESS",
                content=f"Patient reassessed during morning ICU rounds. Current primary impression: {patient.diagnosis}. Oxygenation monitored via continuous pulse oximetry. Current plan is aggressive supportive care, tailored antibiotics, and fluid management.",
                plan="1. Maintain SpO2 > 92%\n2. Daily electrolyte and renal panel\n3. Titrate IV fluids to MAP > 65 mmHg\n4. Re-evaluate chest imaging in 24h",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(3, 8))
            )
            doc_note2 = ClinicalNote(
                patient_id=patient.id,
                doctor_id=pdata["doc"].id,
                doctor_name=pdata["doc"].name,
                note_type="ASSESSMENT",
                content=f"Initial admission assessment completed. Clinical stability tier: {pdata['status']}. Airway intact, bilateral breath sounds evaluated. Telemetry shows regular sinus rhythm without acute ischemic ectopy.",
                plan="Admit to Medical ICU under Dr. Arjun Sharma. Continuous cardiopulmonary monitoring ordered.",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(days=1, hours=2)
            )
            db.add_all([doc_note1, doc_note2])

            # 4. Seed Doctor Orders
            order1 = DoctorOrder(
                patient_id=patient.id,
                doctor_id=pdata["doc"].id,
                doctor_name=pdata["doc"].name,
                order_type="LAB",
                description="Arterial Blood Gas (ABG) and Lactate Clearance Q6H",
                priority="STAT" if is_crit else "ROUTINE",
                status="IN_PROGRESS",
                notes="Monitor for hypercapnic respiratory failure",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=2)
            )
            order2 = DoctorOrder(
                patient_id=patient.id,
                doctor_id=pdata["doc"].id,
                doctor_name=pdata["doc"].name,
                order_type="IMAGING",
                description="Portable Chest X-Ray (AP View) at bedside",
                priority="URGENT" if (is_crit or is_high) else "ROUTINE",
                status="COMPLETED",
                notes="Evaluate progression of bilateral consolidation",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
            )
            order3 = DoctorOrder(
                patient_id=patient.id,
                doctor_id=pdata["doc"].id,
                doctor_name=pdata["doc"].name,
                order_type="PROCEDURE",
                description="12-Lead Electrocardiogram (ECG) Baseline",
                priority="ROUTINE",
                status="COMPLETED",
                notes="Assess QT interval and ST segments",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=14)
            )
            db.add_all([order1, order2, order3])

            # 5. Add Nursing Note
            nn = NursingNote(
                patient_id=patient.id,
                nurse_id=pdata["nurse"].id,
                nurse_name=pdata["nurse"].name,
                content=f"Shift observation: Patient admitted with {patient.diagnosis}. SpO2 maintained at {base_spo2}%. IV infusion running at prescribed rate. Telemetry leads active.",
                timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=random.randint(1, 6))
            )
            db.add(nn)

            # 6. Add Medications
            med1 = Medication(
                patient_id=patient.id,
                drug_name="Ceftriaxone 1g IV",
                dosage="1000 mg",
                frequency="Q12H",
                route="IV",
                status="PENDING",
                administered_by=pdata["nurse"].name
            )
            med2 = Medication(
                patient_id=patient.id,
                drug_name="Paracetamol 500mg Tab",
                dosage="500 mg",
                frequency="Q6H PRN",
                route="ORAL",
                status="ADMINISTERED",
                administered_by=pdata["nurse"].name
            )
            med3 = Medication(
                patient_id=patient.id,
                drug_name="Norepinephrine IV Infusion (Levophed)",
                dosage="4 mcg/min",
                frequency="Continuous Titration",
                route="IV",
                status="ACTIVE" if is_crit else "DISCONTINUED",
                administered_by=pdata["nurse"].name
            )
            db.add_all([med1, med2, med3])

            # 7. Add Nursing Task
            task1 = NurseTask(
                patient_id=patient.id,
                nurse_id=pdata["nurse"].id,
                task_type="VITALS",
                description=f"Record Q2H vital signs for {patient.full_name} ({patient.mrn})",
                due_time="14:00",
                is_completed=False
            )
            task2 = NurseTask(
                patient_id=patient.id,
                nurse_id=pdata["nurse"].id,
                task_type="MEDICATION",
                description=f"Administer IV Antibiotic Ceftriaxone 1g to {patient.full_name}",
                due_time="15:30",
                is_completed=False
            )
            db.add_all([task1, task2])

        db.commit()
        print(f"Seeded {len(seeded_patients)} realistic inpatients with vitals history, labs, clinical notes, doctor orders, medications, and tasks.")

        # 10. Seed 10 Ambulances (with 2 Incoming to Demo Doctor's Hospital)
        ambulances = [
            Ambulance(
                code="AMB-108",
                vehicle_number="EMS-NY-4108",
                driver_name="Officer Sam Hayes",
                paramedic_name="Paramedic Sarah Lin",
                phone="+1-555-0918",
                status="EN_ROUTE",
                lat=40.7350,
                lng=-73.9920,
                destination_hospital_id=primary_hospital.id,
                eta_minutes=8,
                current_patient_name="PT-1098 - James Harrison",
                assigned_bed_code="HNC-01-ICU-12",
                assigned_doctor_name="Dr. Ananya Mehta",
                speed_kmh=62.0,
                equipment=json.dumps(["Ventilator", "Defibrillator", "Lucas CPR", "Telemetry ECG"])
            ),
            Ambulance(
                code="AMB-104",
                vehicle_number="EMS-NY-4104",
                driver_name="Officer Brian Miller",
                paramedic_name="Paramedic Zoe Kravitz",
                phone="+1-555-0914",
                status="EN_ROUTE",
                lat=40.7480,
                lng=-73.9800,
                destination_hospital_id=primary_hospital.id,
                eta_minutes=14,
                current_patient_name="PT-1102 - Marcus Silva",
                assigned_bed_code="HNC-01-ICU-08",
                assigned_doctor_name="Dr. Michael Chen",
                speed_kmh=58.0,
                equipment=json.dumps(["Ventilator", "Defibrillator", "Oxygen Concentrator"])
            ),
            Ambulance(
                code="AMB-101",
                vehicle_number="EMS-NY-4101",
                driver_name="Officer Marcus Brody",
                paramedic_name="Paramedic Jenna Morales",
                phone="+1-555-0911",
                status="AVAILABLE",
                lat=primary_hospital.lat,
                lng=primary_hospital.lng,
                destination_hospital_id=primary_hospital.id,
                equipment=json.dumps(["Defibrillator", "Transport Ventilator"])
            ),
            Ambulance(
                code="AMB-102",
                vehicle_number="EMS-NY-4102",
                driver_name="Officer Robert Torres",
                paramedic_name="Paramedic Lisa Chang",
                phone="+1-555-0912",
                status="TRANSPORTING",
                lat=40.7600,
                lng=-73.9700,
                destination_hospital_id=hospitals[1].id,
                eta_minutes=12,
                current_patient_name="Harold Finch (Trauma)",
                assigned_bed_code="HNN-02-ICU-01",
                speed_kmh=55.0,
                equipment=json.dumps(["Defibrillator", "Oxygen Port"])
            ),
            Ambulance(
                code="AMB-103",
                vehicle_number="EMS-NY-4103",
                driver_name="Officer David Kim",
                paramedic_name="Paramedic Rachel Green",
                phone="+1-555-0913",
                status="DISPATCHED",
                lat=40.7100,
                lng=-74.0100,
                destination_hospital_id=hospitals[2].id,
                eta_minutes=18,
                current_patient_name="Evelyn Cross (Cardiac)",
                speed_kmh=48.0,
                equipment=json.dumps(["Defibrillator", "Oxygen Port"])
            ),
            Ambulance(
                code="AMB-105",
                vehicle_number="EMS-NY-4105",
                driver_name="Officer Alan Diaz",
                paramedic_name="Paramedic Tony Stark",
                phone="+1-555-0915",
                status="ARRIVED",
                lat=primary_hospital.lat,
                lng=primary_hospital.lng,
                destination_hospital_id=primary_hospital.id,
                eta_minutes=0,
                current_patient_name="Natalie Portman (Stroke)",
                assigned_bed_code="HNC-01-ER-02",
                equipment=json.dumps(["Defibrillator", "Transport Monitor"])
            ),
            Ambulance(
                code="AMB-106",
                vehicle_number="EMS-NY-4106",
                driver_name="Officer Chris Evans",
                paramedic_name="Paramedic Natasha R.",
                phone="+1-555-0916",
                status="RETURNING",
                lat=40.7200,
                lng=-74.0000,
                destination_hospital_id=primary_hospital.id,
                equipment=json.dumps(["Defibrillator", "Oxygen Port"])
            ),
            Ambulance(
                code="AMB-107",
                vehicle_number="EMS-NY-4107",
                driver_name="Officer Tom Holland",
                paramedic_name="Paramedic Peter Parker",
                phone="+1-555-0917",
                status="AVAILABLE",
                lat=hospitals[3].lat,
                lng=hospitals[3].lng,
                destination_hospital_id=hospitals[3].id,
                equipment=json.dumps(["Defibrillator", "Ventilator"])
            ),
            Ambulance(
                code="AMB-109",
                vehicle_number="EMS-NY-4109",
                driver_name="Officer Bruce Banner",
                paramedic_name="Paramedic Wanda M.",
                phone="+1-555-0919",
                status="AVAILABLE",
                lat=hospitals[4].lat,
                lng=hospitals[4].lng,
                destination_hospital_id=hospitals[4].id,
                equipment=json.dumps(["Defibrillator", "Transport Ventilator"])
            ),
            Ambulance(
                code="AMB-110",
                vehicle_number="EMS-NY-4110",
                driver_name="Officer Stephen Strange",
                paramedic_name="Paramedic Wong C.",
                phone="+1-555-0920",
                status="EN_ROUTE",
                lat=40.8100,
                lng=-73.9500,
                destination_hospital_id=hospitals[4].id,
                eta_minutes=9,
                current_patient_name="Arthur Curry (Sepsis)",
                assigned_bed_code="HNW-05-ICU-02",
                speed_kmh=60.0,
                equipment=json.dumps(["Defibrillator", "Ventilator"])
            )
        ]
        db.add_all(ambulances)
        db.commit()
        print(f"Seeded {len(ambulances)} emergency ambulances (2 incoming to Central Hospital).")

        # 11. Seed Alerts (Critical Vitals, Ambulances, Doctor Requests)
        alerts = [
            Alert(
                title="Critical Vitals Alert: Raj Mehta (PT-1042)",
                message="SpO2 dropped to 89%, Heart Rate: 124 bpm. High flow O2 titrating. Urgent physician evaluation advised.",
                alert_type="CRITICAL_VITALS",
                severity="CRITICAL",
                hospital_id=primary_hospital.id,
                patient_id=seeded_patients[0].id,
                target_role="NURSE"
            ),
            Alert(
                title="Incoming Critical Ambulance: AMB-108",
                message="AMB-108 en route to Central Hospital with James Harrison (PT-1098). ETA 8 MIN. Critical Respiratory Failure. Bed ICU-12 pre-assigned.",
                alert_type="AMBULANCE_ARRIVAL",
                severity="CRITICAL",
                hospital_id=primary_hospital.id,
                target_role="ALL"
            ),
            Alert(
                title="Incoming Trauma Ambulance: AMB-104",
                message="AMB-104 en route with Marcus Silva (PT-1102). ETA 14 MIN. Subdural Hematoma. Bed ICU-08 assigned.",
                alert_type="AMBULANCE_ARRIVAL",
                severity="HIGH",
                hospital_id=primary_hospital.id,
                target_role="ALL"
            ),
            Alert(
                title="Pending Stat Medication: Sarah Jenkins",
                message="IV Norepinephrine titration protocol pending verification in Medical ICU Bed 02.",
                alert_type="MEDICATION_DUE",
                severity="HIGH",
                hospital_id=primary_hospital.id,
                patient_id=seeded_patients[1].id,
                target_role="NURSE"
            ),
            Alert(
                title="Doctor Evaluation Requested",
                message="Nurse Elena requested urgent Cardiology consultation for Arthur Pendelton (PT-1044).",
                alert_type="DOCTOR_REQUEST",
                severity="MEDIUM",
                hospital_id=primary_hospital.id,
                patient_id=seeded_patients[2].id,
                target_role="DOCTOR"
            )
        ]
        db.add_all(alerts)
        db.commit()

        # 12. Seed Doctor Requests
        doc_req = DoctorRequest(
            patient_id=seeded_patients[2].id,
            hospital_id=primary_hospital.id,
            department_id=all_departments[0].id,
            nurse_id=nurse_elena.id,
            nurse_name=nurse_elena.name,
            doctor_id=doc_arjun.id,
            doctor_name=doc_arjun.name,
            reason="Patient experiencing recurrent ST-elevations and chest tightness on continuous telemetry.",
            priority="URGENT",
            status="PENDING",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(minutes=35)
        )
        db.add(doc_req)

        # 13. Seed Shift Handover
        handover = ShiftHandover(
            hospital_id=primary_hospital.id,
            department_id=all_departments[0].id,
            outgoing_nurse_id=nurse_elena.id,
            outgoing_nurse_name="Nurse Elena Rostova",
            incoming_nurse_id=staff_members[5].id,
            incoming_nurse_name="Nurse Maya Lin",
            shift="MORNING_TO_EVENING",
            general_notes="Medical ICU census is high. 2 patients on invasive ventilation (PT-1042 and PT-1043). 1 incoming ambulance (AMB-108) due in 8 minutes. Bed ICU-12 prepped.",
            pending_tasks_summary="Complete Q2H vitals for Bed 03, administer Ceftriaxone for Bed 01 at 15:30.",
            critical_observations="Watch PT-1042 SpO2 trends closely; ABG scheduled for 16:00.",
            timestamp=datetime.datetime.utcnow() - datetime.timedelta(hours=8)
        )
        db.add(handover)

        # 14. Seed Initial Audit Log
        audit = AuditLog(
            user_email="admin@healthnet.demo",
            action="SYSTEM_INITIALIZE",
            entity_type="NETWORK",
            details="HealthNet Medical Group Phase 3 initialized with 12 hospital branches, 500+ beds, 25+ inpatients, 10 ambulances, tasks, and clinical records."
        )
        db.add(audit)
        db.commit()

        print("HealthNet Phase 3 Database initialized and seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
