from typing import List, Dict, Any, Optional
from ..models import Patient, PatientVital, LabResult

def calculate_news2(vital: Optional[PatientVital]) -> int:
    """
    Calculate National Early Warning Score 2 (NEWS2) based on standard clinical thresholds.
    """
    if not vital:
        return 0

    score = 0

    # 1. Respiration Rate (breaths/min)
    rr = vital.respiratory_rate or 16
    if rr <= 8 or rr >= 25:
        score += 3
    elif rr >= 21:
        score += 2
    elif rr <= 11:
        score += 1

    # 2. SpO2 (%) Scale 1
    spo2 = vital.spo2 or 98.0
    if spo2 <= 91:
        score += 3
    elif spo2 <= 93:
        score += 2
    elif spo2 <= 95:
        score += 1

    # 3. Systolic BP (mmHg)
    sbp = vital.systolic_bp or 120
    if sbp <= 90 or sbp >= 220:
        score += 3
    elif sbp <= 100:
        score += 2
    elif sbp <= 110:
        score += 1

    # 4. Heart Rate (bpm)
    hr = vital.heart_rate or 75
    if hr <= 40 or hr >= 131:
        score += 3
    elif hr >= 111:
        score += 2
    elif (hr <= 50) or (hr >= 91 and hr <= 110):
        score += 1

    # 5. Consciousness
    consciousness = (vital.consciousness or "ALERT").upper()
    if consciousness != "ALERT":
        score += 3

    # 6. Temperature (°C)
    temp = vital.temperature or 37.0
    if temp <= 35.0:
        score += 3
    elif temp >= 39.1:
        score += 2
    elif (temp <= 36.0) or (temp >= 38.1 and temp <= 39.0):
        score += 1

    return score

def evaluate_patient_risk(patient: Patient, latest_vital: Optional[PatientVital] = None, lab_results: Optional[List[LabResult]] = None) -> Dict[str, Any]:
    """
    Prototype AI Risk Estimate:
    Deterministic AI heuristic based on NEWS2 score, abnormal vitals, critical lab values, and clinical history.
    """
    if not latest_vital and patient.vitals:
        latest_vital = patient.vitals[0]

    news2 = calculate_news2(latest_vital)
    contributing_factors: List[str] = []

    base_risk = min(news2 * 12, 60)

    if latest_vital:
        if latest_vital.spo2 < 92:
            contributing_factors.append(f"Hypoxemia detected: SpO2 critical at {latest_vital.spo2:.1f}%")
        elif latest_vital.spo2 < 95:
            contributing_factors.append(f"Mild hypoxia: SpO2 reduced at {latest_vital.spo2:.1f}%")

        if latest_vital.heart_rate > 115:
            contributing_factors.append(f"Tachycardia: Elevated heart rate ({latest_vital.heart_rate} bpm)")
        elif latest_vital.heart_rate < 50:
            contributing_factors.append(f"Bradycardia: Low heart rate ({latest_vital.heart_rate} bpm)")

        if latest_vital.respiratory_rate > 24:
            contributing_factors.append(f"Tachypnea: Accelerated respiratory rate ({latest_vital.respiratory_rate}/min)")

        if latest_vital.systolic_bp < 95:
            contributing_factors.append(f"Hypotension: Low systolic pressure ({latest_vital.systolic_bp} mmHg)")
        elif latest_vital.systolic_bp > 175:
            contributing_factors.append(f"Severe Hypertension: Systolic BP {latest_vital.systolic_bp} mmHg")

        if latest_vital.temperature > 38.5:
            contributing_factors.append(f"Pyrexia / Fever: Core temp {latest_vital.temperature:.1f}°C")
        elif latest_vital.temperature < 35.5:
            contributing_factors.append(f"Hypothermia: Core temp {latest_vital.temperature:.1f}°C")

        if (latest_vital.consciousness or "ALERT").upper() != "ALERT":
            contributing_factors.append(f"Altered mental status: {latest_vital.consciousness}")

    # Check critical labs
    if lab_results:
        for lab in lab_results:
            if lab.status in ["CRITICAL", "ABNORMAL"]:
                contributing_factors.append(f"Abnormal lab: {lab.test_name} ({lab.value} {lab.unit})")
                base_risk += 8

    # Acuity booster from patient clinical status
    if patient.status == "CRITICAL":
        base_risk = max(base_risk, 82)
        if "Critical ICU admission status" not in contributing_factors:
            contributing_factors.append("Critical ICU admission status")
    elif patient.status == "HIGH_RISK":
        base_risk = max(base_risk, 60)
        if "High risk triage classification" not in contributing_factors:
            contributing_factors.append("High risk triage classification")

    # Clamp risk score between 5 and 98
    risk_score = min(max(base_risk, 5), 98)

    if not contributing_factors:
        contributing_factors.append("Vitals and clinical parameters within standard stable baseline limits.")

    if risk_score >= 75:
        risk_level = "CRITICAL"
        recommended_action = "Immediate intensivist review, continuous 12-lead monitoring, and ICU step-up protocol."
    elif risk_score >= 50:
        risk_level = "HIGH"
        recommended_action = "Increase nursing observation interval to Q1H, re-check arterial blood gas & lactate."
    elif risk_score >= 25:
        risk_level = "MODERATE"
        recommended_action = "Routine monitoring Q4H, maintain current medication protocol."
    else:
        risk_level = "LOW"
        recommended_action = "Patient stable on current ward care trajectory."

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "contributing_factors": contributing_factors,
        "news2_score": news2,
        "recommended_action": recommended_action,
        "label": "Prototype AI Risk Estimate"
    }

calculate_patient_risk = evaluate_patient_risk
