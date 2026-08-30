import axios from 'axios';
import {
  Hospital, Branch, Department, Unit, Resource, NetworkSummary, HospitalSummary,
  Bed, Staff, Patient, PatientDetail, PatientVital,
  ClinicalNote, Ambulance, EmergencyCase, HospitalRanking,
  AlertItem, AnalyticsSummary, AuditLogItem,
  NurseDashboardSummary, NursePatient, NursePatientDetail, NursingNote,
  DoctorRequest, ShiftHandover, NurseVitalsFormData, Medication, NurseTask,
  DoctorDashboardSummary, DoctorPatient, DoctorPatientDetail, VitalTrendPoint,
  TimelineEvent, DoctorOrder, PatientTransfer, PatientDischarge, AIRiskReport, LabResult,
  EmergencyCaseCreate, EmergencyCaseDetail, HospitalMatch, BedCandidate, BedReservationRecord,
  AmbulanceCandidate, EmergencyTimelineItem, EmergencyNotificationItem
} from '../types';
import {
  MOCK_HOSPITALS, MOCK_BEDS, MOCK_PATIENTS, MOCK_AMBULANCES,
  MOCK_ALERTS, MOCK_ANALYTICS
} from './mockData';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Request interceptor to attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('healthnet_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      return res.data;
    } catch (e) {
      throw e;
    }
  },
  demoLogin: async (role: string) => {
    try {
      const res = await api.post(`/api/auth/demo-login/${role}`);
      return res.data;
    } catch (e) {
      throw e;
    }
  },
  getMe: async () => {
    const res = await api.get('/api/auth/me');
    return res.data;
  }
};

export const networkAPI = {
  getSummary: async (): Promise<NetworkSummary> => {
    try {
      const res = await api.get('/api/network/summary');
      return res.data;
    } catch (e) {
      console.warn('API fallback for network summary');
      return {
        total_hospitals: 12,
        total_branches: 12,
        total_departments: 96,
        total_beds: 569,
        available_beds: 223,
        occupied_beds: 322,
        reserved_beds: 12,
        cleaning_beds: 12,
        maintenance_beds: 0,
        out_of_service_beds: 0,
        overall_occupancy_rate: 56.6,
        total_icu_beds: 158,
        available_icu_beds: 37,
        occupied_icu_beds: 97,
        icu_occupancy_rate: 61.4,
        total_emergency_beds: 110,
        available_emergency_beds: 55,
        total_ventilators: 96,
        available_ventilators: 68,
        total_monitors: 216,
        available_monitors: 160,
        total_doctors: 30,
        active_doctors: 28,
        total_nurses: 30,
        active_nurses: 30,
        active_emergencies: 1,
        active_ambulances: 1
      };
    }
  },
  getHealthScore: async (): Promise<any> => {
    const res = await api.get('/api/network/health');
    return res.data;
  },
  globalSearch: async (q: string): Promise<any> => {
    const res = await api.get('/api/network/search', { params: { q } });
    return res.data;
  },
  getICUs: async (hospitalId?: number, status?: string): Promise<any[]> => {
    const res = await api.get('/api/network/icus', { params: { hospital_id: hospitalId, status } });
    return res.data;
  }
};

