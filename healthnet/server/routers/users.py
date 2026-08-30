from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Staff, Hospital, Department, Patient, AuditLog
from ..schemas import StaffOut, StaffCreate, StaffUpdate, AuditLogOut, UserOut
from ..auth import get_current_user

router = APIRouter(prefix="/api/staff", tags=["staff"])
users_router = APIRouter(prefix="/api/users", tags=["users"])
audit_router = APIRouter(prefix="/api/audit-logs", tags=["audit"])

@users_router.get("/me", response_model=UserOut)
def get_user_me(current_user: User = Depends(get_current_user)):
    return current_user

@users_router.get("", response_model=List[UserOut])
def get_all_users(db: Session = Depends(get_db)):
    return db.query(User).all()

def serialize_staff(s: Staff, db: Session) -> StaffOut:
    patient_count = 0
    if s.staff_type == "DOCTOR":
        patient_count = db.query(Patient).filter(Patient.assigned_doctor_id == s.id).count()
    elif s.staff_type == "NURSE":
        patient_count = db.query(Patient).filter(Patient.assigned_nurse_id == s.id).count()

    return StaffOut(
        id=s.id,
        user_id=s.user_id,
        staff_type=s.staff_type,
        name=s.name,
        employee_code=s.employee_code,
        specialization=s.specialization,
        hospital_id=s.hospital_id,
        hospital_name=s.hospital.name if s.hospital else None,
        department_id=s.department_id,
        department_name=s.department.name if s.department else None,
        shift=s.shift,
        is_available=s.is_available,
        phone=s.phone,
        on_duty_status=s.on_duty_status,
        assigned_patients_count=patient_count
    )

@router.get("", response_model=List[StaffOut])
def get_staff_members(
    staff_type: Optional[str] = Query(None),
    hospital_id: Optional[int] = Query(None),
    on_duty_status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Staff)
    if staff_type is not None and staff_type != "ALL":
        query = query.filter(Staff.staff_type == staff_type.upper())
    if hospital_id is not None:
        query = query.filter(Staff.hospital_id == hospital_id)
    if on_duty_status is not None and on_duty_status != "ALL":
        query = query.filter(Staff.on_duty_status == on_duty_status.upper())

    staff_list = query.order_by(Staff.hospital_id.asc(), Staff.staff_type.asc()).all()
    return [serialize_staff(s, db) for s in staff_list]

@router.put("/{staff_id}", response_model=StaffOut)
def update_staff_member(staff_id: int, update_data: StaffUpdate, db: Session = Depends(get_db)):
    staff = db.query(Staff).filter(Staff.id == staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    if update_data.shift is not None:
        staff.shift = update_data.shift
    if update_data.is_available is not None:
        staff.is_available = update_data.is_available
    if update_data.on_duty_status is not None:
        staff.on_duty_status = update_data.on_duty_status
    if update_data.department_id is not None:
        staff.department_id = update_data.department_id

    db.commit()
    db.refresh(staff)
    return serialize_staff(staff, db)

@router.post("", response_model=StaffOut)
def create_staff_member(staff_in: StaffCreate, db: Session = Depends(get_db)):
    existing = db.query(Staff).filter(Staff.employee_code == staff_in.employee_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee code already exists")

    new_staff = Staff(**staff_in.model_dump())
    db.add(new_staff)
    db.commit()
    db.refresh(new_staff)
    return serialize_staff(new_staff, db)

@audit_router.get("", response_model=List[AuditLogOut])
def get_audit_logs(db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(100).all()
    return logs
