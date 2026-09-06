import json
import random
import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from ..database import get_db
from ..auth import get_current_user
from ..models import (
    User, Hospital, Department, Bed, Staff, Resource, Ambulance,
    EmergencyCase, HospitalMatch, BedReservation, EmergencyTimeline,
    EmergencyNotification, Patient, PatientVital, Alert, AuditLog
)
from ..schemas import (
    EmergencyCaseCreateIn, EmergencyCaseDetailOut, HospitalMatchDetailOut,
    SelectHospitalIn, BedCandidateOut, BedReservationRequestIn, BedReservationOut,
    AmbulanceCandidateOut, AssignAmbulanceRequestIn, EmergencyTimelineItemOut,
    EmergencyNotificationOut, AmbulanceOut
)
from ..services.routing_engine import RoutingEngine
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/emergency", tags=["emergency"])

def generate_emergency_code(db: Session) -> str:
    """Generates a sequential emergency case code like EMG-2026-0018"""
    year = datetime.datetime.now().year
    count = db.query(EmergencyCase).count() + 1
    return f"EMG-{year}-{count:04d}"

def log_emergency_audit(db: Session, user: Optional[User], action: str, emergency: EmergencyCase, details: str):
    audit = AuditLog(
        user_id=user.id if user else None,
        user_email=user.email if user else "system@healthnet.local",
        action=action,
        entity_type="EmergencyCase",
        entity_id=emergency.case_number,
        details=details,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(audit)

def add_timeline_event(db: Session, emergency_id: int, event_type: str, title: str, description: str, actor_name: str = "System"):
    evt = EmergencyTimeline(
        emergency_case_id=emergency_id,
        event_type=event_type,
        title=title,
        description=description,
        actor_name=actor_name,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(evt)

# ----------------------------------------------------
# 1. CREATE NEW EMERGENCY CASE
# ----------------------------------------------------
@router.post("", response_model=EmergencyCaseDetailOut)
async def create_emergency_case(
    payload: EmergencyCaseCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    case_no = generate_emergency_code(db)

    req_icu = payload.required_department == "ICU" or "ICU bed" in payload.required_resources
    req_vent = "Ventilator" in payload.required_resources
    req_oxy = "Oxygen" in payload.required_resources
    req_specialist = "General"
    if "Cardiologist" in payload.required_resources or payload.emergency_type == "CARDIAC":
        req_specialist = "Cardiology"
    elif "Neurologist" in payload.required_resources or payload.emergency_type == "NEUROLOGICAL":
        req_specialist = "Neurology"
    elif "Pulmonologist" in payload.required_resources or payload.emergency_type == "RESPIRATORY":
        req_specialist = "Pulmonology"
    elif "Trauma specialist" in payload.required_resources or payload.emergency_type == "TRAUMA":
        req_specialist = "Trauma Surgery"

    initial_vitals_dict = {
        "heart_rate": payload.vitals_heart_rate,
        "systolic_bp": payload.vitals_systolic_bp,
        "diastolic_bp": payload.vitals_diastolic_bp,
        "spo2": payload.vitals_spo2,
        "respiratory_rate": payload.vitals_respiratory_rate,
        "temperature": payload.vitals_temperature
    }

    emergency = EmergencyCase(
        case_number=case_no,
        patient_name=payload.patient_name,
        patient_age=payload.patient_age,
        patient_gender=payload.patient_gender,
        emergency_type=payload.emergency_type,
        priority=payload.priority,
        condition_summary=payload.condition_summary,
        required_department=payload.required_department,
        required_resources=json.dumps(payload.required_resources),
        required_icu=req_icu,
        required_ventilator=req_vent,
        required_oxygen=req_oxy,
        required_specialist=req_specialist,
        required_er=True,
        initial_vitals=json.dumps(initial_vitals_dict),
        vitals_heart_rate=payload.vitals_heart_rate,
        vitals_systolic_bp=payload.vitals_systolic_bp,
        vitals_diastolic_bp=payload.vitals_diastolic_bp,
        vitals_spo2=payload.vitals_spo2,
        vitals_respiratory_rate=payload.vitals_respiratory_rate,
        vitals_temperature=payload.vitals_temperature,
        pickup_lat=payload.pickup_lat,
        pickup_lng=payload.pickup_lng,
        pickup_address=payload.pickup_address,
        status="SEARCHING",
        created_at=datetime.datetime.utcnow()
    )
    db.add(emergency)
    db.commit()
    db.refresh(emergency)

    # Broadcast emergency case created
    await notification_service.broadcast("EMERGENCY_CASE_CREATED", {
        "id": emergency.id,
        "case_number": emergency.case_number,
        "patient_name": emergency.patient_name,
        "patient_age": emergency.patient_age,
        "patient_gender": emergency.patient_gender,
        "condition_summary": emergency.condition_summary,
        "priority": emergency.priority,
        "emergency_type": emergency.emergency_type,
        "required_department": emergency.required_department,
        "required_resources": json.loads(emergency.required_resources) if emergency.required_resources else [],
        "created_at": emergency.created_at.isoformat() if isinstance(emergency.created_at, datetime.datetime) else emergency.created_at
    })

    # Initial Timeline Event
    add_timeline_event(
        db, emergency.id, "EMERGENCY_CREATED",
        f"Emergency Call Registered ({emergency.case_number})",
        f"Intake created for {emergency.patient_name}, {emergency.patient_age}y ({emergency.emergency_type} - Priority: {emergency.priority}). Initial SpO2 {payload.vitals_spo2}%, HR {payload.vitals_heart_rate} bpm.",
        current_user.full_name
    )

    # Automatically Run Routing Engine to rank connected hospitals
    matches = RoutingEngine.evaluate_hospitals_for_emergency(emergency, db)
    for m in matches:
        match_record = HospitalMatch(
            emergency_case_id=emergency.id,
            hospital_id=m["hospital_id"],
            is_eligible=m["is_eligible"],
            ineligible_reason=m["ineligible_reason"],
            suitability_score=m["suitability_score"],
            resource_score=m["resource_score"],
            clinical_score=m["clinical_score"],
            eta_score=m["eta_score"],
            capacity_score=m["capacity_score"],
            readiness_score=m["readiness_score"],
            distance_km=m["distance_km"],
            eta_minutes=m["eta_minutes"],
            explanation_json=json.dumps(m["explanation"]),
            breakdown_details_json=json.dumps(m["breakdown_details"]),
            created_at=datetime.datetime.utcnow()
        )
        db.add(match_record)

    add_timeline_event(
        db, emergency.id, "HOSPITALS_EVALUATED",
        "Hospital Routing Intelligence Executed",
        f"Evaluated {len(matches)} connected network hospitals. Best candidate suitability score: {matches[0]['suitability_score'] if matches else 0}/100.",
        "Routing Engine"
    )

    log_emergency_audit(
        db, current_user, "EMERGENCY_CREATED", emergency,
        f"Created emergency {emergency.case_number} for {emergency.patient_name}. Evaluated {len(matches)} hospitals."
    )
    db.commit()
    db.refresh(emergency)

    return get_emergency_case_detail(emergency.id, db, current_user)

# ----------------------------------------------------
# 2. LIST ALL EMERGENCY CASES
# ----------------------------------------------------
@router.get("", response_model=List[EmergencyCaseDetailOut])
def list_emergency_cases(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    hospital_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EmergencyCase)

    if status and status != "ALL":
        query = query.filter(EmergencyCase.status == status)
    if priority and priority != "ALL":
        query = query.filter(EmergencyCase.priority == priority)
    if hospital_id:
        query = query.filter(EmergencyCase.assigned_hospital_id == hospital_id)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                EmergencyCase.case_number.ilike(s),
                EmergencyCase.patient_name.ilike(s),
                EmergencyCase.condition_summary.ilike(s),
                EmergencyCase.assigned_ambulance_code.ilike(s),
                EmergencyCase.assigned_bed_code.ilike(s)
            )
        )

    cases = query.order_by(desc(EmergencyCase.created_at)).offset(skip).limit(limit).all()
    results = []
    for c in cases:
        results.append(format_emergency_case_detail(c, db))
    return results

# ----------------------------------------------------
# 3. GET EMERGENCY CASE DETAIL
# ----------------------------------------------------
def format_emergency_case_detail(c: EmergencyCase, db: Session) -> EmergencyCaseDetailOut:
    req_res = []
    try:
        if c.required_resources:
            req_res = json.loads(c.required_resources) if isinstance(c.required_resources, str) else c.required_resources
    except Exception:
        req_res = []

    matches_out = []
    for m in c.hospital_matches:
        exp = []
        try:
            if m.explanation_json:
                exp = json.loads(m.explanation_json) if isinstance(m.explanation_json, str) else m.explanation_json
        except Exception:
            exp = []

        bd = {}
        try:
            if m.breakdown_details_json:
                bd = json.loads(m.breakdown_details_json) if isinstance(m.breakdown_details_json, str) else m.breakdown_details_json
        except Exception:
            bd = {}

        metrics = bd.get("metrics", {})

        matches_out.append(HospitalMatchDetailOut(
            id=m.id,
            hospital_id=m.hospital_id,
            hospital_name=m.hospital.name if m.hospital else "Hospital",
            branch_name=m.hospital.branch_name if m.hospital else "Campus",
            address=m.hospital.address if m.hospital else "",
            lat=m.hospital.lat if m.hospital else 0.0,
            lng=m.hospital.lng if m.hospital else 0.0,
            is_eligible=m.is_eligible,
            ineligible_reason=m.ineligible_reason,
            suitability_score=m.suitability_score,
            resource_score=m.resource_score,
            clinical_score=m.clinical_score,
            eta_score=m.eta_score,
            capacity_score=m.capacity_score,
            readiness_score=m.readiness_score,
            distance_km=m.distance_km,
            eta_minutes=m.eta_minutes,
            explanation=exp,
            breakdown_details=bd,
            icu_available=metrics.get("available_icu", 0),
            icu_total=metrics.get("total_icu", 0),
            icu_occupancy=metrics.get("icu_occupancy_pct", 0.0),
            ventilators_available=metrics.get("available_ventilators", 0),
            specialist_on_duty=metrics.get("specialist_name", "On-Call Attending"),
            emergency_status=m.hospital.emergency_status if m.hospital else "NORMAL"
        ))

    timeline_out = []
    for t in c.timeline_events:
        timeline_out.append(EmergencyTimelineItemOut(
            id=t.id,
            emergency_case_id=t.emergency_case_id,
            event_type=t.event_type,
            title=t.title,
            description=t.description,
            actor_name=t.actor_name,
            timestamp=t.timestamp
        ))

    amb_out = None
    if c.assigned_ambulance:
        a = c.assigned_ambulance
        amb_out = AmbulanceOut(
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
            destination_hospital_name=a.destination_hospital.name if a.destination_hospital else None,
            current_patient_id=a.current_patient_id,
            current_patient_name=a.current_patient_name,
            assigned_emergency_case_id=a.assigned_emergency_case_id,
            assigned_bed_id=a.assigned_bed_id,
            assigned_bed_code=a.assigned_bed_code,
            assigned_doctor_name=a.assigned_doctor_name or "Dr. Arjun Sharma",
            eta_minutes=a.eta_minutes or 0,
            speed_kmh=a.speed_kmh or 45.0,
            equipment=a.equipment or "[]"
        )

    eta_val = None
    if c.assigned_ambulance:
        eta_val = c.assigned_ambulance.eta_minutes
    elif matches_out:
        eta_val = matches_out[0].eta_minutes

    return EmergencyCaseDetailOut(
        id=c.id,
        case_number=c.case_number,
        patient_name=c.patient_name,
        patient_age=c.patient_age,
        patient_gender=c.patient_gender,
        emergency_type=c.emergency_type or "CARDIAC",
        priority=c.priority,
        condition_summary=c.condition_summary,
        required_department=c.required_department or "ICU",
        required_resources=req_res,
        vitals_heart_rate=c.vitals_heart_rate or 120,
        vitals_systolic_bp=c.vitals_systolic_bp or 90,
        vitals_diastolic_bp=c.vitals_diastolic_bp or 60,
        vitals_spo2=c.vitals_spo2 or 91.0,
        vitals_respiratory_rate=c.vitals_respiratory_rate or 26,
        vitals_temperature=c.vitals_temperature or 37.2,
        pickup_lat=c.pickup_lat,
        pickup_lng=c.pickup_lng,
        pickup_address=c.pickup_address or "City Medical Incident",
        status=c.status,
        assigned_hospital_id=c.assigned_hospital_id,
        assigned_hospital_name=c.assigned_hospital.name if c.assigned_hospital else None,
        assigned_ambulance_id=c.assigned_ambulance_id,
        assigned_ambulance_code=c.assigned_ambulance_code,
        assigned_bed_id=c.assigned_bed_id,
        assigned_bed_code=c.assigned_bed_code,
        assigned_patient_id=c.assigned_patient_id,
        suitability_score=c.suitability_score or (matches_out[0].suitability_score if matches_out else 0.0),
        eta_minutes=eta_val,
        created_at=c.created_at,
        arrived_at=c.arrived_at,
        completed_at=c.completed_at,
        matches=matches_out,
        timeline_events=timeline_out,
        assigned_ambulance=amb_out
    )

@router.get("/{id}", response_model=EmergencyCaseDetailOut)
def get_emergency_case_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")
    return format_emergency_case_detail(emergency, db)

# ----------------------------------------------------
# 4. RUN / RE-EVALUATE HOSPITAL MATCHING ENGINE
# ----------------------------------------------------
@router.post("/{id}/find-hospitals", response_model=List[HospitalMatchDetailOut])
def find_hospitals_for_emergency(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    # Clear old matches
    db.query(HospitalMatch).filter(HospitalMatch.emergency_case_id == id).delete()

    matches = RoutingEngine.evaluate_hospitals_for_emergency(emergency, db)
    for m in matches:
        match_record = HospitalMatch(
            emergency_case_id=emergency.id,
            hospital_id=m["hospital_id"],
            is_eligible=m["is_eligible"],
            ineligible_reason=m["ineligible_reason"],
            suitability_score=m["suitability_score"],
            resource_score=m["resource_score"],
            clinical_score=m["clinical_score"],
            eta_score=m["eta_score"],
            capacity_score=m["capacity_score"],
            readiness_score=m["readiness_score"],
            distance_km=m["distance_km"],
            eta_minutes=m["eta_minutes"],
            explanation_json=json.dumps(m["explanation"]),
            breakdown_details_json=json.dumps(m["breakdown_details"]),
            created_at=datetime.datetime.utcnow()
        )
        db.add(match_record)

    add_timeline_event(
        db, emergency.id, "HOSPITAL_SEARCH",
        "Hospital Routing Search Performed",
        f"Re-evaluated {len(matches)} hospitals across city network. Top suitability score: {matches[0]['suitability_score'] if matches else 0}/100.",
        current_user.full_name
    )

    log_emergency_audit(
        db, current_user, "HOSPITAL_SEARCH", emergency,
        f"Evaluated {len(matches)} connected hospitals for emergency {emergency.case_number}."
    )
    db.commit()
    db.refresh(emergency)

    detail = format_emergency_case_detail(emergency, db)
    return detail.matches

# ----------------------------------------------------
# 5. GET MATCHES
# ----------------------------------------------------
@router.get("/{id}/matches", response_model=List[HospitalMatchDetailOut])
def get_emergency_matches(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")
    detail = format_emergency_case_detail(emergency, db)
    return detail.matches

# ----------------------------------------------------
# 6. SELECT HOSPITAL
# ----------------------------------------------------
@router.post("/{id}/select-hospital", response_model=EmergencyCaseDetailOut)
def select_hospital_for_emergency(
    id: int,
    payload: SelectHospitalIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    hospital = db.query(Hospital).filter(Hospital.id == payload.hospital_id).first()
    if not hospital:
        raise HTTPException(status_code=404, detail="Hospital not found")

    match = db.query(HospitalMatch).filter(
        HospitalMatch.emergency_case_id == id,
        HospitalMatch.hospital_id == payload.hospital_id
    ).first()

    emergency.assigned_hospital_id = hospital.id
    emergency.suitability_score = match.suitability_score if match else 90.0
    emergency.status = "HOSPITAL_SELECTED"

    add_timeline_event(
        db, emergency.id, "HOSPITAL_SELECTED",
        f"Destination Hospital Selected: {hospital.name}",
        f"Assigned receiving facility: {hospital.name} ({hospital.branch_name}). Prototype suitability score: {emergency.suitability_score}/100.",
        current_user.full_name
    )

    log_emergency_audit(
        db, current_user, "HOSPITAL_SELECTED", emergency,
        f"Selected hospital {hospital.name} for emergency {emergency.case_number}."
    )
    db.commit()
    db.refresh(emergency)

    return format_emergency_case_detail(emergency, db)

# ----------------------------------------------------
# 7. GET SUITABLE BEDS AT SELECTED HOSPITAL
# ----------------------------------------------------
@router.get("/{id}/beds", response_model=List[BedCandidateOut])
def get_suitable_beds_for_emergency(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    if not emergency.assigned_hospital_id:
        raise HTTPException(status_code=400, detail="Please select a destination hospital before selecting a bed")

    hosp_id = emergency.assigned_hospital_id
    # Look for available beds in ICU or department matching requirements
    req_icu = emergency.required_icu or (emergency.required_department == "ICU")

    query = db.query(Bed).filter(
        Bed.hospital_id == hosp_id,
        Bed.status == "AVAILABLE"
    )

    if req_icu:
        query = query.filter(Bed.bed_type == "ICU")

    beds = query.all()
    # Fallback to any available bed if strict ICU list is empty
    if not beds:
        beds = db.query(Bed).filter(
            Bed.hospital_id == hosp_id,
            Bed.status == "AVAILABLE"
        ).all()

    results = []
    for b in beds:
        eq = b.equipment or "[]"
        unit_lbl = b.department.name if b.department else "Critical Care"
        has_v = "Ventilator" in eq or b.bed_type == "ICU"
        has_m = "Monitor" in eq or b.bed_type == "ICU"
        has_o = "Oxygen" in eq or True

        results.append(BedCandidateOut(
            id=b.id,
            code=b.code,
            bed_type=b.bed_type,
            department_id=b.department_id,
            department_name=b.department.name if b.department else "Critical Care",
            unit_name=unit_lbl,
            status=b.status,
            has_ventilator=has_v,
            has_monitor=has_m,
            has_oxygen=has_o
        ))
    return results

# ----------------------------------------------------
# 8. SAFE BED RESERVATION
# ----------------------------------------------------
@router.post("/{id}/reserve-bed", response_model=BedReservationOut)
def reserve_bed_for_emergency(
    id: int,
    payload: BedReservationRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    bed = db.query(Bed).filter(Bed.id == payload.bed_id).first()
    if not bed:
        raise HTTPException(status_code=404, detail="Bed record not found")

    # Re-validate Bed Availability (Failsafe against concurrency)
    if bed.status != "AVAILABLE":
        raise HTTPException(
            status_code=400,
            detail=f"Bed {bed.code} is no longer available (Current status: {bed.status}). Please select another available bed."
        )

    # Atomically Transition Bed to RESERVED
    bed.status = "RESERVED"

    # Create BedReservation Record
    reservation = BedReservation(
        emergency_case_id=emergency.id,
        bed_id=bed.id,
        hospital_id=bed.hospital_id,
        status="ACTIVE",
        reserved_at=datetime.datetime.utcnow()
    )
    db.add(reservation)

    emergency.assigned_bed_id = bed.id
    emergency.assigned_bed_code = bed.code
    emergency.assigned_hospital_id = bed.hospital_id
    emergency.status = "BED_RESERVED"

    add_timeline_event(
        db, emergency.id, "BED_RESERVED",
        f"Bed Reserved: {bed.code} ({bed.bed_type})",
        f"Bed {bed.code} at {bed.hospital.name if bed.hospital else 'Hospital'} successfully locked & reserved for incoming emergency case.",
        current_user.full_name
    )

    log_emergency_audit(
        db, current_user, "BED_RESERVED", emergency,
        f"Reserved bed {bed.code} (Status: AVAILABLE -> RESERVED) for emergency {emergency.case_number}."
    )
    db.commit()
    db.refresh(reservation)

    return BedReservationOut(
        id=reservation.id,
        emergency_case_id=emergency.id,
        bed_id=bed.id,
        bed_code=bed.code,
        hospital_id=bed.hospital_id,
        hospital_name=bed.hospital.name if bed.hospital else "Hospital",
        department_name=bed.department.name if bed.department else "Critical Care",
        status=reservation.status,
        reserved_at=reservation.reserved_at
    )

# ----------------------------------------------------
# 9. GET CANDIDATE AMBULANCES
# ----------------------------------------------------
@router.get("/{id}/ambulances", response_model=List[AmbulanceCandidateOut])
def get_candidate_ambulances_for_emergency(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    ambulances = db.query(Ambulance).filter(
        Ambulance.status.in_(["AVAILABLE", "RETURNING"])
    ).all()

    # Fallback to all ambulances if none strictly available
    if not ambulances:
        ambulances = db.query(Ambulance).all()

    candidates = []
    for amb in ambulances:
        dist = RoutingEngine.haversine_distance(
            emergency.pickup_lat, emergency.pickup_lng,
            amb.lat, amb.lng
        )
        eta = RoutingEngine.calculate_simulated_eta(dist, speed_kmh=amb.speed_kmh or 45.0)

        candidates.append(AmbulanceCandidateOut(
            id=amb.id,
            code=amb.code,
            vehicle_number=amb.vehicle_number,
            driver_name=amb.driver_name,
            paramedic_name=amb.paramedic_name,
            phone=amb.phone,
            status=amb.status,
            lat=amb.lat,
            lng=amb.lng,
            distance_km=dist,
            eta_minutes=eta
        ))

    candidates.sort(key=lambda x: (x.status == "AVAILABLE", -x.distance_km), reverse=True)
    return candidates

# ----------------------------------------------------
# 10. ASSIGN AMBULANCE & DISPATCH
# ----------------------------------------------------
@router.post("/{id}/assign-ambulance", response_model=EmergencyCaseDetailOut)
async def assign_ambulance_to_emergency(
    id: int,
    payload: AssignAmbulanceRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    ambulance = db.query(Ambulance).filter(Ambulance.id == payload.ambulance_id).first()
    if not ambulance:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    hospital = db.query(Hospital).filter(Hospital.id == emergency.assigned_hospital_id).first()

    # Calculate travel metrics
    dist_to_pickup = RoutingEngine.haversine_distance(emergency.pickup_lat, emergency.pickup_lng, ambulance.lat, ambulance.lng)
    dist_to_hosp = RoutingEngine.haversine_distance(emergency.pickup_lat, emergency.pickup_lng, hospital.lat, hospital.lng) if hospital else 5.0
    total_eta = RoutingEngine.calculate_simulated_eta(dist_to_pickup + dist_to_hosp, speed_kmh=ambulance.speed_kmh or 45.0)

    # Update Ambulance state
    ambulance.status = "EN_ROUTE"
    ambulance.destination_hospital_id = emergency.assigned_hospital_id
    ambulance.assigned_emergency_case_id = emergency.id
    ambulance.current_patient_name = emergency.patient_name
    ambulance.assigned_bed_id = emergency.assigned_bed_id
    ambulance.assigned_bed_code = emergency.assigned_bed_code
    ambulance.assigned_doctor_name = "Dr. Arjun Sharma"
    ambulance.eta_minutes = total_eta

    # Update Emergency state
    emergency.assigned_ambulance_id = ambulance.id
    emergency.assigned_ambulance_code = ambulance.code
    emergency.status = "EN_ROUTE"

    # Create Multi-Role Receiving Hospital Notifications
    if hospital:
        req_res_list = []
        try:
            if emergency.required_resources:
                req_res_list = json.loads(emergency.required_resources) if isinstance(emergency.required_resources, str) else emergency.required_resources
        except Exception:
            req_res_list = []

        notif_msg = (
            f"🚑 INCOMING CRITICAL PATIENT: {emergency.patient_name} ({emergency.patient_age}y {emergency.patient_gender}) "
            f"en route in Ambulance {ambulance.code}. Condition: {emergency.condition_summary}. "
            f"Estimated ETA: {total_eta} mins. Reserved Bed: {emergency.assigned_bed_code or 'ICU'}. "
            f"Required: {', '.join(req_res_list) if req_res_list else 'Critical Care'}."
        )

        for role in ["ADMIN", "NURSE", "DOCTOR"]:
            notif = EmergencyNotification(
                emergency_case_id=emergency.id,
                hospital_id=hospital.id,
                recipient_role=role,
                title=f"Incoming Emergency — {emergency.case_number}",
                message=notif_msg,
                is_read=False,
                created_at=datetime.datetime.utcnow()
            )
            db.add(notif)

        # Broadcast general alert
        alert = Alert(
            title=f"🚑 INCOMING EMERGENCY — {emergency.patient_name} ({emergency.case_number})",
            message=notif_msg,
            alert_type="EMERGENCY_INTAKE",
            severity="CRITICAL" if emergency.priority == "CRITICAL" else "HIGH",
            hospital_id=hospital.id,
            ambulance_id=ambulance.id,
            target_role="ALL",
            created_at=datetime.datetime.utcnow()
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        # Broadcast ALERT_TRIGGERED for the created alert
        await notification_service.broadcast("ALERT_TRIGGERED", {
            "id": alert.id,
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity,
            "alert_type": alert.alert_type,
            "hospital_id": alert.hospital_id,
            "patient_id": alert.patient_id,
            "ambulance_id": alert.ambulance_id,
            "target_role": alert.target_role,
            "created_at": alert.created_at.isoformat() if isinstance(alert.created_at, datetime.datetime) else alert.created_at
        })

    add_timeline_event(
        db, emergency.id, "AMBULANCE_DISPATCHED",
        f"Ambulance {ambulance.code} Dispatched (Paramedic: {ambulance.paramedic_name})",
        f"Ambulance {ambulance.code} ({ambulance.vehicle_number}) dispatched to pickup location. Total simulated ETA: {total_eta} mins.",
        current_user.full_name
    )

    log_emergency_audit(
        db, current_user, "AMBULANCE_DISPATCHED", emergency,
        f"Dispatched ambulance {ambulance.code} for emergency {emergency.case_number} to {hospital.name if hospital else 'Hospital'}."
    )
    db.commit()
    db.refresh(emergency)

    return format_emergency_case_detail(emergency, db)

# ----------------------------------------------------
# 11. PATIENT RECEIVED & ADMITTED AT HOSPITAL
# ----------------------------------------------------
@router.post("/{id}/patient-received", response_model=EmergencyCaseDetailOut)
def confirm_patient_received(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    hospital = db.query(Hospital).filter(Hospital.id == emergency.assigned_hospital_id).first()
    bed = db.query(Bed).filter(Bed.id == emergency.assigned_bed_id).first() if emergency.assigned_bed_id else None
    ambulance = db.query(Ambulance).filter(Ambulance.id == emergency.assigned_ambulance_id).first() if emergency.assigned_ambulance_id else None

    # 1. Create or Find Patient Record
    patient = None
    if emergency.assigned_patient_id:
        patient = db.query(Patient).filter(Patient.id == emergency.assigned_patient_id).first()

    if not patient and hospital:
        dept = db.query(Department).filter(
            Department.hospital_id == hospital.id,
            Department.name.ilike(f"%{emergency.required_department}%")
        ).first()
        dept_id = dept.id if dept else (hospital.departments[0].id if hospital.departments else 1)

        doc = db.query(Staff).filter(Staff.hospital_id == hospital.id, Staff.staff_type == "DOCTOR").first()
        nurse = db.query(Staff).filter(Staff.hospital_id == hospital.id, Staff.staff_type == "NURSE").first()

        mrn = f"PT-{random.randint(2000, 9999)}"
        patient = Patient(
            mrn=mrn,
            full_name=emergency.patient_name,
            age=emergency.patient_age,
            gender=emergency.patient_gender,
            blood_group="O+",
            status="CRITICAL" if emergency.priority == "CRITICAL" else "HIGH_RISK",
            triage_priority="RED" if emergency.priority == "CRITICAL" else "YELLOW",
            hospital_id=hospital.id,
            department_id=dept_id,
            assigned_doctor_id=doc.id if doc else None,
            assigned_nurse_id=nurse.id if nurse else None,
            assigned_bed_id=bed.id if bed else None,
            diagnosis=f"{emergency.emergency_type} — {emergency.condition_summary}",
            medical_history=json.dumps(["Acute emergency intake"]),
            allergies=json.dumps(["None Documented"]),
            admission_date=datetime.datetime.utcnow(),
            created_at=datetime.datetime.utcnow()
        )
        db.add(patient)
        db.commit()
        db.refresh(patient)

        # Record Initial Intake Vitals
        v = PatientVital(
            patient_id=patient.id,
            heart_rate=emergency.vitals_heart_rate or 120,
            systolic_bp=emergency.vitals_systolic_bp or 90,
            diastolic_bp=emergency.vitals_diastolic_bp or 60,
            spo2=emergency.vitals_spo2 or 91.0,
            respiratory_rate=emergency.vitals_respiratory_rate or 26,
            temperature=emergency.vitals_temperature or 37.2,
            pain_score=4,
            consciousness="ALERT",
            news2_score=6,
            recorded_by_nurse_name=current_user.full_name,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(v)

        emergency.assigned_patient_id = patient.id

    # 2. Transition Bed to OCCUPIED
    if bed:
        bed.status = "OCCUPIED"
        bed.patient_id = patient.id if patient else None

    # 3. Transition BedReservation to FULFILLED
    reservation = db.query(BedReservation).filter(
        BedReservation.emergency_case_id == emergency.id,
        BedReservation.status == "ACTIVE"
    ).first()
    if reservation:
        reservation.status = "FULFILLED"
        reservation.fulfilled_at = datetime.datetime.utcnow()
        reservation.patient_id = patient.id if patient else None

    # 4. Transition Ambulance to TRANSPORTING / RETURNING
    if ambulance:
        ambulance.status = "TRANSPORTING"
        ambulance.eta_minutes = 0

    # 5. Transition Emergency Case state
    emergency.status = "PATIENT_RECEIVED"
    emergency.arrived_at = datetime.datetime.utcnow()

    add_timeline_event(
        db, emergency.id, "PATIENT_RECEIVED",
        f"Patient Received & Admitted to Bed {emergency.assigned_bed_code or 'ICU'}",
        f"Patient {emergency.patient_name} received by bedside clinical team at {hospital.name if hospital else 'Hospital'}. Bed status transitioned to OCCUPIED.",
        current_user.full_name
    )

    log_emergency_audit(
        db, current_user, "PATIENT_RECEIVED", emergency,
        f"Confirmed patient arrival for emergency {emergency.case_number}. Bed {bed.code if bed else 'N/A'} is now OCCUPIED."
    )
    db.commit()
    db.refresh(emergency)

    return format_emergency_case_detail(emergency, db)

# ----------------------------------------------------
# 12. COMPLETE EMERGENCY
# ----------------------------------------------------
@router.post("/{id}/complete", response_model=EmergencyCaseDetailOut)
def complete_emergency_case(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emergency = db.query(EmergencyCase).filter(EmergencyCase.id == id).first()
    if not emergency:
        raise HTTPException(status_code=404, detail="Emergency case not found")

    emergency.status = "COMPLETED"
    emergency.completed_at = datetime.datetime.utcnow()

    if emergency.assigned_ambulance:
        emergency.assigned_ambulance.status = "AVAILABLE"
        emergency.assigned_ambulance.current_patient_name = None
        emergency.assigned_ambulance.assigned_emergency_case_id = None

    add_timeline_event(
        db, emergency.id, "EMERGENCY_COMPLETED",
        f"Emergency Case Closed ({emergency.case_number})",
        f"Emergency workflow successfully completed. Patient is in active inpatient care.",
        current_user.full_name
    )

    log_emergency_audit(
        db, current_user, "EMERGENCY_COMPLETED", emergency,
        f"Completed emergency case {emergency.case_number}."
    )
    db.commit()
    db.refresh(emergency)

    return format_emergency_case_detail(emergency, db)

# ----------------------------------------------------
# 13. GET TIMELINE
# ----------------------------------------------------
@router.get("/{id}/timeline", response_model=List[EmergencyTimelineItemOut])
def get_emergency_timeline(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    events = db.query(EmergencyTimeline).filter(
        EmergencyTimeline.emergency_case_id == id
    ).order_by(EmergencyTimeline.timestamp.asc()).all()

    return [
        EmergencyTimelineItemOut(
            id=e.id,
            emergency_case_id=e.emergency_case_id,
            event_type=e.event_type,
            title=e.title,
            description=e.description,
            actor_name=e.actor_name,
            timestamp=e.timestamp
        )
        for e in events
    ]

# ----------------------------------------------------
# 14. GET NOTIFICATIONS
# ----------------------------------------------------
@router.get("/{id}/notifications", response_model=List[EmergencyNotificationOut])
def get_emergency_notifications(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notifs = db.query(EmergencyNotification).filter(
        EmergencyNotification.emergency_case_id == id
    ).order_by(EmergencyNotification.created_at.desc()).all()

    return [
        EmergencyNotificationOut(
            id=n.id,
            emergency_case_id=n.emergency_case_id,
            hospital_id=n.hospital_id,
            recipient_role=n.recipient_role,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            created_at=n.created_at
        )
        for n in notifs
    ]
