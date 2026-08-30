# HEALTHNET: City-Wide Intelligent Hospital & Emergency Resource Network

> **"Connected Care. Smarter Response."**
> Hackathon Prototype Edition (2026)

HealthNet connects 12 hospital branches across a metropolitan network, providing real-time telemetry, 300+ tracked ICU & Ward beds, background physiological vitals simulation, intelligent emergency routing algorithms, and 3 dedicated role-based dashboards (Nurse, Doctor, Admin).

---

## 🚀 Quick Start Guide

### 1. Backend Startup (Python / FastAPI)

```bash
# From workspace root
cd healthnet

# Start FastAPI server
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:
- **API Root**: `http://127.0.0.1:8000/`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Real-Time WebSocket Bus**: `ws://127.0.0.1:8000/ws`

---

### 2. Frontend Startup (React / Vite / TypeScript)

```bash
# In a second terminal
cd healthnet/client

# Start Vite dev server
npm run dev
```

Open your browser at:
**`http://localhost:5173/`**

---

## 🔑 Demo Login Accounts

The login page contains **1-Click Demo Login Buttons** for all 3 application roles:

| Role | Demo Email | Demo Password | Primary Responsibilities |
|---|---|---|---|
| **Nurse** | `nurse@healthnet.demo` | `nurse123` | Inpatient census, Vitals recording, Medication schedules, Incoming ambulance triage & Arrival Confirmation |
| **Doctor** | `doctor@healthnet.demo` | `doctor123` | Attending clinical EHR, Dynamic ECG waveform, NEWS2 & Prototype AI Risk assessment, SOAP progress notes |
| **Admin** | `admin@healthnet.demo` | `admin123` | Metropolitan Command Center, Interactive City Map, Hospital & Bed capacity matrix, Staff rosters, Emergency Routing Engine |
