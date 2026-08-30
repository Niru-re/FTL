import json
import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from ..database import get_db
from ..auth import get_current_user, require_doctor
from ..models import (
    User, Staff, Patient, PatientVital, ClinicalNote, NursingNote,
    LabResult, Medication, NurseTask, DoctorRequest, DoctorOrder,
    PatientTransfer, PatientDischarge, RiskPrediction, Bed, Hospital,
    Department, Ambulance, EmergencyCase, Alert, AuditLog
)
from ..schemas import (
    DoctorDashboardSummaryOut, DoctorPatientOut, DoctorPatientDetailOut,
    PatientVitalOut, PatientVitalIn, VitalTrendPointOut, TimelineEventOut, LabResultOut,
    LabResultIn, MedicationOut, MedicationIn, ClinicalNoteOut,
    ClinicalNoteCreateIn, ClinicalNoteUpdateIn, NursingNoteOut,
    DoctorOrderIn, DoctorOrderOut, PatientTransferIn, PatientTransferOut,
    PatientDischargeIn, PatientDischargeOut, AIRiskReportOut, DoctorRequestOut,
    AlertOut, AmbulanceOut
)
from ..services.risk_engine import AIRiskEngine
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/doctor", tags=["doctor"])

def get_current_doctor_staff(user: User, db: Session) -> Optional[Staff]:
    """Resolves the Staff record for the logged-in doctor"""
    staff = db.query(Staff).filter(Staff.user_id == user.id).first()
    if not staff:
        staff = db.query(Staff).filter(Staff.name == user.full_name).first()
    if not staff and user.role == "DOCTOR":
        # Fallback to the primary doctor in their hospital
        staff = db.query(Staff).filter(Staff.hospital_id == user.hospital_id, Staff.staff_type == "DOCTOR").first()
    return staff

