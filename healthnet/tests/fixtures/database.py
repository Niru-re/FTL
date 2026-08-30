import os
import requests
from server.database import SessionLocal, engine, Base
from server.models import User, Hospital, Branch, Department, Bed, Resource, Patient, Ambulance, EmergencyCase, Alert, AuditLog
from server.seed_data import seed_database

BASE_URL = "http://127.0.0.1:8000"

def reset_test_database():
    """Resets the application state to a clean, deterministic baseline."""
    token = get_admin_token()
    res = requests.post(f"{BASE_URL}/api/simulation/reset", headers={"Authorization": f"Bearer {token}"})
    return res.status_code == 200

def get_test_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_admin_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    if res.status_code == 200:
        return res.json()["access_token"]
    raise RuntimeError(f"Admin auth failed: {res.text}")

def get_doctor_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "doctor@healthnet.demo", "password": "doctor123"})
    if res.status_code == 200:
        return res.json()["access_token"]
    raise RuntimeError(f"Doctor auth failed: {res.text}")

def get_nurse_token():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nurse@healthnet.demo", "password": "nurse123"})
    if res.status_code == 200:
        return res.json()["access_token"]
    raise RuntimeError(f"Nurse auth failed: {res.text}")
