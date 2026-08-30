import pytest
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_admin_login_success():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "admin123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "ADMIN"

def test_doctor_login_success():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "doctor@healthnet.demo", "password": "doctor123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "DOCTOR"

def test_nurse_login_success():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nurse@healthnet.demo", "password": "nurse123"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["role"] == "NURSE"

def test_invalid_password():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo", "password": "wrongpassword"})
    assert res.status_code == 401

def test_invalid_email():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "nonexistent@healthnet.demo", "password": "password"})
    assert res.status_code == 401

def test_missing_credentials():
    res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "admin@healthnet.demo"})
    assert res.status_code == 422
