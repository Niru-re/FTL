import os
import json
import logging
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import engine, Base, get_db, SessionLocal, ensure_hospital_schema
from .models import Hospital
from .seed_data import seed_database
from .services.notification_service import notification_service
from .services.telemetry_simulator import telemetry_simulator
from .services.xray_service import xray_service
from .services.websocket_manager import websocket_manager

from .routers import (
    auth, hospitals, beds, patients, ambulances, emergency, alerts, users, analytics, resources, nurse, doctor, simulation, ai, xray
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("healthnet.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting HealthNet Server...")
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    ensure_hospital_schema()

    # Pre-load AI inference models
    try:
        xray_service.load_model()
    except Exception as e:
        logger.warning(f"X-Ray model preload note: {e}")

    # Check if database needs seeding
    db = SessionLocal()
    try:
        hosp_count = db.query(Hospital).count()
        if hosp_count < 10:
            logger.info("Empty or incomplete database detected. Seeding initial network dummy data...")
            seed_database()
        else:
            logger.info(f"Database already initialized with {hosp_count} hospitals.")
    finally:
        db.close()

    # Start background telemetry simulator
    await telemetry_simulator.start()

    yield

    # Shutdown
    logger.info("Shutting down HealthNet Server...")
    await telemetry_simulator.stop()

app = FastAPI(
    title="HealthNet API",
    description="City-Wide Intelligent Hospital & Emergency Resource Network API",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
# In production, ALLOWED_ORIGINS should be set as a comma-separated env var,
# e.g. "https://carebridge.vercel.app,https://your-preview-url.vercel.app"
# Wildcard + credentials is rejected by browsers, so we use explicit origins.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "")
_explicit_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Always allow localhost for local development
_dev_origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

CORS_ORIGINS = _explicit_origins if _explicit_origins else ["*"]
# If explicit origins are provided, also include dev origins
if _explicit_origins:
    CORS_ORIGINS = list(set(_explicit_origins + _dev_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(nurse.router)
app.include_router(doctor.router)
app.include_router(hospitals.router)
app.include_router(beds.router)
app.include_router(resources.router)
app.include_router(patients.router)
app.include_router(ambulances.router)
app.include_router(emergency.router)
app.include_router(alerts.router)
app.include_router(users.router)
app.include_router(users.users_router)
app.include_router(users.audit_router)
app.include_router(analytics.router)
app.include_router(simulation.router)
app.include_router(simulation.events_router)
app.include_router(ai.router)
app.include_router(xray.router)

# WebSocket Endpoints (Supporting both /api/ws and /ws with JWT authentication)
async def handle_websocket_connection(websocket: WebSocket, token: Optional[str] = None):
    ctx = await websocket_manager.connect(websocket, token)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue

            try:
                msg = json.loads(data)
                action = msg.get("action")
                if action == "subscribe" and "channel" in msg:
                    websocket_manager.subscribe_channel(websocket, msg["channel"])
                    await websocket.send_text(json.dumps({"event": "SUBSCRIBED", "channel": msg["channel"]}))
                elif action == "unsubscribe" and "channel" in msg:
                    websocket_manager.unsubscribe_channel(websocket, msg["channel"])
                    await websocket.send_text(json.dumps({"event": "UNSUBSCRIBED", "channel": msg["channel"]}))
                elif action == "ping":
                    await websocket.send_text(json.dumps({"event": "pong"}))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection closed: {e}")
        websocket_manager.disconnect(websocket)

@app.websocket("/api/ws")
async def api_websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    await handle_websocket_connection(websocket, token)

@app.websocket("/ws")
async def root_websocket_endpoint(websocket: WebSocket, token: Optional[str] = None):
    await handle_websocket_connection(websocket, token)

# System maintenance / reset endpoint
@app.post("/api/system/reset-demo")
def reset_demo_data():
    """
    Resets the database back to clean initial demo state with all 12 hospitals, 300+ beds, etc.
    """
    seed_database()
    return {"message": "Demo data reset successfully!"}

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "HEALTHNET Foundation API",
        "version": "1.0.0",
        "timestamp": os.environ.get("TZ", "UTC")
    }

@app.get("/api/branches")
def get_branches(db: Session = Depends(get_db)):
    from .models import Hospital
    hospitals = db.query(Hospital).all()
    return [
        {
            "id": h.id,
            "hospital_id": h.id,
            "name": h.name,
            "branch_name": h.branch_name,
            "code": h.code,
            "address": h.address,
            "lat": h.lat,
            "lng": h.lng,
            "emergency_status": h.emergency_status,
            "icu_capacity": h.icu_capacity,
            "ward_capacity": h.ward_capacity,
            "er_capacity": h.er_capacity,
            "contact_phone": h.contact_phone
        }
        for h in hospitals
    ]

@app.get("/api/departments")
def get_all_departments(db: Session = Depends(get_db)):
    from .models import Department
    departments = db.query(Department).all()
    return [
        {
            "id": d.id,
            "hospital_id": d.hospital_id,
            "hospital_name": d.hospital.name if d.hospital else None,
            "name": d.name,
            "code": d.code,
            "floor": d.floor,
            "head_doctor_name": d.head_doctor_name
        }
        for d in departments
    ]

@app.get("/")
def root():
    return {
        "system": "HEALTHNET - City-Wide Intelligent Hospital & Emergency Resource Network",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "docs": "/docs",
        "roles": ["ADMIN", "DOCTOR", "NURSE"]
    }

