import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

# Auth schemas
class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    email: str
    full_name: str
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None
    user_id: int

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    hospital_id: Optional[int] = None
    branch_id: Optional[int] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

# Branch Schemas
class BranchBase(BaseModel):
    name: str
    code: str
    hospital_id: int
    address: str
    lat: float
    lng: float
    contact_phone: Optional[str] = "+1-555-0100"
    emergency_status: Optional[str] = "NORMAL"

class BranchCreate(BranchBase):
    pass

class BranchUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    contact_phone: Optional[str] = None
    emergency_status: Optional[str] = None

class BranchOut(BranchBase):
    id: int
    hospital_name: Optional[str] = None
    total_beds: Optional[int] = 0
    available_beds: Optional[int] = 0
    occupied_beds: Optional[int] = 0
    icu_capacity: Optional[int] = 0
    available_icu_beds: Optional[int] = 0
    emergency_capacity: Optional[int] = 0
    occupancy_rate: Optional[float] = 0.0
    department_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Department Schemas
class DepartmentBase(BaseModel):
    hospital_id: int
    branch_id: Optional[int] = None
    name: str
    code: str
    floor: Optional[str] = "Floor 1"
    head_doctor_name: Optional[str] = None

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    floor: Optional[str] = None
    head_doctor_name: Optional[str] = None

class DepartmentOut(DepartmentBase):
    id: int
    hospital_name: Optional[str] = None
    branch_name: Optional[str] = None
    total_beds: Optional[int] = 0
    occupied_beds: Optional[int] = 0
    available_beds: Optional[int] = 0
    occupancy_rate: Optional[float] = 0.0
    status: Optional[str] = "NORMAL"

    class Config:
        from_attributes = True

# Unit Schemas (ICU & Ward)
class UnitOut(BaseModel):
    id: int
    department_id: int
    department_name: Optional[str] = None
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None
    branch_name: Optional[str] = None
    name: str
    unit_type: str  # "ICU", "WARD", "ER", "OT"
    capacity: int
    occupied: int
    available: int
    reserved: int
    cleaning: int
    occupancy_rate: float
    status: str  # "NORMAL", "HIGH_LOAD", "FULL" / "CRITICAL_CAPACITY"

    class Config:
        from_attributes = True

# Hospital Schemas
class HospitalBase(BaseModel):
    name: str
    branch_name: str
    code: str
    address: str
    city: str = "Nagpur"
    zone: str = "Central"
    service_area: str = "City Network"
    hospital_type: str = "Multi-Specialty"
    services: List[str] = Field(default_factory=list)
    contact_person: str = "Network Administrator"
    email: str = "contact@hospital.in"
    total_staff: int = 0
    doctors_count: int = 0
    nurses_count: int = 0
    ambulance_count: int = 0
    ambulances_available: int = 0
    bed_occupancy_rate: float = 0.0
    lat: float = 21.1458
    lng: float = 79.0882
    total_beds: int = 50
    icu_capacity: int = 15
    ward_capacity: int = 25
    er_capacity: int = 10
    ventilators_total: int = 10
    ventilators_available: int = 5
    ecmo_available: bool = True
    trauma_level: str = "Level 1 Comprehensive"
    emergency_status: str = "NORMAL"
    contact_phone: str = "+1-555-0100"

class HospitalCreate(HospitalBase):
    pass

class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    branch_name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    zone: Optional[str] = None
    service_area: Optional[str] = None
    hospital_type: Optional[str] = None
    services: Optional[List[str]] = None
    contact_person: Optional[str] = None
    email: Optional[str] = None
    total_staff: Optional[int] = None
    doctors_count: Optional[int] = None
    nurses_count: Optional[int] = None
    ambulance_count: Optional[int] = None
    ambulances_available: Optional[int] = None
    bed_occupancy_rate: Optional[float] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    emergency_status: Optional[str] = None
    ventilators_total: Optional[int] = None
    ventilators_available: Optional[int] = None
    contact_phone: Optional[str] = None
    trauma_level: Optional[str] = None

