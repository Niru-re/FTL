import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship
from .database import Base

class HospitalNetwork(Base):
    __tablename__ = "hospital_networks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, index=True, nullable=False)
    description = Column(String(500), default="City-Wide Integrated Medical Group")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospitals = relationship("Hospital", back_populates="network", cascade="all, delete-orphan")
    branches = relationship("Branch", back_populates="network", cascade="all, delete-orphan")

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)  # "ADMIN", "DOCTOR", "NURSE"
    description = Column(String(255), nullable=True)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # "ADMIN", "DOCTOR", "NURSE"
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    department = Column(String(100), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="users")
    branch = relationship("Branch", back_populates="users")
    staff_profile = relationship("Staff", back_populates="user", uselist=False)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("hospital_networks.id"), nullable=True)
    name = Column(String(255), nullable=False)
    branch_name = Column(String(255), nullable=False)
    code = Column(String(20), unique=True, index=True, nullable=False)
    address = Column(String(500), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    total_beds = Column(Integer, default=50)
    icu_capacity = Column(Integer, default=15)
    ward_capacity = Column(Integer, default=25)
    er_capacity = Column(Integer, default=10)
    ventilators_total = Column(Integer, default=10)
    ventilators_available = Column(Integer, default=5)
    ecmo_available = Column(Boolean, default=True)
    trauma_level = Column(String(50), default="Level 1 Comprehensive")
    emergency_status = Column(String(50), default="NORMAL")  # "NORMAL", "DIVERT", "SURGE", "CLOSED"
    contact_phone = Column(String(50), default="+1-555-0100")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    network = relationship("HospitalNetwork", back_populates="hospitals")
    branches = relationship("Branch", back_populates="hospital", cascade="all, delete-orphan")
    users = relationship("User", back_populates="hospital")
    departments = relationship("Department", back_populates="hospital", cascade="all, delete-orphan")
    beds = relationship("Bed", back_populates="hospital", foreign_keys="Bed.hospital_id", cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="hospital", foreign_keys="Staff.hospital_id")
    resources = relationship("Resource", back_populates="hospital", cascade="all, delete-orphan")
    ambulances = relationship("Ambulance", back_populates="destination_hospital", foreign_keys="Ambulance.destination_hospital_id")
    patients = relationship("Patient", back_populates="hospital", foreign_keys="Patient.hospital_id")
    emergency_cases = relationship("EmergencyCase", back_populates="assigned_hospital", foreign_keys="EmergencyCase.assigned_hospital_id")
    alerts = relationship("Alert", back_populates="hospital")

class Branch(Base):
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    network_id = Column(Integer, ForeignKey("hospital_networks.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    address = Column(String(500), nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    contact_phone = Column(String(50), default="+1-555-0100")
    emergency_status = Column(String(50), default="NORMAL")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    network = relationship("HospitalNetwork", back_populates="branches")
    hospital = relationship("Hospital", back_populates="branches")
    users = relationship("User", back_populates="branch")
    departments = relationship("Department", back_populates="branch")
    resources = relationship("Resource", back_populates="branch")

class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), nullable=False)
    floor = Column(String(50), default="Floor 1")
    head_doctor_name = Column(String(255), nullable=True)

    hospital = relationship("Hospital", back_populates="departments")
    branch = relationship("Branch", back_populates="departments")
    beds = relationship("Bed", back_populates="department", foreign_keys="Bed.department_id")
    staff = relationship("Staff", back_populates="department", foreign_keys="Staff.department_id")
    patients = relationship("Patient", back_populates="department", foreign_keys="Patient.department_id")
    units = relationship("Unit", back_populates="department", cascade="all, delete-orphan")

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    name = Column(String(100), nullable=False)  # "Medical ICU", "Surgical ICU", "West General Ward", "Cardiology Day Ward"
    unit_type = Column(String(50), nullable=False)  # "ICU", "WARD", "ER", "OT"
    capacity = Column(Integer, default=10)

    department = relationship("Department", back_populates="units")

class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=True)
    bed_type = Column(String(50), default="GENERAL")  # "ICU", "EMERGENCY", "GENERAL", "ISOLATION", "SURGICAL_STEPDOWN"
    status = Column(String(50), default="AVAILABLE")  # "AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE", "OUT_OF_SERVICE"
    patient_id = Column(Integer, ForeignKey("patients.id", use_alter=True, name="fk_bed_patient"), nullable=True)
    equipment = Column(Text, default="[]")
    last_cleaned_at = Column(DateTime, default=datetime.datetime.utcnow)
    notes = Column(String(500), nullable=True)

    hospital = relationship("Hospital", back_populates="beds", foreign_keys=[hospital_id])
    department = relationship("Department", back_populates="beds", foreign_keys=[department_id])
    patient = relationship("Patient", foreign_keys=[patient_id], post_update=True)

