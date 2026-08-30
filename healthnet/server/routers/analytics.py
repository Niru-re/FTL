from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Hospital, Bed, Patient, Ambulance, Alert, Staff
from ..schemas import AnalyticsSummaryOut

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/summary", response_model=AnalyticsSummaryOut)
def get_analytics_summary(db: Session = Depends(get_db)):
    total_hospitals = db.query(Hospital).count()
    beds = db.query(Bed).all()
    total_beds = len(beds)
    occupied_beds = len([b for b in beds if b.status == "OCCUPIED"])
    available_beds = len([b for b in beds if b.status == "AVAILABLE"])

    icu_beds = [b for b in beds if b.bed_type == "ICU"]
    total_icu = len(icu_beds)
    occupied_icu = len([b for b in icu_beds if b.status == "OCCUPIED"])
    available_icu = len([b for b in icu_beds if b.status == "AVAILABLE"])

    net_icu_rate = round((occupied_icu / total_icu * 100), 1) if total_icu > 0 else 0.0
    net_overall_rate = round((occupied_beds / total_beds * 100), 1) if total_beds > 0 else 0.0

    active_ambs = db.query(Ambulance).filter(Ambulance.status.in_(["DISPATCHED", "EN_ROUTE", "TRANSPORTING"])).count()
    critical_pts = db.query(Patient).filter(Patient.status == "CRITICAL").count()
    high_risk_pts = db.query(Patient).filter(Patient.status == "HIGH_RISK").count()
    active_alerts = db.query(Alert).filter(Alert.is_read == False).count()

    return AnalyticsSummaryOut(
        total_hospitals=total_hospitals,
        total_beds=total_beds,
        total_occupied_beds=occupied_beds,
        total_available_beds=available_beds,
        total_icu_beds=total_icu,
        available_icu_beds=available_icu,
        network_icu_occupancy_rate=net_icu_rate,
        network_overall_occupancy_rate=net_overall_rate,
        active_ambulances=active_ambs,
        critical_patients=critical_pts,
        high_risk_patients=high_risk_pts,
        active_alerts=active_alerts,
        avg_ambulance_response_mins=8.4,
        total_admissions_today=28,
        total_discharges_today=14
    )

@router.get("/hospital-comparison")
def get_hospital_comparison(db: Session = Depends(get_db)):
    hospitals = db.query(Hospital).all()
    results = []

    for hosp in hospitals:
        beds = db.query(Bed).filter(Bed.hospital_id == hosp.id).all()
        total_b = len(beds)
        occ_b = len([b for b in beds if b.status == "OCCUPIED"])
        avail_b = len([b for b in beds if b.status == "AVAILABLE"])

        icu_b = [b for b in beds if b.bed_type == "ICU"]
        total_icu = len(icu_b)
        occ_icu = len([b for b in icu_b if b.status == "OCCUPIED"])
        avail_icu = len([b for b in icu_b if b.status == "AVAILABLE"])

        icu_pct = round((occ_icu / total_icu * 100), 1) if total_icu > 0 else 0.0
        ward_pct = round((occ_b / total_b * 100), 1) if total_b > 0 else 0.0

        results.append({
            "id": hosp.id,
            "name": hosp.name,
            "branch": hosp.branch_name,
            "total_beds": total_b,
            "occupied_beds": occ_b,
            "available_beds": avail_b,
            "total_icu": total_icu,
            "available_icu": avail_icu,
            "icu_occupancy_rate": icu_pct,
            "ward_occupancy_rate": ward_pct,
            "ventilators_available": hosp.ventilators_available,
            "emergency_status": hosp.emergency_status
        })

    return results

@router.get("/department-breakdown")
def get_department_breakdown(db: Session = Depends(get_db)):
    beds = db.query(Bed).all()
    dept_map = {}

    for b in beds:
        dept_name = b.department.name if b.department else "General"
        if dept_name not in dept_map:
            dept_map[dept_name] = {"department": dept_name, "total": 0, "occupied": 0, "available": 0, "reserved": 0, "cleaning": 0}

        dept_map[dept_name]["total"] += 1
        if b.status == "OCCUPIED":
            dept_map[dept_name]["occupied"] += 1
        elif b.status == "AVAILABLE":
            dept_map[dept_name]["available"] += 1
        elif b.status == "RESERVED":
            dept_map[dept_name]["reserved"] += 1
        else:
            dept_map[dept_name]["cleaning"] += 1

    return list(dept_map.values())

@router.get("/timeseries-trends")
def get_timeseries_trends():
    return {
        "hourly_admissions": [
            {"hour": "00:00", "admissions": 2, "discharges": 0, "emergencies": 3},
            {"hour": "03:00", "admissions": 1, "discharges": 0, "emergencies": 2},
            {"hour": "06:00", "admissions": 4, "discharges": 1, "emergencies": 5},
            {"hour": "09:00", "admissions": 9, "discharges": 4, "emergencies": 8},
            {"hour": "12:00", "admissions": 14, "discharges": 8, "emergencies": 11},
            {"hour": "15:00", "admissions": 12, "discharges": 11, "emergencies": 9},
            {"hour": "18:00", "admissions": 10, "discharges": 5, "emergencies": 13},
            {"hour": "21:00", "admissions": 6, "discharges": 2, "emergencies": 7}
        ],
        "ambulance_response_trends": [
            {"day": "Mon", "avg_response_mins": 8.2, "target_mins": 8.0, "total_runs": 45},
            {"day": "Tue", "avg_response_mins": 7.9, "target_mins": 8.0, "total_runs": 52},
            {"day": "Wed", "avg_response_mins": 9.1, "target_mins": 8.0, "total_runs": 61},
            {"day": "Thu", "avg_response_mins": 8.4, "target_mins": 8.0, "total_runs": 48},
            {"day": "Fri", "avg_response_mins": 8.8, "target_mins": 8.0, "total_runs": 58},
            {"day": "Sat", "avg_response_mins": 7.6, "target_mins": 8.0, "total_runs": 64},
            {"day": "Sun", "avg_response_mins": 7.3, "target_mins": 8.0, "total_runs": 40}
        ]
    }
