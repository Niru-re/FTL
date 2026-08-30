import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Patient, PatientVital, ClinicalNote, LabResult, Medication, NurseTask, Staff, Bed, Hospital, Department, AuditLog, Alert
from ..schemas import (
    PatientOut, PatientDetailOut, PatientVitalIn, PatientVitalOut,
    ClinicalNoteIn, ClinicalNoteOut, LabResultOut, MedicationOut, NurseTaskOut,
    AIRiskEvaluation
)
from ..services.ai_risk_service import evaluate_patient_risk, calculate_news2
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/patients", tags=["patients"])

def serialize_patient_summary(p: Patient, db: Session) -> PatientOut:
    latest_v = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).first()
    news2 = calculate_news2(latest_v) if latest_v else 0
    ai_risk = evaluate_patient_risk(p, latest_v)

    latest_v_out = None
    if latest_v:
        latest_v_out = PatientVitalOut.model_validate(latest_v)

    return PatientOut(
        id=p.id,
        mrn=p.mrn,
        full_name=p.full_name,
        age=p.age,
        gender=p.gender,
        blood_group=p.blood_group,
        admission_date=p.admission_date,
        discharge_date=p.discharge_date,
        status=p.status,
        triage_priority=p.triage_priority,
        assigned_doctor_id=p.assigned_doctor_id,
        assigned_doctor_name=p.assigned_doctor.name if p.assigned_doctor else None,
        assigned_nurse_id=p.assigned_nurse_id,
        assigned_nurse_name=p.assigned_nurse.name if p.assigned_nurse else None,
        assigned_bed_id=p.assigned_bed_id,
        bed_code=p.bed.code if p.bed else None,
        hospital_id=p.hospital_id,
        hospital_name=p.hospital.name if p.hospital else None,
        department_id=p.department_id,
        department_name=p.department.name if p.department else None,
        diagnosis=p.diagnosis,
        latest_vitals=latest_v_out,
        news2_score=news2,
        ai_risk_score=ai_risk["risk_score"],
        ai_risk_level=ai_risk["risk_level"]
    )

@router.get("", response_model=List[PatientOut])
def get_patients(
    hospital_id: Optional[int] = Query(None),
    doctor_id: Optional[int] = Query(None),
    nurse_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Patient)

    if hospital_id is not None:
        query = query.filter(Patient.hospital_id == hospital_id)
    if doctor_id is not None:
        query = query.filter(Patient.assigned_doctor_id == doctor_id)
    if nurse_id is not None:
        query = query.filter(Patient.assigned_nurse_id == nurse_id)
    if status is not None and status != "ALL":
        query = query.filter(Patient.status == status)

    patients = query.order_by(Patient.admission_date.desc()).all()
    return [serialize_patient_summary(p, db) for p in patients]

