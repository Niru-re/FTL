# HEALTHNET: City-Wide Intelligent Hospital & Emergency Resource Network

> **"Connected Care. Smarter Response."**
> Hackathon Prototype Edition (2026)

HealthNet connects 12 hospital branches across a metropolitan network, providing real-time telemetry, 300+ tracked ICU & Ward beds, background physiological vitals simulation, intelligent emergency routing algorithms, and 3 dedicated role-based dashboards (Nurse, Doctor, Admin).

---

## 🚀 Quick Start Guide

### 1. Backend Startup (Python / FastAPI)

Ensure Python 3.10+ is installed.

```bash
# Navigate to the server root
cd d:/FTL2/healthnet

# Start the FastAPI server (auto-seeds 12 hospitals, 500+ beds, staff, and ambulances on initial boot)
uvicorn server.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at:
- **API Root**: `http://127.0.0.1:8000/`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Real-Time WebSocket Bus**: `ws://127.0.0.1:8000/ws`

---

### 2. Frontend Startup (React / Vite / TypeScript)

```bash
# Navigate to the client directory
cd d:/FTL2/healthnet/client

# Install dependencies (already installed)
npm install

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

---

## 🩺 Core Workflows

### WORKFLOW 1: Nurse Operations
1. Click **"Nurse Demo"** on the login page.
2. View the assigned patient census, active alerts, and pending tasks.
3. Click on a patient or click **"Record Vitals"** to update physiological parameters (HR, BP, SpO2, Temp, RR) with real-time NEWS2 calculation.
4. Monitor incoming ambulances with live ETA countdown.
5. Click **"Confirm Patient Arrival"** to transition the ambulance to `ARRIVED` and the reserved bed to `OCCUPIED`.

### WORKFLOW 2: Doctor Clinical Workstation
1. Click **"Doctor Demo"** on the login page.
2. Open any patient to access the clinical workstation.
3. Observe live simulated **ECG Waveform Canvas** (Lead II) and real-time hemodynamic parameters.
4. Review **Prototype AI Risk Estimate** (composite risk score %, severity tier, and key contributing physiological factors).
5. Compose and save new **SOAP Progress Notes**.
6. Switch to the **Live Telemetry Wall** (`/doctor/monitoring`) for a multi-bed ICU monitor view.

### WORKFLOW 3: Admin Command Center & Bed Matrix
1. Click **"Admin Demo"** on the login page.
2. View top KPI cards (Total Beds, Available ICU, ICU Occupancy Rate, Active Ambulances, Critical Patients).
3. Interact with the **City-Wide Leaflet Map**:
   - Hospitals are color-coded by ICU load (<70% Green, 70-89% Amber, ≥90% / Divert Red).
   - Ambulances are displayed with live coordinates and destination badges.
   - Click any hospital marker to open the slide-over resource inspector.
4. Navigate to **Beds & Resources** (`/admin/beds`) to filter and execute state transitions (`AVAILABLE` ⇄ `RESERVED` ⇄ `OCCUPIED` ⇄ `CLEANING`).

### WORKFLOW 4: Emergency Triage & Intelligent Routing
1. Click the **"⚡ EMERGENCY INTAKE"** button in the top navigation bar.
2. **Step 1**: Enter patient condition, priority (RED/YELLOW/GREEN), field vitals, and required resources (ICU Bed, Ventilator, Oxygen, Cardiologist/Neurologist/Trauma specialist).
3. Click **"FIND BEST HOSPITAL"**.
4. **Step 2**: The multi-factor Routing Engine ranks all 12 connected hospitals with a **0–100 Suitability Score** based on Distance, ETA, ICU availability, equipment, specialist on duty, and hospital surge/divert status.
5. Click **"RESERVE BED & DISPATCH AMBULANCE"**.
6. The system transitions the bed to `RESERVED`, dispatches an ambulance with live ETA countdown, broadcasts real-time alerts across all nurse/doctor dashboards, and updates upon arrival to `OCCUPIED`.

---

## 🏛️ System Architecture

- **Backend**: Python, FastAPI, SQLAlchemy ORM, SQLite database (`healthnet.db`), Pydantic v2 schemas.
- **Real-Time Layer**: WebSocket server (`/ws`) broadcasting state changes (`BED_STATUS_CHANGED`, `PATIENT_VITALS_UPDATED`, `AMBULANCE_LOCATION_UPDATED`, `EMERGENCY_CASE_CREATED`, `AMBULANCE_ARRIVED`).
- **Telemetry Simulator**: Background async service generating physiological vitals fluctuations and GPS ambulance transit.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, React-Leaflet.