def generate_patient_timeline(p: Patient, db: Session) -> List[TimelineEventOut]:
    """Compiles chronological timeline events for a patient"""
    events: List[TimelineEventOut] = []

    # 1. Admission
    events.append(TimelineEventOut(
        id=f"adm-{p.id}",
        timestamp=p.admission_date,
        time_label=p.admission_date.strftime("%H:%M"),
        event_type="ADMISSION",
        title="Patient Inpatient Admission",
        description=f"Admitted with initial diagnosis: {p.diagnosis}. Assigned to Bed {p.bed.code if p.bed else 'Unassigned'}.",
        actor_name=p.assigned_nurse.name if p.assigned_nurse else "Intake Desk",
        severity="INFO"
    ))

    # 2. Vitals Events
    vitals = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).limit(8).all()
    for v in vitals:
        is_crit = v.spo2 < 90 or v.heart_rate > 120 or v.respiratory_rate > 28
        events.append(TimelineEventOut(
            id=f"vit-{v.id}",
            timestamp=v.timestamp,
            time_label=v.timestamp.strftime("%H:%M"),
            event_type="VITALS",
            title="Telemetry Vitals Logged",
            description=f"SpO2: {v.spo2}%, HR: {v.heart_rate} bpm, BP: {v.systolic_bp}/{v.diastolic_bp} mmHg, RR: {v.respiratory_rate}/min, Temp: {v.temperature}°C",
            actor_name=v.recorded_by_nurse_name or "Staff Nurse",
            severity="CRITICAL" if is_crit else "INFO"
        ))

    # 3. Lab Results
    labs = db.query(LabResult).filter(LabResult.patient_id == p.id).order_by(LabResult.timestamp.desc()).limit(6).all()
    for lab in labs:
        events.append(TimelineEventOut(
            id=f"lab-{lab.id}",
            timestamp=lab.timestamp,
            time_label=lab.timestamp.strftime("%H:%M"),
            event_type="LAB",
            title=f"Lab Result: {lab.test_name}",
            description=f"{lab.test_name} reported at {lab.value} {lab.unit} (Status: {lab.status}). Ref: {lab.reference_range}",
            actor_name="Clinical Pathology Lab",
            severity="HIGH" if lab.status in ["HIGH", "CRITICAL"] else "INFO"
        ))

    # 4. Clinical Notes
    c_notes = db.query(ClinicalNote).filter(ClinicalNote.patient_id == p.id).order_by(ClinicalNote.timestamp.desc()).all()
    for cn in c_notes:
        events.append(TimelineEventOut(
            id=f"cn-{cn.id}",
            timestamp=cn.timestamp,
            time_label=cn.timestamp.strftime("%H:%M"),
            event_type="DOCTOR_NOTE",
            title=f"Physician Note ({cn.note_type})",
            description=cn.content[:180] + ("..." if len(cn.content) > 180 else ""),
            actor_name=cn.doctor_name or "Attending Physician",
            severity="INFO"
        ))

    # 5. Nursing Notes
    n_notes = db.query(NursingNote).filter(NursingNote.patient_id == p.id).order_by(NursingNote.timestamp.desc()).all()
    for nn in n_notes:
        events.append(TimelineEventOut(
            id=f"nn-{nn.id}",
            timestamp=nn.timestamp,
            time_label=nn.timestamp.strftime("%H:%M"),
            event_type="NURSE_NOTE",
            title="Nursing Observation Note",
            description=nn.content[:180] + ("..." if len(nn.content) > 180 else ""),
            actor_name=nn.nurse_name or "Staff Nurse",
            severity="INFO"
        ))

    # 6. Doctor Orders
    orders = db.query(DoctorOrder).filter(DoctorOrder.patient_id == p.id).order_by(DoctorOrder.timestamp.desc()).all()
    for o in orders:
        events.append(TimelineEventOut(
            id=f"ord-{o.id}",
            timestamp=o.timestamp,
            time_label=o.timestamp.strftime("%H:%M"),
            event_type="ORDER",
            title=f"Physician Order: {o.order_type}",
            description=f"{o.description} (Priority: {o.priority}, Status: {o.status})",
            actor_name=o.doctor_name,
            severity="HIGH" if o.priority in ["STAT", "URGENT"] else "INFO"
        ))

    # 7. Alerts
    alerts = db.query(Alert).filter(Alert.patient_id == p.id).order_by(Alert.created_at.desc()).limit(5).all()
    for a in alerts:
        events.append(TimelineEventOut(
            id=f"alt-{a.id}",
            timestamp=a.created_at,
            time_label=a.created_at.strftime("%H:%M"),
            event_type="ALERT",
            title=a.title,
            description=a.message,
            actor_name="Telemetry Monitoring System",
            severity=a.severity
        ))

    # Sort all events chronologically (most recent first)
    events.sort(key=lambda x: x.timestamp, reverse=True)
    return events

# ----------------------------------------------------
# 1. DASHBOARD
# ----------------------------------------------------
@router.get("/dashboard", response_model=DoctorDashboardSummaryOut)
def get_doctor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    doctor_staff = get_current_doctor_staff(current_user, db)
    doc_id = doctor_staff.id if doctor_staff else None
    hosp_id = current_user.hospital_id or 1

    # Patients assigned to this doctor (or all in hospital if admin)
    if current_user.role == "ADMIN":
        query = db.query(Patient).filter(Patient.hospital_id == hosp_id, Patient.status != "DISCHARGED")
    elif doc_id:
        query = db.query(Patient).filter(
            or_(Patient.assigned_doctor_id == doc_id, Patient.hospital_id == hosp_id),
            Patient.status != "DISCHARGED"
        )
    else:
        query = db.query(Patient).filter(Patient.hospital_id == hosp_id, Patient.status != "DISCHARGED")

    patients = query.all()
    total_pts = len(patients)

    critical_count = 0
    high_risk_count = 0
    stable_count = 0

    for p in patients:
        latest_v = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).first()
        risk_out = AIRiskEngine.evaluate_patient_risk(p, latest_v)
        if risk_out.risk_level == "CRITICAL" or p.status == "CRITICAL":
            critical_count += 1
        elif risk_out.risk_level == "HIGH RISK" or p.status == "HIGH_RISK":
            high_risk_count += 1
        else:
            stable_count += 1

    # Active Alerts
    active_alerts = db.query(Alert).filter(
        Alert.hospital_id == hosp_id,
        Alert.is_read == False
    ).count()

    # Incoming Ambulance Cases
    incoming_ambs = db.query(Ambulance).filter(
        Ambulance.destination_hospital_id == hosp_id,
        Ambulance.status.in_(["EN_ROUTE", "DISPATCHED", "TRANSPORTING"])
    ).count()

    # Pending Nurse Requests
    nurse_reqs = db.query(DoctorRequest).filter(
        DoctorRequest.hospital_id == hosp_id,
        DoctorRequest.status == "PENDING"
    ).count()

    return DoctorDashboardSummaryOut(
        my_patients=total_pts,
        critical_patients=critical_count,
        high_risk_patients=high_risk_count,
        stable_patients=stable_count,
        active_alerts=active_alerts,
        incoming_patients=incoming_ambs,
        pending_nurse_requests=nurse_reqs
    )