@router.get("/{patient_id}", response_model=PatientDetailOut)
def get_patient_details(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = db.query(PatientVital).filter(PatientVital.patient_id == p.id).order_by(PatientVital.timestamp.desc()).all()
    notes = db.query(ClinicalNote).filter(ClinicalNote.patient_id == p.id).order_by(ClinicalNote.timestamp.desc()).all()
    labs = db.query(LabResult).filter(LabResult.patient_id == p.id).order_by(LabResult.timestamp.desc()).all()
    meds = db.query(Medication).filter(Medication.patient_id == p.id).all()
    tasks = db.query(NurseTask).filter(NurseTask.patient_id == p.id).all()

    latest_v = vitals[0] if vitals else None
    ai_risk_data = evaluate_patient_risk(p, latest_v, labs)
    news2 = calculate_news2(latest_v) if latest_v else 0

    latest_v_out = PatientVitalOut.model_validate(latest_v) if latest_v else None

    # Format nurse tasks
    task_outs = []
    for t in tasks:
        task_outs.append(NurseTaskOut(
            id=t.id,
            patient_id=t.patient_id,
            patient_name=p.full_name,
            bed_code=p.bed.code if p.bed else None,
            nurse_id=t.nurse_id,
            hospital_id=t.hospital_id,
            task_type=t.task_type,
            description=t.description,
            due_time=t.due_time,
            is_completed=t.is_completed,
            completed_at=t.completed_at
        ))

    return PatientDetailOut(
        id=p.id,
        mrn=p.mrn,
        full_name=p.full_name,
        age=p.age,
        gender=p.gender,
        blood_group=p.blood_group,
        admission_date=p.admission_date,
        discharge_date=p.discharge_date,
        status=p.status,
        triage_priority=p.triage_priority,
        assigned_doctor_id=p.assigned_doctor_id,
        assigned_doctor_name=p.assigned_doctor.name if p.assigned_doctor else None,
        assigned_nurse_id=p.assigned_nurse_id,
        assigned_nurse_name=p.assigned_nurse.name if p.assigned_nurse else None,
        assigned_bed_id=p.assigned_bed_id,
        bed_code=p.bed.code if p.bed else None,
        hospital_id=p.hospital_id,
        hospital_name=p.hospital.name if p.hospital else None,
        department_id=p.department_id,
        department_name=p.department.name if p.department else None,
        diagnosis=p.diagnosis,
        latest_vitals=latest_v_out,
        news2_score=news2,
        ai_risk_score=ai_risk_data["risk_score"],
        ai_risk_level=ai_risk_data["risk_level"],
        medical_history=p.medical_history or "[]",
        allergies=p.allergies or "[]",
        vitals=[PatientVitalOut.model_validate(v) for v in vitals],
        clinical_notes=[ClinicalNoteOut.model_validate(n) for n in notes],
        lab_results=[LabResultOut.model_validate(l) for l in labs],
        medications=[MedicationOut.model_validate(m) for m in meds],
        nurse_tasks=task_outs,
        ai_risk_evaluation=AIRiskEvaluation(**ai_risk_data)
    )

@router.post("/{patient_id}/vitals", response_model=PatientVitalOut)
async def add_patient_vitals(
    patient_id: int,
    vital_in: PatientVitalIn,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    temp_vital = PatientVital(
        patient_id=patient_id,
        timestamp=datetime.datetime.utcnow(),
        heart_rate=vital_in.heart_rate,
        systolic_bp=vital_in.systolic_bp,
        diastolic_bp=vital_in.diastolic_bp,
        spo2=vital_in.spo2,
        respiratory_rate=vital_in.respiratory_rate,
        temperature=vital_in.temperature,
        pain_score=vital_in.pain_score,
        consciousness=vital_in.consciousness,
        recorded_by_nurse_name=vital_in.recorded_by_nurse_name or "Staff Nurse"
    )
    temp_vital.news2_score = calculate_news2(temp_vital)

    db.add(temp_vital)

    # If vitals indicate critical deterioration, trigger alert
    if temp_vital.news2_score >= 5 or temp_vital.spo2 < 91:
        alert = Alert(
            title=f"Critical Vitals Alert - {patient.full_name}",
            message=f"Patient {patient.full_name} ({patient.mrn}) recorded NEWS2 score of {temp_vital.news2_score}. SpO2 {temp_vital.spo2}%, HR {temp_vital.heart_rate} bpm.",
            alert_type="CRITICAL_PATIENT",
            severity="CRITICAL" if temp_vital.news2_score >= 7 else "HIGH",
            hospital_id=patient.hospital_id,
            patient_id=patient.id,
            target_role="ALL"
        )
        db.add(alert)

    db.commit()
    db.refresh(temp_vital)

    vital_out = PatientVitalOut.model_validate(temp_vital)

    # Broadcast real-time vitals update
    await notification_service.broadcast("PATIENT_VITALS_UPDATED", {
        "patient_id": patient.id,
        "mrn": patient.mrn,
        "full_name": patient.full_name,
        "vital": vital_out.model_dump()
    })

    return vital_out

@router.post("/{patient_id}/notes", response_model=ClinicalNoteOut)
async def add_clinical_note(
    patient_id: int,
    note_in: ClinicalNoteIn,
    doctor_name: Optional[str] = "Attending Physician",
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    new_note = ClinicalNote(
        patient_id=patient_id,
        doctor_id=patient.assigned_doctor_id,
        doctor_name=doctor_name or (patient.assigned_doctor.name if patient.assigned_doctor else "Attending Physician"),
        timestamp=datetime.datetime.utcnow(),
        note_type=note_in.note_type,
        content=note_in.content,
        plan=note_in.plan
    )
    db.add(new_note)

    audit = AuditLog(
        action="ADD_CLINICAL_NOTE",
        entity_type="PATIENT",
        entity_id=str(patient.id),
        details=f"Clinical note added for {patient.full_name} ({note_in.note_type})"
    )
    db.add(audit)
    db.commit()
    db.refresh(new_note)

    return ClinicalNoteOut.model_validate(new_note)

@router.put("/tasks/{task_id}/complete")
async def toggle_nurse_task(task_id: int, is_completed: bool = True, db: Session = Depends(get_db)):
    task = db.query(NurseTask).filter(NurseTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_completed = is_completed
    task.completed_at = datetime.datetime.utcnow() if is_completed else None
    db.commit()
    return {"message": "Task updated successfully", "task_id": task_id, "is_completed": is_completed}
