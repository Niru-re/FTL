from abc import ABC, abstractmethod
import json
import datetime
import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from ..models import Patient, PatientVital, LabResult, Alert, AIPredictionAudit, RiskPrediction
from .websocket_manager import websocket_manager
from .ai_risk_service import calculate_news2

logger = logging.getLogger("healthnet.ai_engine")

# ====================================================
# MODEL ABSTRACTION (Section 26 & 27)
# ====================================================

class BaseRiskModel(ABC):
    """Abstract interface for clinical deterioration risk models"""

    @abstractmethod
    def predict(
        self,
        patient: Patient,
        current_vital: Optional[PatientVital],
        vitals_history: List[PatientVital],
        lab_results: List[LabResult]
    ) -> Dict[str, Any]:
        pass

class PrototypeRiskModel(BaseRiskModel):
    """
    Deterministic clinical decision-support model implementing:
    - Multi-vital physiological scoring (NEWS2 augmented)
    - Moving trajectory & trend compensation
    - Laboratory parameter weighting
    """
    MODEL_NAME = "PrototypeRiskModel"
    MODEL_VERSION = "1.0-hackathon"
    CONFIDENCE = 0.84  # Prototype confidence indicator (non-medical)

    def predict(
        self,
        patient: Patient,
        current_vital: Optional[PatientVital],
        vitals_history: List[PatientVital],
        lab_results: List[LabResult]
    ) -> Dict[str, Any]:
        if not current_vital and vitals_history:
            current_vital = vitals_history[0]

        news2 = calculate_news2(current_vital)
        base_score = min(news2 * 11.5, 62.0)

        # Physiological parameter impact evaluation
        if current_vital:
            # Severe hypoxemia
            if current_vital.spo2 < 88.0:
                base_score += 26.0
            elif current_vital.spo2 < 92.0:
                base_score += 18.0
            elif current_vital.spo2 < 95.0:
                base_score += 8.0

            # Extreme tachycardia / bradycardia
            if current_vital.heart_rate > 130 or current_vital.heart_rate < 45:
                base_score += 20.0
            elif current_vital.heart_rate > 110:
                base_score += 12.0

            # Tachypnea
            if current_vital.respiratory_rate > 28:
                base_score += 18.0
            elif current_vital.respiratory_rate > 22:
                base_score += 10.0

            # Hypotension
            if current_vital.systolic_bp < 90:
                base_score += 20.0
            elif current_vital.systolic_bp < 100:
                base_score += 10.0

            # Pyrexia
            if current_vital.temperature > 38.8 or current_vital.temperature < 35.5:
                base_score += 10.0

        # Lab values impact
        if lab_results:
            for lab in lab_results:
                if lab.status == "CRITICAL":
                    base_score += 12.0
                elif lab.status in ["ABNORMAL", "HIGH", "LOW"]:
                    base_score += 5.0

        # Acuity floor based on admission status
        if patient.status == "CRITICAL":
            base_score = max(base_score, 82.0)
        elif patient.status == "HIGH_RISK":
            base_score = max(base_score, 58.0)

        # Multi-vital trend modifier: if SpO2 is dropping while HR is rising, amplify score
        trend_penalty = 0.0
        if len(vitals_history) >= 2:
            prev = vitals_history[1]
            if current_vital and prev:
                if current_vital.spo2 < prev.spo2 and current_vital.heart_rate > prev.heart_rate:
                    trend_penalty += 8.0
                if current_vital.respiratory_rate > prev.respiratory_rate:
                    trend_penalty += 5.0

        raw_score = min(98.0, max(5.0, round(base_score + trend_penalty, 1)))

        # Risk Classification (Section 3)
        if raw_score >= 85.0:
            level = "CRITICAL"
        elif raw_score >= 70.0:
            level = "VERY HIGH"
        elif raw_score >= 50.0:
            level = "HIGH"
        elif raw_score >= 30.0:
            level = "MODERATE"
        else:
            level = "LOW"

        return {
            "risk_score": raw_score,
            "risk_level": level,
            "news2_score": news2,
            "model_name": self.MODEL_NAME,
            "model_version": self.MODEL_VERSION,
            "confidence": self.CONFIDENCE
        }

