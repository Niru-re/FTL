import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth import get_current_user, require_nurse
from ..models import (
    User, Patient, PatientVital, NursingNote, Medication, MedicationAdministration,
    NurseTask, DoctorRequest, ShiftHandover, Bed, Staff, Hospital, Department,
    Unit, Ambulance, EmergencyCase, Alert, AuditLog
)
from ..schemas import (
    NurseDashboardSummaryOut, NursePatientOut, NursePatientDetailOut, PatientVitalOut,
    NursingNoteIn, NursingNoteOut, NurseVitalsCreate, MedicationOut, MedicationAdministerIn,
    NurseTaskOut, NurseTaskIn, DoctorRequestIn, DoctorRequestOut, ShiftHandoverIn, ShiftHandoverOut,
    AmbulancePrepareResult, AmbulanceArrivalResult, AmbulanceOut, BedOut, AlertOut, StaffOut
)
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/nurse", tags=["nurse"])

def derive_patient_risk_level(p: Patient, latest_v: Optional[PatientVital]) -> str:
    if p.status == "CRITICAL":
        return "CRITICAL"
    if latest_v:
        if latest_v.spo2 < 90 or latest_v.heart_rate > 120 or latest_v.respiratory_rate > 28 or latest_v.systolic_bp < 90:
            return "CRITICAL"
        if latest_v.spo2 <= 93 or latest_v.heart_rate > 100 or latest_v.respiratory_rate > 20 or latest_v.temperature > 38.5:
            return "HIGH RISK"
        if latest_v.temperature > 37.5 or latest_v.pain_score >= 5:
            return "WATCH"
    if p.status == "HIGH_RISK":
        return "HIGH RISK"
    return "STABLE"

def serialize_nurse_patient(p: Patient, db: Session) -> NursePatientOut:
    latest_v = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).first()
    risk_level = derive_patient_risk_level(p, latest_v)

    latest_v_out = None
    if latest_v:
        latest_v_out = PatientVitalOut.model_validate(latest_v)

    bed_code = p.bed.code if p.bed else None
    doc_name = p.assigned_doctor.name if p.assigned_doctor else None
    nurse_name = p.assigned_nurse.name if p.assigned_nurse else None

    return NursePatientOut(
        id=p.id,
        mrn=p.mrn,
        full_name=p.full_name,
        age=p.age,
        gender=p.gender,
        blood_group=p.blood_group,
        admission_date=p.admission_date,
        status=p.status,
        triage_priority=p.triage_priority,
        risk_level=risk_level,
        hospital_id=p.hospital_id,
        hospital_name=p.hospital.name if p.hospital else None,
        department_id=p.department_id,
        department_name=p.department.name if p.department else None,
        bed_id=p.assigned_bed_id,
        bed_code=bed_code,
        diagnosis=p.diagnosis,
        assigned_doctor_id=p.assigned_doctor_id,
        assigned_doctor_name=doc_name,
        assigned_nurse_id=p.assigned_nurse_id,
        assigned_nurse_name=nurse_name,
        latest_vitals=latest_v_out,
        last_vitals_updated=latest_v.timestamp if latest_v else None
    )

# 1. DASHBOARD SUMMARY
@router.get("/dashboard", response_model=NurseDashboardSummaryOut)
def get_nurse_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1

    # Assigned patients
    patients = db.query(Patient).filter(Patient.hospital_id == hospital_id).all()
    assigned_count = len(patients)

    critical_count = 0
    high_risk_count = 0
    for p in patients:
        latest_v = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).first()
        risk = derive_patient_risk_level(p, latest_v)
        if risk == "CRITICAL":
            critical_count += 1
        elif risk == "HIGH RISK":
            high_risk_count += 1

    # Pending tasks
    pending_tasks_count = db.query(NurseTask).join(Patient).filter(
        Patient.hospital_id == hospital_id,
        NurseTask.is_completed == False
    ).count()

    # Available ICU beds
    available_icu_beds = db.query(Bed).filter(
        Bed.hospital_id == hospital_id,
        Bed.bed_type == "ICU",
        Bed.status == "AVAILABLE"
    ).count()

    # Incoming ambulances
    incoming_amb_count = db.query(Ambulance).filter(
        Ambulance.destination_hospital_id == hospital_id,
        Ambulance.status.in_(["EN_ROUTE", "DISPATCHED", "TRANSPORTING"])
    ).count()

    # Active alerts
    active_alerts_count = db.query(Alert).filter(
        Alert.hospital_id == hospital_id,
        Alert.is_read == False
    ).count()

    return NurseDashboardSummaryOut(
        assigned_patients=assigned_count,
        critical_patients=critical_count,
        high_risk_patients=high_risk_count,
        pending_tasks=pending_tasks_count,
        available_icu_beds=available_icu_beds,
        incoming_ambulances=incoming_amb_count,
        active_alerts=active_alerts_count
    )