export const hospitalsAPI = {
  getAll: async (): Promise<Hospital[]> => {
    try {
      const res = await api.get('/api/hospitals');
      return res.data;
    } catch (e) {
      console.warn('API fallback for hospitals');
      return MOCK_HOSPITALS;
    }
  },
  getById: async (id: number): Promise<Hospital> => {
    try {
      const res = await api.get(`/api/hospitals/${id}`);
      return res.data;
    } catch (e) {
      return MOCK_HOSPITALS.find(h => h.id === id) || MOCK_HOSPITALS[0];
    }
  },
  getSummary: async (id: number): Promise<HospitalSummary> => {
    try {
      const res = await api.get(`/api/hospitals/${id}/summary`);
      return res.data;
    } catch (e) {
      const h = MOCK_HOSPITALS.find(x => x.id === id) || MOCK_HOSPITALS[0];
      return {
        hospital_id: h.id,
        name: h.name,
        branch_name: h.branch_name,
        code: h.code,
        emergency_status: h.emergency_status,
        total_beds: h.total_beds,
        available_beds: h.available_beds,
        occupied_beds: h.occupied_beds,
        reserved_beds: h.reserved_beds,
        cleaning_beds: h.cleaning_beds,
        maintenance_beds: 0,
        out_of_service_beds: 0,
        overall_occupancy_rate: h.overall_occupancy_rate,
        total_icu_beds: h.icu_capacity,
        available_icu_beds: h.available_icu_beds,
        occupied_icu_beds: h.occupied_icu_beds,
        icu_occupancy_rate: h.icu_occupancy_rate,
        total_emergency_beds: h.er_capacity,
        available_emergency_beds: Math.floor(h.er_capacity / 2),
        ventilators_total: h.ventilators_total,
        ventilators_available: h.ventilators_available,
        ecmo_available: h.ecmo_available,
        doctors_count: h.doctors_on_duty,
        nurses_count: h.nurses_on_duty
      };
    }
  },
  updateEmergencyStatus: async (id: number, status: string) => {
    try {
      const res = await api.patch(`/api/hospitals/${id}/emergency-status`, { status });
      return res.data;
    } catch (e) {
      return { success: true, status };
    }
  },
  create: async (data: Partial<Hospital>) => {
    const res = await api.post('/api/hospitals', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Hospital>) => {
    const res = await api.put(`/api/hospitals/${id}`, data);
    return res.data;
  }
};

export const branchesAPI = {
  getAll: async (): Promise<Branch[]> => {
    try {
      const res = await api.get('/api/branches');
      return res.data;
    } catch (e) {
      return MOCK_HOSPITALS.map(h => ({
        id: h.id,
        hospital_id: h.id,
        hospital_name: h.name,
        name: `${h.name} - ${h.branch_name}`,
        code: `${h.code}-BR`,
        address: h.address,
        lat: h.lat,
        lng: h.lng,
        contact_phone: h.contact_phone,
        emergency_status: h.emergency_status,
        total_beds: h.total_beds,
        available_beds: h.available_beds,
        occupied_beds: h.occupied_beds,
        icu_capacity: h.icu_capacity,
        available_icu_beds: h.available_icu_beds,
        emergency_capacity: h.er_capacity,
        occupancy_rate: h.overall_occupancy_rate,
        department_count: 8
      }));
    }
  },
  getById: async (id: number): Promise<Branch> => {
    const res = await api.get(`/api/branches/${id}`);
    return res.data;
  },
  create: async (data: Partial<Branch>): Promise<Branch> => {
    const res = await api.post('/api/branches', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Branch>): Promise<Branch> => {
    const res = await api.put(`/api/branches/${id}`, data);
    return res.data;
  }
};

export const departmentsAPI = {
  getAll: async (hospitalId?: number): Promise<Department[]> => {
    try {
      const res = await api.get('/api/departments', { params: { hospital_id: hospitalId } });
      return res.data;
    } catch (e) {
      return [];
    }
  },
  getById: async (id: number): Promise<Department> => {
    const res = await api.get(`/api/departments/${id}`);
    return res.data;
  },
  create: async (data: Partial<Department>): Promise<Department> => {
    const res = await api.post('/api/departments', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Department>): Promise<Department> => {
    const res = await api.put(`/api/departments/${id}`, data);
    return res.data;
  }
};

export const unitsAPI = {
  getICUs: async (hospitalId?: number): Promise<Unit[]> => {
    try {
      const res = await api.get('/api/icus', { params: { hospital_id: hospitalId } });
      return res.data;
    } catch (e) {
      return [];
    }
  },
  getWards: async (hospitalId?: number): Promise<Unit[]> => {
    try {
      const res = await api.get('/api/wards', { params: { hospital_id: hospitalId } });
      return res.data;
    } catch (e) {
      return [];
    }
  }
};

export const resourcesAPI = {
  getAll: async (params?: { hospital_id?: number; resource_type?: string; status?: string; search?: string }): Promise<Resource[]> => {
    try {
      const res = await api.get('/api/resources', { params });
      return res.data;
    } catch (e) {
      return [];
    }
  },
  getById: async (id: number): Promise<Resource> => {
    const res = await api.get(`/api/resources/${id}`);
    return res.data;
  },
  create: async (data: Partial<Resource>): Promise<Resource> => {
    const res = await api.post('/api/resources', data);
    return res.data;
  },
  update: async (id: number, data: Partial<Resource>): Promise<Resource> => {
    const res = await api.put(`/api/resources/${id}`, data);
    return res.data;
  }
};

export const bedsAPI = {
  getBeds: async (params?: { hospital_id?: number; department_id?: number; bed_type?: string; status?: string; search?: string }): Promise<Bed[]> => {
    try {
      const res = await api.get('/api/beds', { params });
      return res.data;
    } catch (e) {
      console.warn('API fallback for beds');
      let beds = [...MOCK_BEDS];
      if (params?.status && params.status !== 'ALL') {
        beds = beds.filter(b => b.status === params.status);
      }
      return beds;
    }
  },
  getById: async (id: number): Promise<Bed> => {
    try {
      const res = await api.get(`/api/beds/${id}`);
      return res.data;
    } catch (e) {
      return MOCK_BEDS.find(b => b.id === id) || MOCK_BEDS[0];
    }
  },
  updateStatus: async (bedId: number, status: string, reason?: string, notes?: string, patientId?: number): Promise<Bed> => {
    try {
      const res = await api.put(`/api/beds/${bedId}/status`, {
        status,
        reason,
        notes,
        patient_id: patientId
      });
      return res.data;
    } catch (e) {
      const b = MOCK_BEDS.find(x => x.id === bedId) || MOCK_BEDS[0];
      return { ...b, status: status as any };
    }
  }
};

export const patientsAPI = {
  getAll: async (params?: { hospital_id?: number; doctor_id?: number; nurse_id?: number; status?: string }): Promise<Patient[]> => {
    return patientsAPI.getPatients(params);
  },
  getPatients: async (params?: { hospital_id?: number; doctor_id?: number; nurse_id?: number; status?: string }): Promise<Patient[]> => {
    try {
      const res = await api.get('/api/patients', { params });
      return res.data;
    } catch (e) {
      console.warn('API fallback for patients');
      let pts = [...MOCK_PATIENTS];
      if (params?.status && params.status !== 'ALL') {
        pts = pts.filter(p => p.status === params.status);
      }
      return pts;
    }
  },
  getDetails: async (patientId: number): Promise<PatientDetail> => {
    try {
      const res = await api.get(`/api/patients/${patientId}`);
      return res.data;
    } catch (e) {
      const pt = MOCK_PATIENTS.find(p => p.id === patientId) || MOCK_PATIENTS[0];
      return {
        ...pt,
        medical_history: JSON.stringify(['CAD post-PCI (2022)', 'Hypertension', 'Dyslipidemia']),
        allergies: JSON.stringify(['Penicillin', 'Sulfa drugs']),
        vitals: pt.latest_vitals ? [pt.latest_vitals] : [],
        clinical_notes: [
          {
            id: 1,
            patient_id: pt.id,
            doctor_id: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            note_type: 'SOAP',
            content: 'Subjective: Patient reports resolving substernal chest discomfort.\nObjective: HR 82 regular, BP 120/75, Lungs clear to auscultation.\nAssessment: Improving clinical stability.\nPlan: Continue telemetry, repeat cardiac enzymes in 6h.',
            plan: 'Continue telemetry monitoring, repeat ECG in morning.',
            timestamp: new Date().toISOString()
          }
        ],
        lab_results: [
          {
            id: 1,
            patient_id: pt.id,
            test_name: 'Cardiac Troponin I',
            category: 'CARDIAC',
            value: '4.82',
            unit: 'ng/mL',
            reference_range: '< 0.04',
            status: 'CRITICAL',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            patient_id: pt.id,
            test_name: 'Serum Lactate',
            category: 'CHEMISTRY',
            value: '2.8',
            unit: 'mmol/L',
            reference_range: '0.5 - 2.2',
            status: 'ABNORMAL',
            timestamp: new Date().toISOString()
          }
        ],
        medications: [
          {
            id: 1,
            patient_id: pt.id,
            drug_name: 'Heparin Sodium Drip',
            dosage: '1000 units/hr',
            frequency: 'Continuous IV Infusion',
            route: 'IV',
            status: 'ACTIVE',
            start_date: new Date().toISOString(),
            administered_by: 'Nurse Elena Rostova'
          }
        ],
        nurse_tasks: [
          {
            id: 1,
            patient_id: pt.id,
            hospital_id: 1,
            task_type: 'VITALS',
            description: 'Record Q2H vital signs and pulse oximetry',
            due_time: '14:00',
            is_completed: false
          }
        ],
        ai_risk_evaluation: {
          risk_score: pt.ai_risk_score,
          risk_level: (pt.ai_risk_level === 'CRITICAL' || pt.ai_risk_level === 'HIGH' || pt.ai_risk_level === 'MODERATE') ? pt.ai_risk_level : 'LOW',
          contributing_factors: ['Acute hemodynamic alteration', 'NEWS2 Acuity indicator'],
          news2_score: pt.news2_score,
          recommended_action: 'Maintain continuous 12-lead cardiac telemetry and ICU close observation',
          label: 'Prototype AI Risk Estimate'
        }
      };
    }
  },
  addVitals: async (patientId: number, vitalsData: any): Promise<PatientVital> => {
    try {
      const res = await api.post(`/api/patients/${patientId}/vitals`, vitalsData);
      return res.data;
    } catch (e) {
      return {
        id: Date.now(),
        patient_id: patientId,
        heart_rate: vitalsData.heart_rate,
        systolic_bp: vitalsData.systolic_bp,
        diastolic_bp: vitalsData.diastolic_bp,
        spo2: vitalsData.spo2,
        respiratory_rate: vitalsData.respiratory_rate,
        temperature: vitalsData.temperature,
        pain_score: vitalsData.pain_score || 0,
        consciousness: vitalsData.consciousness || 'ALERT',
        news2_score: 3,
        timestamp: new Date().toISOString(),
        recorded_by_nurse_name: vitalsData.recorded_by_nurse_name || 'Staff Nurse'
      };
    }
  },
  addClinicalNote: async (patientId: number, noteData: any): Promise<ClinicalNote> => {
    try {
      const res = await api.post(`/api/patients/${patientId}/notes`, noteData);
      return res.data;
    } catch (e) {
      return {
        id: Date.now(),
        patient_id: patientId,
        doctor_id: 1,
        doctor_name: 'Dr. Sarah Jenkins',
        note_type: noteData.note_type || 'SOAP',
        content: noteData.content,
        plan: noteData.plan,
        timestamp: new Date().toISOString()
      };
    }
  },
  toggleTask: async (taskId: number, isCompleted: boolean) => {
    try {
      const res = await api.put(`/api/patients/tasks/${taskId}/complete?is_completed=${isCompleted}`);
      return res.data;
    } catch (e) {
      return { success: true, taskId, isCompleted };
    }
  }
};

export const ambulancesAPI = {
  getAll: async (params?: { status?: string; hospital_id?: number }): Promise<Ambulance[]> => {
    try {
      const res = await api.get('/api/ambulances', { params });
      return res.data;
    } catch (e) {
      console.warn('API fallback for ambulances');
      return MOCK_AMBULANCES;
    }
  },
  getById: async (id: number): Promise<Ambulance> => {
    const res = await api.get(`/api/ambulances/${id}`);
    return res.data;
  },
  stepSimulation: async (id: number): Promise<Ambulance> => {
    const res = await api.post(`/api/ambulances/${id}/step-simulation`);
    return res.data;
  },
  triggerArrival: async (id: number): Promise<Ambulance> => {
    const res = await api.post(`/api/ambulances/${id}/arrive`);
    return res.data;
  },
  arrive: async (id: number): Promise<Ambulance> => {
    return ambulancesAPI.triggerArrival(id);
  },
  returnAmbulance: async (id: number): Promise<Ambulance> => {
    const res = await api.post(`/api/ambulances/${id}/return`);
    return res.data;
  },
  confirmArrival: async (ambulanceId: number) => {
    try {
      const res = await api.post(`/api/ambulances/${ambulanceId}/confirm-arrival`);
      return res.data;
    } catch (e) {
      return {
        success: true,
        message: 'Ambulance confirmed arrived! Bed transitioned to OCCUPIED.'
      };
    }
  }
};

export const emergencyAPI = {
  create: async (payload: EmergencyCaseCreate): Promise<EmergencyCaseDetail> => {
    const res = await api.post('/api/emergency', payload);
    return res.data;
  },
  getAll: async (params?: { status?: string; priority?: string; hospital_id?: number; search?: string }): Promise<EmergencyCaseDetail[]> => {
    const res = await api.get('/api/emergency', { params });
    return res.data;
  },
  getById: async (id: number): Promise<EmergencyCaseDetail> => {
    const res = await api.get(`/api/emergency/${id}`);
    return res.data;
  },
  findHospitals: async (id: number): Promise<HospitalMatch[]> => {
    const res = await api.post(`/api/emergency/${id}/find-hospitals`);
    return res.data;
  },
  getMatches: async (id: number): Promise<HospitalMatch[]> => {
    const res = await api.get(`/api/emergency/${id}/matches`);
    return res.data;
  },
  selectHospital: async (id: number, hospital_id: number): Promise<EmergencyCaseDetail> => {
    const res = await api.post(`/api/emergency/${id}/select-hospital`, { hospital_id });
    return res.data;
  },
  getBeds: async (id: number): Promise<BedCandidate[]> => {
    const res = await api.get(`/api/emergency/${id}/beds`);
    return res.data;
  },
  reserveBed: async (id: number, bed_id: number): Promise<BedReservationRecord> => {
    const res = await api.post(`/api/emergency/${id}/reserve-bed`, { bed_id });
    return res.data;
  },
  getAmbulances: async (id: number): Promise<AmbulanceCandidate[]> => {
    const res = await api.get(`/api/emergency/${id}/ambulances`);
    return res.data;
  },
  assignAmbulance: async (id: number, ambulance_id: number): Promise<EmergencyCaseDetail> => {
    const res = await api.post(`/api/emergency/${id}/assign-ambulance`, { ambulance_id });
    return res.data;
  },
  confirmPatientReceived: async (id: number): Promise<EmergencyCaseDetail> => {
    const res = await api.post(`/api/emergency/${id}/patient-received`);
    return res.data;
  },
  completeCase: async (id: number): Promise<EmergencyCaseDetail> => {
    const res = await api.post(`/api/emergency/${id}/complete`);
    return res.data;
  },
  getTimeline: async (id: number): Promise<EmergencyTimelineItem[]> => {
    const res = await api.get(`/api/emergency/${id}/timeline`);
    return res.data;
  },
  getNotifications: async (id: number): Promise<EmergencyNotificationItem[]> => {
    const res = await api.get(`/api/emergency/${id}/notifications`);
    return res.data;
  },
  // Legacy aliases for backwards compatibility
  getCases: async (status?: string): Promise<any[]> => {
    const res = await api.get('/api/emergency', { params: { status } });
    return res.data;
  },
  getCaseById: async (id: number): Promise<any> => {
    const res = await api.get(`/api/emergency/${id}`);
    return res.data;
  },
  findBestHospital: async (intake: any): Promise<any[]> => {
    try {
      const caseDetail = await emergencyAPI.create({
        patient_name: intake.patient_name || 'Emergency Patient',
        patient_age: intake.patient_age || 45,
        patient_gender: intake.patient_gender || 'Male',
        emergency_type: intake.emergency_type || 'CARDIAC',
        priority: intake.priority || 'CRITICAL',
        condition_summary: intake.condition_summary || 'Emergency patient intake',
        required_department: intake.required_department || (intake.required_icu ? 'ICU' : 'EMERGENCY'),
        required_resources: [
          ...(intake.required_icu ? ['ICU bed'] : []),
          ...(intake.required_ventilator ? ['Ventilator'] : []),
          ...(intake.required_oxygen ? ['Oxygen'] : []),
          ...(intake.required_specialist ? [intake.required_specialist] : [])
        ],
        vitals_heart_rate: intake.heart_rate || 90,
        vitals_systolic_bp: intake.systolic_bp || 120,
        vitals_diastolic_bp: intake.diastolic_bp || 80,
        vitals_spo2: intake.spo2 || 95.0,
        vitals_respiratory_rate: intake.respiratory_rate || 18,
        vitals_temperature: 37.0,
        pickup_address: 'City Medical Incident',
        pickup_lat: intake.pickup_lat || 28.6139,
        pickup_lng: intake.pickup_lng || 77.2090
      });
      return caseDetail.matches.map(m => ({
        hospital_id: m.hospital_id,
        hospital_name: m.hospital_name,
        branch_name: m.branch_name,
        code: m.branch_name,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        distance_km: m.distance_km,
        eta_minutes: m.eta_minutes,
        suitability_score: m.suitability_score,
        has_icu_bed: m.icu_available > 0,
        available_icu_beds: m.icu_available,
        has_general_bed: true,
        available_total_beds: m.icu_total,
        has_ventilator: m.ventilators_available > 0,
        has_specialist: true,
        specialist_name: m.specialist_on_duty,
        emergency_status: m.emergency_status,
        criteria_breakdown: {
          distance_score: m.eta_score,
          bed_score: m.resource_score,
          equipment_score: m.resource_score,
          specialist_score: m.clinical_score,
          status_score: m.readiness_score,
          ventilators_available: m.ventilators_available,
          trauma_level: "Level 1"
        }
      }));
    } catch (e) {
      return [];
    }
  },
  reserveAndDispatch: async (payload: any): Promise<any> => {
    return {
      success: true,
      message: 'Bed reserved and ambulance dispatched.'
    };
  }
};

export const alertsAPI = {
  getAll: async (params?: { hospital_id?: number; severity?: string; is_read?: boolean }): Promise<AlertItem[]> => {
    try {
      const res = await api.get('/api/alerts', { params });
      return res.data;
    } catch (e) {
      return MOCK_ALERTS;
    }
  },
  markAsRead: async (alertId: number) => {
    try {
      const res = await api.put(`/api/alerts/${alertId}/read`);
      return res.data;
    } catch (e) {
      return { success: true };
    }
  },
  createAlert: async (data: Partial<AlertItem>) => {
    const res = await api.post('/api/alerts', data);
    return res.data;
  }
};

export const staffAPI = {
  getAll: async (params?: { staff_type?: string; hospital_id?: number; on_duty_status?: string }): Promise<Staff[]> => {
    try {
      const res = await api.get('/api/staff', { params });
      return res.data;
    } catch (e) {
      return [
        {
          id: 1,
          name: 'Dr. Sarah Jenkins',
          employee_code: 'DOC-101',
          staff_type: 'DOCTOR',
          specialization: 'Cardiology',
          hospital_id: 1,
          hospital_name: 'CityCare Central Hospital',
          department_id: 1,
          shift: 'MORNING',
          is_available: true,
          on_duty_status: 'ON_DUTY',
          phone: '+1-555-0181',
          assigned_patients_count: 5
        },
        {
          id: 2,
          name: 'Dr. Michael Chen',
          employee_code: 'DOC-102',
          staff_type: 'DOCTOR',
          specialization: 'Neurology',
          hospital_id: 1,
          hospital_name: 'CityCare Central Hospital',
          department_id: 1,
          shift: 'MORNING',
          is_available: true,
          on_duty_status: 'ON_DUTY',
          phone: '+1-555-0182',
          assigned_patients_count: 3
        },
        {
          id: 3,
          name: 'Nurse Elena Rostova',
          employee_code: 'NUR-201',
          staff_type: 'NURSE',
          specialization: 'ICU Critical Care',
          hospital_id: 1,
          hospital_name: 'CityCare Central Hospital',
          department_id: 1,
          shift: 'MORNING',
          is_available: true,
          on_duty_status: 'ON_DUTY',
          phone: '+1-555-0191',
          assigned_patients_count: 4
        }
      ];
    }
  },
  update: async (staffId: number, data: Partial<Staff>): Promise<Staff> => {
    const res = await api.put(`/api/staff/${staffId}`, data);
    return res.data;
  },
  create: async (data: Partial<Staff>): Promise<Staff> => {
    const res = await api.post('/api/staff', data);
    return res.data;
  }
};

export const analyticsAPI = {
  getSummary: async (): Promise<AnalyticsSummary> => {
    try {
      const res = await api.get('/api/analytics/summary');
      return res.data;
    } catch (e) {
      return MOCK_ANALYTICS;
    }
  },
  getHospitalComparison: async (): Promise<any[]> => {
    try {
      const res = await api.get('/api/analytics/hospital-comparison');
      return res.data;
    } catch (e) {
      return [
        { name: 'CityCare Central', icu_occupancy_rate: 73.3, ward_occupancy_rate: 65.0 },
        { name: 'MetroCare West', icu_occupancy_rate: 54.2, ward_occupancy_rate: 54.7 },
        { name: 'Sunrise Memorial', icu_occupancy_rate: 92.9, ward_occupancy_rate: 89.1 },
        { name: 'St. Jude Health', icu_occupancy_rate: 55.0, ward_occupancy_rate: 47.1 }
      ];
    }
  },
  getDepartmentBreakdown: async (): Promise<any[]> => {
    try {
      const res = await api.get('/api/analytics/department-breakdown');
      return res.data;
    } catch (e) {
      return [
        { department: 'ICU', occupied: 114, available: 42, reserved: 8 },
        { department: 'Emergency', occupied: 38, available: 16, reserved: 4 },
        { department: 'Cardiology', occupied: 62, available: 24, reserved: 6 },
        { department: 'General Ward', occupied: 128, available: 92, reserved: 10 }
      ];
    }
  },
  getTimeseriesTrends: async (): Promise<any> => {
    try {
      const res = await api.get('/api/analytics/timeseries-trends');
      return res.data;
    } catch (e) {
      return {
        hourly_admissions: [
          { hour: '00:00', admissions: 3, emergencies: 2 },
          { hour: '04:00', admissions: 1, emergencies: 1 },
          { hour: '08:00', admissions: 8, emergencies: 5 },
          { hour: '12:00', admissions: 14, emergencies: 8 },
          { hour: '16:00', admissions: 12, emergencies: 7 },
          { hour: '20:00', admissions: 6, emergencies: 4 }
        ],
        ambulance_response_trends: [
          { day: 'Mon', avg_response_mins: 7.8, target_mins: 8.0 },
          { day: 'Tue', avg_response_mins: 8.2, target_mins: 8.0 },
          { day: 'Wed', avg_response_mins: 7.4, target_mins: 8.0 },
          { day: 'Thu', avg_response_mins: 8.9, target_mins: 8.0 },
          { day: 'Fri', avg_response_mins: 8.1, target_mins: 8.0 },
          { day: 'Sat', avg_response_mins: 7.1, target_mins: 8.0 },
          { day: 'Sun', avg_response_mins: 6.9, target_mins: 8.0 }
        ]
      };
    }
  },
  getAuditLogs: async (): Promise<AuditLogItem[]> => {
    try {
      const res = await api.get('/api/audit-logs');
      return res.data;
    } catch (e) {
      return [
        {
          id: 1,
          user_email: 'admin@healthnet.demo',
          action: 'BED_RESERVED',
          entity_type: 'Bed',
          entity_id: '5',
          details: 'Pre-reserved ICU Bed CCC01-ICU-05 for incoming STEMI intake',
          timestamp: new Date().toISOString()
        }
      ];
    }
  }
};

export const nurseAPI = {
  getDashboard: async (): Promise<NurseDashboardSummary> => {
    const res = await api.get('/api/nurse/dashboard');
    return res.data;
  },
  getPatients: async (params?: { status?: string; risk?: string; department_id?: number; bed_id?: number; search?: string }): Promise<NursePatient[]> => {
    const res = await api.get('/api/nurse/patients', { params });
    return res.data;
  },
  getPatientDetail: async (id: number): Promise<NursePatientDetail> => {
    const res = await api.get(`/api/nurse/patients/${id}`);
    return res.data;
  },
  recordVitals: async (patientId: number, vitals: NurseVitalsFormData): Promise<PatientVital> => {
    const res = await api.post(`/api/nurse/patients/${patientId}/vitals`, vitals);
    return res.data;
  },
  addNursingNote: async (patientId: number, content: string, nurseName?: string): Promise<NursingNote> => {
    const res = await api.post(`/api/nurse/patients/${patientId}/notes`, { content, nurse_name: nurseName });
    return res.data;
  },
  getBeds: async (params?: { department_id?: number; status?: string }): Promise<Bed[]> => {
    const res = await api.get('/api/nurse/beds', { params });
    return res.data;
  },
  updateBedStatus: async (bedId: number, status: string, reason?: string, notes?: string): Promise<Bed> => {
    const res = await api.patch(`/api/nurse/beds/${bedId}/status`, { status, reason, notes });
    return res.data;
  },
  getAmbulances: async (): Promise<Ambulance[]> => {
    const res = await api.get('/api/nurse/ambulances');
    return res.data;
  },
  getAmbulanceDetail: async (id: number): Promise<Ambulance> => {
    const res = await api.get(`/api/nurse/ambulances/${id}`);
    return res.data;
  },
  prepareBed: async (ambulanceId: number): Promise<{ ambulance_id: number; bed_id: number; bed_code: string; message: string }> => {
    const res = await api.post(`/api/nurse/ambulances/${ambulanceId}/prepare`);
    return res.data;
  },
  confirmArrival: async (ambulanceId: number): Promise<{ ambulance_id: number; patient_name: string; bed_code?: string; message: string }> => {
    const res = await api.post(`/api/nurse/ambulances/${ambulanceId}/arrival`);
    return res.data;
  },
  getDoctors: async (): Promise<Staff[]> => {
    const res = await api.get('/api/nurse/doctors');
    return res.data;
  },
  requestDoctor: async (data: { patient_id: number; doctor_id?: number; reason: string; priority?: string }): Promise<DoctorRequest> => {
    const res = await api.post('/api/nurse/doctors/request', data);
    return res.data;
  },
  getMedications: async (status?: string): Promise<Medication[]> => {
    const res = await api.get('/api/nurse/medications', { params: { status } });
    return res.data;
  },
  administerMedication: async (medId: number, data?: { administered_by?: string; status?: string; notes?: string }): Promise<Medication> => {
    const res = await api.post(`/api/nurse/medications/${medId}/administer`, data || {});
    return res.data;
  },
  getTasks: async (status?: string): Promise<NurseTask[]> => {
    const res = await api.get('/api/nurse/tasks', { params: { status } });
    return res.data;
  },
  updateTask: async (taskId: number, data: { is_completed?: boolean; description?: string }): Promise<NurseTask> => {
    const res = await api.patch(`/api/nurse/tasks/${taskId}`, data);
    return res.data;
  },
  createTask: async (patientId: number, data: { task_type: string; description: string; due_time: string }): Promise<NurseTask> => {
    const res = await api.post('/api/nurse/tasks', data, { params: { patient_id: patientId } });
    return res.data;
  },
  getAlerts: async (): Promise<AlertItem[]> => {
    const res = await api.get('/api/nurse/alerts');
    return res.data;
  },
  acknowledgeAlert: async (alertId: number): Promise<AlertItem> => {
    const res = await api.post(`/api/nurse/alerts/${alertId}/acknowledge`);
    return res.data;
  },
  getHandovers: async (): Promise<ShiftHandover[]> => {
    const res = await api.get('/api/nurse/handover');
    return res.data;
  },
  createHandover: async (data: Partial<ShiftHandover>): Promise<ShiftHandover> => {
    const res = await api.post('/api/nurse/handover', data);
    return res.data;
  }
};

export const doctorAPI = {
  getDashboard: async (): Promise<DoctorDashboardSummary> => {
    const res = await api.get('/api/doctor/dashboard');
    return res.data;
  },
  getPatients: async (params?: {
    risk?: string;
    status?: string;
    department_id?: number;
    bed_id?: number;
    search?: string;
    sort_by?: string;
  }): Promise<DoctorPatient[]> => {
    const res = await api.get('/api/doctor/patients', { params });
    return res.data;
  },
  getPatientDetail: async (id: number): Promise<DoctorPatientDetail> => {
    const res = await api.get(`/api/doctor/patients/${id}`);
    return res.data;
  },
  getPatientVitals: async (id: number, range?: string): Promise<VitalTrendPoint[]> => {
    const res = await api.get(`/api/doctor/patients/${id}/vitals`, { params: { range } });
    return res.data;
  },
  recordVitals: async (id: number, vitals: Partial<PatientVital>): Promise<PatientVital> => {
    const res = await api.post(`/api/doctor/patients/${id}/vitals`, vitals);
    return res.data;
  },
  getPatientHistory: async (id: number): Promise<any> => {
    const res = await api.get(`/api/doctor/patients/${id}/history`);
    return res.data;
  },
  getPatientLabs: async (id: number): Promise<LabResult[]> => {
    const res = await api.get(`/api/doctor/patients/${id}/labs`);
    return res.data;
  },
  addPatientLab: async (id: number, lab: Partial<LabResult>): Promise<LabResult> => {
    const res = await api.post(`/api/doctor/patients/${id}/labs`, lab);
    return res.data;
  },
  getPatientMedications: async (id: number): Promise<Medication[]> => {
    const res = await api.get(`/api/doctor/patients/${id}/medications`);
    return res.data;
  },
  prescribeMedication: async (id: number, med: Partial<Medication>): Promise<Medication> => {
    const res = await api.post(`/api/doctor/patients/${id}/medications`, med);
    return res.data;
  },
  updateMedication: async (id: number, med: Partial<Medication>): Promise<Medication> => {
    const res = await api.put(`/api/doctor/medications/${id}`, med);
    return res.data;
  },
  discontinueMedication: async (id: number): Promise<{ message: string }> => {
    const res = await api.delete(`/api/doctor/medications/${id}`);
    return res.data;
  },
  getPatientNotes: async (id: number): Promise<ClinicalNote[]> => {
    const res = await api.get(`/api/doctor/patients/${id}/notes`);
    return res.data;
  },
  addPatientNote: async (id: number, note: { note_type: string; content: string; plan?: string }): Promise<ClinicalNote> => {
    const res = await api.post(`/api/doctor/patients/${id}/notes`, note);
    return res.data;
  },
  updatePatientNote: async (id: number, note: { note_type?: string; content?: string; plan?: string }): Promise<ClinicalNote> => {
    const res = await api.put(`/api/doctor/notes/${id}`, note);
    return res.data;
  },
  getPatientAIRisk: async (id: number): Promise<AIRiskReport> => {
    const res = await api.get(`/api/doctor/patients/${id}/risk`);
    return res.data;
  },
  getAlerts: async (): Promise<AlertItem[]> => {
    const res = await api.get('/api/doctor/alerts');
    return res.data;
  },
  acknowledgeAlert: async (alertId: number): Promise<AlertItem> => {
    const res = await api.post(`/api/doctor/alerts/${alertId}/acknowledge`);
    return res.data;
  },
  getIncoming: async (): Promise<Ambulance[]> => {
    const res = await api.get('/api/doctor/incoming');
    return res.data;
  },
  getRequests: async (): Promise<DoctorRequest[]> => {
    const res = await api.get('/api/doctor/requests');
    return res.data;
  },
  acknowledgeRequest: async (requestId: number): Promise<DoctorRequest> => {
    const res = await api.post(`/api/doctor/requests/${requestId}/acknowledge`);
    return res.data;
  },
  getOrders: async (patientId?: number): Promise<DoctorOrder[]> => {
    const res = await api.get('/api/doctor/orders', { params: { patient_id: patientId } });
    return res.data;
  },
  createOrder: async (patientId: number, order: { order_type: string; description: string; priority?: string; notes?: string }): Promise<DoctorOrder> => {
    const res = await api.post('/api/doctor/orders', order, { params: { patient_id: patientId } });
    return res.data;
  },
  requestTransfer: async (patientId: number, data: { to_department_id: number; to_unit_name?: string; reason: string; priority?: string; notes?: string }): Promise<PatientTransfer> => {
    const res = await api.post(`/api/doctor/patients/${patientId}/transfer`, data);
    return res.data;
  },
  dischargePatient: async (patientId: number, data: { reason?: string; discharge_summary: string; instructions?: string }): Promise<PatientDischarge> => {
    const res = await api.post(`/api/doctor/patients/${patientId}/discharge`, data);
    return res.data;
  }
};

export const simulationAPI = {
  getStatus: async (): Promise<any> => {
    const res = await api.get('/api/simulation/status');
    return res.data;
  },
  startPatientSim: async (patientId: number, profile: string = 'DETERIORATING'): Promise<any> => {
    const res = await api.post('/api/simulation/patient/start', { patient_id: patientId, profile });
    return res.data;
  },
  stopPatientSim: async (patientId: number): Promise<any> => {
    const res = await api.post('/api/simulation/patient/stop', { patient_id: patientId });
    return res.data;
  },
  startAmbulanceSim: async (ambulanceId: number): Promise<any> => {
    const res = await api.post('/api/simulation/ambulance/start', { ambulance_id: ambulanceId });
    return res.data;
  },
  stopAmbulanceSim: async (ambulanceId: number): Promise<any> => {
    const res = await api.post('/api/simulation/ambulance/stop', { ambulance_id: ambulanceId });
    return res.data;
  },
  startEmergencyDemo: async (): Promise<any> => {
    const res = await api.post('/api/simulation/emergency-demo/start');
    return res.data;
  },
  resetDemo: async (): Promise<any> => {
    const res = await api.post('/api/simulation/reset');
    return res.data;
  },
  triggerScenario: async (scenario: string, hospitalId?: number): Promise<any> => {
    const res = await api.post('/api/simulation/scenario', { scenario, hospital_id: hospitalId });
    return res.data;
  }
};

export const eventsAPI = {
  getActivityFeed: async (limit: number = 30, eventType?: string, hospitalId?: number): Promise<any[]> => {
    const res = await api.get('/api/events/activity-feed', {
      params: { limit, event_type: eventType, hospital_id: hospitalId }
    });
    return res.data;
  },
  broadcastEvent: async (eventName: string, data: any = {}, hospitalId?: number, channel: string = 'network'): Promise<any> => {
    const res = await api.post('/api/events/broadcast', {
      event_name: eventName,
      data,
      hospital_id: hospitalId,
      channel
    });
    return res.data;
  }
};

export const aiAPI = {
  getDoctorRiskList: async (): Promise<any[]> => {
    const res = await api.get('/api/doctor/ai-risk');
    return res.data;
  },
  getPatientRiskDetail: async (patientId: number): Promise<any> => {
    const res = await api.get(`/api/doctor/patients/${patientId}/ai-risk`);
    return res.data;
  },
  getPatientRiskHistory: async (patientId: number): Promise<any[]> => {
    const res = await api.get(`/api/doctor/patients/${patientId}/ai-risk/history`);
    return res.data;
  },
  getNetworkClinicalStatus: async (): Promise<any> => {
    const res = await api.get('/api/admin/ai/network');
    return res.data;
  },
  getHospitalCapacityScores: async (): Promise<any[]> => {
    const res = await api.get('/api/admin/ai/hospitals');
    return res.data;
  },
  getCapacityOverview: async (): Promise<any> => {
    const res = await api.get('/api/admin/ai/capacity');
    return res.data;
  },
  getForecasts: async (hospitalId?: number): Promise<any> => {
    const res = await api.get('/api/admin/ai/forecast', { params: { hospital_id: hospitalId } });
    return res.data;
  },
  getAIAlerts: async (): Promise<any[]> => {
    const res = await api.get('/api/admin/ai/alerts');
    return res.data;
  },
  startCapacitySimulation: async (scenario: string = 'MASS_CASUALTY'): Promise<any> => {
    const res = await api.post('/api/admin/ai/simulation/start', { scenario });
    return res.data;
  },
  stopCapacitySimulation: async (): Promise<any> => {
    const res = await api.post('/api/admin/ai/simulation/stop');
    return res.data;
  },
  resetCapacitySimulation: async (): Promise<any> => {
    const res = await api.post('/api/admin/ai/simulation/reset');
    return res.data;
  }
};

export const systemAPI = {
  resetDemo: async () => {
    const res = await api.post('/api/system/reset-demo');
    return res.data;
  }
};

export default api;

