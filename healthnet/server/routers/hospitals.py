from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from pydantic import BaseModel
from ..database import get_db
from ..models import (
    Hospital, Branch, Department, Unit, Bed, Staff, Alert, Resource,
    Ambulance, EmergencyCase, AuditLog, User, Patient
)
from ..schemas import (
    HospitalOut, HospitalCreate, HospitalUpdate, HospitalSummaryOut,
    BranchOut, BranchCreate, BranchUpdate,
    DepartmentOut, DepartmentCreate, DepartmentUpdate,
    UnitOut, NetworkSummaryOut
)
from ..auth import get_current_user, require_admin
from ..services.notification_service import notification_service
from ..services.websocket_manager import websocket_manager

router = APIRouter(tags=["hospitals_and_network"])

def build_hospital_out(hospital: Hospital, db: Session) -> HospitalOut:
    beds = db.query(Bed).filter(Bed.hospital_id == hospital.id).all()
    total_beds = len(beds) if len(beds) > 0 else hospital.total_beds
    occupied = len([b for b in beds if b.status == "OCCUPIED"])
    available = len([b for b in beds if b.status == "AVAILABLE"])
    reserved = len([b for b in beds if b.status == "RESERVED"])
    cleaning = len([b for b in beds if b.status == "CLEANING"])
    maintenance = len([b for b in beds if b.status == "MAINTENANCE"])
    out_of_service = len([b for b in beds if b.status == "OUT_OF_SERVICE"])

    icu_beds = [b for b in beds if b.bed_type == "ICU"]
    total_icu = len(icu_beds) if len(icu_beds) > 0 else hospital.icu_capacity
    occupied_icu = len([b for b in icu_beds if b.status == "OCCUPIED"])
    available_icu = len([b for b in icu_beds if b.status == "AVAILABLE"])

    icu_rate = round((occupied_icu / total_icu * 100), 1) if total_icu > 0 else 0.0
    overall_rate = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0

    docs_on_duty = db.query(Staff).filter(
        Staff.hospital_id == hospital.id,
        Staff.staff_type == "DOCTOR",
        Staff.on_duty_status == "ON_DUTY"
    ).count()

    nurses_on_duty = db.query(Staff).filter(
        Staff.hospital_id == hospital.id,
        Staff.staff_type == "NURSE",
        Staff.on_duty_status == "ON_DUTY"
    ).count()

    active_alerts = db.query(Alert).filter(
        Alert.hospital_id == hospital.id,
        Alert.is_read == False
    ).count()

    # Dynamic ventilator counts from resources if available
    vent_res = db.query(Resource).filter(
        Resource.hospital_id == hospital.id,
        Resource.resource_type == "Ventilator"
    ).first()
    vent_avail = vent_res.available_quantity if vent_res else hospital.ventilators_available
    vent_total = vent_res.quantity if vent_res else hospital.ventilators_total

    return HospitalOut(
        id=hospital.id,
        name=hospital.name,
        branch_name=hospital.branch_name,
        code=hospital.code,
        address=hospital.address,
        lat=hospital.lat,
        lng=hospital.lng,
        total_beds=total_beds,
        icu_capacity=total_icu,
        ward_capacity=hospital.ward_capacity,
        er_capacity=hospital.er_capacity,
        ventilators_total=vent_total,
        ventilators_available=vent_avail,
        ecmo_available=hospital.ecmo_available,
        trauma_level=hospital.trauma_level,
        emergency_status=hospital.emergency_status,
        contact_phone=hospital.contact_phone,
        created_at=hospital.created_at,
        occupied_beds=occupied,
        available_beds=available,
        reserved_beds=reserved,
        cleaning_beds=cleaning,
        maintenance_beds=maintenance,
        out_of_service_beds=out_of_service,
        occupied_icu_beds=occupied_icu,
        available_icu_beds=available_icu,
        icu_occupancy_rate=icu_rate,
        overall_occupancy_rate=overall_rate,
        doctors_on_duty=docs_on_duty,
        nurses_on_duty=nurses_on_duty,
        active_alerts_count=active_alerts
    )

