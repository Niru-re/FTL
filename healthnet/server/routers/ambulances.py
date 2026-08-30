import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Ambulance, Hospital, Patient, EmergencyCase, Bed, Staff, AuditLog, Alert
from ..schemas import AmbulanceOut, AmbulanceDispatchIn
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/ambulances", tags=["ambulances"])

def serialize_ambulance(a: Ambulance, db: Session) -> AmbulanceOut:
    dest_name = a.destination_hospital.name if a.destination_hospital else None
    patient_name = a.current_patient_name
    bed_code = a.assigned_bed_code
    doctor_name = a.assigned_doctor_name or "Dr. Arjun Sharma"

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
        current_patient_name=patient_name,
        assigned_emergency_case_id=a.assigned_emergency_case_id,
        assigned_bed_id=a.assigned_bed_id,
        assigned_bed_code=bed_code,
        assigned_doctor_name=doctor_name,
        eta_minutes=a.eta_minutes or 0,
        speed_kmh=a.speed_kmh or 45.0,
        equipment=a.equipment or "[]"
    )

@router.get("", response_model=List[AmbulanceOut])
def get_ambulances(
    status: Optional[str] = Query(None),
    hospital_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Ambulance)
    if status is not None and status != "ALL":
        query = query.filter(Ambulance.status == status)
    if hospital_id is not None:
        query = query.filter(Ambulance.destination_hospital_id == hospital_id)

    ambs = query.order_by(Ambulance.id.asc()).all()
    return [serialize_ambulance(a, db) for a in ambs]

@router.get("/{ambulance_id}", response_model=AmbulanceOut)
def get_ambulance_by_id(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    return serialize_ambulance(amb, db)

# ----------------------------------------------------
# STEP SIMULATION (Move closer to hospital & decrement ETA)
# ----------------------------------------------------
@router.post("/{ambulance_id}/step-simulation", response_model=AmbulanceOut)
async def step_ambulance_simulation(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    hosp = db.query(Hospital).filter(Hospital.id == amb.destination_hospital_id).first() if amb.destination_hospital_id else None

    # Step: decrement ETA by 2 minutes
    current_eta = amb.eta_minutes or 8
    new_eta = max(0, current_eta - 2)
    amb.eta_minutes = new_eta

    # Gradually interpolate coordinates towards destination hospital
    if hosp:
        step_factor = 0.25
        amb.lat = round(amb.lat + (hosp.lat - amb.lat) * step_factor, 6)
        amb.lng = round(amb.lng + (hosp.lng - amb.lng) * step_factor, 6)

    # If ETA reaches 0, set status to ARRIVED
    if new_eta == 0 and amb.status in ["EN_ROUTE", "DISPATCHED"]:
        amb.status = "ARRIVED"
        if amb.assigned_emergency_case_id:
            emg = db.query(EmergencyCase).filter(EmergencyCase.id == amb.assigned_emergency_case_id).first()
            if emg:
                emg.status = "ARRIVED"
                emg.arrived_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(amb)

    await notification_service.broadcast("AMBULANCE_STATUS_UPDATED", {
        "ambulance_id": amb.id,
        "code": amb.code,
        "status": amb.status,
        "eta_minutes": amb.eta_minutes,
        "lat": amb.lat,
        "lng": amb.lng
    })

    return serialize_ambulance(amb, db)

# ----------------------------------------------------
# DIRECT ARRIVAL
# ----------------------------------------------------
@router.post("/{ambulance_id}/arrive", response_model=AmbulanceOut)
async def trigger_ambulance_arrival(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    amb.status = "ARRIVED"
    amb.eta_minutes = 0

    if amb.assigned_emergency_case_id:
        emg = db.query(EmergencyCase).filter(EmergencyCase.id == amb.assigned_emergency_case_id).first()
        if emg:
            emg.status = "ARRIVED"
            emg.arrived_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(amb)

    await notification_service.broadcast("AMBULANCE_ARRIVED", {
        "ambulance_id": amb.id,
        "code": amb.code,
        "status": "ARRIVED",
        "hospital_id": amb.destination_hospital_id
    })

    return serialize_ambulance(amb, db)

# ----------------------------------------------------
# RETURN TO BASE / AVAILABLE
# ----------------------------------------------------
@router.post("/{ambulance_id}/return", response_model=AmbulanceOut)
async def return_ambulance_to_available(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    amb.status = "AVAILABLE"
    amb.current_patient_name = None
    amb.current_patient_id = None
    amb.assigned_emergency_case_id = None
    amb.assigned_bed_id = None
    amb.assigned_bed_code = None
    amb.eta_minutes = 0

    db.commit()
    db.refresh(amb)

    await notification_service.broadcast("AMBULANCE_STATUS_UPDATED", {
        "ambulance_id": amb.id,
        "code": amb.code,
        "status": "AVAILABLE"
    })

    return serialize_ambulance(amb, db)

# ----------------------------------------------------
# LEGACY CONFIRM ARRIVAL
# ----------------------------------------------------
@router.post("/{ambulance_id}/confirm-arrival")
async def confirm_ambulance_arrival(ambulance_id: int, db: Session = Depends(get_db)):
    amb = db.query(Ambulance).filter(Ambulance.id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    amb.status = "ARRIVED"
    amb.eta_minutes = 0

    reserved_bed = None
    if amb.assigned_bed_id:
        reserved_bed = db.query(Bed).filter(Bed.id == amb.assigned_bed_id).first()
        if reserved_bed:
            reserved_bed.status = "OCCUPIED"

    emergency_case = None
    if amb.assigned_emergency_case_id:
        emergency_case = db.query(EmergencyCase).filter(EmergencyCase.id == amb.assigned_emergency_case_id).first()
        if emergency_case:
            emergency_case.status = "PATIENT_RECEIVED"
            emergency_case.arrived_at = datetime.datetime.utcnow()

    # Create Audit Log
    audit = AuditLog(
        action="CONFIRM_AMBULANCE_ARRIVAL",
        entity_type="AMBULANCE",
        entity_id=str(amb.id),
        details=f"Ambulance {amb.code} arrival confirmed. Bed {reserved_bed.code if reserved_bed else 'N/A'} transitioned to OCCUPIED."
    )
    db.add(audit)

    db.commit()
    db.refresh(amb)
    if reserved_bed:
        db.refresh(reserved_bed)

    return {
        "success": True,
        "message": f"Arrival confirmed for Ambulance {amb.code}. Assigned bed is now OCCUPIED.",
        "ambulance": serialize_ambulance(amb, db),
        "bed_status": reserved_bed.status if reserved_bed else None
    }
