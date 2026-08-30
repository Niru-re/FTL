import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import EventLog, User, Patient, Hospital, Bed, Resource, Ambulance, Alert, EmergencyCase
from ..auth import get_current_user, require_admin
from ..services.telemetry_simulator import telemetry_simulator
from ..services.websocket_manager import websocket_manager
from ..services.capacity_engine import capacity_engine

router = APIRouter(prefix="/api/simulation", tags=["simulation"])
events_router = APIRouter(prefix="/api/events", tags=["events"])

class ScenarioTriggerIn(BaseModel):
    scenario: str  # "NORMAL_OPERATION", "ICU_SURGE", "EMERGENCY_SURGE", "VENTILATOR_SHORTAGE", "AMBULANCE_SURGE", "MASS_CASUALTY", "HOSPITAL_DIVERT", "HOSPITAL_CLOSURE"
    hospital_id: Optional[int] = 1

class PatientSimStartIn(BaseModel):
    patient_id: int
    profile: str = "DETERIORATING"  # "STABLE", "HIGH_RISK", "DETERIORATING", "RECOVERING"

class PatientSimStopIn(BaseModel):
    patient_id: int

class AmbulanceSimIn(BaseModel):
    ambulance_id: int

class ManualEventIn(BaseModel):
    event_name: str
    data: Dict[str, Any] = {}
    hospital_id: Optional[int] = None
    channel: str = "network"

@router.get("/status")
def get_simulation_status(current_user: User = Depends(get_current_user)):
    return telemetry_simulator.get_simulation_status()

@router.post("/patient/start")
def start_patient_sim(payload: PatientSimStartIn, current_user: User = Depends(get_current_user)):
    return telemetry_simulator.start_patient_simulation(payload.patient_id, payload.profile)

@router.post("/patient/stop")
def stop_patient_sim(payload: PatientSimStopIn, current_user: User = Depends(get_current_user)):
    return telemetry_simulator.stop_patient_simulation(payload.patient_id)

@router.post("/ambulance/start")
def start_ambulance_sim(payload: AmbulanceSimIn, current_user: User = Depends(get_current_user)):
    return telemetry_simulator.start_ambulance_simulation(payload.ambulance_id)

@router.post("/ambulance/stop")
def stop_ambulance_sim(payload: AmbulanceSimIn, current_user: User = Depends(get_current_user)):
    return telemetry_simulator.stop_ambulance_simulation(payload.ambulance_id)

@router.post("/emergency-demo/start")
async def start_emergency_demo(current_user: User = Depends(get_current_user)):
    return await telemetry_simulator.run_full_emergency_demo()