# ----------------- NETWORK SUMMARY -----------------
@router.get("/api/network/summary", response_model=NetworkSummaryOut)
def get_network_summary(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    branches = db.query(Branch).all()
    departments = db.query(Department).all()
    beds = db.query(Bed).all()

    total_beds = len(beds)
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

    er_beds = [b for b in beds if b.bed_type == "EMERGENCY"]
    total_er = len(er_beds)
    available_er = len([b for b in er_beds if b.status == "AVAILABLE"])

    overall_occ = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0
    icu_occ = round((occupied_icu / total_icu * 100), 1) if total_icu > 0 else 0.0

    # Resources
    resources = db.query(Resource).all()
    vent_res = [r for r in resources if r.resource_type == "Ventilator"]
    total_vents = sum(r.quantity for r in vent_res)
    avail_vents = sum(r.available_quantity for r in vent_res)

    mon_res = [r for r in resources if "Monitor" in r.resource_type or "Monitor" in r.name]
    total_mons = sum(r.quantity for r in mon_res)
    avail_mons = sum(r.available_quantity for r in mon_res)

    # Staff
    docs = db.query(Staff).filter(Staff.staff_type == "DOCTOR").all()
    active_docs = len([d for d in docs if d.on_duty_status == "ON_DUTY"])
    nurses = db.query(Staff).filter(Staff.staff_type == "NURSE").all()
    active_nurses = len([n for n in nurses if n.on_duty_status == "ON_DUTY"])

    active_emergencies = db.query(EmergencyCase).filter(EmergencyCase.status.in_(["DISPATCHED", "EN_ROUTE", "ADMITTED"])).count()
    active_amb = db.query(Ambulance).filter(Ambulance.status == "EN_ROUTE").count()

    return NetworkSummaryOut(
        total_hospitals=len(hospitals),
        total_branches=len(branches) if len(branches) > 0 else len(hospitals),
        total_departments=len(departments),
        total_beds=total_beds,
        available_beds=available,
        occupied_beds=occupied,
        reserved_beds=reserved,
        cleaning_beds=cleaning,
        maintenance_beds=maintenance,
        out_of_service_beds=out_of_service,
        overall_occupancy_rate=overall_occ,
        total_icu_beds=total_icu,
        available_icu_beds=available_icu,
        occupied_icu_beds=occupied_icu,
        icu_occupancy_rate=icu_occ,
        total_emergency_beds=total_er,
        available_emergency_beds=available_er,
        total_ventilators=total_vents,
        available_ventilators=avail_vents,
        total_monitors=total_mons,
        available_monitors=avail_mons,
        total_doctors=len(docs),
        active_doctors=active_docs,
        total_nurses=len(nurses),
        active_nurses=active_nurses,
        active_emergencies=active_emergencies,
        active_ambulances=active_amb
    )

# ----------------- HOSPITALS -----------------
@router.get("/api/hospitals", response_model=List[HospitalOut])
def get_all_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).order_by(Hospital.id.asc()).all()
    return [build_hospital_out(h, db) for h in hospitals]

