"""
Chest X-Ray Pneumonia AI Screening Router.
Handles image upload, validation, model inference, patient association,
and scan history retrieval.
"""

import os
import uuid
from pathlib import Path
from typing import List, Optional
import datetime
import logging

from fastapi import (
    APIRouter, Depends, HTTPException, UploadFile, File, Form, status, Query
)
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Patient, XRayAnalysis, User, AuditLog
from ..schemas import XRayPredictionResponse, XRayRecordOut
from ..services.xray_service import xray_service
from ..auth import get_current_user

logger = logging.getLogger("healthnet.xray")

router = APIRouter(prefix="/api/xray", tags=["xray"])

# Safe upload storage directory
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "xrays"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Validation constants
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/x-png"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png"}

@router.post("/predict", response_model=XRayPredictionResponse)
async def predict_xray(
    file: UploadFile = File(...),
    patient_id: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    save_record: bool = Form(True),
    db: Session = Depends(get_db)
):
    """
    Accepts an uploaded chest X-ray image, validates it, runs deep learning classification,
    and optionally attaches the diagnostic scan to an existing patient's medical history.
    """
    # 1. Check file presence
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file uploaded. Please provide a chest X-ray image."
        )

    # 2. Validate Extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file extension '{file_ext}'. Allowed formats: JPG, JPEG, PNG."
        )

    # 3. Validate MIME Type
    content_type = file.content_type or ""
    if content_type.lower() not in ALLOWED_MIME_TYPES and not any(ext in file.filename.lower() for ext in [".jpg", ".jpeg", ".png"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported content type '{content_type}'. Allowed types: image/jpeg, image/png."
        )

    # 4. Read File Content with Size Guard
    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(e)}"
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB."
        )

    # 5. Execute Model Inference
    try:
        pred_result = xray_service.predict(content)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image decoding failed: {str(ve)}"
        )
    except RuntimeError as re:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Inference service error: {str(re)}"
        )
    except Exception as e:
        logger.error(f"Unexpected inference error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal error processing chest X-ray image."
        )

    # 6. Verify Patient if supplied
    patient_obj = None
    if patient_id is not None:
        patient_obj = db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found."
            )

    # 7. Safe Image Storage & Database Persistence
    record_id = None
    saved_filename = None
    image_url = None

    if save_record or patient_obj:
        safe_filename = f"xray_{uuid.uuid4().hex}{file_ext}"
        destination_path = UPLOAD_DIR / safe_filename
        try:
            with open(destination_path, "wb") as f:
                f.write(content)
            saved_filename = safe_filename
            image_url = f"/api/xray/images/{safe_filename}"
        except Exception as e:
            logger.warning(f"Failed to persist X-Ray image file: {e}")

        # Create Database Record
        new_analysis = XRayAnalysis(
            patient_id=patient_obj.id if patient_obj else None,
            prediction=pred_result["prediction"],
            confidence=pred_result["confidence"],
            normal_probability=pred_result["normal_probability"],
            pneumonia_probability=pred_result["pneumonia_probability"],
            image_filename=saved_filename,
            image_url=image_url,
            original_filename=Path(file.filename).name,
            notes=notes,
            created_by="Attending Physician",
            created_at=datetime.datetime.utcnow()
        )
        db.add(new_analysis)

        # Add Audit Log
        audit = AuditLog(
            user_email="doctor@hospital.in",
            action="XRAY_AI_SCREENING",
            entity_type="XRAY_ANALYSIS",
            entity_id=str(patient_obj.id) if patient_obj else "ANONYMOUS",
            details=f"Chest X-Ray analyzed: {pred_result['prediction']} ({round(pred_result['confidence']*100, 1)}% confidence) for {patient_obj.full_name if patient_obj else 'Unlinked Scan'}"
        )
        db.add(audit)
        db.commit()
        db.refresh(new_analysis)
        record_id = new_analysis.id

    return XRayPredictionResponse(
        prediction=pred_result["prediction"],
        confidence=pred_result["confidence"],
        normal_probability=pred_result["normal_probability"],
        pneumonia_probability=pred_result["pneumonia_probability"],
        model_version=pred_result.get("model_version", "1.0.0"),
        architecture=pred_result.get("architecture", "efficientnet_b0"),
        disclaimer=pred_result["disclaimer"],
        record_id=record_id,
        patient_id=patient_obj.id if patient_obj else None,
        patient_name=patient_obj.full_name if patient_obj else None,
        patient_mrn=patient_obj.mrn if patient_obj else None,
        image_url=image_url
    )

@router.get("/history", response_model=List[XRayRecordOut])
def get_xray_history(
    patient_id: Optional[int] = Query(None),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """
    Retrieves chronological X-Ray scan history with patient details.
    """
    query = db.query(XRayAnalysis)
    if patient_id is not None:
        query = query.filter(XRayAnalysis.patient_id == patient_id)

    records = query.order_by(XRayAnalysis.created_at.desc()).limit(limit).all()

    results = []
    for r in records:
        results.append(XRayRecordOut(
            id=r.id,
            patient_id=r.patient_id,
            patient_name=r.patient.full_name if r.patient else "Unlinked Scan",
            patient_mrn=r.patient.mrn if r.patient else None,
            prediction=r.prediction,
            confidence=r.confidence,
            normal_probability=r.normal_probability,
            pneumonia_probability=r.pneumonia_probability,
            image_filename=r.image_filename,
            image_url=r.image_url or (f"/api/xray/images/{r.image_filename}" if r.image_filename else None),
            original_filename=r.original_filename,
            notes=r.notes,
            created_by=r.created_by,
            created_at=r.created_at
        ))
    return results

@router.get("/patient/{patient_id}", response_model=List[XRayRecordOut])
def get_patient_xrays(patient_id: int, db: Session = Depends(get_db)):
    """
    Returns all X-Ray analyses performed for a specific patient.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    records = db.query(XRayAnalysis).filter(
        XRayAnalysis.patient_id == patient_id
    ).order_by(XRayAnalysis.created_at.desc()).all()

    return [
        XRayRecordOut(
            id=r.id,
            patient_id=r.patient_id,
            patient_name=patient.full_name,
            patient_mrn=patient.mrn,
            prediction=r.prediction,
            confidence=r.confidence,
            normal_probability=r.normal_probability,
            pneumonia_probability=r.pneumonia_probability,
            image_filename=r.image_filename,
            image_url=r.image_url or (f"/api/xray/images/{r.image_filename}" if r.image_filename else None),
            original_filename=r.original_filename,
            notes=r.notes,
            created_by=r.created_by,
            created_at=r.created_at
        )
        for r in records
    ]

@router.get("/images/{filename}")
def get_xray_image(filename: str):
    """
    Safely serves stored chest radiograph images with strict path traversal protection.
    """
    # Path traversal protection
    clean_name = Path(filename).name
    if clean_name != filename or ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename requested.")

    file_path = UPLOAD_DIR / clean_name
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Requested image not found.")

    ext = file_path.suffix.lower()
    media_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
    return FileResponse(path=str(file_path), media_type=media_type)