# ----------------------------------------------------
# 2. PATIENTS LIST
# ----------------------------------------------------
@router.get("/patients", response_model=List[DoctorPatientOut])
def get_doctor_patients(
    risk: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    department_id: Optional[int] = Query(None),
    bed_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("risk"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    doctor_staff = get_current_doctor_staff(current_user, db)
    doc_id = doctor_staff.id if doctor_staff else None
    hosp_id = current_user.hospital_id or 1

    query = db.query(Patient).filter(Patient.hospital_id == hosp_id)

    if current_user.role != "ADMIN" and doc_id:
        query = query.filter(or_(Patient.assigned_doctor_id == doc_id, Patient.assigned_doctor_id == None))

    if department_id:
        query = query.filter(Patient.department_id == department_id)
    if bed_id:
        query = query.filter(Patient.assigned_bed_id == bed_id)
    if status and status != "ALL":
        query = query.filter(Patient.status == status)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Patient.full_name.ilike(s),
                Patient.mrn.ilike(s),
                Patient.diagnosis.ilike(s)
            )
        )

    patients = query.all()
    results: List[DoctorPatientOut] = []

    for p in patients:
        latest_v = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).first()
        labs = db.query(LabResult).filter(LabResult.patient_id == p.id).all()
        risk_out = AIRiskEngine.evaluate_patient_risk(p, latest_v, [], labs)
        news2 = AIRiskEngine.calculate_news2(latest_v)

        if risk and risk != "ALL" and risk_out.risk_level != risk:
            continue

        allergies_list = []
        try:
            if p.allergies:
                allergies_list = json.loads(p.allergies) if isinstance(p.allergies, str) else p.allergies
        except Exception:
            allergies_list = [p.allergies] if isinstance(p.allergies, str) else []

        latest_alt = db.query(Alert).filter(Alert.patient_id == p.id, Alert.is_read == False).order_by(Alert.created_at.desc()).first()

        results.append(DoctorPatientOut(
            id=p.id,
            mrn=p.mrn,
            full_name=p.full_name,
            age=p.age,
            gender=p.gender,
            blood_group=p.blood_group,
            bed_code=p.bed.code if p.bed else None,
            department_id=p.department_id,
            department_name=p.department.name if p.department else "Medical ICU",
            unit_name="Medical ICU",
            diagnosis=p.diagnosis,
            risk_level=risk_out.risk_level,
            risk_score=risk_out.risk_score,
            news2_score=news2,
            latest_vitals=PatientVitalOut.model_validate(latest_v) if latest_v else None,
            status=p.status,
            assigned_doctor_id=p.assigned_doctor_id,
            assigned_doctor_name=p.assigned_doctor.name if p.assigned_doctor else (doctor_staff.name if doctor_staff else "Dr. Arjun Sharma"),
            assigned_nurse_name=p.assigned_nurse.name if p.assigned_nurse else "Nurse Elena Rostova",
            latest_alert=latest_alt.title if latest_alt else None,
            admission_date=p.admission_date,
            allergies=allergies_list
        ))

    # Sorting
    if sort_by == "risk":
        results.sort(key=lambda x: x.risk_score, reverse=True)
    elif sort_by == "name":
        results.sort(key=lambda x: x.full_name)
    elif sort_by == "bed":
        results.sort(key=lambda x: x.bed_code or "")
    elif sort_by == "alert":
        results.sort(key=lambda x: (x.latest_alert is not None, x.risk_score), reverse=True)

    return results

