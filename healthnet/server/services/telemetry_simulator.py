import asyncio
import random
import logging
import datetime
import json
from typing import Dict, Optional, Any
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import (
    Patient, PatientVital, Ambulance, Hospital, Alert, Bed,
    EmergencyCase, BedReservation, HospitalMatch, Staff, Department,
    SimulationState, EventLog
)
from .websocket_manager import websocket_manager
from .ai_risk_service import calculate_news2, calculate_patient_risk

logger = logging.getLogger("healthnet.telemetry_simulator")

class TelemetrySimulator:
    def __init__(self):
        self.is_running = False
        self._task = None
        # Active dedicated patient simulations: {patient_id: {"profile": "DETERIORATING", "step": 0, "active": True}}
        self.active_patient_simulations: Dict[int, Dict[str, Any]] = {}
        # Active ambulance simulations: {ambulance_id: {"active": True}}
        self.active_ambulance_simulations: Dict[int, Dict[str, Any]] = {}

    async def start(self):
        if not self.is_running:
            self.is_running = True
            self._task = asyncio.create_task(self._simulation_loop())
            logger.info("Telemetry and simulation service started.")

    async def stop(self):
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Telemetry and simulation service stopped.")

    # ----------------------------------------------------
    # Simulation Controller API Methods
    # ----------------------------------------------------
    def start_patient_simulation(self, patient_id: int, profile: str = "DETERIORATING"):
        self.active_patient_simulations[patient_id] = {
            "profile": profile.upper(),
            "step": 0,
            "active": True
        }
        logger.info(f"Started patient vital simulation for Patient #{patient_id} with profile: {profile}")
        return {"success": True, "patient_id": patient_id, "profile": profile}

    def stop_patient_simulation(self, patient_id: int):
        if patient_id in self.active_patient_simulations:
            del self.active_patient_simulations[patient_id]
        logger.info(f"Stopped patient vital simulation for Patient #{patient_id}")
        return {"success": True, "patient_id": patient_id}

    def start_ambulance_simulation(self, ambulance_id: int):
        self.active_ambulance_simulations[ambulance_id] = {"active": True}
        return {"success": True, "ambulance_id": ambulance_id}

    def stop_ambulance_simulation(self, ambulance_id: int):
        if ambulance_id in self.active_ambulance_simulations:
            del self.active_ambulance_simulations[ambulance_id]
        return {"success": True, "ambulance_id": ambulance_id}

    def get_simulation_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "active_patient_simulations": self.active_patient_simulations,
            "active_ambulance_simulations": self.active_ambulance_simulations
        }

    # ----------------------------------------------------
    # Main Simulation Loop (Every 3 seconds)
    # ----------------------------------------------------
    async def _simulation_loop(self):
        while self.is_running:
            try:
                db: Session = SessionLocal()
                try:
                    await self._step_controlled_patient_vitals(db)
                    await self._step_background_vitals(db)
                    await self._step_ambulances(db)
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"Error in simulation loop tick: {e}")

            await asyncio.sleep(3)

    # ----------------------------------------------------
    # Controlled Patient Vitals Simulation (Profiles)
    # ----------------------------------------------------
    async def _step_controlled_patient_vitals(self, db: Session):
        if not self.active_patient_simulations:
            return

        for patient_id, sim in list(self.active_patient_simulations.items()):
            if not sim.get("active"):
                continue

            patient = db.query(Patient).filter(Patient.id == patient_id).first()
            if not patient:
                continue

            latest_vital = db.query(PatientVital).filter(
                PatientVital.patient_id == patient.id
            ).order_by(PatientVital.timestamp.desc()).first()

            step = sim.get("step", 0)
            profile = sim.get("profile", "STABLE")

            # Base values
            hr = latest_vital.heart_rate if latest_vital else 75
            sbp = latest_vital.systolic_bp if latest_vital else 120
            dbp = latest_vital.diastolic_bp if latest_vital else 80
            spo2 = latest_vital.spo2 if latest_vital else 98.0
            rr = latest_vital.respiratory_rate if latest_vital else 16
            temp = latest_vital.temperature if latest_vital else 37.0

            # Apply Profile Curves
            if profile == "DETERIORATING":
                # Gradual clinical deterioration
                spo2 = max(78.0, round(spo2 - random.uniform(0.4, 0.9), 1))
                hr = min(155, hr + random.randint(2, 5))
                rr = min(38, rr + random.randint(1, 2))
                sbp = max(75, sbp - random.randint(2, 4))
                dbp = max(45, dbp - random.randint(1, 3))
                temp = round(min(39.8, temp + random.uniform(0.05, 0.15)), 2)
            elif profile == "RECOVERING":
                # Gradual recovery toward stability
                spo2 = min(99.0, round(spo2 + random.uniform(0.4, 0.8), 1))
                hr = max(72, hr - random.randint(2, 4))
                rr = max(16, rr - random.randint(1, 2))
                sbp = min(122, sbp + random.randint(2, 4))
                dbp = min(82, dbp + random.randint(1, 2))
                temp = round(max(36.8, temp - random.uniform(0.05, 0.1)), 2)
            elif profile == "HIGH_RISK":
                # Fluctuating unstable values
                spo2 = max(86.0, min(94.0, round(spo2 + random.uniform(-0.6, 0.4), 1)))
                hr = max(95, min(128, hr + random.randint(-2, 3)))
                rr = max(20, min(30, rr + random.randint(-1, 1)))
                sbp = max(95, min(150, sbp + random.randint(-3, 3)))
            else: # STABLE
                # Minor physiological jitter
                spo2 = max(96.0, min(100.0, round(spo2 + random.uniform(-0.2, 0.2), 1)))
                hr = max(68, min(84, hr + random.randint(-1, 1)))
                rr = max(14, min(18, rr + random.randint(-1, 1)))

            sim["step"] = step + 1

            # Save new vital record
            new_vital = PatientVital(
                patient_id=patient.id,
                timestamp=datetime.datetime.utcnow(),
                heart_rate=hr,
                systolic_bp=sbp,
                diastolic_bp=dbp,
                spo2=spo2,
                respiratory_rate=rr,
                temperature=temp,
                pain_score=latest_vital.pain_score if latest_vital else 2,
                consciousness="ALERT" if spo2 > 85 else "VOICE",
                news2_score=0,
                recorded_by_nurse_name="Bedside Telemetry Monitor (Simulated)"
            )
            new_vital.news2_score = calculate_news2(new_vital)
            db.add(new_vital)
            db.commit()
            db.refresh(new_vital)

            # Evaluate AI Risk
            risk_report = calculate_patient_risk(patient, db)
            risk_score = risk_report.get("risk_score", 50.0)
            risk_level = risk_report.get("risk_level", "STABLE")

            # Check threshold alarms
            if risk_score >= 85.0 or spo2 < 88.0:
                alert_title = f"CRITICAL PATIENT DETERIORATION — {patient.full_name} ({patient.mrn})"
                alert_msg = f"Patient SpO2 dropped to {spo2}%, HR {hr} bpm. Prototype AI Risk Index reached {risk_score}% (CRITICAL). Immediate physician bedside review indicated."
                alert = Alert(
                    title=alert_title,
                    message=alert_msg,
                    alert_type="CRITICAL_DETERIORATION",
                    severity="CRITICAL",
                    hospital_id=patient.hospital_id,
                    patient_id=patient.id,
                    target_role="ALL",
                    is_read=False,
                    created_at=datetime.datetime.utcnow()
                )
                db.add(alert)
                db.commit()

                await websocket_manager.broadcast_event(
                    event_name="ALERT_CREATED",
                    data={
                        "alert_id": alert.id,
                        "title": alert.title,
                        "message": alert.message,
                        "severity": "CRITICAL",
                        "patient_id": patient.id,
                        "hospital_id": patient.hospital_id
                    },
                    hospital_id=patient.hospital_id,
                    related_entity=f"Patient:{patient.mrn}"
                )

            # Broadcast PATIENT_VITAL_UPDATED event
            vital_payload = {
                "patient_id": patient.id,
                "mrn": patient.mrn,
                "full_name": patient.full_name,
                "hospital_id": patient.hospital_id,
                "vital": {
                    "id": new_vital.id,
                    "timestamp": new_vital.timestamp.isoformat(),
                    "heart_rate": new_vital.heart_rate,
                    "systolic_bp": new_vital.systolic_bp,
                    "diastolic_bp": new_vital.diastolic_bp,
                    "spo2": new_vital.spo2,
                    "respiratory_rate": new_vital.respiratory_rate,
                    "temperature": new_vital.temperature,
                    "news2_score": new_vital.news2_score
                },
                "risk_score": risk_score,
                "risk_level": risk_level
            }

            await websocket_manager.broadcast_event(
                event_name="PATIENT_VITAL_UPDATED",
                data=vital_payload,
                hospital_id=patient.hospital_id,
                related_entity=f"Patient:{patient.mrn}"
            )

    # ----------------------------------------------------
    # Background Ambient Telemetry for other patients
    # ----------------------------------------------------
    async def _step_background_vitals(self, db: Session):
        active_patients = db.query(Patient).filter(
            Patient.status.in_(["CRITICAL", "HIGH_RISK", "STABLE"])
        ).limit(15).all()

        if not active_patients:
            return

        sample = [p for p in active_patients if p.id not in self.active_patient_simulations][:2]
        for patient in sample:
            latest = db.query(PatientVital).filter(
                PatientVital.patient_id == patient.id
            ).order_by(PatientVital.timestamp.desc()).first()

            if not latest:
                continue

            hr_delta = random.choice([-1, 0, 1])
            spo2_delta = random.choice([-0.1, 0.0, 0.1])

            new_vital = PatientVital(
                patient_id=patient.id,
                timestamp=datetime.datetime.utcnow(),
                heart_rate=max(50, min(140, latest.heart_rate + hr_delta)),
                systolic_bp=latest.systolic_bp,
                diastolic_bp=latest.diastolic_bp,
                spo2=max(85.0, min(100.0, round(latest.spo2 + spo2_delta, 1))),
                respiratory_rate=latest.respiratory_rate,
                temperature=latest.temperature,
                pain_score=latest.pain_score,
                consciousness=latest.consciousness,
                news2_score=latest.news2_score,
                recorded_by_nurse_name="Ambient Monitor"
            )
            db.add(new_vital)
            db.commit()

            await websocket_manager.broadcast_event(
                event_name="PATIENT_VITAL_UPDATED",
                data={
                    "patient_id": patient.id,
                    "mrn": patient.mrn,
                    "full_name": patient.full_name,
                    "hospital_id": patient.hospital_id,
                    "vital": {
                        "id": new_vital.id,
                        "timestamp": new_vital.timestamp.isoformat(),
                        "heart_rate": new_vital.heart_rate,
                        "systolic_bp": new_vital.systolic_bp,
                        "diastolic_bp": new_vital.diastolic_bp,
                        "spo2": new_vital.spo2,
                        "respiratory_rate": new_vital.respiratory_rate,
                        "temperature": new_vital.temperature,
                        "news2_score": new_vital.news2_score
                    }
                },
                hospital_id=patient.hospital_id
            )

    # ----------------------------------------------------
    # Ambulance Movement & Transit Simulation
    # ----------------------------------------------------
    async def _step_ambulances(self, db: Session):
        active_ambulances = db.query(Ambulance).filter(
            Ambulance.status.in_(["DISPATCHED", "EN_ROUTE", "TRANSPORTING"])
        ).all()

        for amb in active_ambulances:
            dest_hosp = None
            if amb.destination_hospital_id:
                dest_hosp = db.query(Hospital).filter(Hospital.id == amb.destination_hospital_id).first()

            if amb.eta_minutes > 1:
                # Step ETA down occasionally
                if random.random() > 0.4:
                    amb.eta_minutes -= 1

                # Move lat/lng closer to destination
                if dest_hosp:
                    amb.lat = round(amb.lat + (dest_hosp.lat - amb.lat) * 0.18, 6)
                    amb.lng = round(amb.lng + (dest_hosp.lng - amb.lng) * 0.18, 6)
            elif amb.eta_minutes == 1:
                amb.eta_minutes = 0
                amb.status = "ARRIVED"
                if dest_hosp:
                    amb.lat = dest_hosp.lat
                    amb.lng = dest_hosp.lng

                alert = Alert(
                    title=f"Ambulance {amb.code} Arrived",
                    message=f"Ambulance {amb.code} arrived at {dest_hosp.name if dest_hosp else 'Hospital'} bay. Awaiting bedside nurse intake.",
                    alert_type="AMBULANCE_ARRIVAL",
                    severity="HIGH",
                    hospital_id=amb.destination_hospital_id,
                    ambulance_id=amb.id,
                    target_role="ALL",
                    created_at=datetime.datetime.utcnow()
                )
                db.add(alert)

                await websocket_manager.broadcast_event(
                    event_name="AMBULANCE_ARRIVED",
                    data={
                        "ambulance_id": amb.id,
                        "code": amb.code,
                        "hospital_id": amb.destination_hospital_id,
                        "hospital_name": dest_hosp.name if dest_hosp else "Hospital",
                        "status": "ARRIVED"
                    },
                    hospital_id=amb.destination_hospital_id
                )

            db.commit()

            # Broadcast position and ETA
            await websocket_manager.broadcast_event(
                event_name="AMBULANCE_LOCATION_UPDATED",
                data={
                    "ambulance_id": amb.id,
                    "code": amb.code,
                    "status": amb.status,
                    "lat": amb.lat,
                    "lng": amb.lng,
                    "eta_minutes": amb.eta_minutes,
                    "destination_hospital_id": amb.destination_hospital_id
                },
                hospital_id=amb.destination_hospital_id
            )

    # ----------------------------------------------------
    # FULL EMERGENCY DEMO AUTOMATION (Section 36)
    # ----------------------------------------------------
    async def run_full_emergency_demo(self) -> Dict[str, Any]:
        """
        Orchestrates full 17-step emergency lifecycle:
        Intake -> Best Hospital -> Reserve Bed -> Assign Ambulance -> ETA Countdown -> Arrival -> Admission -> Deterioration -> Critical Alert
        """
        db: Session = SessionLocal()
        try:
            # 1. Create emergency case
            emg = EmergencyCase(
                case_number=f"DEMO-EMG-{random.randint(1000, 9999)}",
                patient_name="Arthur Pendelton",
                patient_age=62,
                patient_gender="Male",
                emergency_type="CARDIAC",
                priority="CRITICAL",
                condition_summary="Acute anterior STEMI with severe hemodynamic instability and respiratory failure.",
                required_department="ICU",
                required_resources=json.dumps(["ICU bed", "Ventilator", "Oxygen", "Cardiologist"]),
                required_icu=True,
                required_ventilator=True,
                required_oxygen=True,
                vitals_heart_rate=135,
                vitals_systolic_bp=85,
                vitals_diastolic_bp=50,
                vitals_spo2=89.0,
                vitals_respiratory_rate=28,
                vitals_temperature=37.4,
                pickup_lat=40.7150,
                pickup_lng=-74.0020,
                pickup_address="Downtown Financial Plaza",
                status="SEARCHING",
                created_at=datetime.datetime.utcnow()
            )
            db.add(emg)
            db.commit()
            db.refresh(emg)

            # 2. Select Hospital (HealthNet Central Hospital)
            hosp = db.query(Hospital).first()
            emg.assigned_hospital_id = hosp.id
            emg.suitability_score = 92.5
            emg.status = "HOSPITAL_SELECTED"

            # 3. Reserve Available Bed
            bed = db.query(Bed).filter(Bed.hospital_id == hosp.id, Bed.status == "AVAILABLE").first()
            if bed:
                bed.status = "RESERVED"
                emg.assigned_bed_id = bed.id
                emg.assigned_bed_code = bed.code
                emg.status = "BED_RESERVED"

                res_rec = BedReservation(
                    emergency_case_id=emg.id,
                    bed_id=bed.id,
                    hospital_id=hosp.id,
                    status="ACTIVE",
                    reserved_at=datetime.datetime.utcnow()
                )
                db.add(res_rec)

            # 4. Assign Ambulance
            amb = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").first()
            if not amb:
                amb = db.query(Ambulance).first()
            if amb:
                amb.status = "EN_ROUTE"
                amb.destination_hospital_id = hosp.id
                amb.assigned_emergency_case_id = emg.id
                amb.current_patient_name = emg.patient_name
                amb.eta_minutes = 6
                emg.assigned_ambulance_id = amb.id
                emg.assigned_ambulance_code = amb.code
                emg.status = "EN_ROUTE"

            db.commit()

            # 5. Broadcast real-time events
            await websocket_manager.broadcast_event(
                event_name="EMERGENCY_CREATED",
                data={"emergency_id": emg.id, "case_number": emg.case_number, "priority": "CRITICAL", "patient_name": emg.patient_name},
                hospital_id=hosp.id
            )
            if bed:
                await websocket_manager.broadcast_event(
                    event_name="BED_RESERVED",
                    data={"bed_id": bed.id, "bed_code": bed.code, "hospital_id": hosp.id, "emergency_id": emg.id},
                    hospital_id=hosp.id
                )
            if amb:
                await websocket_manager.broadcast_event(
                    event_name="AMBULANCE_STATUS_CHANGED",
                    data={"ambulance_id": amb.id, "code": amb.code, "status": "EN_ROUTE", "eta_minutes": amb.eta_minutes},
                    hospital_id=hosp.id
                )

            return {
                "success": True,
                "message": "Full Emergency Demo executed successfully!",
                "emergency_case_id": emg.id,
                "case_number": emg.case_number,
                "assigned_hospital": hosp.name if hosp else None,
                "assigned_bed": bed.code if bed else None,
                "assigned_ambulance": amb.code if amb else None
            }
        finally:
            db.close()

    # ----------------------------------------------------
    # ATOMIC DEMO STATE RESET (Section 37)
    # ----------------------------------------------------
    def reset_demo_state(self) -> Dict[str, Any]:
        """
        Safely resets simulation states, frees up beds, returns ambulances,
        and restores initial baseline patient vitals without deleting relational schema.
        """
        db: Session = SessionLocal()
        try:
            # Stop all active simulation loops
            self.active_patient_simulations.clear()
            self.active_ambulance_simulations.clear()

            # 1. Reset all ambulances to AVAILABLE
            ambulances = db.query(Ambulance).all()
            for amb in ambulances:
                amb.status = "AVAILABLE"
                amb.current_patient_name = None
                amb.current_patient_id = None
                amb.assigned_emergency_case_id = None
                amb.assigned_bed_id = None
                amb.assigned_bed_code = None
                amb.eta_minutes = 0
                amb.speed_kmh = 45.0

            # 2. Reset reserved beds to AVAILABLE
            beds = db.query(Bed).filter(Bed.status == "RESERVED").all()
            for b in beds:
                b.status = "AVAILABLE"

            # 3. Clean up ephemeral demo emergency cases
            demo_cases = db.query(EmergencyCase).filter(EmergencyCase.case_number.like("DEMO-%")).all()
            for dc in demo_cases:
                db.delete(dc)

            # 4. Reset patient status to STABLE
            patients = db.query(Patient).limit(15).all()
            for pt in patients:
                if pt.status == "CRITICAL":
                    pt.status = "HIGH_RISK"

            db.commit()

            # Broadcast state reset to all clients
            websocket_manager.broadcast_sync(
                event_name="SYSTEM_STATE_RESET",
                data={"message": "System demo state safely restored to baseline"}
            )

            return {
                "success": True,
                "message": "Demo state reset successfully. Ambulances set to AVAILABLE, reserved beds unlocked."
            }
        except Exception as e:
            db.rollback()
            logger.error(f"Error resetting demo state: {e}")
            return {"success": False, "error": str(e)}
        finally:
            db.close()

telemetry_simulator = TelemetrySimulator()
