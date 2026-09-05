import datetime
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import (
    User, Patient, Bed, Staff, Hospital, Department,
    PatientAccount, FamilyMember, FamilyAuthorization,
    PatientRequest, PatientUpdate, PatientDocument,
    Appointment, PatientNotification, PatientVital,
    Medication, LabResult, Ambulance, EmergencyCase
)
from ..schemas import (
    PatientDashboardOut, PatientStatusOut, PatientCareTeamOut,
    CareTeamMemberOut, PatientSimplifiedVitalsOut, PatientUpdateOut,
    PatientTimelineItemOut, PatientMedicationOut, PatientLabOut,
    PatientDocumentOut, AppointmentItemOut, PatientNotificationOut,
    PatientRequestCreate, PatientRequestOut, FamilyMemberOut,
    FamilyInviteCreate, FamilyAuthUpdate, HospitalInfoOut,
    AmbulanceStatusOut, PatientProfileOut
)
from ..auth import get_current_user, require_patient_or_family, check_patient_authorization
from ..services.websocket_manager import websocket_manager

router = APIRouter(prefix="/api/patient", tags=["patient-portal"])

def get_authorized_patient_id(
    current_user: User,
    db: Session,
    requested_patient_id: Optional[int] = None,
    required_level: str = "BASIC"
) -> int:
    """
    Resolves and verifies the authorized patient ID for the current patient or family session.
    """
    if current_user.role == "PATIENT":
        pt_acct = db.query(PatientAccount).filter(PatientAccount.user_id == current_user.id).first()
        if not pt_acct:
            raise HTTPException(status_code=404, detail="Patient account profile not found.")
        if requested_patient_id and requested_patient_id != pt_acct.patient_id:
            raise HTTPException(status_code=403, detail="Unauthorized access to requested patient.")
        return pt_acct.patient_id

    if current_user.role == "FAMILY_MEMBER":
        fam = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
        if not fam:
            raise HTTPException(status_code=404, detail="Family member profile not found.")

        # Query all accepted authorizations
        auths = db.query(FamilyAuthorization).filter(
            FamilyAuthorization.family_member_id == fam.id,
            FamilyAuthorization.status == "ACCEPTED"
        ).all()

        if not auths:
            raise HTTPException(status_code=403, detail="No active patient authorizations found.")

        level_weights = {"BASIC": 1, "CARE": 2, "FULL": 3}
        req_weight = level_weights.get(required_level, 1)

        if requested_patient_id:
            target_auth = next((a for a in auths if a.patient_id == requested_patient_id), None)
            if not target_auth:
                raise HTTPException(status_code=403, detail="You do not have access to this patient.")
            if level_weights.get(target_auth.access_level, 0) < req_weight:
                raise HTTPException(status_code=403, detail=f"Requires {required_level} access level.")
            return requested_patient_id
        else:
            # Default to the first authorized patient
            for a in auths:
                if level_weights.get(a.access_level, 0) >= req_weight:
                    return a.patient_id
            raise HTTPException(status_code=403, detail=f"Requires {required_level} access level.")

    if current_user.role == "ADMIN":
        if requested_patient_id:
            return requested_patient_id
        first_pt = db.query(Patient).first()
        return first_pt.id if first_pt else 1

    raise HTTPException(status_code=403, detail="Access forbidden.")

