from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import datetime

from ..database import get_db
from ..models import Alert
from ..schemas import AlertOut, AlertCreate
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/alerts", tags=["alerts"])

@router.get("", response_model=List[AlertOut])
def get_alerts(
    hospital_id: Optional[int] = Query(None),
    severity: Optional[str] = Query(None),
    is_read: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Alert)

    if hospital_id is not None:
        query = query.filter(Alert.hospital_id == hospital_id)
    if severity is not None and severity != "ALL":
        query = query.filter(Alert.severity == severity)
    if is_read is not None:
        query = query.filter(Alert.is_read == is_read)

    alerts = query.order_by(Alert.created_at.desc()).limit(100).all()
    return alerts

@router.put("/{alert_id}/read")
def mark_alert_read(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_read = True
    db.commit()
    return {"message": "Alert marked as read", "alert_id": alert_id}

@router.post("", response_model=AlertOut)
async def create_custom_alert(alert_in: AlertCreate, db: Session = Depends(get_db)):
    new_alert = Alert(
        title=alert_in.title,
        message=alert_in.message,
        alert_type=alert_in.alert_type,
        severity=alert_in.severity,
        hospital_id=alert_in.hospital_id,
        patient_id=alert_in.patient_id,
        target_role=alert_in.target_role,
        created_at=datetime.datetime.utcnow()
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)

    # Broadcast
    await notification_service.broadcast("ALERT_TRIGGERED", {
        "id": new_alert.id,
        "title": new_alert.title,
        "message": new_alert.message,
        "severity": new_alert.severity,
        "alert_type": new_alert.alert_type,
        "hospital_id": new_alert.hospital_id
    })

    return new_alert