class Resource(Base):
    __tablename__ = "resources"

    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(String(50), unique=True, index=True, nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    resource_type = Column(String(100), nullable=False)  # "Ventilator", "Patient Monitor", "Infusion Pump", "Oxygen Concentrator", "Oxygen Cylinder", "Defibrillator"
    name = Column(String(255), nullable=False)
    quantity = Column(Integer, default=1)
    available_quantity = Column(Integer, default=1)
    status = Column(String(50), default="OPERATIONAL")  # "OPERATIONAL", "IN_USE", "MAINTENANCE", "STANDBY"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="resources")
    branch = relationship("Branch", back_populates="resources")

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    staff_type = Column(String(20), nullable=False)  # "DOCTOR", "NURSE"
    name = Column(String(255), nullable=False)
    employee_code = Column(String(50), unique=True, nullable=False)
    specialization = Column(String(100), default="General Medicine")
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    shift = Column(String(20), default="MORNING")
    is_available = Column(Boolean, default=True)
    phone = Column(String(50), default="+1-555-0199")
    on_duty_status = Column(String(50), default="ON_DUTY")

    user = relationship("User", back_populates="staff_profile")
    hospital = relationship("Hospital", back_populates="staff", foreign_keys=[hospital_id])
    department = relationship("Department", back_populates="staff", foreign_keys=[department_id])
    doctor_patients = relationship("Patient", foreign_keys="Patient.assigned_doctor_id")
    nurse_patients = relationship("Patient", foreign_keys="Patient.assigned_nurse_id")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(50), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    blood_group = Column(String(10), default="O+")
    admission_date = Column(DateTime, default=datetime.datetime.utcnow)
    discharge_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="STABLE")  # "CRITICAL", "HIGH_RISK", "STABLE", "DISCHARGED"
    triage_priority = Column(String(20), default="YELLOW")
    assigned_doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    assigned_nurse_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    assigned_bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    diagnosis = Column(String(500), default="Observation")
    ai_risk_score = Column(Float, default=45.0)
    ai_risk_level = Column(String(50), default="STABLE")
    medical_history = Column(Text, default="[]")
    allergies = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="patients", foreign_keys=[hospital_id])
    department = relationship("Department", back_populates="patients", foreign_keys=[department_id])
    assigned_doctor = relationship("Staff", foreign_keys=[assigned_doctor_id], overlaps="doctor_patients")
    assigned_nurse = relationship("Staff", foreign_keys=[assigned_nurse_id], overlaps="nurse_patients")
    bed = relationship("Bed", foreign_keys=[assigned_bed_id], post_update=True)
    vitals = relationship("PatientVital", back_populates="patient", cascade="all, delete-orphan", order_by="desc(PatientVital.timestamp)")
    clinical_notes = relationship("ClinicalNote", back_populates="patient", cascade="all, delete-orphan", order_by="desc(ClinicalNote.timestamp)")
    nursing_notes = relationship("NursingNote", back_populates="patient", cascade="all, delete-orphan", order_by="desc(NursingNote.timestamp)")
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan", order_by="desc(LabResult.timestamp)")
    medications = relationship("Medication", back_populates="patient", cascade="all, delete-orphan")
    nurse_tasks = relationship("NurseTask", back_populates="patient", cascade="all, delete-orphan")
    doctor_orders = relationship("DoctorOrder", back_populates="patient", cascade="all, delete-orphan", order_by="desc(DoctorOrder.timestamp)")
    transfers = relationship("PatientTransfer", back_populates="patient", cascade="all, delete-orphan", order_by="desc(PatientTransfer.timestamp)")
    discharges = relationship("PatientDischarge", back_populates="patient", cascade="all, delete-orphan", order_by="desc(PatientDischarge.timestamp)")
    risk_predictions = relationship("RiskPrediction", back_populates="patient", cascade="all, delete-orphan", order_by="desc(RiskPrediction.timestamp)")

