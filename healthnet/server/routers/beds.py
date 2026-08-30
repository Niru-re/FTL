import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import Bed, Hospital, Department, Unit, Patient, Staff, AuditLog, User
from ..schemas import BedOut, BedStatusUpdate
from ..auth import get_current_user
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/beds", tags=["beds"])

VALID_TRANSITIONS = {
    "AVAILABLE": ["RESERVED", "MAINTENANCE", "OUT_OF_SERVICE", "OCCUPIED"],
    "RESERVED": ["OCCUPIED", "AVAILABLE", "OUT_OF_SERVICE"],
    "OCCUPIED": ["CLEANING", "OUT_OF_SERVICE"],  # Cannot go directly to AVAILABLE without CLEANING
    "CLEANING": ["AVAILABLE", "OUT_OF_SERVICE", "MAINTENANCE"],
    "MAINTENANCE": ["AVAILABLE", "CLEANING", "OUT_OF_SERVICE"],
    "OUT_OF_SERVICE": ["MAINTENANCE", "CLEANING", "AVAILABLE"]
}

def serialize_bed(b: Bed) -> BedOut:
    p_name = b.patient.full_name if b.patient else None
    p_mrn = b.patient.mrn if b.patient else None
    p_diag = b.patient.diagnosis if b.patient else None
    doc_name = b.patient.assigned_doctor.name if (b.patient and b.patient.assigned_doctor) else None
    nurse_name = b.patient.assigned_nurse.name if (b.patient and b.patient.assigned_nurse) else None
    unit_name = None
    if hasattr(b, 'unit') and b.unit:
        unit_name = b.unit.name

    return BedOut(
        id=b.id,
        code=b.code,
        hospital_id=b.hospital_id,
        hospital_name=b.hospital.name if b.hospital else None,
        branch_name=b.hospital.branch_name if b.hospital else None,
        department_id=b.department_id,
        department_name=b.department.name if b.department else None,
        unit_id=b.unit_id,
        unit_name=unit_name,
        bed_type=b.bed_type,
        status=b.status,
        patient_id=b.patient_id,
        patient_name=p_name,
        patient_mrn=p_mrn,
        patient_diagnosis=p_diag,
        doctor_name=doc_name,
        nurse_name=nurse_name,
        equipment=b.equipment or "[]",
        last_cleaned_at=b.last_cleaned_at,
        notes=b.notes
    )

@router.get("/summary")
def get_beds_summary(hospital_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Bed)
    if hospital_id:
        query = query.filter(Bed.hospital_id == hospital_id)
    beds = query.all()
    total = len(beds)
    occupied = len([b for b in beds if b.status == "OCCUPIED"])
    available = len([b for b in beds if b.status == "AVAILABLE"])
    reserved = len([b for b in beds if b.status == "RESERVED"])
    cleaning = len([b for b in beds if b.status == "CLEANING"])
    maintenance = len([b for b in beds if b.status == "MAINTENANCE"])
    out_of_service = len([b for b in beds if b.status == "OUT_OF_SERVICE"])

    icu_beds = [b for b in beds if b.bed_type == "ICU"]
    total_icu = len(icu_beds)
    available_icu = len([b for b in icu_beds if b.status == "AVAILABLE"])
    occupied_icu = len([b for b in icu_beds if b.status == "OCCUPIED"])

    icu_occupancy_rate = round((occupied_icu / total_icu * 100), 1) if total_icu > 0 else 0.0
    overall_occupancy_rate = round((occupied / total * 100), 1) if total > 0 else 0.0

    return {
        "total_beds": total,
        "occupied_beds": occupied,
        "available_beds": available,
        "reserved_beds": reserved,
        "cleaning_beds": cleaning,
        "maintenance_beds": maintenance,
        "out_of_service_beds": out_of_service,
        "total_icu_beds": total_icu,
        "available_icu_beds": available_icu,
        "occupied_icu_beds": occupied_icu,
        "icu_occupancy_rate": icu_occupancy_rate,
        "overall_occupancy_rate": overall_occupancy_rate
    }

@router.get("", response_model=List[BedOut])
def get_beds(
    hospital_id: Optional[int] = Query(None),
    department_id: Optional[int] = Query(None),
    bed_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Bed)

    if hospital_id is not None:
        query = query.filter(Bed.hospital_id == hospital_id)
    if department_id is not None:
        query = query.filter(Bed.department_id == department_id)
    if bed_type is not None and bed_type != "ALL":
        query = query.filter(Bed.bed_type == bed_type)
    if status is not None and status != "ALL":
        query = query.filter(Bed.status == status)
    if search:
        search_clean = f"%{search.strip()}%"
        query = query.outerjoin(Patient, Bed.patient_id == Patient.id).filter(
            or_(
                Bed.code.ilike(search_clean),
                Patient.full_name.ilike(search_clean),
                Patient.mrn.ilike(search_clean)
            )
        )

    beds = query.order_by(Bed.hospital_id.asc(), Bed.id.asc()).all()
    return [serialize_bed(b) for b in beds]