# 2. PATIENTS LIST
@router.get("/patients", response_model=List[NursePatientOut])
def get_nurse_patients(
    status: Optional[str] = None,
    risk: Optional[str] = None,
    department_id: Optional[int] = None,
    bed_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    query = db.query(Patient).filter(Patient.hospital_id == hospital_id)

    if department_id:
        query = query.filter(Patient.department_id == department_id)
    if bed_id:
        query = query.filter(Patient.assigned_bed_id == bed_id)
    if status and status != "ALL":
        query = query.filter(Patient.status == status)

    patients = query.order_by(Patient.id.desc()).all()
    results = []
    for p in patients:
        s_pat = serialize_nurse_patient(p, db)
        if risk and risk != "ALL" and s_pat.risk_level != risk:
            continue
        if search:
            q = search.lower()
            if q not in s_pat.full_name.lower() and q not in s_pat.mrn.lower() and (not s_pat.bed_code or q not in s_pat.bed_code.lower()):
                continue
        results.append(s_pat)

    return results

# 3. PATIENT DETAIL (NURSE SCOPED)
@router.get("/patients/{id}", response_model=NursePatientDetailOut)
def get_nurse_patient_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    base = serialize_nurse_patient(patient, db)

    # Vitals history
    vitals_history = [
        PatientVitalOut.model_validate(v) for v in patient.vitals
    ]

    # Nursing notes (exclude confidential doctor-only clinical SOAP notes)
    nursing_notes = [
        NursingNoteOut(
            id=n.id,
            patient_id=n.patient_id,
            nurse_id=n.nurse_id,
            nurse_name=n.nurse_name,
            content=n.content,
            timestamp=n.timestamp
        ) for n in patient.nursing_notes
    ]

    # Medications
    medications = [
        MedicationOut.model_validate(m) for m in patient.medications
    ]

    # Nurse tasks
    nurse_tasks = [
        NurseTaskOut(
            id=t.id,
            patient_id=t.patient_id,
            patient_name=patient.full_name,
            bed_code=base.bed_code,
            nurse_id=t.nurse_id,
            task_type=t.task_type,
            description=t.description,
            due_time=t.due_time,
            is_completed=t.is_completed,
            completed_at=t.completed_at
        ) for t in patient.nurse_tasks
    ]

    return NursePatientDetailOut(
        **base.model_dump(),
        vitals_history=vitals_history,
        nursing_notes=nursing_notes,
        medications=medications,
        nurse_tasks=nurse_tasks
    )

# 4. RECORD VITALS
@router.post("/patients/{id}/vitals", response_model=PatientVitalOut)
def record_patient_vitals(
    id: int,
    vitals_in: NurseVitalsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Determine prototype threshold status
    is_critical = False
    if vitals_in.spo2 < 90 or vitals_in.heart_rate > 120 or vitals_in.respiratory_rate > 28 or vitals_in.temperature > 39.0:
        is_critical = True
        patient.status = "CRITICAL"
        patient.triage_priority = "RED"
    elif vitals_in.spo2 <= 93 or vitals_in.heart_rate > 100 or vitals_in.respiratory_rate > 20:
        if patient.status != "CRITICAL":
            patient.status = "HIGH_RISK"
            patient.triage_priority = "YELLOW"

    new_vital = PatientVital(
        patient_id=patient.id,
        heart_rate=vitals_in.heart_rate,
        systolic_bp=vitals_in.systolic_bp,
        diastolic_bp=vitals_in.diastolic_bp,
        spo2=vitals_in.spo2,
        respiratory_rate=vitals_in.respiratory_rate,
        temperature=vitals_in.temperature,
        pain_score=vitals_in.pain_score or 0,
        consciousness=vitals_in.consciousness or "ALERT",
        recorded_by_nurse_name=vitals_in.recorded_by_nurse_name or current_user.full_name,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(new_vital)

    # If critical, generate real-time Alert
    if is_critical:
        alert = Alert(
            title=f"Critical Vitals Alert: {patient.full_name} ({patient.mrn})",
            message=f"SpO2: {vitals_in.spo2}%, HR: {vitals_in.heart_rate} bpm, RR: {vitals_in.respiratory_rate} bpm. Immediate clinical evaluation required.",
            alert_type="CRITICAL_VITALS",
            severity="CRITICAL",
            hospital_id=patient.hospital_id,
            patient_id=patient.id,
            target_role="ALL"
        )
        db.add(alert)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="RECORD_VITALS",
        entity_type="PATIENT_VITALS",
        entity_id=str(patient.id),
        details=f"HR={vitals_in.heart_rate}, SpO2={vitals_in.spo2}, BP={vitals_in.systolic_bp}/{vitals_in.diastolic_bp}"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_vital)

    # Broadcast WebSocket events
    notification_service.broadcast_sync({
        "type": "PATIENT_VITALS_UPDATED",
        "patient_id": patient.id,
        "vital_id": new_vital.id,
        "is_critical": is_critical
    })

    return PatientVitalOut.model_validate(new_vital)

# 5. ADD NURSING NOTE
@router.post("/patients/{id}/notes", response_model=NursingNoteOut)
def add_nursing_note(
    id: int,
    note_in: NursingNoteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()

    note = NursingNote(
        patient_id=patient.id,
        nurse_id=staff.id if staff else None,
        nurse_name=note_in.nurse_name or current_user.full_name,
        content=note_in.content,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(note)
    db.commit()
    db.refresh(note)

    return NursingNoteOut(
        id=note.id,
        patient_id=note.patient_id,
        nurse_id=note.nurse_id,
        nurse_name=note.nurse_name,
        content=note.content,
        timestamp=note.timestamp
    )

# 6. BEDS FOR NURSE WORKSPACE
@router.get("/beds", response_model=List[BedOut])
def get_nurse_beds(
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    query = db.query(Bed).filter(Bed.hospital_id == hospital_id)

    if department_id:
        query = query.filter(Bed.department_id == department_id)
    if status and status != "ALL":
        query = query.filter(Bed.status == status)

    beds = query.order_by(Bed.code.asc()).all()

    out = []
    for b in beds:
        doc_name = None
        nurse_name = None
        patient_name = None
        patient_mrn = None
        patient_diagnosis = None

        if b.patient:
            patient_name = b.patient.full_name
            patient_mrn = b.patient.mrn
            patient_diagnosis = b.patient.diagnosis
            if b.patient.assigned_doctor:
                doc_name = b.patient.assigned_doctor.name
            if b.patient.assigned_nurse:
                nurse_name = b.patient.assigned_nurse.name

        out.append(BedOut(
            id=b.id,
            code=b.code,
            hospital_id=b.hospital_id,
            hospital_name=b.hospital.name if b.hospital else None,
            branch_name=b.hospital.branch_name if b.hospital else None,
            department_id=b.department_id,
            department_name=b.department.name if b.department else None,
            bed_type=b.bed_type,
            status=b.status,
            patient_id=b.patient_id,
            patient_name=patient_name,
            patient_mrn=patient_mrn,
            patient_diagnosis=patient_diagnosis,
            doctor_name=doc_name,
            nurse_name=nurse_name,
            equipment=b.equipment or "[]",
            last_cleaned_at=b.last_cleaned_at,
            notes=b.notes
        ))
    return out

# 7. NURSE BED STATUS TRANSITION
ALLOWED_NURSE_TRANSITIONS = {
    "OCCUPIED": ["CLEANING"],
    "CLEANING": ["AVAILABLE"],
    "AVAILABLE": ["RESERVED"],
    "RESERVED": ["AVAILABLE", "OCCUPIED"]
}

@router.patch("/beds/{id}/status", response_model=BedOut)
@router.put("/beds/{id}/status", response_model=BedOut)
def update_nurse_bed_status(
    id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    bed = db.query(Bed).filter(Bed.id == id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    new_status = status_update.get("status")
    reason = status_update.get("reason", "Nurse Bed Management")
    notes = status_update.get("notes")

    current_status = bed.status
    allowed = ALLOWED_NURSE_TRANSITIONS.get(current_status, [])

    if new_status not in allowed and new_status != current_status:
        raise HTTPException(
            status_code=400,
            detail=f"Nurse role cannot perform transition from {current_status} to {new_status}. Allowed: {allowed}"
        )

    old_status = bed.status
    bed.status = new_status
    if notes:
        bed.notes = notes

    if new_status == "AVAILABLE":
        bed.patient_id = None
        bed.last_cleaned_at = datetime.datetime.utcnow()
    elif new_status == "CLEANING":
        bed.patient_id = None

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="NURSE_BED_STATUS_UPDATE",
        entity_type="BED",
        entity_id=str(bed.id),
        details=f"Transitioned {old_status} -> {new_status}. Reason: {reason}"
    )
    db.add(audit)
    db.commit()
    db.refresh(bed)

    notification_service.broadcast_sync({
        "type": "BED_STATUS_CHANGED",
        "bed_id": bed.id,
        "old_status": old_status,
        "new_status": new_status,
        "hospital_id": bed.hospital_id
    })

    return BedOut(
        id=bed.id,
        code=bed.code,
        hospital_id=bed.hospital_id,
        hospital_name=bed.hospital.name if bed.hospital else None,
        branch_name=bed.hospital.branch_name if bed.hospital else None,
        department_id=bed.department_id,
        department_name=bed.department.name if bed.department else None,
        bed_type=bed.bed_type,
        status=bed.status,
        patient_id=bed.patient_id,
        patient_name=bed.patient.full_name if bed.patient else None,
        equipment=bed.equipment or "[]",
        last_cleaned_at=bed.last_cleaned_at,
        notes=bed.notes
    )

# 8. AMBULANCES MODULE
@router.get("/ambulances", response_model=List[AmbulanceOut])
def get_nurse_ambulances(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    ambulances = db.query(Ambulance).filter(
        (Ambulance.destination_hospital_id == hospital_id) | (Ambulance.destination_hospital_id == None)
    ).all()

    out = []
    for a in ambulances:
        dest_name = a.destination_hospital.name if a.destination_hospital else None
        out.append(AmbulanceOut(
            id=a.id,
            code=a.code,
            vehicle_number=a.vehicle_number,
            driver_name=a.driver_name,
            paramedic_name=a.paramedic_name,
            phone=a.phone,
            status=a.status,
            lat=a.lat,
            lng=a.lng,
            destination_hospital_id=a.destination_hospital_id,
            destination_hospital_name=dest_name,
            current_patient_id=a.current_patient_id,
            current_patient_name=a.current_patient_name,
            assigned_emergency_case_id=a.assigned_emergency_case_id,
            assigned_bed_id=a.assigned_bed_id,
            assigned_bed_code=a.assigned_bed_code,
            assigned_doctor_name=a.assigned_doctor_name,
            eta_minutes=a.eta_minutes,
            speed_kmh=a.speed_kmh,
            equipment=a.equipment or "[]"
        ))
    return out

@router.get("/ambulances/{id}", response_model=AmbulanceOut)
def get_nurse_ambulance_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    a = db.query(Ambulance).filter(Ambulance.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    dest_name = a.destination_hospital.name if a.destination_hospital else None
    return AmbulanceOut(
        id=a.id,
        code=a.code,
        vehicle_number=a.vehicle_number,
        driver_name=a.driver_name,
        paramedic_name=a.paramedic_name,
        phone=a.phone,
        status=a.status,
        lat=a.lat,
        lng=a.lng,
        destination_hospital_id=a.destination_hospital_id,
        destination_hospital_name=dest_name,
        current_patient_id=a.current_patient_id,
        current_patient_name=a.current_patient_name,
        assigned_emergency_case_id=a.assigned_emergency_case_id,
        assigned_bed_id=a.assigned_bed_id,
        assigned_bed_code=a.assigned_bed_code,
        assigned_doctor_name=a.assigned_doctor_name,
        eta_minutes=a.eta_minutes,
        speed_kmh=a.speed_kmh,
        equipment=a.equipment or "[]"
    )

# 9. PREPARE BED FOR INCOMING AMBULANCE
@router.post("/ambulances/{id}/prepare", response_model=AmbulancePrepareResult)
def prepare_bed_for_ambulance(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    ambulance = db.query(Ambulance).filter(Ambulance.id == id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    hospital_id = ambulance.destination_hospital_id or current_user.hospital_id or 1

    # Find the assigned bed or an available ICU bed
    target_bed = None
    if ambulance.assigned_bed_id:
        target_bed = db.query(Bed).filter(Bed.id == ambulance.assigned_bed_id).first()

    if not target_bed:
        target_bed = db.query(Bed).filter(
            Bed.hospital_id == hospital_id,
            Bed.bed_type == "ICU",
            Bed.status == "AVAILABLE"
        ).first()

    if not target_bed:
        # Fallback to general bed
        target_bed = db.query(Bed).filter(
            Bed.hospital_id == hospital_id,
            Bed.status == "AVAILABLE"
        ).first()

    if not target_bed:
        raise HTTPException(status_code=400, detail="No available bed found in facility to prepare.")

    # Reserve bed
    target_bed.status = "RESERVED"
    ambulance.assigned_bed_id = target_bed.id
    ambulance.assigned_bed_code = target_bed.code

    # Create alert & audit log
    alert = Alert(
        title=f"Bed Prepared for {ambulance.code}",
        message=f"Bed {target_bed.code} reserved for incoming patient ({ambulance.current_patient_name or 'Emergency Case'}). ETA: {ambulance.eta_minutes} mins.",
        alert_type="BED_PREPARED",
        severity="HIGH",
        hospital_id=hospital_id,
        ambulance_id=ambulance.id,
        target_role="ALL"
    )
    db.add(alert)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="PREPARE_BED",
        entity_type="AMBULANCE",
        entity_id=str(ambulance.id),
        details=f"Prepared and reserved Bed {target_bed.code} for {ambulance.code}"
    )
    db.add(audit)
    db.commit()

    notification_service.broadcast_sync({
        "type": "BED_STATUS_CHANGED",
        "bed_id": target_bed.id,
        "old_status": "AVAILABLE",
        "new_status": "RESERVED",
        "hospital_id": hospital_id
    })

    return AmbulancePrepareResult(
        ambulance_id=ambulance.id,
        ambulance_code=ambulance.code,
        bed_id=target_bed.id,
        bed_code=target_bed.code,
        bed_status="RESERVED",
        message=f"Bed {target_bed.code} successfully prepared and reserved for incoming patient."
    )

# 10. CONFIRM AMBULANCE ARRIVAL & PATIENT INTAKE
@router.post("/ambulances/{id}/arrival", response_model=AmbulanceArrivalResult)
def confirm_ambulance_arrival(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    ambulance = db.query(Ambulance).filter(Ambulance.id == id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    hospital_id = ambulance.destination_hospital_id or current_user.hospital_id or 1
    ambulance.status = "ARRIVED"
    ambulance.eta_minutes = 0

    # Locate assigned bed or create association
    target_bed = None
    if ambulance.assigned_bed_id:
        target_bed = db.query(Bed).filter(Bed.id == ambulance.assigned_bed_id).first()

    if not target_bed:
        target_bed = db.query(Bed).filter(
            Bed.hospital_id == hospital_id,
            Bed.status.in_(["RESERVED", "AVAILABLE"])
        ).first()

    # Check if patient exists or create admitted patient
    patient_name = ambulance.current_patient_name or "Emergency Patient"
    patient = None
    if ambulance.current_patient_id:
        patient = db.query(Patient).filter(Patient.id == ambulance.current_patient_id).first()

    if not patient:
        # Create admitted patient
        dept = db.query(Department).filter(Department.hospital_id == hospital_id).first()
        doc = db.query(Staff).filter(Staff.hospital_id == hospital_id, Staff.staff_type == "DOCTOR").first()
        nurse_staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()

        patient = Patient(
            mrn=f"MRN-EM-{int(datetime.datetime.utcnow().timestamp()) % 100000}",
            full_name=patient_name,
            age=52,
            gender="M",
            blood_group="O+",
            admission_date=datetime.datetime.utcnow(),
            status="CRITICAL",
            triage_priority="RED",
            hospital_id=hospital_id,
            department_id=dept.id if dept else 1,
            assigned_doctor_id=doc.id if doc else None,
            assigned_nurse_id=nurse_staff.id if nurse_staff else None,
            diagnosis="Acute Emergency Admission via Ambulance"
        )
        db.add(patient)
        db.flush()

    if target_bed:
        target_bed.status = "OCCUPIED"
        target_bed.patient_id = patient.id
        patient.assigned_bed_id = target_bed.id

    # Create initial triage vitals for patient
    initial_v = PatientVital(
        patient_id=patient.id,
        heart_rate=118,
        systolic_bp=105,
        diastolic_bp=65,
        spo2=91.0,
        respiratory_rate=26,
        temperature=38.4,
        pain_score=6,
        consciousness="VOICE",
        recorded_by_nurse_name=current_user.full_name,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(initial_v)

    # Create arrival alert
    alert = Alert(
        title=f"Patient Arrived & Admitted: {patient.full_name}",
        message=f"Ambulance {ambulance.code} has arrived. Patient admitted to Bed {target_bed.code if target_bed else 'Triage'}.",
        alert_type="AMBULANCE_ARRIVED",
        severity="HIGH",
        hospital_id=hospital_id,
        patient_id=patient.id,
        ambulance_id=ambulance.id,
        target_role="ALL"
    )
    db.add(alert)

    # Audit log
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="CONFIRM_ARRIVAL",
        entity_type="AMBULANCE",
        entity_id=str(ambulance.id),
        details=f"Ambulance {ambulance.code} confirmed arrived. Patient {patient.full_name} admitted to Bed {target_bed.code if target_bed else 'N/A'}"
    )
    db.add(audit)
    db.commit()

    notification_service.broadcast_sync({
        "type": "AMBULANCE_LOCATION_UPDATED",
        "ambulance_id": ambulance.id,
        "status": "ARRIVED",
        "eta_minutes": 0,
        "lat": ambulance.lat,
        "lng": ambulance.lng
    })

    if target_bed:
        notification_service.broadcast_sync({
            "type": "BED_STATUS_CHANGED",
            "bed_id": target_bed.id,
            "old_status": "RESERVED",
            "new_status": "OCCUPIED",
            "hospital_id": hospital_id
        })

    return AmbulanceArrivalResult(
        ambulance_id=ambulance.id,
        ambulance_code=ambulance.code,
        patient_id=patient.id,
        patient_name=patient.full_name,
        bed_id=target_bed.id if target_bed else None,
        bed_code=target_bed.code if target_bed else None,
        ambulance_status="ARRIVED",
        bed_status="OCCUPIED",
        message=f"Patient {patient.full_name} received and admitted to bed {target_bed.code if target_bed else 'Triage'}."
    )

# 11. DOCTORS LIST & DOCTOR REQUEST
@router.get("/doctors", response_model=List[StaffOut])
def get_nurse_doctors(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    doctors = db.query(Staff).filter(
        Staff.hospital_id == hospital_id,
        Staff.staff_type == "DOCTOR"
    ).all()

    out = []
    for d in doctors:
        pts_count = db.query(Patient).filter(Patient.assigned_doctor_id == d.id).count()
        out.append(StaffOut(
            id=d.id,
            user_id=d.user_id,
            staff_type=d.staff_type,
            name=d.name,
            employee_code=d.employee_code,
            specialization=d.specialization,
            hospital_id=d.hospital_id,
            hospital_name=d.hospital.name if d.hospital else None,
            department_id=d.department_id,
            department_name=d.department.name if d.department else None,
            shift=d.shift,
            is_available=d.is_available,
            phone=d.phone,
            on_duty_status=d.on_duty_status,
            assigned_patients_count=pts_count
        ))
    return out

@router.post("/doctors/request", response_model=DoctorRequestOut)
def request_doctor_assignment(
    req_in: DoctorRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    patient = db.query(Patient).filter(Patient.id == req_in.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = None
    if req_in.doctor_id:
        doctor = db.query(Staff).filter(Staff.id == req_in.doctor_id).first()

    staff_nurse = db.query(Staff).filter(Staff.user_id == current_user.id).first()

    doc_req = DoctorRequest(
        patient_id=patient.id,
        hospital_id=patient.hospital_id,
        department_id=patient.department_id,
        nurse_id=staff_nurse.id if staff_nurse else None,
        nurse_name=current_user.full_name,
        doctor_id=doctor.id if doctor else None,
        doctor_name=doctor.name if doctor else "On-Call Attending Physician",
        reason=req_in.reason,
        priority=req_in.priority or "ROUTINE",
        status="PENDING",
        created_at=datetime.datetime.utcnow()
    )
    db.add(doc_req)

    # Alert for doctor
    alert = Alert(
        title=f"Doctor Requested: {patient.full_name} ({req_in.priority})",
        message=f"Nurse {current_user.full_name} requested physician evaluation for {patient.full_name}. Reason: {req_in.reason}",
        alert_type="DOCTOR_REQUEST",
        severity="HIGH" if req_in.priority in ["URGENT", "STAT"] else "MEDIUM",
        hospital_id=patient.hospital_id,
        patient_id=patient.id,
        target_role="DOCTOR"
    )
    db.add(alert)
    db.commit()
    db.refresh(doc_req)

    notification_service.broadcast_sync({
        "type": "DOCTOR_REQUESTED",
        "request_id": doc_req.id,
        "patient_id": patient.id,
        "priority": req_in.priority
    })

    return DoctorRequestOut(
        id=doc_req.id,
        patient_id=patient.id,
        patient_name=patient.full_name,
        patient_mrn=patient.mrn,
        hospital_id=doc_req.hospital_id,
        department_id=doc_req.department_id,
        department_name=patient.department.name if patient.department else None,
        nurse_id=doc_req.nurse_id,
        nurse_name=doc_req.nurse_name,
        doctor_id=doc_req.doctor_id,
        doctor_name=doc_req.doctor_name,
        reason=doc_req.reason,
        priority=doc_req.priority,
        status=doc_req.status,
        created_at=doc_req.created_at
    )

# 12. MEDICATIONS & ADMINISTRATION
@router.get("/medications", response_model=List[MedicationOut])
def get_nurse_medications(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    query = db.query(Medication).join(Patient).filter(Patient.hospital_id == hospital_id)

    if status and status != "ALL":
        query = query.filter(Medication.status == status)

    meds = query.order_by(Medication.id.desc()).all()
    return [MedicationOut.model_validate(m) for m in meds]

@router.post("/medications/{id}/administer", response_model=MedicationOut)
def administer_medication(
    id: int,
    admin_in: MedicationAdministerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    med = db.query(Medication).filter(Medication.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication record not found")

    target_status = admin_in.status or "ADMINISTERED"
    med.status = target_status
    med.administered_by = admin_in.administered_by or current_user.full_name

    admin_log = MedicationAdministration(
        medication_id=med.id,
        patient_id=med.patient_id,
        administered_by=med.administered_by,
        status=target_status,
        notes=admin_in.notes,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(admin_log)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="ADMINISTER_MEDICATION",
        entity_type="MEDICATION",
        entity_id=str(med.id),
        details=f"Medication {med.drug_name} marked {target_status} by {med.administered_by}"
    )
    db.add(audit)
    db.commit()
    db.refresh(med)

    notification_service.broadcast_sync({
        "type": "MEDICATION_ADMINISTERED",
        "medication_id": med.id,
        "patient_id": med.patient_id,
        "status": target_status
    })

    return MedicationOut.model_validate(med)

# 13. TASKS
@router.get("/tasks", response_model=List[NurseTaskOut])
def get_nurse_tasks(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    query = db.query(NurseTask).join(Patient).filter(Patient.hospital_id == hospital_id)

    if status == "PENDING":
        query = query.filter(NurseTask.is_completed == False)
    elif status == "COMPLETED":
        query = query.filter(NurseTask.is_completed == True)

    tasks = query.order_by(NurseTask.id.desc()).all()
    out = []
    for t in tasks:
        p = t.patient
        bed_code = p.bed.code if (p and p.bed) else None
        out.append(NurseTaskOut(
            id=t.id,
            patient_id=t.patient_id,
            patient_name=p.full_name if p else "Patient",
            bed_code=bed_code,
            nurse_id=t.nurse_id,
            task_type=t.task_type,
            description=t.description,
            due_time=t.due_time,
            is_completed=t.is_completed,
            completed_at=t.completed_at
        ))
    return out

@router.post("/tasks", response_model=NurseTaskOut)
def create_nurse_task(
    task_in: NurseTaskIn,
    patient_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()

    task = NurseTask(
        patient_id=patient.id,
        nurse_id=staff.id if staff else None,
        task_type=task_in.task_type,
        description=task_in.description,
        due_time=task_in.due_time,
        is_completed=False
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return NurseTaskOut(
        id=task.id,
        patient_id=patient.id,
        patient_name=patient.full_name,
        bed_code=patient.bed.code if patient.bed else None,
        nurse_id=task.nurse_id,
        task_type=task.task_type,
        description=task.description,
        due_time=task.due_time,
        is_completed=task.is_completed,
        completed_at=task.completed_at
    )

@router.patch("/tasks/{id}", response_model=NurseTaskOut)
def update_nurse_task(
    id: int,
    task_update: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    task = db.query(NurseTask).filter(NurseTask.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if "is_completed" in task_update:
        task.is_completed = task_update["is_completed"]
        if task.is_completed:
            task.completed_at = datetime.datetime.utcnow()
        else:
            task.completed_at = None

    if "description" in task_update:
        task.description = task_update["description"]

    db.commit()
    db.refresh(task)

    p = task.patient
    return NurseTaskOut(
        id=task.id,
        patient_id=task.patient_id,
        patient_name=p.full_name if p else "Patient",
        bed_code=p.bed.code if (p and p.bed) else None,
        nurse_id=task.nurse_id,
        task_type=task.task_type,
        description=task.description,
        due_time=task.due_time,
        is_completed=task.is_completed,
        completed_at=task.completed_at
    )

# 14. ALERTS & ACKNOWLEDGE
@router.get("/alerts", response_model=List[AlertOut])
def get_nurse_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    alerts = db.query(Alert).filter(
        Alert.hospital_id == hospital_id,
        Alert.target_role.in_(["ALL", "NURSE"])
    ).order_by(Alert.id.desc()).all()

    out = []
    for a in alerts:
        out.append(AlertOut(
            id=a.id,
            title=a.title,
            message=a.message,
            alert_type=a.alert_type,
            severity=a.severity,
            hospital_id=a.hospital_id,
            hospital_name=a.hospital.name if a.hospital else None,
            patient_id=a.patient_id,
            patient_name=a.patient.full_name if a.patient else None,
            ambulance_id=a.ambulance_id,
            is_read=a.is_read,
            target_role=a.target_role,
            created_at=a.created_at
        ))
    return out

@router.post("/alerts/{id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    db.refresh(alert)

    return AlertOut(
        id=alert.id,
        title=alert.title,
        message=alert.message,
        alert_type=alert.alert_type,
        severity=alert.severity,
        hospital_id=alert.hospital_id,
        hospital_name=alert.hospital.name if alert.hospital else None,
        patient_id=alert.patient_id,
        patient_name=alert.patient.full_name if alert.patient else None,
        ambulance_id=alert.ambulance_id,
        is_read=alert.is_read,
        target_role=alert.target_role,
        created_at=alert.created_at
    )

# 15. SHIFT HANDOVER
@router.get("/handover", response_model=List[ShiftHandoverOut])
def get_shift_handovers(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = current_user.hospital_id or 1
    handovers = db.query(ShiftHandover).filter(
        ShiftHandover.hospital_id == hospital_id
    ).order_by(ShiftHandover.timestamp.desc()).all()

    return [
        ShiftHandoverOut(
            id=h.id,
            hospital_id=h.hospital_id,
            department_id=h.department_id,
            outgoing_nurse_id=h.outgoing_nurse_id,
            outgoing_nurse_name=h.outgoing_nurse_name,
            incoming_nurse_id=h.incoming_nurse_id,
            incoming_nurse_name=h.incoming_nurse_name,
            shift=h.shift,
            general_notes=h.general_notes,
            pending_tasks_summary=h.pending_tasks_summary,
            critical_observations=h.critical_observations,
            timestamp=h.timestamp
        ) for h in handovers
    ]

@router.post("/handover", response_model=ShiftHandoverOut)
def create_shift_handover(
    ho_in: ShiftHandoverIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_nurse)
):
    hospital_id = ho_in.hospital_id or current_user.hospital_id or 1
    staff = db.query(Staff).filter(Staff.user_id == current_user.id).first()
    dept_id = ho_in.department_id or (staff.department_id if staff else 1)

    handover = ShiftHandover(
        hospital_id=hospital_id,
        department_id=dept_id,
        outgoing_nurse_id=staff.id if staff else None,
        outgoing_nurse_name=current_user.full_name,
        incoming_nurse_id=ho_in.incoming_nurse_id,
        incoming_nurse_name=ho_in.incoming_nurse_name,
        shift=ho_in.shift or "MORNING_TO_EVENING",
        general_notes=ho_in.general_notes,
        pending_tasks_summary=ho_in.pending_tasks_summary,
        critical_observations=ho_in.critical_observations,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(handover)

    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="CREATE_SHIFT_HANDOVER",
        entity_type="SHIFT_HANDOVER",
        entity_id=str(handover.id),
        details=f"Shift handover logged from {current_user.full_name} to {ho_in.incoming_nurse_name}"
    )
    db.add(audit)
    db.commit()
    db.refresh(handover)

    return ShiftHandoverOut(
        id=handover.id,
        hospital_id=handover.hospital_id,
        department_id=handover.department_id,
        outgoing_nurse_id=handover.outgoing_nurse_id,
        outgoing_nurse_name=handover.outgoing_nurse_name,
        incoming_nurse_id=handover.incoming_nurse_id,
        incoming_nurse_name=handover.incoming_nurse_name,
        shift=handover.shift,
        general_notes=handover.general_notes,
        pending_tasks_summary=handover.pending_tasks_summary,
        critical_observations=handover.critical_observations,
        timestamp=handover.timestamp
    )