class PatientVital(Base):
    __tablename__ = "patient_vitals"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    heart_rate = Column(Integer, default=78)
    systolic_bp = Column(Integer, default=120)
    diastolic_bp = Column(Integer, default=80)
    spo2 = Column(Float, default=98.0)
    respiratory_rate = Column(Integer, default=16)
    temperature = Column(Float, default=37.0)
    pain_score = Column(Integer, default=0)
    consciousness = Column(String(50), default="ALERT")
    news2_score = Column(Integer, default=0)
    recorded_by_nurse_name = Column(String(255), default="Staff Nurse")

    patient = relationship("Patient", back_populates="vitals")

class ClinicalNote(Base):
    __tablename__ = "clinical_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    doctor_name = Column(String(255), default="Attending Physician")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    note_type = Column(String(50), default="PROGRESS")
    content = Column(Text, nullable=False)
    plan = Column(Text, nullable=True)

    patient = relationship("Patient", back_populates="clinical_notes")

class NursingNote(Base):
    __tablename__ = "nursing_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    nurse_name = Column(String(255), default="Staff Nurse")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    content = Column(Text, nullable=False)

    patient = relationship("Patient", back_populates="nursing_notes")

class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    test_name = Column(String(255), nullable=False)
    category = Column(String(100), default="Hematology")
    value = Column(String(50), nullable=False)
    unit = Column(String(50), default="")
    reference_range = Column(String(100), default="")
    status = Column(String(50), default="NORMAL")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="lab_results")

class Medication(Base):
    __tablename__ = "medications"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    drug_name = Column(String(255), nullable=False)
    dosage = Column(String(100), nullable=False)
    frequency = Column(String(100), default="Q8H (Every 8 hours)")
    route = Column(String(50), default="ORAL")
    status = Column(String(50), default="ACTIVE")
    start_date = Column(DateTime, default=datetime.datetime.utcnow)
    administered_by = Column(String(255), default="Staff Nurse")

    patient = relationship("Patient", back_populates="medications")

class NurseTask(Base):
    __tablename__ = "nurse_tasks"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    task_type = Column(String(50), default="VITALS")
    description = Column(String(500), nullable=False)
    due_time = Column(String(50), default="14:00")
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="nurse_tasks")

class Ambulance(Base):
    __tablename__ = "ambulances"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, index=True, nullable=False)
    vehicle_number = Column(String(50), nullable=False)
    driver_name = Column(String(255), nullable=False)
    paramedic_name = Column(String(255), nullable=False)
    phone = Column(String(50), default="+1-555-0911")
    status = Column(String(50), default="AVAILABLE")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    destination_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    current_patient_id = Column(Integer, nullable=True)
    current_patient_name = Column(String(255), nullable=True)
    assigned_emergency_case_id = Column(Integer, nullable=True)
    assigned_bed_id = Column(Integer, nullable=True)
    assigned_bed_code = Column(String(50), nullable=True)
    assigned_doctor_name = Column(String(255), nullable=True)
    eta_minutes = Column(Integer, default=0)
    speed_kmh = Column(Float, default=45.0)
    equipment = Column(Text, default="[]")

    destination_hospital = relationship("Hospital", back_populates="ambulances", foreign_keys=[destination_hospital_id])

