from abc import ABC, abstractmethod
import json
import datetime
import random
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models import (
    Hospital, Bed, Resource, EmergencyCase, Ambulance,
    CapacityForecast, AIPredictionAudit, Alert, Patient
)
from .websocket_manager import websocket_manager

logger = logging.getLogger("healthnet.capacity_engine")

# ====================================================
# MODEL ABSTRACTION (Section 26 & 27)
# ====================================================

class BaseCapacityModel(ABC):
    """Abstract interface for hospital capacity and resource forecasting"""

    @abstractmethod
    def forecast(
        self,
        hospital: Hospital,
        hours_ahead: int,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        pass

class PrototypeCapacityModel(BaseCapacityModel):
    """
    Stochastic projection model evaluating:
    - Historical admission/discharge turnover
    - Emergency arrival intensity & ambulance ingress
    - Ventilator and ICU bed exhaustion rates
    """
    MODEL_NAME = "PrototypeCapacityModel"
    MODEL_VERSION = "1.0-hackathon"
    CONFIDENCE = 0.81  # Prototype forecast confidence indicator

    def forecast(
        self,
        hospital: Hospital,
        hours_ahead: int,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        curr_icu_occ = metrics.get("icu_occupancy_pct", 65.0)
        curr_avail_icu = metrics.get("available_icu", 5)
        curr_avail_beds = metrics.get("available_beds", 20)
        curr_avail_vents = metrics.get("available_ventilators", 6)
        active_emergencies = metrics.get("active_emergencies", 2)

        # Growth factor proportional to forecast window and current emergency load
        growth_rate = 0.08 * (hours_ahead / 12.0) + (active_emergencies * 0.02)
        projected_icu_occ = min(99.0, max(25.0, round(curr_icu_occ + (growth_rate * 100), 1)))

        # Projected bed reductions
        burn_rate = max(1, int(round((hours_ahead / 12.0) * (1 + active_emergencies * 0.4))))
        projected_avail_icu = max(0, curr_avail_icu - burn_rate)
        projected_avail_beds = max(0, curr_avail_beds - (burn_rate * 3))
        projected_vents = max(0, curr_avail_vents - max(1, int(burn_rate * 0.6)))

        # Calculate Capacity Pressure Score (0 - 100) (Section 21)
        occ_component = projected_icu_occ * 0.50
        shortage_component = 30.0 if projected_avail_icu <= 1 else (15.0 if projected_avail_icu <= 3 else 0.0)
        vent_component = 20.0 if projected_vents <= 1 else (10.0 if projected_vents <= 3 else 0.0)
        pressure_score = min(100.0, max(5.0, round(occ_component + shortage_component + vent_component, 1)))

        # Risk Classification
        if pressure_score >= 80.0:
            risk_level = "CRITICAL"
            outlook = "CRITICAL SHORTAGE RISK"
        elif pressure_score >= 60.0:
            risk_level = "HIGH"
            outlook = "HIGH PRESSURE"
        elif pressure_score >= 40.0:
            risk_level = "MODERATE"
            outlook = "MODERATE PRESSURE"
        else:
            risk_level = "LOW"
            outlook = "STABLE"

        # Generate Operational Insights & Recommendations (Section 23)
        recommendations = []
        if projected_avail_icu == 0:
            recommendations.append(f"Projected 0 available ICU beds at {hospital.name} in {hours_ahead}h. Prepare step-down transfers immediately.")
        elif projected_avail_icu <= 2:
            recommendations.append(f"ICU capacity nearing exhaustion at {hospital.name}. Consider redirecting non-critical trauma to partner campuses.")

        if projected_vents <= 2:
            recommendations.append(f"Ventilator availability constrained ({projected_vents} projected). Request mutual aid reserves.")

        if pressure_score >= 75.0:
            recommendations.append(f"Hospital operational pressure high ({pressure_score}%). Activate surge staffing protocol.")

        if not recommendations:
            recommendations.append(f"Capacity outlook stable for {hospital.name} across next {hours_ahead} hours. Standard operational monitoring.")

        return {
            "forecast_window_hours": hours_ahead,
            "current_icu_occupancy": curr_icu_occ,
            "projected_icu_occupancy": projected_icu_occ,
            "projected_available_beds": projected_avail_beds,
            "projected_available_icu": projected_avail_icu,
            "projected_ventilators": projected_vents,
            "capacity_pressure_score": pressure_score,
            "risk_level": risk_level,
            "capacity_outlook": outlook,
            "recommendations": recommendations,
            "model_metadata": {
                "model_name": self.MODEL_NAME,
                "model_version": self.MODEL_VERSION,
                "confidence": self.CONFIDENCE,
                "label": "PROTOTYPE OPERATIONAL FORECAST • SIMULATED DATA"
            }
        }

# ====================================================
# HOSPITAL CAPACITY INTELLIGENCE ENGINE (Section 15 - 33)
# ====================================================

class CapacityIntelligenceEngine:
    def __init__(self, model: Optional[BaseCapacityModel] = None):
        self.model = model or PrototypeCapacityModel()

    def get_hospital_metrics(self, hospital: Hospital, db: Session) -> Dict[str, Any]:
        """Calculates live resource headroom and active cases for a hospital"""
        total_beds = db.query(Bed).filter(Bed.hospital_id == hospital.id).count()
        avail_beds = db.query(Bed).filter(Bed.hospital_id == hospital.id, Bed.status == "AVAILABLE").count()
        icu_total = db.query(Bed).filter(Bed.hospital_id == hospital.id, Bed.bed_type == "ICU").count()
        icu_avail = db.query(Bed).filter(Bed.hospital_id == hospital.id, Bed.bed_type == "ICU", Bed.status == "AVAILABLE").count()
        icu_occ = round(((icu_total - icu_avail) / icu_total * 100) if icu_total > 0 else 0.0, 1)

        # Ventilators
        vent_res = db.query(Resource).filter(
            Resource.hospital_id == hospital.id,
            Resource.resource_type == "Ventilator"
        ).first()
        avail_vents = vent_res.available_quantity if vent_res else 4
        total_vents = vent_res.quantity if vent_res else 8

        # Active incoming emergencies
        active_emgs = db.query(EmergencyCase).filter(
            EmergencyCase.assigned_hospital_id == hospital.id,
            EmergencyCase.status.in_(["EN_ROUTE", "SEARCHING", "HOSPITAL_SELECTED", "BED_RESERVED"])
        ).count()

        return {
            "total_beds": total_beds,
            "available_beds": avail_beds,
            "icu_total": icu_total,
            "available_icu": icu_avail,
            "icu_occupancy_pct": icu_occ,
            "available_ventilators": avail_vents,
            "total_ventilators": total_vents,
            "active_emergencies": active_emgs
        }

    def generate_forecasts_for_hospital(
        self,
        hospital: Hospital,
        db: Session
    ) -> Dict[str, Any]:
        """Generates 6h, 12h, 24h, 48h projections for a single hospital"""
        metrics = self.get_hospital_metrics(hospital, db)

        windows = [6, 12, 24, 48]
        window_forecasts = {}
        primary_24h = None

        for w in windows:
            fc = self.model.forecast(hospital, w, metrics)
            window_forecasts[f"{w}h"] = fc
            if w == 24:
                primary_24h = fc

                # Persist to CapacityForecast table
                cf_record = CapacityForecast(
                    hospital_id=hospital.id,
                    forecast_window_hours=24,
                    current_icu_occupancy=fc["current_icu_occupancy"],
                    projected_icu_occupancy=fc["projected_icu_occupancy"],
                    projected_available_beds=fc["projected_available_beds"],
                    projected_available_icu=fc["projected_available_icu"],
                    projected_ventilators=fc["projected_ventilators"],
                    capacity_pressure_score=fc["capacity_pressure_score"],
                    risk_level=fc["risk_level"],
                    recommendations_json=json.dumps(fc["recommendations"]),
                    timestamp=datetime.datetime.utcnow()
                )
                db.add(cf_record)

        db.commit()

        return {
            "hospital_id": hospital.id,
            "hospital_name": hospital.name,
            "branch_name": hospital.branch_name,
            "current_metrics": metrics,
            "forecast_24h": primary_24h,
            "windows": window_forecasts
        }

    def get_network_capacity_intelligence(self, db: Session) -> Dict[str, Any]:
        """Aggregates network-wide capacity predictions across all hospitals (Section 20 & 22)"""
        hospitals = db.query(Hospital).all()

        hospital_reports = []
        total_beds = 0
        total_avail_beds = 0
        total_icu = 0
        total_avail_icu = 0
        total_vents = 0
        total_avail_vents = 0
        active_emergencies = 0

        high_risk_count = 0
        shortage_warnings = []
        all_recommendations = []

        for h in hospitals:
            rep = self.generate_forecasts_for_hospital(h, db)
            hospital_reports.append(rep)

            m = rep["current_metrics"]
            total_beds += m["total_beds"]
            total_avail_beds += m["available_beds"]
            total_icu += m["icu_total"]
            total_avail_icu += m["available_icu"]
            total_vents += m["total_ventilators"]
            total_avail_vents += m["available_ventilators"]
            active_emergencies += m["active_emergencies"]

            fc24 = rep["forecast_24h"]
            if fc24["risk_level"] in ["HIGH", "CRITICAL"]:
                high_risk_count += 1

            if fc24["projected_available_icu"] <= 1:
                shortage_warnings.append({
                    "hospital_id": h.id,
                    "hospital_name": h.name,
                    "warning": f"Projected ICU Bed Exhaustion ({fc24['projected_available_icu']} available in 24h)",
                    "severity": "CRITICAL" if fc24["projected_available_icu"] == 0 else "HIGH"
                })

            all_recommendations.extend(fc24["recommendations"])

        network_icu_occ = round(((total_icu - total_avail_icu) / total_icu * 100) if total_icu > 0 else 0.0, 1)
        projected_network_icu_occ = min(98.0, round(network_icu_occ + 9.5, 1))

        network_pressure = round(
            sum(r["forecast_24h"]["capacity_pressure_score"] for r in hospital_reports) / max(1, len(hospital_reports)),
            1
        )

        return {
            "city_health_network": {
                "total_hospitals": len(hospitals),
                "total_beds": total_beds,
                "available_beds": total_avail_beds,
                "icu_total": total_icu,
                "available_icu": total_avail_icu,
                "current_icu_occupancy": network_icu_occ,
                "projected_24h_icu_occupancy": projected_network_icu_occ,
                "available_ventilators": total_avail_vents,
                "total_ventilators": total_vents,
                "active_emergencies": active_emergencies,
                "capacity_pressure_score": network_pressure,
                "hospitals_under_pressure_count": high_risk_count
            },
            "hospitals": hospital_reports,
            "shortage_warnings": shortage_warnings,
            "operational_recommendations": all_recommendations[:6],
            "model_metadata": {
                "model_name": "PrototypeCapacityModel",
                "version": "1.0",
                "status": "ONLINE",
                "label": "PROTOTYPE OPERATIONAL FORECAST • SIMULATED DATA"
            },
            "timestamp": datetime.datetime.utcnow().isoformat()
        }

    # ====================================================
    # MASS CASUALTY DEMO SIMULATOR (Section 32 & 33)
    # ====================================================
    def simulate_mass_casualty_event(self, db: Session) -> Dict[str, Any]:
        """
        Simulates sudden influx of 12-16 emergency trauma patients,
        spiking emergency demand, filling ICU beds, and elevating network pressure.
        """
        hospitals = db.query(Hospital).all()
        if not hospitals:
            return {"success": False, "error": "No hospitals found"}

        created_cases = []
        ambulances = db.query(Ambulance).filter(Ambulance.status == "AVAILABLE").all()

        trauma_profiles = [
            ("Severe Blast Trauma / Hemorrhage", "CRITICAL", "Trauma ICU", True, True),
            ("Multiple Complex Fractures & Shock", "HIGH", "ICU", True, False),
            ("Inhalation Injury & Acute Distress", "CRITICAL", "ICU", True, True),
            ("Blunt Abdominal Injury & Internal Bleeding", "CRITICAL", "Trauma ICU", True, True),
            ("Head Injury / Intracranial Hemorrhage", "CRITICAL", "Neuro ICU", True, True)
        ]

        # Generate 12 emergency cases across the metro grid
        for i in range(12):
            hosp = hospitals[i % len(hospitals)]
            profile = trauma_profiles[i % len(trauma_profiles)]

            emg = EmergencyCase(
                case_number=f"MCE-{random.randint(1000, 9999)}",
                patient_name=f"Mass Casualty Victim #{i+1}",
                patient_age=random.randint(22, 68),
                patient_gender="Male" if i % 2 == 0 else "Female",
                emergency_type="MULTI_TRAUMA",
                priority=profile[1],
                condition_summary=profile[0],
                required_department=profile[2],
                required_resources=json.dumps(["ICU bed", "Ventilator", "Trauma Surgeon"]),
                required_icu=profile[3],
                required_ventilator=profile[4],
                vitals_heart_rate=random.randint(118, 148),
                vitals_systolic_bp=random.randint(70, 95),
                vitals_diastolic_bp=random.randint(45, 60),
                vitals_spo2=round(random.uniform(84.0, 90.0), 1),
                vitals_respiratory_rate=random.randint(26, 36),
                vitals_temperature=37.2,
                pickup_lat=40.7150 + random.uniform(-0.02, 0.02),
                pickup_lng=-74.0020 + random.uniform(-0.02, 0.02),
                pickup_address="Metro Transportation Hub - Sector 4",
                assigned_hospital_id=hosp.id,
                status="EN_ROUTE",
                created_at=datetime.datetime.utcnow()
            )

            # Assign available bed if any
            bed = db.query(Bed).filter(Bed.hospital_id == hosp.id, Bed.status == "AVAILABLE").first()
            if bed:
                bed.status = "RESERVED"
                emg.assigned_bed_id = bed.id
                emg.assigned_bed_code = bed.code

            # Assign ambulance if any
            if ambulances and i < len(ambulances):
                amb = ambulances[i]
                amb.status = "EN_ROUTE"
                amb.destination_hospital_id = hosp.id
                amb.current_patient_name = emg.patient_name
                amb.eta_minutes = random.randint(4, 11)
                emg.assigned_ambulance_id = amb.id
                emg.assigned_ambulance_code = amb.code

            db.add(emg)
            created_cases.append(emg)

        # Create Network Surge Alert
        surge_alert = Alert(
            title="🔴 MASS CASUALTY SURGE EVENT DETECTED",
            message="12 concurrent trauma emergency dispatches initiated across Metropolitan Grid. AI capacity engine forecasts severe ICU and ventilator pressure. Operational recommendation: Distribute incoming transports evenly.",
            alert_type="MASS_CASUALTY_SURGE",
            severity="CRITICAL",
            target_role="ALL",
            created_at=datetime.datetime.utcnow()
        )
        db.add(surge_alert)
        db.commit()

        # Emit Real-time AI events
        websocket_manager.broadcast_sync(
            event_name="NETWORK_SURGE_DETECTED",
            data={
                "event_type": "MASS_CASUALTY",
                "cases_generated": len(created_cases),
                "alert_title": surge_alert.title,
                "message": surge_alert.message
            }
        )

        websocket_manager.broadcast_sync(
            event_name="CAPACITY_WARNING",
            data={
                "warning_level": "CRITICAL",
                "message": "Metropolitan network ICU pressure exceeds 85% post-surge."
            }
        )

        return {
            "success": True,
            "message": f"Mass Casualty Event triggered: {len(created_cases)} critical trauma cases dispatched across connected hospitals.",
            "cases_count": len(created_cases),
            "alert": surge_alert.title
        }

# Global singleton
capacity_engine = CapacityIntelligenceEngine()