@router.get("/me")
def get_patient_me(
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    """
    Returns the authenticated patient or family member identity, plus authorized patients list.
    """
    authorized_patients = []
    active_patient_id = None

    if current_user.role == "PATIENT":
        pt_acct = db.query(PatientAccount).filter(PatientAccount.user_id == current_user.id).first()
        if pt_acct and pt_acct.patient:
            active_patient_id = pt_acct.patient_id
            authorized_patients.append({
                "patient_id": pt_acct.patient.id,
                "mrn": pt_acct.patient.mrn,
                "full_name": pt_acct.patient.full_name,
                "relationship": "Self",
                "access_level": "FULL"
            })
    elif current_user.role == "FAMILY_MEMBER":
        fam = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
        if fam:
            auths = db.query(FamilyAuthorization).filter(
                FamilyAuthorization.family_member_id == fam.id,
                FamilyAuthorization.status == "ACCEPTED"
            ).all()
            for a in auths:
                if a.patient:
                    authorized_patients.append({
                        "patient_id": a.patient.id,
                        "mrn": a.patient.mrn,
                        "full_name": a.patient.full_name,
                        "relationship": fam.relation_type,
                        "access_level": a.access_level

                    })
            if authorized_patients:
                active_patient_id = authorized_patients[0]["patient_id"]
    else:
        # Admin demo view
        first_pt = db.query(Patient).first()
        if first_pt:
            active_patient_id = first_pt.id
            authorized_patients.append({
                "patient_id": first_pt.id,
                "mrn": first_pt.mrn,
                "full_name": first_pt.full_name,
                "relationship": "Administrator",
                "access_level": "FULL"
            })

    return {
        "user_id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "active_patient_id": active_patient_id,
        "authorized_patients": authorized_patients
    }

@router.get("/dashboard", response_model=PatientDashboardOut)
def get_patient_dashboard(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    """
    Answers immediately:
    1. Where is my patient?
    2. What is their current status?
    3. Who is taking care of them?
    4. What has happened recently?
    """
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    # Friendly status explanation (calm, human, professional)
    status_map = {
        "CRITICAL": "Your care team is closely monitoring your condition.",
        "HIGH_RISK": "Your care team is providing dedicated and specialized attention.",
        "STABLE": "You are making steady progress under continuous care.",
        "DISCHARGED": "Discharge completed. Follow-up plan is ready.",
        "DISCHARGE PLANNED": "Your care team is preparing your discharge instructions."
    }
    raw_status = patient.status.upper()
    explanation = status_map.get(raw_status, "Your care team is actively attending to your care.")

    hosp_name = patient.hospital.name if patient.hospital else "Central Medical Pavilion"
    branch_name = patient.hospital.branch_name if patient.hospital else "Main Medical Campus"
    dept_name = patient.department.name if patient.department else "General Observation"

    bed_code = patient.bed.code if patient.bed else "ICU-07"
    room_unit = "Medical ICU" if "ICU" in bed_code else "General Inpatient Care"

    doc_name = patient.assigned_doctor.name if patient.assigned_doctor else "Dr. Arjun Sharma"
    nurse_name = patient.assigned_nurse.name if patient.assigned_nurse else "Nurse Elena Rostova"

    # Simplified vitals (latest)
    vitals_out = None
    latest_vital = db.query(PatientVital).filter(PatientVital.patient_id == pid).order_by(desc(PatientVital.timestamp)).first()
    if latest_vital:
        vitals_out = PatientSimplifiedVitalsOut(
            heart_rate=latest_vital.heart_rate,
            spo2=latest_vital.spo2,
            systolic_bp=latest_vital.systolic_bp,
            diastolic_bp=latest_vital.diastolic_bp,
            respiratory_rate=latest_vital.respiratory_rate,
            temperature=latest_vital.temperature,
            last_updated=latest_vital.timestamp,
            disclaimer="These readings are provided for information only."
        )

    updates_count = db.query(PatientUpdate).filter(PatientUpdate.patient_id == pid).count()
    appts_count = db.query(Appointment).filter(Appointment.patient_id == pid, Appointment.status == "SCHEDULED").count()
    docs_count = db.query(PatientDocument).filter(PatientDocument.patient_id == pid, PatientDocument.is_patient_visible == True).count()

    # Check simulated ambulance transit status via EmergencyCase
    amb_active = False
    amb_eta = None
    active_case = db.query(EmergencyCase).filter(
        EmergencyCase.assigned_patient_id == pid,
        EmergencyCase.status.in_(["EN_ROUTE", "AMBULANCE_ASSIGNED"])
    ).first()
    if active_case:
        amb_active = True
        amb_eta = 8


    first_name = patient.full_name.split()[0] if patient.full_name else "Patient"

    return PatientDashboardOut(
        patient_id=patient.id,
        mrn=patient.mrn,
        full_name=patient.full_name,
        first_name=first_name,
        age=patient.age,
        gender=patient.gender,
        care_status=patient.status,
        status_explanation=explanation,
        hospital_name=hosp_name,
        branch_name=branch_name,
        department_name=dept_name,
        room_unit=room_unit,
        bed_code=bed_code,
        doctor_name=doc_name,
        nurse_name=nurse_name,
        recent_updates_count=updates_count,
        upcoming_appointments_count=appts_count,
        available_documents_count=docs_count,
        last_updated=datetime.datetime.utcnow(),
        vitals=vitals_out,
        is_in_transit=amb_active,
        transit_eta_minutes=amb_eta
    )

@router.get("/status", response_model=PatientStatusOut)
def get_patient_status(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    status_map = {
        "CRITICAL": "Your care team is closely monitoring your condition.",
        "HIGH_RISK": "Your care team is providing dedicated and specialized attention.",
        "STABLE": "You are making steady progress under continuous care.",
        "DISCHARGED": "Discharge completed. Follow-up plan is ready.",
        "DISCHARGE PLANNED": "Your care team is preparing your discharge instructions."
    }

    bed_code = patient.bed.code if patient.bed else "Bed 07"
    dept_name = patient.department.name if patient.department else "General Observation"
    hosp_name = patient.hospital.name if patient.hospital else "Central Hospital"

    return PatientStatusOut(
        status=patient.status,
        headline=f"Current Status: {patient.status.title()}",
        explanation=status_map.get(patient.status.upper(), "Your care team is actively attending to your care."),
        location=f"{hosp_name} • {dept_name} • Room/Bed {bed_code}",
        last_updated=datetime.datetime.utcnow()
    )

@router.get("/care-team", response_model=PatientCareTeamOut)
def get_patient_care_team(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    hosp_name = patient.hospital.name if patient.hospital else "HealthNet Central Hospital"
    branch_name = patient.hospital.branch_name if patient.hospital else "Downtown Campus"
    dept_name = patient.department.name if patient.department else "Intensive Care Unit"
    bed_code = patient.bed.code if patient.bed else "ICU-07"
    unit_name = "Medical ICU"

    doc_out = None
    if patient.assigned_doctor:
        doc_out = CareTeamMemberOut(
            name=patient.assigned_doctor.name,
            role_title="Attending Physician",
            specialization=patient.assigned_doctor.specialization or "Critical Care Medicine",
            department=dept_name,
            hospital_name=hosp_name,
            on_duty_status=patient.assigned_doctor.on_duty_status or "ON_DUTY",
            shift=patient.assigned_doctor.shift or "MORNING"
        )
    else:
        doc_out = CareTeamMemberOut(
            name="Dr. Arjun Sharma",
            role_title="Attending Physician",
            specialization="Critical Care & Pulmonology",
            department=dept_name,
            hospital_name=hosp_name,
            on_duty_status="ON_DUTY",
            shift="MORNING"
        )

    nurse_out = None
    if patient.assigned_nurse:
        nurse_out = CareTeamMemberOut(
            name=patient.assigned_nurse.name,
            role_title="Primary Care Nurse",
            specialization=patient.assigned_nurse.specialization or "ICU Critical Care",
            department=dept_name,
            hospital_name=hosp_name,
            on_duty_status=patient.assigned_nurse.on_duty_status or "ON_DUTY",
            shift=patient.assigned_nurse.shift or "MORNING"
        )
    else:
        nurse_out = CareTeamMemberOut(
            name="Nurse Elena Rostova",
            role_title="Primary Care Nurse",
            specialization="Intensive Care Nursing",
            department=dept_name,
            hospital_name=hosp_name,
            on_duty_status="ON_DUTY",
            shift="MORNING"
        )

    return PatientCareTeamOut(
        doctor=doc_out,
        nurse=nurse_out,
        hospital_name=hosp_name,
        branch_name=branch_name,
        department_name=dept_name,
        bed_code=bed_code,
        room_or_unit=unit_name
    )

@router.get("/updates", response_model=List[PatientUpdateOut])
def get_patient_updates(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")

    allowed_levels = ["BASIC"]
    if current_user.role in ["PATIENT", "ADMIN"]:
        allowed_levels = ["BASIC", "CARE", "FULL"]
    elif current_user.role == "FAMILY_MEMBER":
        fam = db.query(FamilyMember).filter(FamilyMember.user_id == current_user.id).first()
        auth_entry = db.query(FamilyAuthorization).filter(
            FamilyAuthorization.family_member_id == fam.id,
            FamilyAuthorization.patient_id == pid,
            FamilyAuthorization.status == "ACCEPTED"
        ).first()
        if auth_entry:
            if auth_entry.access_level == "FULL":
                allowed_levels = ["BASIC", "CARE", "FULL"]
            elif auth_entry.access_level == "CARE":
                allowed_levels = ["BASIC", "CARE"]

    updates = db.query(PatientUpdate).filter(
        PatientUpdate.patient_id == pid,
        PatientUpdate.visibility_level.in_(allowed_levels)
    ).order_by(desc(PatientUpdate.created_at)).all()

    return [
        PatientUpdateOut(
            id=u.id,
            update_type=u.update_type,
            title=u.title,
            description=u.description,
            timestamp=u.created_at,
            staff_name=u.staff_name
        ) for u in updates
    ]

@router.get("/timeline", response_model=List[PatientTimelineItemOut])
def get_patient_timeline(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="CARE")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    updates = db.query(PatientUpdate).filter(PatientUpdate.patient_id == pid).order_by(desc(PatientUpdate.created_at)).limit(10).all()

    timeline_items = []
    for u in updates:
        timeline_items.append(PatientTimelineItemOut(
            id=u.id,
            time=u.created_at.strftime("%I:%M %p"),
            title=u.title,
            description=u.description,
            timestamp=u.created_at
        ))

    if not timeline_items:
        timeline_items.append(PatientTimelineItemOut(
            id=999,
            time=patient.admission_date.strftime("%I:%M %p"),
            title="Admission Completed",
            description=f"Patient admitted to {patient.hospital.name if patient.hospital else 'HealthNet Central'}.",
            timestamp=patient.admission_date
        ))

    return timeline_items

@router.get("/medications", response_model=List[PatientMedicationOut])
def get_patient_medications(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="CARE")
    meds = db.query(Medication).filter(Medication.patient_id == pid).all()

    results = []
    for m in meds:
        results.append(PatientMedicationOut(
            id=m.id,
            drug_name=f"{m.drug_name} {m.dosage or ''}",
            schedule=m.frequency or "Every 8 hours",
            status=m.status or "SCHEDULED",
            last_given_time="08:00 AM Today" if m.status == "ADMINISTERED" else "Scheduled for next round",
            disclaimer="DEMO MEDICATION INFORMATION"
        ))
    return results

@router.get("/labs", response_model=List[PatientLabOut])
def get_patient_labs(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="FULL")
    labs = db.query(LabResult).filter(LabResult.patient_id == pid).order_by(desc(LabResult.timestamp)).all()

    return [
        PatientLabOut(
            id=l.id,
            test_name=l.test_name,
            date=l.timestamp.strftime("%b %d, %Y"),
            status="AVAILABLE" if l.status == "COMPLETED" else "PENDING",
            reported_time=l.timestamp
        ) for l in labs
    ]

@router.get("/documents", response_model=List[PatientDocumentOut])
def get_patient_documents(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="FULL")
    docs = db.query(PatientDocument).filter(
        PatientDocument.patient_id == pid,
        PatientDocument.is_patient_visible == True
    ).order_by(desc(PatientDocument.created_at)).all()

    return [
        PatientDocumentOut(
            id=d.id,
            document_type=d.document_type,
            title=d.title,
            summary=d.summary,
            created_at=d.created_at,
            file_url=d.file_url
        ) for d in docs
    ]

@router.get("/appointments", response_model=List[AppointmentItemOut])
def get_patient_appointments(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="CARE")
    appts = db.query(Appointment).filter(Appointment.patient_id == pid).order_by(Appointment.appointment_date).all()

    return [
        AppointmentItemOut(
            id=a.id,
            title=f"Consultation with {a.doctor_name}",
            doctor_name=a.doctor_name,
            department_name=a.department_name,
            hospital_name=a.hospital.name if a.hospital else "Central Hospital",
            date_formatted=a.appointment_date.strftime("%A, %b %d, %Y"),
            time_slot=a.time_slot,
            location=a.location,
            reason=a.reason,
            status=a.status
        ) for a in appts
    ]

@router.get("/notifications", response_model=List[PatientNotificationOut])
def get_patient_notifications(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    notifs = db.query(PatientNotification).filter(
        PatientNotification.patient_id == pid
    ).order_by(desc(PatientNotification.created_at)).limit(20).all()

    return [
        PatientNotificationOut(
            id=n.id,
            title=n.title,
            message=n.message,
            notification_type=n.notification_type,
            is_read=n.is_read,
            timestamp=n.created_at
        ) for n in notifs
    ]

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    notif = db.query(PatientNotification).filter(PatientNotification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")
    notif.is_read = True
    db.commit()
    return {"status": "success", "id": notification_id, "is_read": True}

@router.get("/requests", response_model=List[PatientRequestOut])
def get_patient_requests(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    reqs = db.query(PatientRequest).filter(PatientRequest.patient_id == pid).order_by(desc(PatientRequest.created_at)).all()

    return [
        PatientRequestOut(
            id=r.id,
            request_type=r.request_type,
            message=r.message,
            priority=r.priority,
            status=r.status,
            created_by_name=r.created_by_name,
            created_at=r.created_at,
            acknowledged_by_name=r.acknowledged_by_name,
            acknowledged_at=r.acknowledged_at,
            response_message=r.response_message,
            responded_by_name=r.responded_by_name,
            responded_at=r.responded_at,
            completed_at=r.completed_at
        ) for r in reqs
    ]

@router.post("/requests", response_model=PatientRequestOut)
async def create_patient_request(
    request_data: PatientRequestCreate,
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    creator_name = current_user.full_name or "Patient / Family"
    new_req = PatientRequest(
        patient_id=pid,
        created_by_user_id=current_user.id,
        created_by_name=creator_name,
        request_type=request_data.request_type,
        message=request_data.message,
        priority=request_data.priority,
        status="PENDING",
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    # Broadcast real-time notification to Care Team (Doctor & Nurse)
    await websocket_manager.broadcast_event(
        event_name="PATIENT_REQUEST_CREATED",
        data={
            "id": new_req.id,
            "patient_id": pid,
            "patient_name": patient.full_name,
            "patient_mrn": patient.mrn,
            "creator_name": creator_name,
            "request_type": new_req.request_type,
            "message": new_req.message,
            "priority": new_req.priority,
            "status": new_req.status,
            "created_at": new_req.created_at.isoformat()
        },
        channel=f"hospital:{patient.hospital_id}" if patient.hospital_id else "network",
        target_roles=["DOCTOR", "NURSE", "ADMIN"]
    )

    return PatientRequestOut(
        id=new_req.id,
        request_type=new_req.request_type,
        message=new_req.message,
        priority=new_req.priority,
        status=new_req.status,
        created_by_name=new_req.created_by_name,
        created_at=new_req.created_at
    )

@router.get("/family", response_model=List[FamilyMemberOut])
def get_family_members(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")

    auths = db.query(FamilyAuthorization).filter(
        FamilyAuthorization.patient_id == pid
    ).all()

    results = []
    for a in auths:
        if a.family_member:
            results.append(FamilyMemberOut(
                id=a.id,
                full_name=a.family_member.full_name,
                relationship=a.family_member.relation_type,
                email=a.family_member.email,
                phone=a.family_member.phone,
                access_level=a.access_level,
                status=a.status,
                invited_at=a.invited_at
            ))
    return results

@router.post("/family", response_model=FamilyMemberOut)
def invite_family_member(
    invite: FamilyInviteCreate,
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="FULL")

    clean_email = invite.email.strip().lower()
    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        from ..auth import hash_password
        user = User(
            email=clean_email,
            hashed_password=hash_password("demo123"),
            full_name=invite.full_name,
            role="FAMILY_MEMBER",
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    fam_member = db.query(FamilyMember).filter(FamilyMember.user_id == user.id).first()
    if not fam_member:
        fam_member = FamilyMember(
            user_id=user.id,
            full_name=invite.full_name,
            email=clean_email,
            phone=invite.phone,
            relation_type=invite.relationship
        )
        db.add(fam_member)
        db.commit()
        db.refresh(fam_member)

    auth_entry = db.query(FamilyAuthorization).filter(
        FamilyAuthorization.family_member_id == fam_member.id,
        FamilyAuthorization.patient_id == pid
    ).first()

    if not auth_entry:
        auth_entry = FamilyAuthorization(
            family_member_id=fam_member.id,
            patient_id=pid,
            access_level=invite.access_level,
            status="ACCEPTED",
            invited_at=datetime.datetime.utcnow(),
            accepted_at=datetime.datetime.utcnow()
        )
        db.add(auth_entry)
    else:
        auth_entry.access_level = invite.access_level
        auth_entry.status = "ACCEPTED"
        auth_entry.revoked_at = None

    db.commit()
    db.refresh(auth_entry)

    return FamilyMemberOut(
        id=auth_entry.id,
        full_name=fam_member.full_name,
        relationship=fam_member.relation_type,
        email=fam_member.email,
        phone=fam_member.phone,
        access_level=auth_entry.access_level,
        status=auth_entry.status,
        invited_at=auth_entry.invited_at
    )

@router.put("/family/{auth_id}", response_model=FamilyMemberOut)
def update_family_member(
    auth_id: int,
    update_data: FamilyAuthUpdate,
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    auth_entry = db.query(FamilyAuthorization).filter(FamilyAuthorization.id == auth_id).first()
    if not auth_entry:
        raise HTTPException(status_code=404, detail="Authorization not found.")

    get_authorized_patient_id(current_user, db, auth_entry.patient_id, required_level="FULL")

    if update_data.access_level:
        auth_entry.access_level = update_data.access_level
    if update_data.status:
        auth_entry.status = update_data.status
        if update_data.status == "REVOKED":
            auth_entry.revoked_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(auth_entry)

    return FamilyMemberOut(
        id=auth_entry.id,
        full_name=auth_entry.family_member.full_name,
        relationship=auth_entry.family_member.relation_type,
        email=auth_entry.family_member.email,
        phone=auth_entry.family_member.phone,
        access_level=auth_entry.access_level,
        status=auth_entry.status,
        invited_at=auth_entry.invited_at
    )


@router.delete("/family/{auth_id}")
def revoke_family_member(
    auth_id: int,
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    auth_entry = db.query(FamilyAuthorization).filter(FamilyAuthorization.id == auth_id).first()
    if not auth_entry:
        raise HTTPException(status_code=404, detail="Authorization record not found.")

    get_authorized_patient_id(current_user, db, auth_entry.patient_id, required_level="FULL")

    auth_entry.status = "REVOKED"
    auth_entry.revoked_at = datetime.datetime.utcnow()
    db.commit()

    return {"status": "success", "message": "Family member authorization has been revoked."}

@router.get("/hospital", response_model=HospitalInfoOut)
def get_patient_hospital_info(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    hosp = patient.hospital
    hosp_name = hosp.name if hosp else "HealthNet Central Hospital"
    branch_name = hosp.branch_name if hosp else "Downtown Campus"
    address = hosp.address if hosp else "100 Medical Center Blvd, Downtown"
    phone = hosp.contact_phone if hosp else "+1-555-0100"
    lat = hosp.lat if hosp else 40.7128
    lng = hosp.lng if hosp else -74.0060

    dept_name = patient.department.name if patient.department else "Intensive Care Unit"
    bed_code = patient.bed.code if patient.bed else "ICU-07"
    room_unit = "Medical ICU, 3rd Floor East Wing"

    return HospitalInfoOut(
        hospital_name=hosp_name,
        branch_name=branch_name,
        address=address,
        general_phone=phone,
        department_name=dept_name,
        room_unit=room_unit,
        bed_code=bed_code,
        visiting_hours="10:00 AM - 8:00 PM Daily (ICU quiet hours 2:00 PM - 4:00 PM)",
        lat=lat,
        lng=lng
    )

@router.get("/ambulance-status", response_model=AmbulanceStatusOut)
def get_patient_ambulance_status(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    case = db.query(EmergencyCase).filter(
        EmergencyCase.assigned_patient_id == pid,
        EmergencyCase.status.in_(["EN_ROUTE", "AMBULANCE_ASSIGNED"])
    ).first()

    if case and case.assigned_ambulance:
        dest_name = case.assigned_ambulance.destination_hospital.name if case.assigned_ambulance.destination_hospital else (patient.hospital.name if patient.hospital else "Central Hospital")
        return AmbulanceStatusOut(
            is_active=True,
            patient_mrn=patient.mrn,
            destination_hospital=dest_name,
            status="EN ROUTE",
            eta_minutes=case.assigned_ambulance.eta_minutes or 6,
            simulated_note="SIMULATED ETA & TRANSIT"
        )


    return AmbulanceStatusOut(
        is_active=False,
        patient_mrn=patient.mrn,
        destination_hospital=patient.hospital.name if patient.hospital else "HealthNet Central Hospital",
        status="NONE",
        eta_minutes=0,
        simulated_note="No active ambulance transport for this patient."
    )

@router.get("/profile", response_model=PatientProfileOut)
def get_patient_profile(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_patient_or_family),
    db: Session = Depends(get_db)
):
    pid = get_authorized_patient_id(current_user, db, patient_id, required_level="BASIC")
    patient = db.query(Patient).filter(Patient.id == pid).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found.")

    pt_acct = db.query(PatientAccount).filter(PatientAccount.patient_id == pid).first()

    contact_name = pt_acct.emergency_contact_name if pt_acct else "Sarah Mehta"
    contact_phone = pt_acct.emergency_contact_phone if pt_acct else "+1-555-0144"
    contact_rel = pt_acct.emergency_contact_relationship if pt_acct else "Daughter"
    lang = pt_acct.preferred_language if pt_acct else "English"
    hosp_name = patient.hospital.name if patient.hospital else "HealthNet Central Hospital"

    return PatientProfileOut(
        full_name=patient.full_name,
        mrn=patient.mrn,
        age=patient.age,
        gender=patient.gender,
        blood_group=patient.blood_group,
        emergency_contact_name=contact_name,
        emergency_contact_phone=contact_phone,
        emergency_contact_relationship=contact_rel,
        preferred_language=lang,
        hospital_name=hosp_name,
        admission_date=patient.admission_date
    )