@router.get("/{bed_id}", response_model=BedOut)
def get_bed_by_id(bed_id: int, db: Session = Depends(get_db)):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    return serialize_bed(bed)

def handle_bed_status_change(bed: Bed, new_status: str, reason: Optional[str], notes: Optional[str], patient_id: Optional[int], db: Session, user_email: str = "system@healthnet.demo") -> BedOut:
    new_status_upper = new_status.upper()
    valid_statuses = ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING", "MAINTENANCE", "OUT_OF_SERVICE"]
    if new_status_upper not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{new_status}'. Must be one of: {', '.join(valid_statuses)}")

    old_status = bed.status

    # Enforce realistic workflow transitions if changing status
    if old_status != new_status_upper:
        allowed = VALID_TRANSITIONS.get(old_status, valid_statuses)
        if new_status_upper not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Illegal bed status transition: '{old_status}' cannot transition directly to '{new_status_upper}'. (Allowed: {', '.join(allowed)})"
            )

    bed.status = new_status_upper

    if notes or reason:
        bed.notes = f"{notes or ''} {f'[Reason: {reason}]' if reason else ''}".strip()

    if new_status_upper == "AVAILABLE":
        bed.patient_id = None
        bed.last_cleaned_at = datetime.datetime.utcnow()
    elif new_status_upper == "CLEANING":
        # Discharging or unassigning patient
        bed.patient_id = None
    elif new_status_upper == "OCCUPIED" and patient_id:
        bed.patient_id = patient_id
        patient = db.query(Patient).filter(Patient.id == patient_id).first()
        if patient:
            patient.assigned_bed_id = bed.id

    # Log in audit
    audit = AuditLog(
        user_email=user_email,
        action=f"BED_STATUS_UPDATE: {old_status} -> {new_status_upper}",
        entity_type="BED",
        entity_id=str(bed.id),
        details=f"Bed {bed.code} status changed from {old_status} to {new_status_upper}. Reason: {reason or 'Direct Update'}."
    )
    db.add(audit)
    db.commit()
    db.refresh(bed)

    bed_out = serialize_bed(bed)

    # Recalculate hospital capacity metrics
    total_beds = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id).count()
    avail_beds = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.status == "AVAILABLE").count()
    occ_beds = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.status == "OCCUPIED").count()
    res_beds = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.status == "RESERVED").count()
    clean_beds = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.status == "CLEANING").count()
    maint_beds = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.status == "MAINTENANCE").count()
    icu_total = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.bed_type == "ICU").count()
    icu_avail = db.query(Bed).filter(Bed.hospital_id == bed.hospital_id, Bed.bed_type == "ICU", Bed.status == "AVAILABLE").count()
    icu_occ_pct = round(((icu_total - icu_avail) / icu_total * 100) if icu_total > 0 else 0.0, 1)

    # Broadcast BED_STATUS_CHANGED event
    notification_service.broadcast_sync("BED_STATUS_CHANGED", {
        "bed_id": bed.id,
        "code": bed.code,
        "hospital_id": bed.hospital_id,
        "department_id": bed.department_id,
        "old_status": old_status,
        "new_status": new_status_upper,
        "reason": reason,
        "bed": bed_out.model_dump()
    })

    # Broadcast HOSPITAL_CAPACITY_UPDATED event
    notification_service.broadcast_sync("HOSPITAL_CAPACITY_UPDATED", {
        "hospital_id": bed.hospital_id,
        "total_beds": total_beds,
        "available_beds": avail_beds,
        "occupied_beds": occ_beds,
        "reserved_beds": res_beds,
        "cleaning_beds": clean_beds,
        "maintenance_beds": maint_beds,
        "icu_total": icu_total,
        "icu_available": icu_avail,
        "icu_occupancy_pct": icu_occ_pct
    })

    return bed_out

@router.patch("/{bed_id}/status", response_model=BedOut)
def patch_bed_status(
    bed_id: int,
    status_update: BedStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    user_email = current_user.email if current_user else "admin@healthnet.demo"
    return handle_bed_status_change(
        bed,
        status_update.status,
        status_update.reason,
        status_update.notes,
        status_update.patient_id,
        db,
        user_email
    )

@router.put("/{bed_id}/status", response_model=BedOut)
def put_bed_status(
    bed_id: int,
    status_update: BedStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    bed = db.query(Bed).filter(Bed.id == bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")

    user_email = current_user.email if current_user else "admin@healthnet.demo"
    return handle_bed_status_change(
        bed,
        status_update.status,
        status_update.reason,
        status_update.notes,
        status_update.patient_id,
        db,
        user_email
    )