@router.get("/api/hospitals/{hospital_id}", response_model=HospitalOut)
def get_hospital_by_id(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return build_hospital_out(hosp, db)

@router.get("/api/hospitals/{hospital_id}/summary", response_model=HospitalSummaryOut)
def get_hospital_summary(hospital_id: int, db: Session = Depends(get_db)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    beds = db.query(Bed).filter(Bed.hospital_id == hospital_id).all()
    total_beds = len(beds) if len(beds) > 0 else hosp.total_beds
    occupied = len([b for b in beds if b.status == "OCCUPIED"])
    available = len([b for b in beds if b.status == "AVAILABLE"])
    reserved = len([b for b in beds if b.status == "RESERVED"])
    cleaning = len([b for b in beds if b.status == "CLEANING"])
    maintenance = len([b for b in beds if b.status == "MAINTENANCE"])
    out_of_service = len([b for b in beds if b.status == "OUT_OF_SERVICE"])

    icu_beds = [b for b in beds if b.bed_type == "ICU"]
    total_icu = len(icu_beds) if len(icu_beds) > 0 else hosp.icu_capacity
    occupied_icu = len([b for b in icu_beds if b.status == "OCCUPIED"])
    available_icu = len([b for b in icu_beds if b.status == "AVAILABLE"])

    er_beds = [b for b in beds if b.bed_type == "EMERGENCY"]
    total_er = len(er_beds) if len(er_beds) > 0 else hosp.er_capacity
    available_er = len([b for b in er_beds if b.status == "AVAILABLE"])

    icu_rate = round((occupied_icu / total_icu * 100), 1) if total_icu > 0 else 0.0
    overall_rate = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0

    docs_count = db.query(Staff).filter(Staff.hospital_id == hospital_id, Staff.staff_type == "DOCTOR").count()
    nurses_count = db.query(Staff).filter(Staff.hospital_id == hospital_id, Staff.staff_type == "NURSE").count()

    vent_res = db.query(Resource).filter(Resource.hospital_id == hospital_id, Resource.resource_type == "Ventilator").first()
    vent_avail = vent_res.available_quantity if vent_res else hosp.ventilators_available
    vent_total = vent_res.quantity if vent_res else hosp.ventilators_total

    return HospitalSummaryOut(
        hospital_id=hosp.id,
        name=hosp.name,
        branch_name=hosp.branch_name,
        code=hosp.code,
        emergency_status=hosp.emergency_status,
        total_beds=total_beds,
        available_beds=available,
        occupied_beds=occupied,
        reserved_beds=reserved,
        cleaning_beds=cleaning,
        maintenance_beds=maintenance,
        out_of_service_beds=out_of_service,
        overall_occupancy_rate=overall_rate,
        total_icu_beds=total_icu,
        available_icu_beds=available_icu,
        occupied_icu_beds=occupied_icu,
        icu_occupancy_rate=icu_rate,
        total_emergency_beds=total_er,
        available_emergency_beds=available_er,
        ventilators_total=vent_total,
        ventilators_available=vent_avail,
        ecmo_available=hosp.ecmo_available,
        doctors_count=docs_count,
        nurses_count=nurses_count
    )

@router.post("/api/hospitals", response_model=HospitalOut)
def create_hospital(hosp_in: HospitalCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(Hospital).filter(Hospital.code == hosp_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Hospital code already exists")

    new_hosp = Hospital(**hosp_in.model_dump())
    db.add(new_hosp)
    db.commit()
    db.refresh(new_hosp)

    # Also create corresponding Branch entry
    new_branch = Branch(
        hospital_id=new_hosp.id,
        name=f"{new_hosp.name} - {new_hosp.branch_name}",
        code=f"{new_hosp.code}-BR",
        address=new_hosp.address,
        lat=new_hosp.lat,
        lng=new_hosp.lng,
        contact_phone=new_hosp.contact_phone,
        emergency_status=new_hosp.emergency_status
    )
    db.add(new_branch)
    db.commit()

    # Log audit
    audit = AuditLog(
        user_email=current_user.email,
        action="HOSPITAL_CREATE",
        entity_type="HOSPITAL",
        entity_id=str(new_hosp.id),
        details=f"Created hospital {new_hosp.name} ({new_hosp.code})"
    )
    db.add(audit)
    db.commit()

    return build_hospital_out(new_hosp, db)

@router.put("/api/hospitals/{hospital_id}", response_model=HospitalOut)
def update_hospital(hospital_id: int, hosp_update: HospitalUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    for field, value in hosp_update.model_dump(exclude_unset=True).items():
        setattr(hosp, field, value)

    db.commit()
    db.refresh(hosp)

    audit = AuditLog(
        user_email=current_user.email,
        action="HOSPITAL_UPDATE",
        entity_type="HOSPITAL",
        entity_id=str(hosp.id),
        details=f"Updated hospital {hosp.name} ({hosp.code})"
    )
    db.add(audit)
    db.commit()

    return build_hospital_out(hosp, db)

@router.put("/api/hospitals/{hospital_id}/emergency-status")
async def update_emergency_status(hospital_id: int, status: str, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    status_upper = status.upper()
    if status_upper not in ["NORMAL", "DIVERT", "SURGE", "CLOSED"]:
        raise HTTPException(status_code=400, detail="Invalid status. Must be NORMAL, DIVERT, SURGE, or CLOSED")

    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    hosp.emergency_status = status_upper
    db.commit()
    db.refresh(hosp)

    await notification_service.broadcast("HOSPITAL_STATUS_CHANGED", {
        "hospital_id": hosp.id,
        "name": hosp.name,
        "emergency_status": hosp.emergency_status
    })

    return {"message": f"Hospital status updated to {status_upper}", "emergency_status": status_upper}

# ----------------- BRANCHES -----------------
def serialize_branch(b: Branch, db: Session) -> BranchOut:
    hosp = b.hospital or db.query(Hospital).filter(Hospital.id == b.hospital_id).first()
    beds = db.query(Bed).filter(Bed.hospital_id == b.hospital_id).all()
    total_beds = len(beds) if len(beds) > 0 else (hosp.total_beds if hosp else 0)
    occupied = len([bd for bd in beds if bd.status == "OCCUPIED"])
    available = len([bd for bd in beds if bd.status == "AVAILABLE"])
    icu_beds = [bd for bd in beds if bd.bed_type == "ICU"]
    available_icu = len([bd for bd in icu_beds if bd.status == "AVAILABLE"])
    occ_rate = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0
    dept_count = db.query(Department).filter(Department.hospital_id == b.hospital_id).count()

    return BranchOut(
        id=b.id,
        hospital_id=b.hospital_id,
        hospital_name=hosp.name if hosp else "HealthNet",
        name=b.name,
        code=b.code,
        address=b.address,
        lat=b.lat,
        lng=b.lng,
        contact_phone=b.contact_phone,
        emergency_status=b.emergency_status,
        total_beds=total_beds,
        available_beds=available,
        occupied_beds=occupied,
        icu_capacity=len(icu_beds),
        available_icu_beds=available_icu,
        emergency_capacity=hosp.er_capacity if hosp else 10,
        occupancy_rate=occ_rate,
        department_count=dept_count
    )

@router.get("/api/branches", response_model=List[BranchOut])
def get_all_branches(db: Session = Depends(get_db)):
    branches = db.query(Branch).all()
    if not branches:
        # Fallback to hospitals as branches
        hospitals = db.query(Hospital).all()
        return [
            BranchOut(
                id=h.id,
                hospital_id=h.id,
                hospital_name=h.name,
                name=f"{h.name} - {h.branch_name}",
                code=f"{h.code}-BR",
                address=h.address,
                lat=h.lat,
                lng=h.lng,
                contact_phone=h.contact_phone,
                emergency_status=h.emergency_status,
                total_beds=h.total_beds,
                available_beds=h.total_beds - 20,
                occupied_beds=20,
                icu_capacity=h.icu_capacity,
                available_icu_beds=5,
                emergency_capacity=h.er_capacity,
                occupancy_rate=65.0,
                department_count=8
            )
            for h in hospitals
        ]
    return [serialize_branch(b, db) for b in branches]

@router.get("/api/branches/{branch_id}", response_model=BranchOut)
def get_branch_by_id(branch_id: int, db: Session = Depends(get_db)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return serialize_branch(branch, db)

@router.post("/api/branches", response_model=BranchOut)
def create_branch(branch_in: BranchCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(Branch).filter(Branch.code == branch_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Branch code already exists")

    new_branch = Branch(**branch_in.model_dump())
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return serialize_branch(new_branch, db)

@router.put("/api/branches/{branch_id}", response_model=BranchOut)
def update_branch(branch_id: int, branch_update: BranchUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    for field, value in branch_update.model_dump(exclude_unset=True).items():
        setattr(branch, field, value)

    db.commit()
    db.refresh(branch)
    return serialize_branch(branch, db)

# ----------------- DEPARTMENTS -----------------
def serialize_department(d: Department, db: Session) -> DepartmentOut:
    hosp = d.hospital or db.query(Hospital).filter(Hospital.id == d.hospital_id).first()
    beds = db.query(Bed).filter(Bed.department_id == d.id).all()
    total_beds = len(beds)
    occupied = len([b for b in beds if b.status == "OCCUPIED"])
    available = len([b for b in beds if b.status == "AVAILABLE"])
    occ_rate = round((occupied / total_beds * 100), 1) if total_beds > 0 else 0.0

    dept_status = "NORMAL"
    if occ_rate > 85:
        dept_status = "CRITICAL CAPACITY"
    elif occ_rate >= 60:
        dept_status = "HIGH LOAD"

    return DepartmentOut(
        id=d.id,
        hospital_id=d.hospital_id,
        branch_id=d.branch_id or d.hospital_id,
        hospital_name=hosp.name if hosp else None,
        branch_name=hosp.branch_name if hosp else None,
        name=d.name,
        code=d.code,
        floor=d.floor,
        head_doctor_name=d.head_doctor_name,
        total_beds=total_beds,
        occupied_beds=occupied,
        available_beds=available,
        occupancy_rate=occ_rate,
        status=dept_status
    )

@router.get("/api/departments", response_model=List[DepartmentOut])
def get_all_departments(hospital_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Department)
    if hospital_id:
        query = query.filter(Department.hospital_id == hospital_id)
    departments = query.order_by(Department.hospital_id.asc(), Department.id.asc()).all()
    return [serialize_department(d, db) for d in departments]

@router.get("/api/departments/{dept_id}", response_model=DepartmentOut)
def get_department_by_id(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    return serialize_department(dept, db)

@router.post("/api/departments", response_model=DepartmentOut)
def create_department(dept_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    existing = db.query(Department).filter(Department.code == dept_in.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")

    new_dept = Department(**dept_in.model_dump())
    db.add(new_dept)
    db.commit()
    db.refresh(new_dept)
    return serialize_department(new_dept, db)

@router.put("/api/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, dept_update: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    for field, value in dept_update.model_dump(exclude_unset=True).items():
        setattr(dept, field, value)

    db.commit()
    db.refresh(dept)
    return serialize_department(dept, db)

# ----------------- ICU & WARDS (UNITS) -----------------
def serialize_unit(u: Unit, db: Session) -> UnitOut:
    dept = u.department or db.query(Department).filter(Department.id == u.department_id).first()
    hosp = dept.hospital if dept else None

    # Find beds matching this unit or department
    beds = db.query(Bed).filter(Bed.unit_id == u.id).all()
    if not beds and dept:
        # Match by department bed type
        if u.unit_type == "ICU":
            beds = db.query(Bed).filter(Bed.department_id == dept.id, Bed.bed_type == "ICU").all()
        else:
            beds = db.query(Bed).filter(Bed.department_id == dept.id).all()

    total = len(beds) if len(beds) > 0 else u.capacity
    occupied = len([b for b in beds if b.status == "OCCUPIED"])
    available = len([b for b in beds if b.status == "AVAILABLE"])
    reserved = len([b for b in beds if b.status == "RESERVED"])
    cleaning = len([b for b in beds if b.status == "CLEANING"])

    occ_rate = round((occupied / total * 100), 1) if total > 0 else 0.0

    # Auto status based on occupancy
    status_label = "NORMAL"
    if occ_rate > 85:
        status_label = "CRITICAL CAPACITY"
    elif occ_rate >= 60:
        status_label = "HIGH LOAD"

    return UnitOut(
        id=u.id,
        department_id=u.department_id,
        department_name=dept.name if dept else "General",
        hospital_id=hosp.id if hosp else None,
        hospital_name=hosp.name if hosp else None,
        branch_name=hosp.branch_name if hosp else None,
        name=u.name,
        unit_type=u.unit_type,
        capacity=total,
        occupied=occupied,
        available=available,
        reserved=reserved,
        cleaning=cleaning,
        occupancy_rate=occ_rate,
        status=status_label
    )

@router.get("/api/icus", response_model=List[UnitOut])
def get_all_icus(hospital_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Unit).filter(Unit.unit_type == "ICU")
    if hospital_id:
        query = query.join(Department).filter(Department.hospital_id == hospital_id)
    icus = query.all()
    if not icus:
        # Fallback synthetic ICU units from departments
        dept_query = db.query(Department).filter(Department.name.like("%ICU%") | Department.name.like("%Intensive%"))
        if hospital_id:
            dept_query = dept_query.filter(Department.hospital_id == hospital_id)
        depts = dept_query.all()
        results = []
        for d in depts:
            beds = db.query(Bed).filter(Bed.department_id == d.id).all()
            total = len(beds) if len(beds) > 0 else 15
            occupied = len([b for b in beds if b.status == "OCCUPIED"])
            available = len([b for b in beds if b.status == "AVAILABLE"])
            reserved = len([b for b in beds if b.status == "RESERVED"])
            cleaning = len([b for b in beds if b.status == "CLEANING"])
            occ_rate = round((occupied / total * 100), 1) if total > 0 else 0.0
            stat = "CRITICAL CAPACITY" if occ_rate > 85 else ("HIGH LOAD" if occ_rate >= 60 else "NORMAL")
            results.append(UnitOut(
                id=d.id,
                department_id=d.id,
                department_name=d.name,
                hospital_id=d.hospital_id,
                hospital_name=d.hospital.name if d.hospital else None,
                branch_name=d.hospital.branch_name if d.hospital else None,
                name=f"{d.name} Unit",
                unit_type="ICU",
                capacity=total,
                occupied=occupied,
                available=available,
                reserved=reserved,
                cleaning=cleaning,
                occupancy_rate=occ_rate,
                status=stat
            ))
        return results
    return [serialize_unit(u, db) for u in icus]

@router.get("/api/wards", response_model=List[UnitOut])
def get_all_wards(hospital_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Unit).filter(Unit.unit_type != "ICU")
    if hospital_id:
        query = query.join(Department).filter(Department.hospital_id == hospital_id)
    wards = query.all()
    if not wards:
        # Fallback synthetic Ward units from departments
        dept_query = db.query(Department).filter(~Department.name.like("%ICU%") & ~Department.name.like("%Intensive%"))
        if hospital_id:
            dept_query = dept_query.filter(Department.hospital_id == hospital_id)
        depts = dept_query.all()
        results = []
        for d in depts:
            beds = db.query(Bed).filter(Bed.department_id == d.id).all()
            total = len(beds) if len(beds) > 0 else 20
            occupied = len([b for b in beds if b.status == "OCCUPIED"])
            available = len([b for b in beds if b.status == "AVAILABLE"])
            reserved = len([b for b in beds if b.status == "RESERVED"])
            cleaning = len([b for b in beds if b.status == "CLEANING"])
            occ_rate = round((occupied / total * 100), 1) if total > 0 else 0.0
            stat = "CRITICAL CAPACITY" if occ_rate > 85 else ("HIGH LOAD" if occ_rate >= 60 else "NORMAL")
            results.append(UnitOut(
                id=d.id,
                department_id=d.id,
                department_name=d.name,
                hospital_id=d.hospital_id,
                hospital_name=d.hospital.name if d.hospital else None,
                branch_name=d.hospital.branch_name if d.hospital else None,
                name=f"{d.name} General Unit",
                unit_type="WARD",
                capacity=total,
                occupied=occupied,
                available=available,
                reserved=reserved,
                cleaning=cleaning,
                occupancy_rate=occ_rate,
                status=stat
            ))
        return results
    return [serialize_unit(u, db) for u in wards]

# ====================================================
# PHASE 8: ADMIN COMMAND CENTER & NETWORK INTELLIGENCE
# ====================================================

class HospitalStatusUpdate(BaseModel):
    status: str  # "NORMAL", "DIVERT", "SURGE", "CLOSED"

@router.patch("/api/hospitals/{hospital_id}/emergency-status", response_model=HospitalOut)
def update_hospital_emergency_status(
    hospital_id: int,
    payload: HospitalStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Admin control to update hospital emergency status (NORMAL, DIVERT, SURGE, CLOSED) (Section 26)"""
    status_upper = payload.status.upper()
    valid_statuses = ["NORMAL", "DIVERT", "SURGE", "CLOSED"]
    if status_upper not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{payload.status}'. Valid: {', '.join(valid_statuses)}")

    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(status_code=404, detail="Hospital not found")

    old_status = hosp.emergency_status
    hosp.emergency_status = status_upper

    audit = AuditLog(
        user_email=current_user.email,
        action="HOSPITAL_STATUS_CHANGED",
        entity_type="HOSPITAL",
        entity_id=str(hosp.id),
        details=f"Hospital '{hosp.name}' emergency status updated: {old_status} -> {status_upper}"
    )
    db.add(audit)
    db.commit()
    db.refresh(hosp)

    hosp_out = build_hospital_out(hosp, db)

    # Broadcast event via WebSocket
    websocket_manager.broadcast_sync(
        event_name="HOSPITAL_STATUS_CHANGED",
        data={
            "hospital_id": hosp.id,
            "hospital_name": hosp.name,
            "old_status": old_status,
            "new_status": status_upper,
            "hospital": hosp_out.model_dump()
        },
        hospital_id=hosp.id
    )

    return hosp_out

@router.get("/api/network/health")
def get_network_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes composite operational Network Health Score (0-100) (Section 3)
    Factors:
    - ICU Availability (30%)
    - Inpatient Bed Headroom (25%)
    - Ventilator Reserve (20%)
    - Ambulance Fleet Availability (15%)
    - Active Critical Alarms Penalty (10%)
    """
    # ICU metrics
    all_beds = db.query(Bed).all()
    total_beds = len(all_beds)
    avail_beds = len([b for b in all_beds if b.status == "AVAILABLE"])
    icu_beds = [b for b in all_beds if b.bed_type == "ICU"]
    total_icu = len(icu_beds)
    avail_icu = len([b for b in icu_beds if b.status == "AVAILABLE"])
    icu_occ = ((total_icu - avail_icu) / total_icu * 100) if total_icu > 0 else 0.0

    # Ventilators
    all_vents = db.query(Resource).filter(Resource.resource_type == "Ventilator").all()
    total_vents = sum(v.quantity for v in all_vents) or 60
    avail_vents = sum(v.available_quantity for v in all_vents) or 20
    vent_avail_pct = (avail_vents / total_vents * 100) if total_vents > 0 else 0.0

    # Ambulances
    all_ambs = db.query(Ambulance).all()
    total_ambs = len(all_ambs) or 10
    avail_ambs = len([a for a in all_ambs if a.status == "AVAILABLE"])
    amb_avail_pct = (avail_ambs / total_ambs * 100) if total_ambs > 0 else 0.0

    # Active Emergencies & Critical Alerts
    active_emgs = db.query(EmergencyCase).filter(EmergencyCase.status.in_(["EN_ROUTE", "SEARCHING", "HOSPITAL_SELECTED", "BED_RESERVED"])).count()
    crit_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.is_read == False).count()

    # Calculate component points
    icu_points = max(0.0, 30.0 * (avail_icu / max(1, total_icu * 0.35)))
    bed_points = max(0.0, 25.0 * (avail_beds / max(1, total_beds * 0.40)))
    vent_points = max(0.0, 20.0 * (vent_avail_pct / 100.0))
    amb_points = max(0.0, 15.0 * (amb_avail_pct / 100.0))
    alert_penalty = min(10.0, crit_alerts * 2.0)
    alert_points = max(0.0, 10.0 - alert_penalty)

    raw_score = round(min(100.0, icu_points + bed_points + vent_points + amb_points + alert_points), 1)

    if raw_score >= 80.0:
        net_status = "STABLE"
    elif raw_score >= 65.0:
        net_status = "WATCH"
    elif raw_score >= 45.0:
        net_status = "PRESSURE"
    else:
        net_status = "CRITICAL"

    return {
        "network_health_score": raw_score,
        "status": net_status,
        "components": {
            "icu_health": round(min(30.0, icu_points), 1),
            "bed_headroom": round(min(25.0, bed_points), 1),
            "ventilator_reserve": round(min(20.0, vent_points), 1),
            "ambulance_readiness": round(min(15.0, amb_points), 1),
            "alert_clearance": round(min(10.0, alert_points), 1)
        },
        "metrics": {
            "total_beds": total_beds,
            "available_beds": avail_beds,
            "total_icu": total_icu,
            "available_icu": avail_icu,
            "icu_occupancy_pct": round(icu_occ, 1),
            "total_ventilators": total_vents,
            "available_ventilators": avail_vents,
            "total_ambulances": total_ambs,
            "available_ambulances": avail_ambs,
            "active_emergencies": active_emgs,
            "critical_alerts_count": crit_alerts
        },
        "label": "PROTOTYPE OPERATIONAL INDICATOR • SIMULATED DATA"
    }

@router.get("/api/network/search")
def global_network_search(
    q: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Global grouped search across Hospitals, Branches, Beds, Patients, Staff, Ambulances, Emergencies (Section 22)"""
    term = f"%{q.strip()}%"

    # Hospitals
    hosps = db.query(Hospital).filter(
        Hospital.name.ilike(term) | Hospital.code.ilike(term) | Hospital.branch_name.ilike(term)
    ).limit(5).all()

    # Beds
    beds = db.query(Bed).filter(
        Bed.code.ilike(term) | Bed.bed_type.ilike(term) | Bed.status.ilike(term)
    ).limit(8).all()

    # Patients
    patients = db.query(Patient).filter(
        Patient.full_name.ilike(term) | Patient.mrn.ilike(term)
    ).limit(6).all()

    # Staff
    staff_members = db.query(Staff).filter(
        Staff.name.ilike(term) | Staff.specialization.ilike(term) | Staff.staff_type.ilike(term)
    ).limit(6).all()

    # Ambulances
    ambulances = db.query(Ambulance).filter(
        Ambulance.code.ilike(term) | Ambulance.vehicle_number.ilike(term) | Ambulance.paramedic_name.ilike(term)
    ).limit(5).all()

    # Emergencies
    emergencies = db.query(EmergencyCase).filter(
        EmergencyCase.case_number.ilike(term) | EmergencyCase.patient_name.ilike(term)
    ).limit(5).all()

    return {
        "query": q,
        "hospitals": [{"id": h.id, "name": h.name, "code": h.code, "branch": h.branch_name, "status": h.emergency_status} for h in hosps],
        "beds": [{"id": b.id, "code": b.code, "hospital_name": b.hospital.name if b.hospital else "Hospital", "status": b.status, "type": b.bed_type} for b in beds],
        "patients": [{"id": p.id, "name": p.full_name, "mrn": p.mrn, "bed": p.bed.code if p.bed else "None", "status": p.status, "risk": p.ai_risk_level or "STABLE"} for p in patients],
        "staff": [{"id": s.id, "name": s.name, "role": s.staff_type, "specialization": s.specialization, "hospital": s.hospital.name if s.hospital else "Hospital"} for s in staff_members],
        "ambulances": [{"id": a.id, "code": a.code, "status": a.status, "paramedic": a.paramedic_name, "eta": a.eta_minutes} for a in ambulances],
        "emergencies": [{"id": e.id, "case_number": e.case_number, "patient": e.patient_name, "priority": e.priority, "status": e.status} for e in emergencies]
    }

@router.get("/api/network/icus")
def get_network_icus(
    hospital_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns all ICU departments sorted by occupancy rate descending (Section 7)"""
    query = db.query(Department).filter(
        Department.name.ilike("%ICU%") | Department.name.ilike("%Intensive%")
    )
    if hospital_id:
        query = query.filter(Department.hospital_id == hospital_id)

    dept_icus = query.all()
    results = []

    for d in dept_icus:
        beds = db.query(Bed).filter(Bed.department_id == d.id).all()
        total = len(beds) if len(beds) > 0 else 10
        occupied = len([b for b in beds if b.status == "OCCUPIED"])
        available = len([b for b in beds if b.status == "AVAILABLE"])
        reserved = len([b for b in beds if b.status == "RESERVED"])
        cleaning = len([b for b in beds if b.status == "CLEANING"])
        maintenance = len([b for b in beds if b.status == "MAINTENANCE"])
        out_of_service = len([b for b in beds if b.status == "OUT_OF_SERVICE"])

        occ_rate = round((occupied / total * 100), 1) if total > 0 else 0.0

        if occ_rate >= 85.0 or available == 0:
            pressure = "CRITICAL"
        elif occ_rate >= 70.0:
            pressure = "HIGH"
        elif occ_rate >= 50.0:
            pressure = "MODERATE"
        else:
            pressure = "STABLE"

        if status and status != "ALL" and pressure != status:
            continue

        results.append({
            "id": d.id,
            "department_id": d.id,
            "icu_name": d.name,
            "hospital_id": d.hospital_id,
            "hospital_name": d.hospital.name if d.hospital else "Hospital",
            "branch_name": d.hospital.branch_name if d.hospital else "Campus",
            "hospital_code": d.hospital.code if d.hospital else "HNC",
            "emergency_status": d.hospital.emergency_status if d.hospital else "NORMAL",
            "total_beds": total,
            "occupied_beds": occupied,
            "available_beds": available,
            "reserved_beds": reserved,
            "cleaning_beds": cleaning,
            "maintenance_beds": maintenance,
            "out_of_service_beds": out_of_service,
            "occupancy_rate": occ_rate,
            "pressure_level": pressure
        })

    results.sort(key=lambda x: x["occupancy_rate"], reverse=True)
    return results

