"""
Tests for Chest X-Ray AI Classification and Pneumonia Screening API.
"""

import io
from pathlib import Path
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from server.main import app
from server.database import SessionLocal, Base, engine
from server.models import Patient, XRayAnalysis

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Create test patient if needed
    p = db.query(Patient).filter(Patient.mrn == "TEST-MRN-999").first()
    if not p:
        p = Patient(
            mrn="TEST-MRN-999",
            full_name="Test Pneumonia Patient",
            age=45,
            gender="MALE",
            hospital_id=1,
            department_id=1
        )
        db.add(p)
        db.commit()
        db.refresh(p)
    patient_id = p.id
    db.close()
    yield patient_id

def create_synthetic_image(color=(200, 200, 200), size=(224, 224), format="JPEG") -> io.BytesIO:
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf

def test_xray_predict_with_synthetic_image(setup_db):
    patient_id = setup_db
    img_buf = create_synthetic_image()
    
    response = client.post(
        "/api/xray/predict",
        files={"file": ("chest_test.jpg", img_buf, "image/jpeg")},
        data={"patient_id": patient_id, "notes": "Routine pre-op chest screening"}
    )
    
    assert response.status_code == 200, response.text
    data = response.json()
    
    assert "prediction" in data
    assert data["prediction"] in ["NORMAL", "PNEUMONIA"]
    assert "confidence" in data
    assert 0.0 <= data["confidence"] <= 1.0
    assert "normal_probability" in data
    assert "pneumonia_probability" in data
    assert round(data["normal_probability"] + data["pneumonia_probability"], 2) == 1.0
    assert "disclaimer" in data
    assert "not a medical diagnosis" in data["disclaimer"].lower()
    assert data["patient_id"] == patient_id
    assert data["patient_name"] == "Test Pneumonia Patient"
    assert data["record_id"] is not None

def get_sample_path(cls_name: str) -> Path:
    candidates = [
        Path(f"data/chest_xray/test/{cls_name}"),
        Path(f"../data/chest_xray/test/{cls_name}"),
        Path(__file__).resolve().parents[3] / "data" / "chest_xray" / "test" / cls_name
    ]
    for c in candidates:
        if c.exists():
            return c
    return Path(f"data/chest_xray/test/{cls_name}")

def test_xray_predict_with_real_normal_sample():
    normal_sample_path = get_sample_path("NORMAL")
    if not normal_sample_path.exists():
        pytest.skip("Dataset path not found")
        
    sample_files = list(normal_sample_path.glob("*.jpeg"))
    if not sample_files:
        pytest.skip("No normal samples found")
        
    with open(sample_files[0], "rb") as f:
        img_bytes = f.read()
        
    response = client.post(
        "/api/xray/predict",
        files={"file": (sample_files[0].name, io.BytesIO(img_bytes), "image/jpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] in ["NORMAL", "PNEUMONIA"]
    assert data["normal_probability"] > 0.0

def test_xray_predict_with_real_pneumonia_sample():
    pneu_sample_path = get_sample_path("PNEUMONIA")
    if not pneu_sample_path.exists():
        pytest.skip("Dataset path not found")
        
    sample_files = list(pneu_sample_path.glob("*.jpeg"))
    if not sample_files:
        pytest.skip("No pneumonia samples found")
        
    with open(sample_files[0], "rb") as f:
        img_bytes = f.read()
        
    response = client.post(
        "/api/xray/predict",
        files={"file": (sample_files[0].name, io.BytesIO(img_bytes), "image/jpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["prediction"] == "PNEUMONIA"
    assert data["pneumonia_probability"] > 0.5

def test_xray_reject_unsupported_file_extension():
    fake_txt = io.BytesIO(b"This is a text file, not a radiograph.")
    response = client.post(
        "/api/xray/predict",
        files={"file": ("report.txt", fake_txt, "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]

def test_xray_reject_corrupted_image():
    corrupted_data = io.BytesIO(b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01ThisIsCorruptedGarbageData")
    response = client.post(
        "/api/xray/predict",
        files={"file": ("corrupted.jpg", corrupted_data, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "Image decoding failed" in response.json()["detail"]

def test_xray_reject_empty_file():
    empty_buf = io.BytesIO(b"")
    response = client.post(
        "/api/xray/predict",
        files={"file": ("empty.jpg", empty_buf, "image/jpeg")}
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()

def test_xray_history_and_patient_endpoints(setup_db):
    patient_id = setup_db
    
    # Check general history
    res_all = client.get("/api/xray/history")
    assert res_all.status_code == 200
    records = res_all.json()
    assert isinstance(records, list)
    assert len(records) > 0
    
    # Check patient specific history
    res_pt = client.get(f"/api/xray/patient/{patient_id}")
    assert res_pt.status_code == 200
    pt_records = res_pt.json()
    assert isinstance(pt_records, list)
    assert all(r["patient_id"] == patient_id for r in pt_records)