class EmergencyCase(Base):
    __tablename__ = "emergency_cases"

    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String(50), unique=True, index=True, nullable=False)
    patient_name = Column(String(255), nullable=False)
    patient_age = Column(Integer, nullable=False)
    patient_gender = Column(String(20), nullable=False)
    emergency_type = Column(String(50), default="CARDIAC")  # "CARDIAC", "RESPIRATORY", "TRAUMA", "NEUROLOGICAL", "GENERAL_CRITICAL", "OTHER"
    priority = Column(String(20), default="CRITICAL")       # "CRITICAL", "HIGH", "MEDIUM"
    condition_summary = Column(String(500), nullable=False)
    required_department = Column(String(50), default="ICU") # "ICU", "EMERGENCY", "CARDIOLOGY", "NEUROLOGY", "TRAUMA", "PULMONOLOGY", "GENERAL"
    required_resources = Column(Text, default="[]")        # JSON list e.g. ["ICU bed", "Ventilator", "Oxygen", "Cardiologist"]
    required_icu = Column(Boolean, default=True)
    required_ventilator = Column(Boolean, default=False)
    required_oxygen = Column(Boolean, default=False)
    required_specialist = Column(String(100), default="General")
    required_er = Column(Boolean, default=True)
    initial_vitals = Column(Text, default="{}")
    vitals_heart_rate = Column(Integer, default=120)
    vitals_systolic_bp = Column(Integer, default=90)
    vitals_diastolic_bp = Column(Integer, default=60)
    vitals_spo2 = Column(Float, default=91.0)
    vitals_respiratory_rate = Column(Integer, default=26)
    vitals_temperature = Column(Float, default=37.2)
    pickup_lat = Column(Float, nullable=False, default=28.6139)
    pickup_lng = Column(Float, nullable=False, default=77.2090)
    pickup_address = Column(String(255), default="City Medical Incident Location")
    assigned_hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    assigned_ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    assigned_ambulance_code = Column(String(50), nullable=True)
    assigned_bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    assigned_bed_code = Column(String(50), nullable=True)
    assigned_patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    suitability_score = Column(Float, default=0.0)
    status = Column(String(50), default="SEARCHING")  # "SEARCHING", "HOSPITAL_SELECTED", "BED_RESERVED", "AMBULANCE_ASSIGNED", "EN_ROUTE", "ARRIVED", "PATIENT_RECEIVED", "COMPLETED", "CANCELLED"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    arrived_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    assigned_hospital = relationship("Hospital", back_populates="emergency_cases", foreign_keys=[assigned_hospital_id])
    assigned_ambulance = relationship("Ambulance", foreign_keys=[assigned_ambulance_id])
    assigned_bed = relationship("Bed", foreign_keys=[assigned_bed_id])
    assigned_patient = relationship("Patient", foreign_keys=[assigned_patient_id])
    hospital_matches = relationship("HospitalMatch", back_populates="emergency_case", cascade="all, delete-orphan", order_by="desc(HospitalMatch.suitability_score)")
    bed_reservations = relationship("BedReservation", back_populates="emergency_case", cascade="all, delete-orphan")
    timeline_events = relationship("EmergencyTimeline", back_populates="emergency_case", cascade="all, delete-orphan", order_by="asc(EmergencyTimeline.timestamp)")
    notifications = relationship("EmergencyNotification", back_populates="emergency_case", cascade="all, delete-orphan", order_by="desc(EmergencyNotification.created_at)")

class HospitalMatch(Base):
    __tablename__ = "hospital_matches"

    id = Column(Integer, primary_key=True, index=True)
    emergency_case_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    is_eligible = Column(Boolean, default=True)
    ineligible_reason = Column(String(500), nullable=True)
    suitability_score = Column(Float, default=0.0)
    resource_score = Column(Float, default=0.0)
    clinical_score = Column(Float, default=0.0)
    eta_score = Column(Float, default=0.0)
    capacity_score = Column(Float, default=0.0)
    readiness_score = Column(Float, default=0.0)
    distance_km = Column(Float, default=0.0)
    eta_minutes = Column(Integer, default=0)
    explanation_json = Column(Text, default="[]")
    breakdown_details_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    emergency_case = relationship("EmergencyCase", back_populates="hospital_matches")
    hospital = relationship("Hospital")