@router.post("/reset")
def reset_simulation_state(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Also reset any MCE cases, restore divert hospitals to NORMAL
    diverted = db.query(Hospital).filter(Hospital.emergency_status.in_(["DIVERT", "SURGE", "CLOSED"])).all()
    for h in diverted:
        h.emergency_status = "NORMAL"
    db.commit()
    return telemetry_simulator.reset_demo_state()

@router.post("/scenario")
def trigger_network_scenario(
    payload: ScenarioTriggerIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Executes one of 8 Metropolitan Network Simulation Scenarios (Section 28):
    NORMAL_OPERATION, ICU_SURGE, EMERGENCY_SURGE, VENTILATOR_SHORTAGE,
    AMBULANCE_SURGE, MASS_CASUALTY, HOSPITAL_DIVERT, HOSPITAL_CLOSURE
    """
    scen = payload.scenario.upper()

    if scen == "MASS_CASUALTY":
        return capacity_engine.simulate_mass_casualty_event(db)

    elif scen == "ICU_SURGE":
        # Reserve up to 10 ICU beds across hospitals to simulate acute saturation
        avail_icus = db.query(Bed).filter(Bed.bed_type == "ICU", Bed.status == "AVAILABLE").limit(10).all()
        for b in avail_icus:
            b.status = "RESERVED"
        db.commit()

        # Emit alert and capacity warning
        alert = Alert(
            title="🔴 NETWORK ICU SATURATION SURGE",
            message="Metropolitan ICU occupancy exceeded 85%. Available ICU capacity critically constrained.",
            alert_type="ICU_SURGE",
            severity="CRITICAL",
            target_role="ALL"
        )
        db.add(alert)
        db.commit()

        websocket_manager.broadcast_sync("CAPACITY_WARNING", {
            "message": "Metropolitan ICU occupancy exceeded 85%.",
            "scenario": "ICU_SURGE"
        })
        return {"success": True, "message": f"ICU Surge simulated: {len(avail_icus)} ICU beds locked. Occupancy spiked."}

    elif scen == "EMERGENCY_SURGE":
        # Dispatch 6 ambulances to emergencies
        avail_ambs = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").limit(6).all()
        for a in avail_ambs:
            a.status = "EN_ROUTE"
            a.current_patient_name = "Emergency Surge Intake"
            a.eta_minutes = 5
        db.commit()

        websocket_manager.broadcast_sync("NETWORK_SURGE_DETECTED", {
            "message": "Emergency Department intake volume surging.",
            "scenario": "EMERGENCY_SURGE"
        })
        return {"success": True, "message": f"Emergency Surge triggered: {len(avail_ambs)} ambulances dispatched."}

    elif scen == "VENTILATOR_SHORTAGE":
        vents = db.query(Resource).filter(Resource.resource_type == "Ventilator").all()
        for v in vents:
            v.available_quantity = min(v.available_quantity, 1)
        db.commit()

        shortage_alert = Alert(
            title="🔴 CRITICAL VENTILATOR SHORTAGE WARNING",
            message="City-wide ventilator availability has fallen below safety buffer. Mutual aid transfers required.",
            alert_type="RESOURCE_SHORTAGE",
            severity="CRITICAL",
            target_role="ALL"
        )
        db.add(shortage_alert)
        db.commit()

        websocket_manager.broadcast_sync("RESOURCE_SHORTAGE", {
            "resource_type": "Ventilator",
            "message": "Network ventilator reserves critically low."
        })
        return {"success": True, "message": "Ventilator Shortage scenario simulated. Reserve levels reduced to critical thresholds."}

    elif scen == "AMBULANCE_SURGE":
        all_ambs = db.query(Ambulance).all()
        for a in all_ambs:
            a.status = "TRANSPORTING"
            a.eta_minutes = 8
        db.commit()
        return {"success": True, "message": f"Ambulance Surge simulated: {len(all_ambs)} units placed in transit."}

    elif scen in ["HOSPITAL_DIVERT", "HOSPITAL_CLOSURE"]:
        hosp = db.query(Hospital).filter(Hospital.id == (payload.hospital_id or 1)).first()
        if hosp:
            new_st = "DIVERT" if scen == "HOSPITAL_DIVERT" else "CLOSED"
            hosp.emergency_status = new_st
            db.commit()

            websocket_manager.broadcast_sync("HOSPITAL_STATUS_CHANGED", {
                "hospital_id": hosp.id,
                "hospital_name": hosp.name,
                "new_status": new_st
            })
            return {"success": True, "message": f"Hospital '{hosp.name}' placed on {new_st}."}

    elif scen == "NORMAL_OPERATION":
        # Reset everything to baseline
        diverted = db.query(Hospital).all()
        for h in diverted:
            h.emergency_status = "NORMAL"
        ambs = db.query(Ambulance).all()
        for a in ambs:
            a.status = "AVAILABLE"
            a.current_patient_name = None
        db.commit()
        return {"success": True, "message": "Normal network operations restored."}

    return {"success": True, "message": f"Scenario '{payload.scenario}' executed."}

# ----------------------------------------------------
# Real-Time Event Log & Activity Feed Endpoints
# ----------------------------------------------------
@events_router.get("/activity-feed")
def get_activity_feed(
    limit: int = Query(30, ge=1, le=100),
    event_type: Optional[str] = None,
    hospital_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(EventLog)
    if event_type and event_type != "ALL":
        query = query.filter(EventLog.event_type == event_type)
    if hospital_id:
        query = query.filter(EventLog.hospital_id == hospital_id)

    logs = query.order_by(EventLog.timestamp.desc()).limit(limit).all()

    feed = []
    for lg in logs:
        feed.append({
            "id": lg.id,
            "event_type": lg.event_type,
            "hospital_id": lg.hospital_id,
            "branch_id": lg.branch_id,
            "related_entity": lg.related_entity,
            "channel": lg.channel,
            "timestamp": lg.timestamp.isoformat() if lg.timestamp else None,
            "data": lg.payload_json
        })
    return feed

@events_router.post("/broadcast")
async def broadcast_manual_event(payload: ManualEventIn, current_user: User = Depends(get_current_user)):
    await websocket_manager.broadcast_event(
        event_name=payload.event_name,
        data=payload.data,
        hospital_id=payload.hospital_id,
        channel=payload.channel
    )
    return {"success": True, "broadcasted": payload.event_name}