class HospitalOut(HospitalBase):
    id: int
    created_at: datetime.datetime
    # Live aggregated stats computed from DB:
    occupied_beds: Optional[int] = 0
    available_beds: Optional[int] = 0
    reserved_beds: Optional[int] = 0
    cleaning_beds: Optional[int] = 0
    maintenance_beds: Optional[int] = 0
    out_of_service_beds: Optional[int] = 0
    occupied_icu_beds: Optional[int] = 0
    available_icu_beds: Optional[int] = 0
    icu_occupancy_rate: Optional[float] = 0.0
    overall_occupancy_rate: Optional[float] = 0.0
    doctors_on_duty: Optional[int] = 0
    nurses_on_duty: Optional[int] = 0
    active_alerts_count: Optional[int] = 0

    class Config:
        from_attributes = True

# Bed Schemas
class BedOut(BaseModel):
    id: int
    code: str
    hospital_id: int
    hospital_name: Optional[str] = None
    branch_name: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    unit_id: Optional[int] = None
    unit_name: Optional[str] = None
    bed_type: str
    status: str
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    patient_diagnosis: Optional[str] = None
    doctor_name: Optional[str] = None
    nurse_name: Optional[str] = None
    equipment: Optional[str] = "[]"
    last_cleaned_at: Optional[datetime.datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True

class BedStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None
    notes: Optional[str] = None
    patient_id: Optional[int] = None

# Resource Schemas
class ResourceBase(BaseModel):
    resource_id: str
    hospital_id: int
    branch_id: Optional[int] = None
    resource_type: str  # "Ventilator", "Patient Monitor", "Infusion Pump", "Oxygen Concentrator", "Oxygen Cylinder", "Defibrillator", "Wheelchair", "ICU Equipment"
    name: str
    quantity: int = 1
    available_quantity: int = 1
    status: str = "AVAILABLE"  # "AVAILABLE", "IN_USE", "MAINTENANCE", "OUT_OF_SERVICE"

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    resource_type: Optional[str] = None
    quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    status: Optional[str] = None
    hospital_id: Optional[int] = None

class ResourceOut(ResourceBase):
    id: int
    hospital_name: Optional[str] = None
    branch_name: Optional[str] = None
    in_use_quantity: Optional[int] = 0
    maintenance_quantity: Optional[int] = 0
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Summary Schemas
class NetworkSummaryOut(BaseModel):
    total_hospitals: int
    total_branches: int
    total_departments: int
    total_beds: int
    available_beds: int
    occupied_beds: int
    reserved_beds: int
    cleaning_beds: int
    maintenance_beds: int
    out_of_service_beds: int
    overall_occupancy_rate: float
    total_icu_beds: int
    available_icu_beds: int
    occupied_icu_beds: int
    icu_occupancy_rate: float
    total_emergency_beds: int
    available_emergency_beds: int
    total_ventilators: int
    available_ventilators: int
    total_monitors: int
    available_monitors: int
    total_doctors: int
    active_doctors: int
    total_nurses: int
    active_nurses: int
    active_emergencies: int
    active_ambulances: int

class HospitalSummaryOut(BaseModel):
    hospital_id: int
    name: str
    branch_name: str
    code: str
    emergency_status: str
    total_beds: int
    available_beds: int
    occupied_beds: int
    reserved_beds: int
    cleaning_beds: int
    maintenance_beds: int
    out_of_service_beds: int
    overall_occupancy_rate: float
    total_icu_beds: int
    available_icu_beds: int
    occupied_icu_beds: int
    icu_occupancy_rate: float
    total_emergency_beds: int
    available_emergency_beds: int
    ventilators_total: int
    ventilators_available: int
    ecmo_available: bool
    doctors_count: int
    nurses_count: int

# Staff Schemas
class StaffOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    staff_type: str
    name: str
    employee_code: str
    specialization: str
    hospital_id: int
    hospital_name: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    shift: str
    is_available: bool
    phone: str
    on_duty_status: str
    assigned_patients_count: Optional[int] = 0

    class Config:
        from_attributes = True

class StaffUpdate(BaseModel):
    shift: Optional[str] = None
    is_available: Optional[bool] = None
    on_duty_status: Optional[str] = None
    department_id: Optional[int] = None

class StaffCreate(BaseModel):
    staff_type: str
    name: str
    employee_code: str
    specialization: str
    hospital_id: int
    department_id: int
    shift: str = "MORNING"
    phone: str = "+1-555-0199"

# Patient Clinical Data Schemas
class PatientVitalIn(BaseModel):
    heart_rate: int
    systolic_bp: int
    diastolic_bp: int
    spo2: float
    respiratory_rate: int
    temperature: float
    pain_score: int = 0
    consciousness: str = "ALERT"
    recorded_by_nurse_name: Optional[str] = "Staff Nurse"

class PatientVitalOut(BaseModel):
    id: int
    patient_id: int
    timestamp: datetime.datetime
    heart_rate: int
    systolic_bp: int
    diastolic_bp: int
    spo2: float
    respiratory_rate: int
    temperature: float
    pain_score: int
    consciousness: str
    news2_score: int
    recorded_by_nurse_name: Optional[str] = None

    class Config:
        from_attributes = True

class ClinicalNoteIn(BaseModel):
    note_type: str = "PROGRESS"
    content: str
    plan: Optional[str] = None
    doctor_name: Optional[str] = "Attending Physician"

class ClinicalNoteOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: Optional[int] = None
    doctor_name: str
    timestamp: datetime.datetime
    note_type: str
    content: str
    plan: Optional[str] = None

    class Config:
        from_attributes = True

class LabResultIn(BaseModel):
    test_name: str
    category: str
    value: str
    unit: str = ""
    reference_range: str = ""
    status: str = "NORMAL"

class LabResultOut(BaseModel):
    id: int
    patient_id: int
    test_name: str
    category: str
    value: str
    unit: str
    reference_range: str
    status: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class MedicationIn(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    route: str = "ORAL"
    status: str = "ACTIVE"
    administered_by: Optional[str] = "Staff Nurse"

class MedicationOut(BaseModel):
    id: int
    patient_id: int
    drug_name: str
    dosage: str
    frequency: str
    route: str
    status: str
    start_date: datetime.datetime
    administered_by: str

    class Config:
        from_attributes = True

class NurseTaskIn(BaseModel):
    task_type: str = "VITALS"
    description: str
    due_time: str = "14:00"

class NurseTaskOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    bed_code: Optional[str] = None
    nurse_id: Optional[int] = None
    task_type: str
    description: str
    due_time: str
    is_completed: bool
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class PatientIn(BaseModel):
    full_name: str
    age: int
    gender: str
    blood_group: str = "O+"
    status: str = "STABLE"
    triage_priority: str = "YELLOW"
    assigned_doctor_id: Optional[int] = None
    assigned_nurse_id: Optional[int] = None
    assigned_bed_id: Optional[int] = None
    hospital_id: int
    department_id: int
    diagnosis: str = "Under observation"
    medical_history: Optional[str] = "[]"
    allergies: Optional[str] = "[]"

class PatientOut(BaseModel):
    id: int
    mrn: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    admission_date: datetime.datetime
    discharge_date: Optional[datetime.datetime] = None
    status: str
    triage_priority: str
    assigned_doctor_id: Optional[int] = None
    assigned_doctor_name: Optional[str] = None
    assigned_nurse_id: Optional[int] = None
    assigned_nurse_name: Optional[str] = None
    assigned_bed_id: Optional[int] = None
    assigned_bed_code: Optional[str] = None
    hospital_id: int
    hospital_name: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    diagnosis: str
    medical_history: Optional[str] = "[]"
    allergies: Optional[str] = "[]"
    latest_vitals: Optional[PatientVitalOut] = None
    ai_risk_score: Optional[int] = 0
    ai_risk_level: Optional[str] = "LOW"

    class Config:
        from_attributes = True

class AIRiskEvaluation(BaseModel):
    risk_score: int = 0
    risk_level: str = "LOW"
    contributing_factors: List[str] = []
    news2_score: int = 0
    recommended_action: str = "Routine monitoring"
    label: str = "Prototype AI Risk Estimate"

class PatientDetailOut(PatientOut):
    vitals: List[PatientVitalOut] = []
    clinical_notes: List[ClinicalNoteOut] = []
    lab_results: List[LabResultOut] = []
    medications: List[MedicationOut] = []
    nurse_tasks: List[NurseTaskOut] = []
    ai_risk_evaluation: Optional[AIRiskEvaluation] = None

# Ambulance Schemas
class AmbulanceOut(BaseModel):
    id: int
    code: str
    vehicle_number: str
    driver_name: str
    paramedic_name: str
    phone: str
    status: str
    lat: float
    lng: float
    destination_hospital_id: Optional[int] = None
    destination_hospital_name: Optional[str] = None
    current_patient_id: Optional[int] = None
    current_patient_name: Optional[str] = None
    assigned_emergency_case_id: Optional[int] = None
    assigned_bed_id: Optional[int] = None
    assigned_bed_code: Optional[str] = None
    assigned_doctor_name: Optional[str] = None
    eta_minutes: int
    speed_kmh: float
    equipment: Optional[str] = "[]"

    class Config:
        from_attributes = True

class AmbulanceDispatchIn(BaseModel):
    destination_hospital_id: int
    assigned_emergency_case_id: Optional[int] = None
    assigned_bed_id: Optional[int] = None
    notes: Optional[str] = None

class AmbulanceStatusUpdate(BaseModel):
    status: str
    destination_hospital_id: Optional[int] = None
    assigned_bed_id: Optional[int] = None
    eta_minutes: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None

# Emergency Schemas
class EmergencyIntakeRequest(BaseModel):
    patient_name: str
    patient_age: int
    patient_gender: str
    condition_summary: str
    priority: str = "RED"
    required_icu: bool = False
    required_ventilator: bool = False
    required_oxygen: bool = False
    required_specialist: str = "General"
    pickup_lat: float
    pickup_lng: float
    initial_heart_rate: Optional[int] = 90
    initial_systolic_bp: Optional[int] = 120
    initial_diastolic_bp: Optional[int] = 80
    initial_spo2: Optional[float] = 98.0
    initial_respiratory_rate: Optional[int] = 18

EmergencyIntakeIn = EmergencyIntakeRequest

class CriteriaBreakdown(BaseModel):
    distance_score: float
    bed_score: float
    equipment_score: float
    specialist_score: float
    status_score: float
    ventilators_available: int
    trauma_level: str

class HospitalRankingOut(BaseModel):
    hospital_id: int
    hospital_name: str
    branch_name: str
    code: str
    address: str
    lat: float
    lng: float
    distance_km: float
    eta_minutes: int
    suitability_score: float
    has_icu_bed: bool
    available_icu_beds: int
    has_general_bed: bool
    available_total_beds: int
    has_ventilator: bool
    has_specialist: bool
    specialist_name: Optional[str] = None
    emergency_status: str
    recommended_bed_id: Optional[int] = None
    recommended_bed_code: Optional[str] = None
    criteria_breakdown: CriteriaBreakdown

class ReserveAndDispatchIn(BaseModel):
    patient_name: str
    patient_age: int
    patient_gender: str
    condition_summary: str
    priority: str = "RED"
    required_icu: bool = False
    required_ventilator: bool = False
    required_oxygen: bool = False
    required_specialist: str = "General"
    pickup_lat: float
    pickup_lng: float
    hospital_id: int
    bed_id: Optional[int] = None
    ambulance_id: Optional[int] = None

class ReserveAndDispatchResult(BaseModel):
    emergency_case_id: int
    case_number: str
    hospital_id: int
    hospital_name: str
    bed_id: Optional[int] = None
    bed_code: Optional[str] = None
    ambulance_id: Optional[int] = None
    ambulance_code: Optional[str] = None
    status: str
    message: str

class EmergencyCaseOut(BaseModel):
    id: int
    case_number: str
    patient_name: str
    patient_age: int
    patient_gender: str
    condition_summary: str
    priority: str
    required_icu: bool
    required_ventilator: bool
    required_oxygen: bool
    required_specialist: str
    required_er: bool
    initial_vitals: Optional[str] = "{}"
    pickup_lat: float
    pickup_lng: float
    assigned_hospital_id: Optional[int] = None
    assigned_hospital_name: Optional[str] = None
    assigned_ambulance_id: Optional[int] = None
    assigned_ambulance_code: Optional[str] = None
    assigned_bed_id: Optional[int] = None
    assigned_bed_code: Optional[str] = None
    status: str
    created_at: datetime.datetime
    arrived_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

# ----------------------------------------------------
# PHASE 5: EMERGENCY & AMBULANCE INTELLIGENCE SCHEMAS
# ----------------------------------------------------
class EmergencyCaseCreateIn(BaseModel):
    patient_name: str
    patient_age: int
    patient_gender: str
    emergency_type: str = "CARDIAC"  # "CARDIAC", "RESPIRATORY", "TRAUMA", "NEUROLOGICAL", "GENERAL_CRITICAL", "OTHER"
    priority: str = "CRITICAL"       # "CRITICAL", "HIGH", "MEDIUM"
    condition_summary: str
    required_department: str = "ICU" # "ICU", "EMERGENCY", "CARDIOLOGY", "NEUROLOGY", "TRAUMA", "PULMONOLOGY", "GENERAL"
    required_resources: List[str] = ["ICU bed", "Ventilator", "Oxygen", "Cardiologist"]
    vitals_heart_rate: int = 120
    vitals_systolic_bp: int = 90
    vitals_diastolic_bp: int = 60
    vitals_spo2: float = 91.0
    vitals_respiratory_rate: int = 26
    vitals_temperature: float = 37.2
    pickup_address: str = "Central Plaza Intersection, Downtown"
    pickup_lat: float = 28.6139
    pickup_lng: float = 77.2090

class HospitalMatchDetailOut(BaseModel):
    id: int
    hospital_id: int
    hospital_name: str
    branch_name: str
    address: str
    lat: float
    lng: float
    is_eligible: bool
    ineligible_reason: Optional[str] = None
    suitability_score: float
    resource_score: float
    clinical_score: float
    eta_score: float
    capacity_score: float
    readiness_score: float
    distance_km: float
    eta_minutes: int
    explanation: List[str] = []
    breakdown_details: dict = {}
    icu_available: int = 0
    icu_total: int = 0
    icu_occupancy: float = 0.0
    ventilators_available: int = 0
    specialist_on_duty: Optional[str] = None
    emergency_status: str = "NORMAL"

    class Config:
        from_attributes = True

class SelectHospitalIn(BaseModel):
    hospital_id: int

class BedCandidateOut(BaseModel):
    id: int
    code: str
    bed_type: str
    department_id: int
    department_name: str
    unit_name: str
    status: str
    has_ventilator: bool = True
    has_monitor: bool = True
    has_oxygen: bool = True

    class Config:
        from_attributes = True

class BedReservationRequestIn(BaseModel):
    bed_id: int

class BedReservationOut(BaseModel):
    id: int
    emergency_case_id: int
    bed_id: int
    bed_code: str
    hospital_id: int
    hospital_name: str
    department_name: str
    status: str
    reserved_at: datetime.datetime

    class Config:
        from_attributes = True

class AmbulanceCandidateOut(BaseModel):
    id: int
    code: str
    vehicle_number: str
    driver_name: str
    paramedic_name: str
    phone: str
    status: str
    lat: float
    lng: float
    distance_km: float
    eta_minutes: int

    class Config:
        from_attributes = True

class AssignAmbulanceRequestIn(BaseModel):
    ambulance_id: int

class EmergencyTimelineItemOut(BaseModel):
    id: int
    emergency_case_id: int
    event_type: str
    title: str
    description: str
    actor_name: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class EmergencyNotificationOut(BaseModel):
    id: int
    emergency_case_id: int
    hospital_id: int
    recipient_role: str
    title: str
    message: str
    is_read: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class EmergencyCaseDetailOut(BaseModel):
    id: int
    case_number: str
    patient_name: str
    patient_age: int
    patient_gender: str
    emergency_type: str
    priority: str
    condition_summary: str
    required_department: str
    required_resources: List[str] = []
    vitals_heart_rate: int
    vitals_systolic_bp: int
    vitals_diastolic_bp: int
    vitals_spo2: float
    vitals_respiratory_rate: int
    vitals_temperature: float
    pickup_lat: float
    pickup_lng: float
    pickup_address: str
    status: str
    assigned_hospital_id: Optional[int] = None
    assigned_hospital_name: Optional[str] = None
    assigned_ambulance_id: Optional[int] = None
    assigned_ambulance_code: Optional[str] = None
    assigned_bed_id: Optional[int] = None
    assigned_bed_code: Optional[str] = None
    assigned_patient_id: Optional[int] = None
    suitability_score: float = 0.0
    eta_minutes: Optional[int] = None
    created_at: datetime.datetime
    arrived_at: Optional[datetime.datetime] = None
    completed_at: Optional[datetime.datetime] = None
    matches: List[HospitalMatchDetailOut] = []
    timeline_events: List[EmergencyTimelineItemOut] = []
    assigned_ambulance: Optional[AmbulanceOut] = None

    class Config:
        from_attributes = True

# Analytics Schemas
class AnalyticsSummaryOut(BaseModel):
    total_hospitals: int
    total_beds: int
    total_occupied_beds: int
    total_available_beds: int
    total_icu_beds: int
    available_icu_beds: int
    network_icu_occupancy_rate: float
    network_overall_occupancy_rate: float
    active_ambulances: int
    critical_patients: int
    high_risk_patients: int
    active_alerts: int
    avg_ambulance_response_mins: float
    total_admissions_today: int
    total_discharges_today: int

# Alert Schemas
class AlertCreate(BaseModel):
    title: str
    message: str
    alert_type: str = "GENERAL"
    severity: str = "MEDIUM"
    hospital_id: Optional[int] = None
    patient_id: Optional[int] = None
    target_role: Optional[str] = "ALL"

class AlertOut(BaseModel):
    id: int
    title: str
    message: str
    alert_type: str
    severity: str
    hospital_id: Optional[int] = None
    hospital_name: Optional[str] = None
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    ambulance_id: Optional[int] = None
    is_read: bool
    target_role: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# Audit Log Schemas
class AuditLogOut(BaseModel):
    id: int
    user_email: str
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    details: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# ==========================================
# NURSE SPECIFIC SCHEMAS (PHASE 3)
# ==========================================

class NurseDashboardSummaryOut(BaseModel):
    assigned_patients: int
    critical_patients: int
    high_risk_patients: int
    pending_tasks: int
    available_icu_beds: int
    incoming_ambulances: int
    active_alerts: int

class NursingNoteIn(BaseModel):
    content: str
    nurse_name: Optional[str] = "Staff Nurse"

class NursingNoteOut(BaseModel):
    id: int
    patient_id: int
    nurse_id: Optional[int] = None
    nurse_name: str
    content: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class NursePatientOut(BaseModel):
    id: int
    mrn: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    admission_date: datetime.datetime
    status: str
    triage_priority: str
    risk_level: str  # "STABLE", "WATCH", "HIGH RISK", "CRITICAL"
    hospital_id: int
    hospital_name: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    bed_id: Optional[int] = None
    bed_code: Optional[str] = None
    diagnosis: str
    assigned_doctor_id: Optional[int] = None
    assigned_doctor_name: Optional[str] = None
    assigned_nurse_id: Optional[int] = None
    assigned_nurse_name: Optional[str] = None
    latest_vitals: Optional[PatientVitalOut] = None
    last_vitals_updated: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class NursePatientDetailOut(NursePatientOut):
    vitals_history: List[PatientVitalOut] = []
    nursing_notes: List[NursingNoteOut] = []
    medications: List[MedicationOut] = []
    nurse_tasks: List[NurseTaskOut] = []

class NurseVitalsCreate(BaseModel):
    heart_rate: int
    spo2: float
    systolic_bp: int
    diastolic_bp: int
    respiratory_rate: int
    temperature: float
    pain_score: Optional[int] = 0
    consciousness: Optional[str] = "ALERT"
    recorded_by_nurse_name: Optional[str] = "Staff Nurse"

class MedicationAdministerIn(BaseModel):
    administered_by: Optional[str] = "Staff Nurse"
    status: Optional[str] = "ADMINISTERED"  # "ADMINISTERED", "SKIPPED", "MISSED"
    notes: Optional[str] = None

class DoctorRequestIn(BaseModel):
    patient_id: int
    doctor_id: Optional[int] = None
    reason: str
    priority: Optional[str] = "ROUTINE"  # "ROUTINE", "URGENT", "STAT"

class DoctorRequestOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    hospital_id: int
    department_id: int
    department_name: Optional[str] = None
    nurse_id: Optional[int] = None
    nurse_name: str
    doctor_id: Optional[int] = None
    doctor_name: Optional[str] = None
    reason: str
    priority: str
    status: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class ShiftHandoverIn(BaseModel):
    hospital_id: Optional[int] = None
    department_id: Optional[int] = None
    incoming_nurse_id: Optional[int] = None
    incoming_nurse_name: str
    shift: Optional[str] = "MORNING_TO_EVENING"
    general_notes: str
    pending_tasks_summary: Optional[str] = None
    critical_observations: Optional[str] = None

class ShiftHandoverOut(BaseModel):
    id: int
    hospital_id: int
    department_id: int
    outgoing_nurse_id: Optional[int] = None
    outgoing_nurse_name: str
    incoming_nurse_id: Optional[int] = None
    incoming_nurse_name: str
    shift: str
    general_notes: str
    pending_tasks_summary: Optional[str] = None
    critical_observations: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class AmbulancePrepareResult(BaseModel):
    ambulance_id: int
    ambulance_code: str
    bed_id: int
    bed_code: str
    bed_status: str
    message: str

class AmbulanceArrivalResult(BaseModel):
    ambulance_id: int
    ambulance_code: str
    patient_id: Optional[int] = None
    patient_name: str
    bed_id: Optional[int] = None
    bed_code: Optional[str] = None
    ambulance_status: str
    bed_status: str
    message: str

# ----------------------------------------------------
# PHASE 4: DOCTOR SCHEMAS
# ----------------------------------------------------

class DoctorDashboardSummaryOut(BaseModel):
    my_patients: int
    critical_patients: int
    high_risk_patients: int
    stable_patients: int
    active_alerts: int
    incoming_patients: int
    pending_nurse_requests: int

class AIRiskReportOut(BaseModel):
    risk_score: float  # 0.0 - 100.0
    risk_level: str    # "CRITICAL", "HIGH RISK", "WATCH", "STABLE"
    factors: dict      # e.g. {"spo2": 35.0, "respiratory_rate": 25.0, "heart_rate": 20.0, "blood_pressure": 15.0, "temperature": 5.0}
    factor_labels: dict = {}
    contributing_factors: List[str] = []
    trend: List[float] = []
    explanation: str = ""
    disclaimer: str = "Prototype AI estimate — not a clinical diagnosis."

class VitalTrendPointOut(BaseModel):
    timestamp: datetime.datetime
    time_label: str
    heart_rate: int
    spo2: float
    systolic_bp: int
    diastolic_bp: int
    respiratory_rate: int
    temperature: float
    news2_score: int

class TimelineEventOut(BaseModel):
    id: str
    timestamp: datetime.datetime
    time_label: str
    event_type: str  # ADMISSION, VITALS, LAB, MEDICATION, ALERT, DOCTOR_NOTE, NURSE_NOTE, PROCEDURE, ORDER, TRANSFER, DISCHARGE
    title: str
    description: str
    actor_name: Optional[str] = None
    severity: Optional[str] = "INFO"

class DoctorOrderIn(BaseModel):
    order_type: str  # "LAB", "IMAGING", "PROCEDURE", "MEDICATION", "CONSULT"
    description: str
    priority: Optional[str] = "ROUTINE"  # "ROUTINE", "URGENT", "STAT"
    notes: Optional[str] = None

class DoctorOrderOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    doctor_id: Optional[int] = None
    doctor_name: str
    order_type: str
    description: str
    priority: str
    status: str  # "REQUESTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"
    notes: Optional[str] = None
    timestamp: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class PatientTransferIn(BaseModel):
    to_department_id: int
    to_unit_name: Optional[str] = None
    reason: str
    priority: Optional[str] = "URGENT"  # "ROUTINE", "URGENT", "EMERGENCY"
    notes: Optional[str] = None

class PatientTransferOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    doctor_name: str
    from_department_id: Optional[int] = None
    from_department_name: Optional[str] = None
    to_department_id: Optional[int] = None
    to_department_name: Optional[str] = None
    from_unit_name: Optional[str] = None
    to_unit_name: Optional[str] = None
    from_bed_code: Optional[str] = None
    to_bed_code: Optional[str] = None
    reason: str
    priority: str
    status: str
    notes: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class PatientDischargeIn(BaseModel):
    reason: Optional[str] = "RECOVERY"  # "RECOVERY", "TRANSFER", "HOME_CARE", "OTHER"
    discharge_summary: str
    instructions: Optional[str] = None

class PatientDischargeOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    doctor_name: str
    bed_code: Optional[str] = None
    reason: str
    discharge_summary: str
    instructions: Optional[str] = None
    status: str
    timestamp: datetime.datetime
    completed_at: Optional[datetime.datetime] = None

    class Config:
        from_attributes = True

class ClinicalNoteCreateIn(BaseModel):
    note_type: str = "PROGRESS"  # "PROGRESS", "OBSERVATION", "ASSESSMENT", "PROCEDURE", "DISCHARGE", "GENERAL"
    content: str
    plan: Optional[str] = None

class ClinicalNoteUpdateIn(BaseModel):
    note_type: Optional[str] = None
    content: Optional[str] = None
    plan: Optional[str] = None

class DoctorPatientOut(BaseModel):
    id: int
    mrn: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    bed_code: Optional[str] = None
    department_id: int
    department_name: Optional[str] = None
    unit_name: Optional[str] = None
    diagnosis: str
    risk_level: str  # "CRITICAL", "HIGH RISK", "WATCH", "STABLE"
    risk_score: float
    news2_score: int
    latest_vitals: Optional[PatientVitalOut] = None
    status: str  # "CRITICAL", "HIGH_RISK", "STABLE", "DISCHARGED", "DISCHARGE_PENDING"
    assigned_doctor_id: Optional[int] = None
    assigned_doctor_name: Optional[str] = None
    assigned_nurse_name: Optional[str] = None
    latest_alert: Optional[str] = None
    admission_date: datetime.datetime
    allergies: List[str] = []

    class Config:
        from_attributes = True

class DoctorPatientDetailOut(BaseModel):
    id: int
    mrn: str
    full_name: str
    age: int
    gender: str
    blood_group: str
    admission_date: datetime.datetime
    discharge_date: Optional[datetime.datetime] = None
    status: str
    triage_priority: str
    risk_level: str
    risk_score: float
    news2_score: int
    hospital_id: int
    hospital_name: str
    branch_name: str
    department_id: int
    department_name: str
    unit_name: Optional[str] = None
    bed_code: Optional[str] = None
    diagnosis: str
    assigned_doctor_id: Optional[int] = None
    assigned_doctor_name: Optional[str] = None
    assigned_nurse_id: Optional[int] = None
    assigned_nurse_name: Optional[str] = None
    medical_history: List[Any] = []
    allergies: List[str] = []
    latest_vitals: Optional[PatientVitalOut] = None
    latest_alert: Optional[str] = None
    vitals_history: List[PatientVitalOut] = []
    lab_results: List[LabResultOut] = []
    medications: List[MedicationOut] = []
    clinical_notes: List[ClinicalNoteOut] = []
    nursing_notes: List[NursingNoteOut] = []
    doctor_orders: List[DoctorOrderOut] = []
    risk_prediction: Optional[AIRiskReportOut] = None
    timeline_events: List[TimelineEventOut] = []

    class Config:
        from_attributes = True

# X-Ray AI Schemas
class XRayPredictionResponse(BaseModel):
    prediction: str  # "NORMAL" or "PNEUMONIA"
    confidence: float
    normal_probability: float
    pneumonia_probability: float
    model_version: str = "1.0.0"
    architecture: str = "efficientnet_b0"
    disclaimer: str
    record_id: Optional[int] = None
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    image_url: Optional[str] = None

class XRayRecordOut(BaseModel):
    id: int
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    patient_mrn: Optional[str] = None
    prediction: str
    confidence: float
    normal_probability: float
    pneumonia_probability: float
    image_filename: Optional[str] = None
    image_url: Optional[str] = None
    original_filename: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True



