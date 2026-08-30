import math
import json
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from ..models import Hospital, Department, Bed, Staff, Resource, EmergencyCase, HospitalMatch

class RoutingEngine:
    """
    HealthNet City-Wide Emergency Hospital Routing Intelligence Engine.
    Evaluates all connected hospitals across 5 core clinical dimensions,
    applies hard eligibility constraints, computes simulated travel ETA,
    and calculates a normalized 0-100 Hospital Suitability Score.
    """

    # Centralized configurable scoring weights
    ROUTING_WEIGHTS = {
        "RESOURCE_WEIGHT": 0.30,   # Max 30 pts: ICU beds, ventilators, oxygen, monitors
        "CLINICAL_WEIGHT": 0.25,   # Max 25 pts: Department & specialist on duty
        "ETA_WEIGHT": 0.20,        # Max 20 pts: Travel distance and simulated transit time
        "CAPACITY_WEIGHT": 0.15,   # Max 15 pts: Current ICU and ward occupancy headroom
        "READINESS_WEIGHT": 0.10,  # Max 10 pts: Emergency status, trauma capability
    }

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates geographic distance in kilometers using the Haversine formula"""
        R = 6371.0  # Earth's radius in kilometers
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = (
            math.sin(dlat / 2) ** 2
            + math.cos(math.radians(lat1))
            * math.cos(math.radians(lat2))
            * math.sin(dlon / 2) ** 2
        )
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    @staticmethod
    def calculate_simulated_eta(distance_km: float, speed_kmh: float = 40.0) -> int:
        """
        Calculates simulated travel time in minutes.
        Uses urban transit simulation (distance / speed * 60 + traffic variance).
        """
        base_mins = (distance_km / speed_kmh) * 60
        # Add dispatch & urban intersection overhead
        simulated_mins = max(3, round(base_mins + 2))
        return simulated_mins

    @classmethod
    def evaluate_hospitals_for_emergency(
        cls, emergency: EmergencyCase, db: Session
    ) -> List[Dict[str, Any]]:
        """
        Searches all connected hospitals and evaluates each against the emergency requirements.
        Returns a ranked list of evaluated hospital results with suitability scores and explanations.
        """
        hospitals = db.query(Hospital).all()
        results: List[Dict[str, Any]] = []

        req_resources = []
        try:
            if emergency.required_resources:
                req_resources = (
                    json.loads(emergency.required_resources)
                    if isinstance(emergency.required_resources, str)
                    else emergency.required_resources
                )
        except Exception:
            req_resources = []

        req_icu = emergency.required_icu or ("ICU bed" in req_resources) or (emergency.required_department == "ICU")
        req_vent = emergency.required_ventilator or ("Ventilator" in req_resources)
        req_oxy = emergency.required_oxygen or ("Oxygen" in req_resources)
        req_specialist = emergency.required_specialist or "General"
        if "Cardiologist" in req_resources:
            req_specialist = "Cardiology"
        elif "Neurologist" in req_resources:
            req_specialist = "Neurology"
        elif "Pulmonologist" in req_resources:
            req_specialist = "Pulmonology"
        elif "Trauma" in req_resources or emergency.emergency_type == "TRAUMA":
            req_specialist = "Trauma Surgery"

        for hosp in hospitals:
            # 1. Gather Hospital Real-Time Prototype Metrics
            beds = db.query(Bed).filter(Bed.hospital_id == hosp.id).all()
            total_beds = len(beds)
            avail_beds = sum(1 for b in beds if b.status == "AVAILABLE")
            icu_beds = [b for b in beds if b.bed_type == "ICU"]
            total_icu = len(icu_beds)
            avail_icu = sum(1 for b in icu_beds if b.status == "AVAILABLE")
            icu_occupancy = round(((total_icu - avail_icu) / max(1, total_icu)) * 100, 1)

            # Resources (Ventilators, Oxygen)
            vent_res = db.query(Resource).filter(
                Resource.hospital_id == hosp.id,
                Resource.resource_type == "Ventilator"
            ).first()
            avail_vents = vent_res.available_quantity if vent_res else 0

            oxy_res = db.query(Resource).filter(
                Resource.hospital_id == hosp.id,
                Resource.resource_type == "Oxygen"
            ).first()
            avail_oxy = oxy_res.available_quantity if oxy_res else 0

            # Staff & Specialists
            staff_list = db.query(Staff).filter(Staff.hospital_id == hosp.id).all()
            specialist_found = None
            specialist_status = "UNAVAILABLE"
            for st in staff_list:
                if getattr(st, "staff_type", None) == "DOCTOR":
                    if req_specialist.lower() in (st.specialization or "").lower() or (
                        req_specialist == "General" or req_specialist == "Critical Care"
                    ):
                        specialist_found = st
                        specialist_status = getattr(st, "on_duty_status", "ON DUTY") or "ON DUTY"
                        break

            # Distance & Simulated ETA
            dist_km = cls.haversine_distance(
                emergency.pickup_lat, emergency.pickup_lng,
                hosp.lat, hosp.lng
            )
            simulated_eta = cls.calculate_simulated_eta(dist_km)

            # 2. Evaluate Hard Eligibility Constraints
            is_eligible = True
            ineligible_reasons = []

            if hosp.emergency_status == "DIVERT":
                is_eligible = False
                ineligible_reasons.append("Emergency department is currently on full DIVERT status.")

            if req_icu and avail_icu == 0:
                is_eligible = False
                ineligible_reasons.append("Zero ICU beds available (ICU at 100% capacity).")

            if req_vent and avail_vents == 0:
                is_eligible = False
                ineligible_reasons.append("Required high-performance ventilators unavailable (0 in stock).")

            if avail_beds == 0:
                is_eligible = False
                ineligible_reasons.append("Hospital is at 100% total bed capacity.")

            # 3. Calculate 5 Weighted Dimension Scores (0 - 100 total)
            # Dimension A: Resource Availability (Max 30 pts)
            resource_pts = 0.0
            if avail_icu > 0 or not req_icu:
                resource_pts += 12.0
            if avail_vents > 0 or not req_vent:
                resource_pts += 10.0
            if avail_oxy > 0 or not req_oxy:
                resource_pts += 5.0
            if avail_beds > 2:
                resource_pts += 3.0
            resource_score = min(30.0, resource_pts)

            # Dimension B: Clinical Capability (Max 25 pts)
            clinical_pts = 0.0
            dept_exists = db.query(Department).filter(
                Department.hospital_id == hosp.id,
                Department.name.ilike(f"%{emergency.required_department}%")
            ).first()
            if dept_exists or emergency.required_department == "ICU":
                clinical_pts += 10.0

            if specialist_found:
                if specialist_status in ["AVAILABLE", "ON DUTY"]:
                    clinical_pts += 15.0
                elif specialist_status == "BUSY":
                    clinical_pts += 8.0
                else:
                    clinical_pts += 4.0
            else:
                clinical_pts += 5.0
            clinical_score = min(25.0, clinical_pts)

            # Dimension C: Simulated ETA & Distance (Max 20 pts)
            # Lower ETA yields higher score (e.g. <=5 min = 20 pts, 10 min = 16 pts, 20 min = 8 pts)
            if simulated_eta <= 5:
                eta_score = 20.0
            elif simulated_eta <= 10:
                eta_score = max(12.0, 20.0 - (simulated_eta - 5) * 0.8)
            elif simulated_eta <= 20:
                eta_score = max(5.0, 16.0 - (simulated_eta - 10) * 1.0)
            else:
                eta_score = max(2.0, 5.0 - (simulated_eta - 20) * 0.2)
            eta_score = round(eta_score, 1)

            # Dimension D: Hospital Capacity & Load (Max 15 pts)
            # Lower occupancy yields higher headroom score
            headroom_pct = max(0.0, 100.0 - icu_occupancy)
            capacity_score = round((headroom_pct / 100.0) * 15.0, 1)

            # Dimension E: Emergency Readiness (Max 10 pts)
            readiness_pts = 0.0
            if hosp.emergency_status == "OPEN" or hosp.emergency_status == "NORMAL":
                readiness_pts += 7.0
            elif hosp.emergency_status == "BUSY":
                readiness_pts += 4.0
            if total_icu >= 10:
                readiness_pts += 3.0
            readiness_score = min(10.0, readiness_pts)

            # Composite Suitability Score
            if is_eligible:
                suitability_score = round(
                    resource_score + clinical_score + eta_score + capacity_score + readiness_score,
                    1
                )
                suitability_score = min(100.0, max(0.0, suitability_score))
            else:
                suitability_score = round(max(0.0, (resource_score + eta_score) * 0.3), 1)

            # 4. Generate Explainability Narrative ("Why This Hospital?")
            explanation_points = []
            if req_icu:
                if avail_icu > 0:
                    explanation_points.append(f"✓ {avail_icu} ICU beds immediately available ({icu_occupancy}% ICU load)")
                else:
                    explanation_points.append("✗ 0 ICU beds available")

            if req_vent:
                if avail_vents > 0:
                    explanation_points.append(f"✓ {avail_vents} high-performance ventilators in stock")
                else:
                    explanation_points.append("✗ Ventilators unavailable")

            if specialist_found:
                explanation_points.append(f"✓ {specialist_found.name} ({specialist_found.specialization}) on duty ({specialist_status})")
            else:
                explanation_points.append(f"• General critical care coverage active")

            explanation_points.append(f"✓ {simulated_eta} min simulated transit ({dist_km} km)")
            if hosp.emergency_status == "NORMAL" or hosp.emergency_status == "OPEN":
                explanation_points.append("✓ Emergency intake active & ready")

            # Phase 7: 24h Capacity Outlook Intelligence (Section 24 & 25)
            projected_burn = 2 if avail_icu > 4 else 1
            projected_24h_icu = max(0, avail_icu - projected_burn)
            projected_24h_occ = min(99.0, round(icu_occupancy + 10.5, 1))
            if projected_24h_icu <= 1:
                capacity_outlook = "HIGH PRESSURE"
                explanation_points.append(f"Capacity outlook: ⚠ High pressure projected over 24h ({projected_24h_icu} ICU beds remaining)")
            else:
                capacity_outlook = "STABLE"
                explanation_points.append(f"Capacity outlook: ✓ Stable over next 24h ({projected_24h_icu} ICU beds projected)")

            breakdown_dict = {
                "weights": cls.ROUTING_WEIGHTS,
                "scores": {
                    "resource_score": resource_score,
                    "clinical_score": clinical_score,
                    "eta_score": eta_score,
                    "capacity_score": capacity_score,
                    "readiness_score": readiness_score,
                },
                "metrics": {
                    "available_icu": avail_icu,
                    "total_icu": total_icu,
                    "icu_occupancy_pct": icu_occupancy,
                    "available_ventilators": avail_vents,
                    "available_oxygen": avail_oxy,
                    "distance_km": dist_km,
                    "simulated_eta_min": simulated_eta,
                    "specialist_name": specialist_found.name if specialist_found else "On-Call Team",
                    "specialist_status": specialist_status,
                    "capacity_outlook": capacity_outlook,
                    "projected_24h_available_icu": projected_24h_icu,
                    "projected_24h_occupancy": projected_24h_occ
                }
            }

            results.append({
                "hospital_id": hosp.id,
                "hospital_name": hosp.name,
                "branch_name": hosp.branch_name,
                "address": hosp.address,
                "lat": hosp.lat,
                "lng": hosp.lng,
                "is_eligible": is_eligible,
                "ineligible_reason": "; ".join(ineligible_reasons) if ineligible_reasons else None,
                "suitability_score": suitability_score,
                "resource_score": resource_score,
                "clinical_score": clinical_score,
                "eta_score": eta_score,
                "capacity_score": capacity_score,
                "readiness_score": readiness_score,
                "distance_km": dist_km,
                "eta_minutes": simulated_eta,
                "explanation": explanation_points,
                "breakdown_details": breakdown_dict,
                "icu_available": avail_icu,
                "icu_total": total_icu,
                "icu_occupancy": icu_occupancy,
                "ventilators_available": avail_vents,
                "specialist_on_duty": f"{specialist_found.name} ({specialist_found.specialization})" if specialist_found else "On-Call Attending",
                "emergency_status": hosp.emergency_status or "NORMAL"
            })

        # Sort: Eligible first, then descending by suitability score, then ascending by ETA
        results.sort(key=lambda x: (x["is_eligible"], x["suitability_score"], -x["eta_minutes"]), reverse=True)
        return results
