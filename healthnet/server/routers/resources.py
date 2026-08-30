import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..database import get_db
from ..models import Resource, Hospital, Branch, Department, AuditLog, User
from ..schemas import ResourceOut, ResourceCreate, ResourceUpdate
from ..auth import get_current_user, require_admin
from ..services.notification_service import notification_service

router = APIRouter(prefix="/api/resources", tags=["resources"])

def serialize_resource(r: Resource, db: Session) -> ResourceOut:
    hosp = r.hospital or db.query(Hospital).filter(Hospital.id == r.hospital_id).first()
    branch = r.branch or (db.query(Branch).filter(Branch.id == r.branch_id).first() if r.branch_id else None)
    
    in_use = max(0, r.quantity - r.available_quantity)
    maintenance = 1 if r.status == "MAINTENANCE" else 0

    return ResourceOut(
        id=r.id,
        resource_id=r.resource_id,
        hospital_id=r.hospital_id,
        branch_id=r.branch_id or r.hospital_id,
        hospital_name=hosp.name if hosp else None,
        branch_name=branch.name if branch else (hosp.branch_name if hosp else None),
        resource_type=r.resource_type,
        name=r.name,
        quantity=r.quantity,
        available_quantity=r.available_quantity,
        in_use_quantity=in_use,
        maintenance_quantity=maintenance,
        status=r.status,
        created_at=r.created_at
    )

@router.get("", response_model=List[ResourceOut])
def get_all_resources(
    hospital_id: Optional[int] = Query(None),
    resource_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Resource)

    if hospital_id is not None:
        query = query.filter(Resource.hospital_id == hospital_id)
    if resource_type is not None and resource_type != "ALL":
        query = query.filter(Resource.resource_type == resource_type)
    if status is not None and status != "ALL":
        query = query.filter(Resource.status == status)
    if search:
        search_clean = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Resource.name.ilike(search_clean),
                Resource.resource_id.ilike(search_clean),
                Resource.resource_type.ilike(search_clean)
            )
        )

    resources = query.order_by(Resource.hospital_id.asc(), Resource.id.asc()).all()
    return [serialize_resource(r, db) for r in resources]

@router.get("/{resource_id}", response_model=ResourceOut)
def get_resource_by_id(resource_id: int, db: Session = Depends(get_db)):
    res = db.query(Resource).filter(Resource.id == resource_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    return serialize_resource(res, db)

@router.post("", response_model=ResourceOut)
def create_resource(
    res_in: ResourceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    existing = db.query(Resource).filter(Resource.resource_id == res_in.resource_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Resource ID already exists")

    new_res = Resource(**res_in.model_dump())
    db.add(new_res)
    db.commit()
    db.refresh(new_res)

    audit = AuditLog(
        user_email=current_user.email,
        action="RESOURCE_CREATE",
        entity_type="RESOURCE",
        entity_id=str(new_res.id),
        details=f"Created resource {new_res.name} ({new_res.resource_id})"
    )
    db.add(audit)
    db.commit()

    return serialize_resource(new_res, db)

def handle_resource_update(
    res_id: int,
    res_update: ResourceUpdate,
    db: Session,
    user_email: str = "admin@healthnet.demo"
) -> ResourceOut:
    res = db.query(Resource).filter(Resource.id == res_id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")

    old_status = res.status
    old_avail = res.available_quantity

    for field, value in res_update.model_dump(exclude_unset=True).items():
        setattr(res, field, value)

    # Ensure available_quantity doesn't exceed total quantity
    if res.available_quantity > res.quantity:
        res.available_quantity = res.quantity

    # If status is set to IN_USE, decrease available quantity if at max
    if res.status == "IN_USE" and old_status != "IN_USE" and res.available_quantity == res.quantity:
        res.available_quantity = max(0, res.quantity - 1)
    elif res.status == "AVAILABLE" and old_status == "IN_USE":
        res.available_quantity = res.quantity

    # If this is a Ventilator, keep hospital model's ventilator count in sync
    if res.resource_type == "Ventilator":
        hosp = db.query(Hospital).filter(Hospital.id == res.hospital_id).first()
        if hosp:
            hosp.ventilators_available = res.available_quantity
            hosp.ventilators_total = res.quantity

    audit = AuditLog(
        user_email=user_email,
        action="RESOURCE_UPDATE",
        entity_type="RESOURCE",
        entity_id=str(res.id),
        details=f"Updated resource {res.name}: status {old_status}->{res.status}, avail {old_avail}->{res.available_quantity}"
    )
    db.add(audit)
    db.commit()
    db.refresh(res)

    res_out = serialize_resource(res, db)

    # Check for resource shortage alert
    if res.available_quantity == 0:
        shortage_alert = Alert(
            title=f"CRITICAL RESOURCE SHORTAGE — {res.name}",
            message=f"{res.name} ({res.resource_type}) at {res.hospital.name if res.hospital else 'Hospital'} has reached 0 available reserve! Emergency diverts may apply.",
            alert_type="RESOURCE_SHORTAGE",
            severity="CRITICAL",
            hospital_id=res.hospital_id,
            target_role="ALL"
        )
        db.add(shortage_alert)
        db.commit()

        notification_service.broadcast_sync("ALERT_CREATED", {
            "alert_id": shortage_alert.id,
            "title": shortage_alert.title,
            "message": shortage_alert.message,
            "severity": "CRITICAL",
            "hospital_id": res.hospital_id
        })

    # Broadcast dual events for consistency
    event_data = {
        "resource_id": res.id,
        "name": res.name,
        "resource_type": res.resource_type,
        "hospital_id": res.hospital_id,
        "status": res.status,
        "available_quantity": res.available_quantity,
        "quantity": res.quantity
    }
    notification_service.broadcast_sync("RESOURCE_STATUS_CHANGED", event_data)
    notification_service.broadcast_sync("RESOURCE_UPDATED", event_data)

    return res_out

@router.patch("/{resource_id}", response_model=ResourceOut)
def patch_resource(
    resource_id: int,
    res_update: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user_email = current_user.email if current_user else "admin@healthnet.demo"
    return handle_resource_update(resource_id, res_update, db, user_email)

@router.put("/{resource_id}", response_model=ResourceOut)
def put_resource(
    resource_id: int,
    res_update: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    user_email = current_user.email if current_user else "admin@healthnet.demo"
    return handle_resource_update(resource_id, res_update, db, user_email)