# ----------------------------------------------------
# 3. PATIENT DETAIL (CLINICAL COMMAND VIEW)
# ----------------------------------------------------
@router.get("/patients/{id}", response_model=DoctorPatientDetailOut)
def get_doctor_patient_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found")

    latest_v = db.query(PatientVital).filter(PatientVital.patient_id == id).order_by(PatientVital.timestamp.desc()).first()
    vitals_history = db.query(PatientVital).filter(PatientVital.patient_id == id).order_by(PatientVital.timestamp.desc()).limit(20).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == id).order_by(LabResult.timestamp.desc()).all()
    meds = db.query(Medication).filter(Medication.patient_id == id).all()
    c_notes = db.query(ClinicalNote).filter(ClinicalNote.patient_id == id).order_by(ClinicalNote.timestamp.desc()).all()
    n_notes = db.query(NursingNote).filter(NursingNote.patient_id == id).order_by(NursingNote.timestamp.desc()).all()
    orders = db.query(DoctorOrder).filter(DoctorOrder.patient_id == id).order_by(DoctorOrder.timestamp.desc()).all()
    latest_alt = db.query(Alert).filter(Alert.patient_id == id, Alert.is_read == False).order_by(Alert.created_at.desc()).first()

    risk_report = AIRiskEngine.evaluate_patient_risk(patient, latest_v, vitals_history, labs)
    news2 = AIRiskEngine.calculate_news2(latest_v)

    # Decode JSON fields
    med_history = []
    try:
        if patient.medical_history:
            med_history = json.loads(patient.medical_history) if isinstance(patient.medical_history, str) else patient.medical_history
    except Exception:
        med_history = []

    allergies_list = []
    try:
        if patient.allergies:
            allergies_list = json.loads(patient.allergies) if isinstance(patient.allergies, str) else patient.allergies
    except Exception:
        allergies_list = []

    timeline = generate_patient_timeline(patient, db)

    return DoctorPatientDetailOut(
        id=patient.id,
        mrn=patient.mrn,
        full_name=patient.full_name,
        age=patient.age,
        gender=patient.gender,
        blood_group=patient.blood_group,
        admission_date=patient.admission_date,
        discharge_date=patient.discharge_date,
        status=patient.status,
        triage_priority=patient.triage_priority,
        risk_level=risk_report.risk_level,
        risk_score=risk_report.risk_score,
        news2_score=news2,
        hospital_id=patient.hospital_id,
        hospital_name=patient.hospital.name if patient.hospital else "HealthNet Central Hospital",
        branch_name=patient.hospital.branch_name if patient.hospital else "Downtown Campus",
        department_id=patient.department_id,
        department_name=patient.department.name if patient.department else "Medical ICU",
        unit_name="Medical ICU",
        bed_code=patient.bed.code if patient.bed else None,
        diagnosis=patient.diagnosis,
        assigned_doctor_id=patient.assigned_doctor_id,
        assigned_doctor_name=patient.assigned_doctor.name if patient.assigned_doctor else "Dr. Arjun Sharma",
        assigned_nurse_id=patient.assigned_nurse_id,
        assigned_nurse_name=patient.assigned_nurse.name if patient.assigned_nurse else "Nurse Elena Rostova",
        medical_history=med_history,
        allergies=allergies_list,
        latest_vitals=PatientVitalOut.model_validate(latest_v) if latest_v else None,
        latest_alert=latest_alt.title if latest_alt else None,
        vitals_history=[PatientVitalOut.model_validate(v) for v in vitals_history],
        lab_results=[LabResultOut.model_validate(l) for l in labs],
        medications=[MedicationOut.model_validate(m) for m in meds],
        clinical_notes=[ClinicalNoteOut.model_validate(cn) for cn in c_notes],
        nursing_notes=[NursingNoteOut.model_validate(nn) for nn in n_notes],
        doctor_orders=[DoctorOrderOut.model_validate(o) for o in orders],
        risk_prediction=risk_report,
        timeline_events=timeline
    )

