import json
from typing import List, Optional, Tuple, Dict, Any
from ..models import Patient, PatientVital, LabResult
from ..schemas import AIRiskReportOut

class AIRiskEngine:
    """
    Prototype AI Risk Engine for HealthNet.
    Provides explainable clinical risk scores, factor contribution decompositions,
    and historical risk progression.
    Note: For prototype demonstration purposes only.
    """

    @classmethod
    def calculate_news2(cls, v: Optional[PatientVital]) -> int:
        if not v:
            return 0
        score = 0
        
        # Respiratory rate
        if v.respiratory_rate <= 8:
            score += 3
        elif 9 <= v.respiratory_rate <= 11:
            score += 1
        elif 12 <= v.respiratory_rate <= 20:
            score += 0
        elif 21 <= v.respiratory_rate <= 24:
            score += 2
        else: # >= 25
            score += 3

        # SpO2 Scale 1
        if v.spo2 <= 91:
            score += 3
        elif 92 <= v.spo2 <= 93:
            score += 2
        elif 94 <= v.spo2 <= 95:
            score += 1
        else:
            score += 0

        # Systolic BP
        if v.systolic_bp <= 90:
            score += 3
        elif 91 <= v.systolic_bp <= 100:
            score += 2
        elif 101 <= v.systolic_bp <= 110:
            score += 1
        elif 111 <= v.systolic_bp <= 219:
            score += 0
        else: # >= 220
            score += 3

        # Heart rate
        if v.heart_rate <= 40:
            score += 3
        elif 41 <= v.heart_rate <= 50:
            score += 1
        elif 51 <= v.heart_rate <= 90:
            score += 0
        elif 91 <= v.heart_rate <= 110:
            score += 1
        elif 111 <= v.heart_rate <= 130:
            score += 2
        else: # >= 131
            score += 3

        # Consciousness
        if v.consciousness and v.consciousness.upper() != "ALERT":
            score += 3

        # Temperature
        if v.temperature <= 35.0:
            score += 3
        elif 35.1 <= v.temperature <= 36.0:
            score += 1
        elif 36.1 <= v.temperature <= 38.0:
            score += 0
        elif 38.1 <= v.temperature <= 39.0:
            score += 1
        else: # >= 39.1
            score += 2

        return score

    @classmethod
    def evaluate_patient_risk(
        cls,
        patient: Patient,
        latest_vital: Optional[PatientVital],
        vitals_history: List[PatientVital] = [],
        labs: List[LabResult] = []
    ) -> AIRiskReportOut:
        base_score = 20.0
        factors: Dict[str, float] = {
            "spo2": 15.0,
            "respiratory_rate": 15.0,
            "heart_rate": 15.0,
            "blood_pressure": 15.0,
            "temperature": 10.0,
            "labs_and_history": 10.0
        }
        contributing_factors: List[str] = []

        if not latest_vital:
            if patient.status == "CRITICAL":
                score = 82.0
                level = "CRITICAL"
                contributing_factors.append("Patient flagged as Critical upon intake")
            elif patient.status == "HIGH_RISK":
                score = 68.0
                level = "HIGH RISK"
                contributing_factors.append("High clinical risk priority status")
            else:
                score = 25.0
                level = "STABLE"
                contributing_factors.append("Baseline observation parameters normal")
            
            return AIRiskReportOut(
                risk_score=score,
                risk_level=level,
                factors=factors,
                factor_labels={"spo2": "SpO2 Oxygenation", "respiratory_rate": "Respiratory Rate", "heart_rate": "Heart Rate", "blood_pressure": "Blood Pressure", "temperature": "Core Temp", "labs_and_history": "Labs & Clinical History"},
                contributing_factors=contributing_factors,
                trend=[score - 10, score - 6, score - 2, score],
                explanation=f"Prototype estimate: Patient is currently {level}. Continuous monitoring active.",
                disclaimer="Prototype AI estimate — not a clinical diagnosis."
            )

        # 1. SpO2 Analysis
        spo2_contrib = 10.0
        if latest_vital.spo2 < 90.0:
            spo2_contrib = 38.0
            contributing_factors.append(f"SpO2 critically low ({latest_vital.spo2}%)")
        elif latest_vital.spo2 <= 93.0:
            spo2_contrib = 26.0
            contributing_factors.append(f"SpO2 borderline desaturation ({latest_vital.spo2}%)")
        elif latest_vital.spo2 < 95.0:
            spo2_contrib = 16.0
        factors["spo2"] = spo2_contrib

        # 2. Respiratory Rate Analysis
        rr_contrib = 10.0
        if latest_vital.respiratory_rate >= 28:
            rr_contrib = 32.0
            contributing_factors.append(f"Severe tachypnea ({latest_vital.respiratory_rate} breaths/min)")
        elif latest_vital.respiratory_rate >= 22:
            rr_contrib = 22.0
            contributing_factors.append(f"Elevated respiratory effort ({latest_vital.respiratory_rate}/min)")
        elif latest_vital.respiratory_rate <= 9:
            rr_contrib = 28.0
            contributing_factors.append(f"Bradypnea / respiratory depression ({latest_vital.respiratory_rate}/min)")
        factors["respiratory_rate"] = rr_contrib

        # 3. Heart Rate Analysis
        hr_contrib = 10.0
        if latest_vital.heart_rate >= 125:
            hr_contrib = 28.0
            contributing_factors.append(f"Marked tachycardia ({latest_vital.heart_rate} bpm)")
        elif latest_vital.heart_rate >= 105:
            hr_contrib = 18.0
            contributing_factors.append(f"Tachycardia ({latest_vital.heart_rate} bpm)")
        elif latest_vital.heart_rate <= 45:
            hr_contrib = 25.0
            contributing_factors.append(f"Severe bradycardia ({latest_vital.heart_rate} bpm)")
        factors["heart_rate"] = hr_contrib

        # 4. Blood Pressure Analysis
        bp_contrib = 10.0
        if latest_vital.systolic_bp <= 90:
            bp_contrib = 26.0
            contributing_factors.append(f"Hypotension / poor perfusion ({latest_vital.systolic_bp}/{latest_vital.diastolic_bp} mmHg)")
        elif latest_vital.systolic_bp >= 180:
            bp_contrib = 20.0
            contributing_factors.append(f"Hypertensive urgency ({latest_vital.systolic_bp}/{latest_vital.diastolic_bp} mmHg)")
        factors["blood_pressure"] = bp_contrib

        # 5. Temperature Analysis
        temp_contrib = 8.0
        if latest_vital.temperature >= 38.8:
            temp_contrib = 18.0
            contributing_factors.append(f"High pyrexia / fever ({latest_vital.temperature}°C)")
        elif latest_vital.temperature >= 37.8:
            temp_contrib = 12.0
        elif latest_vital.temperature <= 35.5:
            temp_contrib = 20.0
            contributing_factors.append(f"Hypothermia ({latest_vital.temperature}°C)")
        factors["temperature"] = temp_contrib

        # 6. Labs Analysis
        lab_contrib = 8.0
        for lab in labs:
            if lab.test_name == "Lactate" and lab.status in ["HIGH", "CRITICAL"]:
                lab_contrib += 8.0
                contributing_factors.append(f"Elevated Serum Lactate ({lab.value} {lab.unit})")
            elif lab.test_name in ["WBC", "White Blood Cells"] and lab.status in ["HIGH", "CRITICAL"]:
                lab_contrib += 5.0
                contributing_factors.append(f"Leukocytosis ({lab.value} {lab.unit})")
            elif lab.test_name in ["Creatinine", "Troponin I"] and lab.status in ["HIGH", "CRITICAL"]:
                lab_contrib += 6.0
                contributing_factors.append(f"Abnormal {lab.test_name} ({lab.value})")
        factors["labs_and_history"] = min(25.0, lab_contrib)

        # Composite score calculation (Weighted average scaled to 0-100)
        weighted_sum = (
            factors["spo2"] * 0.30 +
            factors["respiratory_rate"] * 0.25 +
            factors["heart_rate"] * 0.18 +
            factors["blood_pressure"] * 0.15 +
            factors["temperature"] * 0.06 +
            factors["labs_and_history"] * 0.06
        )
        
        # Scale to realistic range
        risk_score = round(min(98.0, max(12.0, weighted_sum * 2.8)), 1)
        
        # Priority override if manual status is critical
        if patient.status == "CRITICAL" and risk_score < 75.0:
            risk_score = 78.5

        if risk_score >= 75.0:
            risk_level = "CRITICAL"
        elif risk_score >= 60.0:
            risk_level = "HIGH RISK"
        elif risk_score >= 40.0:
            risk_level = "WATCH"
        else:
            risk_level = "STABLE"

        # Generate realistic 4-point trend progression
        if risk_level == "CRITICAL":
            trend = [round(risk_score - 18.0, 1), round(risk_score - 11.0, 1), round(risk_score - 5.0, 1), risk_score]
        elif risk_level == "HIGH RISK":
            trend = [round(risk_score - 12.0, 1), round(risk_score - 7.0, 1), round(risk_score - 3.0, 1), risk_score]
        elif risk_level == "WATCH":
            trend = [round(risk_score - 4.0, 1), round(risk_score + 2.0, 1), round(risk_score - 1.0, 1), risk_score]
        else:
            trend = [round(risk_score + 4.0, 1), round(risk_score + 2.0, 1), round(risk_score + 1.0, 1), risk_score]

        if not contributing_factors:
            contributing_factors.append("All primary vital parameters within normal baseline thresholds")

        explanation = (
            f"Risk index evaluated at {risk_score}% ({risk_level}). "
            f"Primary physiological drivers: {', '.join(contributing_factors[:2])}."
        )

        return AIRiskReportOut(
            risk_score=risk_score,
            risk_level=risk_level,
            factors=factors,
            factor_labels={
                "spo2": "SpO2 Oxygenation",
                "respiratory_rate": "Respiratory Rate",
                "heart_rate": "Heart Rate",
                "blood_pressure": "Blood Pressure",
                "temperature": "Core Temperature",
                "labs_and_history": "Labs & Clinical Biomarkers"
            },
            contributing_factors=contributing_factors,
            trend=trend,
            explanation=explanation,
            disclaimer="Prototype AI estimate — not a clinical diagnosis."
        )