# ====================================================
# PATIENT RISK ENGINE (Section 1 - 14)
# ====================================================

class PatientRiskEngine:
    def __init__(self, model: Optional[BaseRiskModel] = None):
        self.model = model or PrototypeRiskModel()

    def calculate_trend(self, vitals_history: List[PatientVital]) -> Dict[str, Any]:
        """Analyzes directional trajectory of vital signs over recent checkpoints (Section 4)"""
        if len(vitals_history) < 2:
            return {
                "spo2_trend": "STABLE",
                "heart_rate_trend": "STABLE",
                "respiratory_rate_trend": "STABLE",
                "blood_pressure_trend": "STABLE",
                "temperature_trend": "STABLE",
                "multi_vital_decline": False
            }

        curr = vitals_history[0]
        prev = vitals_history[1]

        # SpO2 direction
        spo2_diff = curr.spo2 - prev.spo2
        if spo2_diff <= -1.0:
            spo2_trend = "DECLINING"
        elif spo2_diff >= 1.0:
            spo2_trend = "IMPROVING"
        else:
            spo2_trend = "STABLE"

        # HR direction
        hr_diff = curr.heart_rate - prev.heart_rate
        if hr_diff >= 6:
            hr_trend = "INCREASING"
        elif hr_diff <= -6:
            hr_trend = "DECREASING"
        else:
            hr_trend = "STABLE"

        # RR direction
        rr_diff = curr.respiratory_rate - prev.respiratory_rate
        if rr_diff >= 3:
            rr_trend = "INCREASING"
        elif rr_diff <= -3:
            rr_trend = "DECREASING"
        else:
            rr_trend = "STABLE"

        # BP direction
        bp_diff = curr.systolic_bp - prev.systolic_bp
        if bp_diff <= -8:
            bp_trend = "HYPOTENSIVE_DRIFT"
        elif bp_diff >= 12:
            bp_trend = "HYPERTENSIVE_DRIFT"
        else:
            bp_trend = "STABLE"

        # Temp direction
        temp_diff = curr.temperature - prev.temperature
        if temp_diff >= 0.3:
            temp_trend = "ELEVATING"
        elif temp_diff <= -0.3:
            temp_trend = "DECREASING"
        else:
            temp_trend = "STABLE"

        multi_decline = (spo2_trend == "DECLINING" and (hr_trend == "INCREASING" or rr_trend == "INCREASING"))

        return {
            "spo2_trend": spo2_trend,
            "heart_rate_trend": hr_trend,
            "respiratory_rate_trend": rr_trend,
            "blood_pressure_trend": bp_trend,
            "temperature_trend": temp_trend,
            "multi_vital_decline": multi_decline
        }

    def calculate_contributing_factors(
        self,
        current_vital: Optional[PatientVital],
        vitals_history: List[PatientVital],
        lab_results: List[LabResult],
        patient: Patient
    ) -> List[Dict[str, Any]]:
        """Identifies driving factors and classifies impact: HIGH, MEDIUM, LOW (Section 5)"""
        factors: List[Dict[str, Any]] = []

        if current_vital:
            if current_vital.spo2 < 92.0:
                factors.append({
                    "parameter": "SpO2 Oxygen Saturation",
                    "value": f"{current_vital.spo2:.1f}%",
                    "direction": "↓",
                    "impact": "HIGH IMPACT",
                    "description": "Significant hypoxemia below safety baseline (<92%)"
                })
            elif current_vital.spo2 < 95.0:
                factors.append({
                    "parameter": "SpO2 Oxygen Saturation",
                    "value": f"{current_vital.spo2:.1f}%",
                    "direction": "↓",
                    "impact": "MEDIUM IMPACT",
                    "description": "Mild sub-optimal oxygenation"
                })

            if current_vital.respiratory_rate >= 26:
                factors.append({
                    "parameter": "Respiratory Rate",
                    "value": f"{current_vital.respiratory_rate}/min",
                    "direction": "↑",
                    "impact": "HIGH IMPACT",
                    "description": "Severe tachypneic compensatory effort"
                })
            elif current_vital.respiratory_rate >= 22:
                factors.append({
                    "parameter": "Respiratory Rate",
                    "value": f"{current_vital.respiratory_rate}/min",
                    "direction": "↑",
                    "impact": "MEDIUM IMPACT",
                    "description": "Moderate respiratory elevation"
                })

            if current_vital.heart_rate >= 120 or current_vital.heart_rate <= 45:
                factors.append({
                    "parameter": "Heart Rate",
                    "value": f"{current_vital.heart_rate} bpm",
                    "direction": "↑" if current_vital.heart_rate >= 120 else "↓",
                    "impact": "HIGH IMPACT",
                    "description": "Marked hemodynamic alteration"
                })
            elif current_vital.heart_rate >= 100:
                factors.append({
                    "parameter": "Heart Rate",
                    "value": f"{current_vital.heart_rate} bpm",
                    "direction": "↑",
                    "impact": "MEDIUM IMPACT",
                    "description": "Elevated sinus tachycardia"
                })

            if current_vital.systolic_bp <= 90:
                factors.append({
                    "parameter": "Blood Pressure",
                    "value": f"{current_vital.systolic_bp}/{current_vital.diastolic_bp} mmHg",
                    "direction": "↓",
                    "impact": "HIGH IMPACT",
                    "description": "Systemic hypotension indicating potential shock"
                })
            elif current_vital.systolic_bp >= 170:
                factors.append({
                    "parameter": "Blood Pressure",
                    "value": f"{current_vital.systolic_bp}/{current_vital.diastolic_bp} mmHg",
                    "direction": "↑",
                    "impact": "MEDIUM IMPACT",
                    "description": "Hypertensive urgency range"
                })

            if current_vital.temperature >= 38.5:
                factors.append({
                    "parameter": "Body Temperature",
                    "value": f"{current_vital.temperature:.1f}°C",
                    "direction": "↑",
                    "impact": "LOW IMPACT",
                    "description": "Elevated core body temperature / inflammatory response"
                })

        for lab in lab_results:
            if lab.status == "CRITICAL":
                factors.append({
                    "parameter": f"Lab: {lab.test_name}",
                    "value": f"{lab.value} {lab.unit}",
                    "direction": "!",
                    "impact": "HIGH IMPACT",
                    "description": f"Critical laboratory diagnostic value (Ref: {lab.reference_range})"
                })

        if not factors:
            factors.append({
                "parameter": "Baseline Physiological Vitals",
                "value": "Normal Range",
                "direction": "→",
                "impact": "LOW IMPACT",
                "description": "All monitored physiological parameters within safe limits"
            })

        return factors

    def calculate_risk_velocity(
        self,
        patient_id: int,
        current_risk: float,
        previous_predictions: List[RiskPrediction]
    ) -> Dict[str, Any]:
        """Calculates points/15min velocity and trajectory label (Section 7)"""
        if not previous_predictions:
            return {
                "velocity_points": 0.0,
                "velocity_text": "+0.0 / 15 min",
                "velocity_status": "STABLE",
                "direction_arrow": "→"
            }

        last_pred = previous_predictions[0]
        diff = current_risk - last_pred.risk_score

        # Normalize approx rate of change
        velocity_points = round(diff, 1)
        sign = "+" if velocity_points >= 0 else ""
        velocity_text = f"{sign}{velocity_points} / 15 min"

        if velocity_points >= 8.0:
            status = "RAPIDLY RISING"
            arrow = "↑↑"
        elif velocity_points >= 3.0:
            status = "RISING"
            arrow = "↑"
        elif velocity_points <= -3.0:
            status = "FALLING"
            arrow = "↓"
        else:
            status = "STABLE"
            arrow = "→"

        return {
            "velocity_points": velocity_points,
            "velocity_text": velocity_text,
            "velocity_status": status,
            "direction_arrow": arrow
        }

    def generate_explanation(
        self,
        risk_level: str,
        factors: List[Dict[str, Any]],
        trends: Dict[str, Any],
        velocity: Dict[str, Any]
    ) -> str:
        """Uncertainty-aware clinical decision support narrative (Section 40)"""
        primary_signals = [f['parameter'] for f in factors if f.get('impact') == 'HIGH IMPACT']
        if not primary_signals:
            primary_signals = [f['parameter'] for f in factors[:2]]

        signals_str = ", ".join(primary_signals) if primary_signals else "general vital telemetry"

        if risk_level in ["CRITICAL", "VERY HIGH"]:
            if velocity.get("velocity_status") in ["RAPIDLY RISING", "RISING"]:
                return (
                    f"Prototype AI detected a rising deterioration pattern driven by concurrent {signals_str}. "
                    f"Risk velocity indicates a rapid upward trajectory ({velocity.get('velocity_text')}). "
                    f"Immediate bedside intensivist review and continuous 12-lead telemetry strongly indicated."
                )
            return (
                f"Prototype AI identified sustained critical physiological instability primarily involving {signals_str}. "
                f"Close ICU observation protocol is recommended."
            )
        elif risk_level == "HIGH":
            return (
                f"Prototype AI observed borderline physiological destabilization with emerging signals in {signals_str}. "
                f"Recommend increasing nursing observation frequency."
            )
        elif risk_level == "MODERATE":
            return (
                f"Prototype AI evaluates mild physiological variance with manageable {signals_str}. "
                f"Continue routine telemetry tracking."
            )
        else:
            return (
                "Prototype AI indicates all vital signs and laboratory parameters are within stable reference thresholds."
            )

    def evaluate_patient(
        self,
        patient: Patient,
        db: Session,
        emit_events: bool = True
    ) -> Dict[str, Any]:
        """Main end-to-end evaluation entrypoint (Section 1)"""
        # Fetch vitals and labs
        vitals_history = db.query(PatientVital).filter(
            PatientVital.patient_id == patient.id
        ).order_by(PatientVital.timestamp.desc()).limit(10).all()

        current_vital = vitals_history[0] if vitals_history else None

        labs = db.query(LabResult).filter(
            LabResult.patient_id == patient.id
        ).order_by(LabResult.timestamp.desc()).limit(15).all()

        # Fetch previous predictions for velocity calculation
        prev_preds = db.query(RiskPrediction).filter(
            RiskPrediction.patient_id == patient.id
        ).order_by(RiskPrediction.timestamp.desc()).limit(5).all()

        # Run Prediction Model
        pred_res = self.model.predict(patient, current_vital, vitals_history, labs)
        risk_score = pred_res["risk_score"]
        risk_level = pred_res["risk_level"]

        # Run Diagnostics
        trends = self.calculate_trend(vitals_history)
        factors = self.calculate_contributing_factors(current_vital, vitals_history, labs, patient)
        velocity = self.calculate_risk_velocity(patient.id, risk_score, prev_preds)
        explanation = self.generate_explanation(risk_level, factors, trends, velocity)

        # Historical trend snapshots for charts
        historical_scores = [p.risk_score for p in reversed(prev_preds)]
        historical_scores.append(risk_score)
        if len(historical_scores) > 10:
            historical_scores = historical_scores[-10:]

        # Save to RiskPrediction
        new_pred = RiskPrediction(
            patient_id=patient.id,
            risk_score=risk_score,
            risk_level=risk_level,
            factors_json=json.dumps(factors),
            historical_trend_json=json.dumps(historical_scores),
            explanation=explanation,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(new_pred)

        # Update patient record directly
        patient.ai_risk_score = risk_score
        patient.ai_risk_level = risk_level

        # Save to AIPredictionAudit (Section 34)
        audit_rec = AIPredictionAudit(
            model_name=pred_res["model_name"],
            model_version=pred_res["model_version"],
            entity_type="PATIENT",
            entity_id=patient.id,
            input_snapshot_json=json.dumps({
                "heart_rate": current_vital.heart_rate if current_vital else None,
                "spo2": current_vital.spo2 if current_vital else None,
                "respiratory_rate": current_vital.respiratory_rate if current_vital else None,
                "systolic_bp": current_vital.systolic_bp if current_vital else None,
                "temperature": current_vital.temperature if current_vital else None
            }),
            prediction_json=json.dumps({
                "risk_score": risk_score,
                "risk_level": risk_level,
                "velocity": velocity["velocity_text"],
                "velocity_status": velocity["velocity_status"]
            }),
            confidence=pred_res["confidence"],
            explanation=explanation,
            timestamp=datetime.datetime.utcnow()
        )
        db.add(audit_rec)
        db.commit()
        db.refresh(new_pred)

        result_payload = {
            "patient_id": patient.id,
            "mrn": patient.mrn,
            "patient_name": patient.full_name,
            "bed_code": patient.bed.code if patient.bed else (patient.assigned_bed_id or "ICU"),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_velocity": velocity,
            "trends": trends,
            "contributing_factors": factors,
            "historical_scores": historical_scores,
            "explanation": explanation,
            "model_metadata": {
                "model_name": pred_res["model_name"],
                "model_version": pred_res["model_version"],
                "confidence": pred_res["confidence"],
                "status": "ONLINE",
                "label": "PROTOTYPE AI RISK ESTIMATE • SIMULATED DATA • NOT A MEDICAL DIAGNOSIS"
            },
            "timestamp": new_pred.timestamp.isoformat()
        }

        # Emit Real-time AI events & alerts (Section 8 & 9)
        if emit_events:
            self._handle_ai_alerts(db, patient, result_payload, velocity, trends)

        return result_payload

    def _handle_ai_alerts(
        self,
        db: Session,
        patient: Patient,
        data: Dict[str, Any],
        velocity: Dict[str, Any],
        trends: Dict[str, Any]
    ):
        risk_score = data["risk_score"]
        risk_level = data["risk_level"]

        # 1. Critical Risk Alert (>85%)
        if risk_score >= 85.0:
            alert = Alert(
                title=f"CRITICAL AI ALERT: {patient.full_name} ({patient.mrn})",
                message=f"Prototype AI evaluated critical risk ({risk_score}%). Primary drivers: {data['explanation'][:100]}...",
                alert_type="CRITICAL_RISK",
                severity="CRITICAL",
                hospital_id=patient.hospital_id,
                patient_id=patient.id,
                target_role="DOCTOR",
                created_at=datetime.datetime.utcnow()
            )
            db.add(alert)
            db.commit()

            websocket_manager.broadcast_sync(
                event_name="AI_CRITICAL_RISK",
                data={"alert_id": alert.id, "patient_id": patient.id, "mrn": patient.mrn, "risk_score": risk_score},
                hospital_id=patient.hospital_id
            )

        # 2. Rapid Deterioration Alert (Rising velocity >= 8.0 or multi-vital decline)
        elif velocity.get("velocity_status") == "RAPIDLY RISING" or trends.get("multi_vital_decline"):
            alert = Alert(
                title=f"EARLY DETERIORATION WARNING: {patient.full_name} ({patient.mrn})",
                message=f"Prototype AI detected rapid deterioration ({velocity.get('velocity_text')}). Signals: SpO2 decline with compensatory tachycardia.",
                alert_type="RAPID_DETERIORATION",
                severity="HIGH",
                hospital_id=patient.hospital_id,
                patient_id=patient.id,
                target_role="ALL",
                created_at=datetime.datetime.utcnow()
            )
            db.add(alert)
            db.commit()

            websocket_manager.broadcast_sync(
                event_name="AI_EARLY_WARNING",
                data={"alert_id": alert.id, "patient_id": patient.id, "mrn": patient.mrn, "velocity": velocity.get("velocity_text")},
                hospital_id=patient.hospital_id
            )

        # 3. Always broadcast updated score
        websocket_manager.broadcast_sync(
            event_name="AI_RISK_UPDATED",
            data={
                "patient_id": patient.id,
                "mrn": patient.mrn,
                "risk_score": risk_score,
                "risk_level": risk_level,
                "velocity": velocity.get("velocity_text"),
                "velocity_status": velocity.get("velocity_status")
            },
            hospital_id=patient.hospital_id
        )

# Global singleton
patient_risk_engine = PatientRiskEngine()