# ----------------------------------------------------
# 4. VITALS & TREND ANALYTICS
# ----------------------------------------------------
@router.get("/patients/{id}/vitals", response_model=List[VitalTrendPointOut])
def get_patient_vital_trends(
    id: int,
    range: Optional[str] = Query("24h"),  # "1h", "6h", "12h", "24h", "all"
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    limit = 24
    if range == "1h":
        limit = 6
    elif range == "6h":
        limit = 12
    elif range == "12h":
        limit = 18

    vitals = db.query(PatientVital).filter(
        PatientVital.patient_id == id
    ).order_by(PatientVital.timestamp.asc()).all()

    if not vitals:
        return []

    # If few records exist, return what we have formatted
    results = []
    for v in vitals[-limit:]:
        results.append(VitalTrendPointOut(
            timestamp=v.timestamp,
            time_label=v.timestamp.strftime("%H:%M"),
            heart_rate=v.heart_rate,
            spo2=v.spo2,
            systolic_bp=v.systolic_bp,
            diastolic_bp=v.diastolic_bp,
            respiratory_rate=v.respiratory_rate,
            temperature=v.temperature,
            news2_score=v.news2_score or AIRiskEngine.calculate_news2(v)
        ))
    return results

@router.post("/patients/{id}/vitals", response_model=PatientVitalOut)
def record_doctor_vitals(
    id: int,
    payload: PatientVitalIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vital = PatientVital(
        patient_id=id,
        heart_rate=payload.heart_rate,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        spo2=payload.spo2,
        respiratory_rate=payload.respiratory_rate,
        temperature=payload.temperature,
        pain_score=payload.pain_score,
        consciousness=payload.consciousness,
        recorded_by_nurse_name=current_user.full_name,
        timestamp=datetime.datetime.utcnow()
    )
    vital.news2_score = AIRiskEngine.calculate_news2(vital)
    db.add(vital)
    db.commit()
    db.refresh(vital)

    # Check for critical threshold alerts
    if vital.spo2 < 90 or vital.heart_rate > 120 or vital.respiratory_rate > 28:
        alert = Alert(
            title=f"CRITICAL VITALS — {patient.full_name} ({patient.mrn})",
            message=f"Critical vitals recorded: SpO2 {vital.spo2}%, HR {vital.heart_rate} bpm, RR {vital.respiratory_rate}/min.",
            alert_type="CRITICAL_VITALS",
            severity="CRITICAL",
            hospital_id=patient.hospital_id,
            patient_id=patient.id,
            target_role="ALL"
        )
        db.add(alert)
        db.commit()

    notification_service.broadcast_sync({
        "type": "PATIENT_VITALS_UPDATED",
        "patient_id": id,
        "hospital_id": patient.hospital_id
    })

    return PatientVitalOut.model_validate(vital)

# ----------------------------------------------------
# 5. MEDICAL HISTORY & ALLERGIES
# ----------------------------------------------------
@router.get("/patients/{id}/history")
def get_patient_history(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    history = []
    try:
        if patient.medical_history:
            history = json.loads(patient.medical_history) if isinstance(patient.medical_history, str) else patient.medical_history
    except Exception:
        history = []

    allergies = []
    try:
        if patient.allergies:
            allergies = json.loads(patient.allergies) if isinstance(patient.allergies, str) else patient.allergies
    except Exception:
        allergies = []

    return {
        "patient_id": patient.id,
        "full_name": patient.full_name,
        "mrn": patient.mrn,
        "medical_history": history,
        "allergies": allergies,
        "past_diagnoses": ["Essential Hypertension (2018)", "Type 2 Diabetes Mellitus (2020)", "Bilateral Osteoarthritis (2022)"],
        "past_admissions": [
            {"date": "2024-03-12", "reason": "Severe Bronchitis", "hospital": "HealthNet Central", "discharge_status": "Recovered"},
            {"date": "2022-11-04", "reason": "Elective Arthroscopy", "hospital": "HealthNet North", "discharge_status": "Successful"}
        ],
        "surgical_history": ["Right Knee Arthroscopy (2022)", "Appendectomy (2008)"]
    }

# ----------------------------------------------------
# 6. LAB REPORTS
# ----------------------------------------------------
@router.get("/patients/{id}/labs", response_model=List[LabResultOut])
def get_patient_labs(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    labs = db.query(LabResult).filter(LabResult.patient_id == id).order_by(LabResult.timestamp.desc()).all()
    return [LabResultOut.model_validate(l) for l in labs]

@router.post("/patients/{id}/labs", response_model=LabResultOut)
def add_patient_lab_result(
    id: int,
    payload: LabResultIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    lab = LabResult(
        patient_id=id,
        test_name=payload.test_name,
        category=payload.category,
        value=payload.value,
        unit=payload.unit,
        reference_range=payload.reference_range,
        status=payload.status,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(lab)
    db.commit()
    db.refresh(lab)
    return LabResultOut.model_validate(lab)

# ----------------------------------------------------
# 7. MEDICATIONS (PRESCRIPTION & MANAGEMENT)
# ----------------------------------------------------
@router.get("/patients/{id}/medications", response_model=List[MedicationOut])
def get_patient_medications(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    meds = db.query(Medication).filter(Medication.patient_id == id).all()
    return [MedicationOut.model_validate(m) for m in meds]

@router.post("/patients/{id}/medications", response_model=MedicationOut)
def prescribe_medication(
    id: int,
    payload: MedicationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    med = Medication(
        patient_id=id,
        drug_name=payload.drug_name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        route=payload.route,
        status=payload.status,
        start_date=datetime.datetime.utcnow(),
        administered_by=current_user.full_name
    )
    db.add(med)
    db.commit()
    db.refresh(med)

    # Log audit
    audit = AuditLog(
        user_id=current_user.id,
        user_email=current_user.email,
        action="PRESCRIBE_MEDICATION",
        entity_type="Medication",
        entity_id=str(med.id),
        details=f"Prescribed {med.drug_name} {med.dosage} for patient {patient.full_name}"
    )
    db.add(audit)
    db.commit()

    return MedicationOut.model_validate(med)

@router.put("/medications/{id}", response_model=MedicationOut)
def update_medication(
    id: int,
    payload: MedicationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    med = db.query(Medication).filter(Medication.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.drug_name = payload.drug_name
    med.dosage = payload.dosage
    med.frequency = payload.frequency
    med.route = payload.route
    med.status = payload.status
    db.commit()
    db.refresh(med)
    return MedicationOut.model_validate(med)

@router.delete("/medications/{id}")
def discontinue_medication(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    med = db.query(Medication).filter(Medication.id == id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.status = "DISCONTINUED"
    db.commit()
    return {"message": f"Medication '{med.drug_name}' discontinued successfully."}

# ----------------------------------------------------
# 8. CLINICAL NOTES (PROGRESS, SOAP, OBSERVATIONS)
# ----------------------------------------------------
@router.get("/patients/{id}/notes", response_model=List[ClinicalNoteOut])
def get_patient_clinical_notes(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    notes = db.query(ClinicalNote).filter(ClinicalNote.patient_id == id).order_by(ClinicalNote.timestamp.desc()).all()
    return [ClinicalNoteOut.model_validate(n) for n in notes]

@router.post("/patients/{id}/notes", response_model=ClinicalNoteOut)
def add_patient_clinical_note(
    id: int,
    payload: ClinicalNoteCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor_staff = get_current_doctor_staff(current_user, db)

    note = ClinicalNote(
        patient_id=id,
        doctor_id=doctor_staff.id if doctor_staff else None,
        doctor_name=current_user.full_name,
        note_type=payload.note_type,
        content=payload.content,
        plan=payload.plan,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return ClinicalNoteOut.model_validate(note)

@router.put("/notes/{id}", response_model=ClinicalNoteOut)
def update_patient_clinical_note(
    id: int,
    payload: ClinicalNoteUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    note = db.query(ClinicalNote).filter(ClinicalNote.id == id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Clinical note not found")

    if payload.note_type:
        note.note_type = payload.note_type
    if payload.content:
        note.content = payload.content
    if payload.plan is not None:
        note.plan = payload.plan
    db.commit()
    db.refresh(note)
    return ClinicalNoteOut.model_validate(note)

# ----------------------------------------------------
# 9. PROTOTYPE AI RISK ENGINE
# ----------------------------------------------------
@router.get("/patients/{id}/risk", response_model=AIRiskReportOut)
def get_patient_ai_risk(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    latest_v = db.query(PatientVital).filter(PatientVital.patient_id == id).order_by(PatientVital.timestamp.desc()).first()
    vitals_history = db.query(PatientVital).filter(PatientVital.patient_id == id).order_by(PatientVital.timestamp.desc()).limit(15).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == id).all()

    report = AIRiskEngine.evaluate_patient_risk(patient, latest_v, vitals_history, labs)
    return report

# ----------------------------------------------------
# 10. DOCTOR ALERTS
# ----------------------------------------------------
@router.get("/alerts", response_model=List[AlertOut])
def get_doctor_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    hosp_id = current_user.hospital_id or 1
    alerts = db.query(Alert).filter(
        Alert.hospital_id == hosp_id
    ).order_by(Alert.is_read.asc(), Alert.created_at.desc()).limit(50).all()
    return [AlertOut.model_validate(a) for a in alerts]

@router.post("/alerts/{id}/acknowledge", response_model=AlertOut)
def acknowledge_doctor_alert(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    db.refresh(alert)
    return AlertOut.model_validate(alert)

# ----------------------------------------------------
# 11. INCOMING PATIENTS & AMBULANCES
# ----------------------------------------------------
@router.get("/incoming", response_model=List[AmbulanceOut])
def get_incoming_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    hosp_id = current_user.hospital_id or 1
    ambs = db.query(Ambulance).filter(
        Ambulance.destination_hospital_id == hosp_id
    ).order_by(Ambulance.eta_minutes.asc()).all()
    return [AmbulanceOut.model_validate(a) for a in ambs]

# ----------------------------------------------------
# 12. NURSE-TO-DOCTOR REQUESTS
# ----------------------------------------------------
@router.get("/requests", response_model=List[DoctorRequestOut])
def get_doctor_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    hosp_id = current_user.hospital_id or 1
    reqs = db.query(DoctorRequest).filter(
        DoctorRequest.hospital_id == hosp_id
    ).order_by(DoctorRequest.created_at.desc()).all()
    return [DoctorRequestOut.model_validate(r) for r in reqs]

@router.post("/requests/{id}/acknowledge", response_model=DoctorRequestOut)
def acknowledge_nurse_request(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    req = db.query(DoctorRequest).filter(DoctorRequest.id == id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Doctor request not found")

    req.status = "ACCEPTED"
    req.doctor_name = current_user.full_name
    db.commit()
    db.refresh(req)

    # Broadcast notification to nurse
    notification_service.broadcast_sync({
        "type": "DOCTOR_REQUEST_ACKNOWLEDGED",
        "request_id": id,
        "doctor_name": current_user.full_name,
        "patient_id": req.patient_id
    })

    return DoctorRequestOut.model_validate(req)

# ----------------------------------------------------
# 13. DOCTOR ORDERS (LABS, IMAGING, PROCEDURES)
# ----------------------------------------------------
@router.get("/orders", response_model=List[DoctorOrderOut])
def get_doctor_orders(
    patient_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    query = db.query(DoctorOrder)
    if patient_id:
        query = query.filter(DoctorOrder.patient_id == patient_id)
    orders = query.order_by(DoctorOrder.timestamp.desc()).all()
    return [DoctorOrderOut.model_validate(o) for o in orders]

@router.post("/orders", response_model=DoctorOrderOut)
def create_doctor_order(
    payload: DoctorOrderIn,
    patient_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor_staff = get_current_doctor_staff(current_user, db)

    order = DoctorOrder(
        patient_id=patient_id,
        doctor_id=doctor_staff.id if doctor_staff else None,
        doctor_name=current_user.full_name,
        order_type=payload.order_type,
        description=payload.description,
        priority=payload.priority or "ROUTINE",
        status="REQUESTED",
        notes=payload.notes,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    # Create associated Nurse Task
    task = NurseTask(
        patient_id=patient_id,
        task_type="ORDER_EXECUTION",
        description=f"Doctor Order: {order.order_type} - {order.description}",
        due_time="Stat" if order.priority == "STAT" else "16:00",
        is_completed=False
    )
    db.add(task)
    db.commit()

    return DoctorOrderOut.model_validate(order)

# ----------------------------------------------------
# 14. PATIENT TRANSFER WORKFLOW
# ----------------------------------------------------
@router.post("/patients/{id}/transfer", response_model=PatientTransferOut)
def request_patient_transfer(
    id: int,
    payload: PatientTransferIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor_staff = get_current_doctor_staff(current_user, db)
    to_dept = db.query(Department).filter(Department.id == payload.to_department_id).first()

    transfer = PatientTransfer(
        patient_id=id,
        doctor_id=doctor_staff.id if doctor_staff else None,
        doctor_name=current_user.full_name,
        from_department_id=patient.department_id,
        to_department_id=payload.to_department_id,
        from_unit_name="Medical ICU",
        to_unit_name=payload.to_unit_name or (to_dept.name if to_dept else "Specialized Unit"),
        from_bed_code=patient.bed.code if patient.bed else None,
        reason=payload.reason,
        priority=payload.priority or "URGENT",
        status="REQUESTED",
        notes=payload.notes,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(transfer)
    db.commit()
    db.refresh(transfer)

    # Emit notification
    alert = Alert(
        title=f"TRANSFER REQUEST: {patient.full_name} ({patient.mrn})",
        message=f"Physician transfer requested to {to_dept.name if to_dept else 'Unit'}. Reason: {payload.reason}.",
        alert_type="TRANSFER_REQUEST",
        severity="HIGH",
        hospital_id=patient.hospital_id,
        patient_id=patient.id,
        target_role="ADMIN"
    )
    db.add(alert)
    db.commit()

    return PatientTransferOut(
        id=transfer.id,
        patient_id=transfer.patient_id,
        patient_name=patient.full_name,
        patient_mrn=patient.mrn,
        doctor_name=transfer.doctor_name,
        from_department_id=transfer.from_department_id,
        from_department_name=patient.department.name if patient.department else "Medical ICU",
        to_department_id=transfer.to_department_id,
        to_department_name=to_dept.name if to_dept else "Target Unit",
        from_unit_name=transfer.from_unit_name,
        to_unit_name=transfer.to_unit_name,
        from_bed_code=transfer.from_bed_code,
        to_bed_code=transfer.to_bed_code,
        reason=transfer.reason,
        priority=transfer.priority,
        status=transfer.status,
        notes=transfer.notes,
        timestamp=transfer.timestamp
    )

# ----------------------------------------------------
# 15. DISCHARGE WORKFLOW
# ----------------------------------------------------
@router.post("/patients/{id}/discharge", response_model=PatientDischargeOut)
def discharge_patient(
    id: int,
    payload: PatientDischargeIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_doctor)
):
    patient = db.query(Patient).filter(Patient.id == id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor_staff = get_current_doctor_staff(current_user, db)

    discharge = PatientDischarge(
        patient_id=id,
        doctor_id=doctor_staff.id if doctor_staff else None,
        doctor_name=current_user.full_name,
        bed_id=patient.assigned_bed_id,
        bed_code=patient.bed.code if patient.bed else None,
        reason=payload.reason or "RECOVERY",
        discharge_summary=payload.discharge_summary,
        instructions=payload.instructions,
        status="PENDING",
        timestamp=datetime.datetime.utcnow()
    )
    db.add(discharge)

    # Update patient status to DISCHARGE_PENDING (Bed stays occupied until Nurse/Admin sanitizes)
    patient.status = "DISCHARGE_PENDING"
    db.commit()
    db.refresh(discharge)

    # Emit notification to Nursing & Admin
    alert = Alert(
        title=f"DISCHARGE ORDERED: {patient.full_name} ({patient.mrn})",
        message=f"Physician confirmed patient discharge. Bed {patient.bed.code if patient.bed else 'N/A'} pending turnover.",
        alert_type="PATIENT_DISCHARGE",
        severity="MEDIUM",
        hospital_id=patient.hospital_id,
        patient_id=patient.id,
        target_role="NURSE"
    )
    db.add(alert)
    db.commit()

    return PatientDischargeOut(
        id=discharge.id,
        patient_id=discharge.patient_id,
        patient_name=patient.full_name,
        patient_mrn=patient.mrn,
        doctor_name=discharge.doctor_name,
        bed_code=discharge.bed_code,
        reason=discharge.reason,
        discharge_summary=discharge.discharge_summary,
        instructions=discharge.instructions,
        status=discharge.status,
        timestamp=discharge.timestamp
    )