class BedReservation(Base):
    __tablename__ = "bed_reservations"

    id = Column(Integer, primary_key=True, index=True)
    emergency_case_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    status = Column(String(50), default="ACTIVE")  # "ACTIVE", "FULFILLED", "CANCELLED"
    reserved_at = Column(DateTime, default=datetime.datetime.utcnow)
    fulfilled_at = Column(DateTime, nullable=True)

    emergency_case = relationship("EmergencyCase", back_populates="bed_reservations")
    bed = relationship("Bed")
    hospital = relationship("Hospital")

class EmergencyTimeline(Base):
    __tablename__ = "emergency_timeline"

    id = Column(Integer, primary_key=True, index=True)
    emergency_case_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=False)
    event_type = Column(String(50), default="INFO")
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    actor_name = Column(String(255), default="System")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    emergency_case = relationship("EmergencyCase", back_populates="timeline_events")

class EmergencyNotification(Base):
    __tablename__ = "emergency_notifications"

    id = Column(Integer, primary_key=True, index=True)
    emergency_case_id = Column(Integer, ForeignKey("emergency_cases.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    recipient_role = Column(String(50), default="ALL")  # "ADMIN", "NURSE", "DOCTOR", "ALL"
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    emergency_case = relationship("EmergencyCase", back_populates="notifications")
    hospital = relationship("Hospital")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    alert_type = Column(String(50), default="GENERAL")
    severity = Column(String(50), default="MEDIUM")
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    is_read = Column(Boolean, default=False)
    target_role = Column(String(50), default="ALL")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    hospital = relationship("Hospital", back_populates="alerts")
    patient = relationship("Patient", foreign_keys=[patient_id])
    ambulance = relationship("Ambulance", foreign_keys=[ambulance_id])

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    user_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(50), nullable=True)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class MedicationAdministration(Base):
    __tablename__ = "medication_administrations"

    id = Column(Integer, primary_key=True, index=True)
    medication_id = Column(Integer, ForeignKey("medications.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    administered_by = Column(String(255), default="Staff Nurse")
    status = Column(String(50), default="ADMINISTERED")  # "ADMINISTERED", "SKIPPED", "MISSED"
    notes = Column(String(500), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    medication = relationship("Medication")
    patient = relationship("Patient")

class DoctorRequest(Base):
    __tablename__ = "doctor_requests"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    nurse_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    nurse_name = Column(String(255), default="Staff Nurse")
    doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    doctor_name = Column(String(255), nullable=True)
    reason = Column(String(500), nullable=False)
    priority = Column(String(50), default="ROUTINE")  # "ROUTINE", "URGENT", "STAT"
    status = Column(String(50), default="PENDING")    # "PENDING", "ACCEPTED", "COMPLETED", "DECLINED"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient")
    doctor = relationship("Staff", foreign_keys=[doctor_id])

class ShiftHandover(Base):
    __tablename__ = "shift_handovers"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    outgoing_nurse_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    outgoing_nurse_name = Column(String(255), default="Staff Nurse")
    incoming_nurse_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    incoming_nurse_name = Column(String(255), default="Next Shift Nurse")
    shift = Column(String(50), default="MORNING_TO_EVENING")
    general_notes = Column(Text, nullable=False)
    pending_tasks_summary = Column(Text, nullable=True)
    critical_observations = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

class DoctorOrder(Base):
    __tablename__ = "doctor_orders"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    doctor_name = Column(String(255), default="Attending Physician")
    order_type = Column(String(50), nullable=False)  # "LAB", "IMAGING", "PROCEDURE", "MEDICATION", "CONSULT"
    description = Column(String(500), nullable=False)
    priority = Column(String(50), default="ROUTINE")  # "ROUTINE", "URGENT", "STAT"
    status = Column(String(50), default="REQUESTED")   # "REQUESTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="doctor_orders")
    doctor = relationship("Staff", foreign_keys=[doctor_id])

class PatientTransfer(Base):
    __tablename__ = "patient_transfers"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    doctor_name = Column(String(255), default="Attending Physician")
    from_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    from_unit_name = Column(String(100), nullable=True)
    to_unit_name = Column(String(100), nullable=True)
    from_bed_code = Column(String(50), nullable=True)
    to_bed_code = Column(String(50), nullable=True)
    reason = Column(String(500), nullable=False)
    priority = Column(String(50), default="URGENT")  # "ROUTINE", "URGENT", "EMERGENCY"
    status = Column(String(50), default="REQUESTED")   # "REQUESTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="transfers")
    doctor = relationship("Staff", foreign_keys=[doctor_id])

class PatientDischarge(Base):
    __tablename__ = "patient_discharges"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    doctor_name = Column(String(255), default="Attending Physician")
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    bed_code = Column(String(50), nullable=True)
    reason = Column(String(100), default="RECOVERY")  # "RECOVERY", "TRANSFER", "HOME_CARE", "OTHER"
    discharge_summary = Column(Text, nullable=False)
    instructions = Column(Text, nullable=True)
    status = Column(String(50), default="PENDING")    # "PENDING", "COMPLETED"
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient", back_populates="discharges")
    doctor = relationship("Staff", foreign_keys=[doctor_id])

class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    risk_score = Column(Float, nullable=False)  # 0.0 - 100.0
    risk_level = Column(String(50), default="STABLE")  # "CRITICAL", "HIGH RISK", "WATCH", "STABLE"
    factors_json = Column(Text, default="{}")  # JSON string of factor contributions
    historical_trend_json = Column(Text, default="[]")  # JSON array of past scores
    explanation = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    patient = relationship("Patient", back_populates="risk_predictions")

class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(100), nullable=False, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String(50), nullable=True)
    related_entity = Column(String(100), nullable=True)  # e.g. "Bed:HNC-01-ICU-16", "Patient:PT-1042"
    channel = Column(String(100), default="network")
    payload_json = Column(Text, default="{}")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    hospital = relationship("Hospital")
    user = relationship("User")

class SimulationState(Base):
    __tablename__ = "simulation_states"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.id"), nullable=True)
    simulation_type = Column(String(50), default="PATIENT_VITALS")  # "PATIENT_VITALS", "AMBULANCE_TRANSIT", "FULL_EMERGENCY"
    profile = Column(String(50), default="STABLE")  # "STABLE", "HIGH_RISK", "DETERIORATING", "RECOVERING"
    is_active = Column(Boolean, default=False)
    interval_seconds = Column(Float, default=3.0)
    current_step = Column(Integer, default=0)
    meta_json = Column(Text, default="{}")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

class AIPredictionAudit(Base):
    __tablename__ = "ai_prediction_audits"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String(100), default="PrototypeRiskModel")
    model_version = Column(String(50), default="1.0")
    entity_type = Column(String(50), default="PATIENT")  # "PATIENT", "HOSPITAL", "NETWORK"
    entity_id = Column(Integer, nullable=True)
    input_snapshot_json = Column(Text, default="{}")
    prediction_json = Column(Text, default="{}")
    confidence = Column(Float, default=0.85)
    explanation = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class CapacityForecast(Base):
    __tablename__ = "capacity_forecasts"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    forecast_window_hours = Column(Integer, default=24)  # 6, 12, 24, 48
    current_icu_occupancy = Column(Float, default=0.0)
    projected_icu_occupancy = Column(Float, default=0.0)
    projected_available_beds = Column(Integer, default=0)
    projected_available_icu = Column(Integer, default=0)
    projected_ventilators = Column(Integer, default=0)
    capacity_pressure_score = Column(Float, default=0.0)  # 0.0 - 100.0
    risk_level = Column(String(50), default="LOW")  # "LOW", "MODERATE", "HIGH", "CRITICAL"
    recommendations_json = Column(Text, default="[]")
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

    hospital = relationship("Hospital")


