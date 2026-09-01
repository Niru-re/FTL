export type UserRole = 'ADMIN' | 'DOCTOR' | 'NURSE';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  hospital_id?: number | null;
  hospital_name?: string | null;
  department?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export type EmergencyStatus = 'NORMAL' | 'DIVERT' | 'SURGE' | 'CLOSED';

export interface Hospital {
  id: number;
  name: string;
  branch_name: string;
  code: string;
  address: string;
  city?: string;
  zone?: string;
  service_area?: string;
  hospital_type?: string;
  services?: string[];
  contact_person?: string;
  email?: string;
  total_staff?: number;
  doctors_count?: number;
  nurses_count?: number;
  ambulance_count?: number;
  ambulances_available?: number;
  bed_occupancy_rate?: number;
  lat: number;
  lng: number;
  total_beds: number;
  icu_capacity: number;
  ward_capacity: number;
  er_capacity: number;
  ventilators_total: number;
  ventilators_available: number;
  ecmo_available: boolean;
  trauma_level: string;
  emergency_status: EmergencyStatus;
  contact_phone: string;
  created_at: string;
  occupied_beds: number;
  available_beds: number;
  reserved_beds: number;
  cleaning_beds: number;
  occupied_icu_beds: number;
  available_icu_beds: number;
  icu_occupancy_rate: number;
  overall_occupancy_rate: number;
  doctors_on_duty: number;
  nurses_on_duty: number;
  active_alerts_count: number;
}

export type BedType = 'ICU' | 'EMERGENCY' | 'GENERAL' | 'ISOLATION' | 'SURGICAL_STEPDOWN';
export type BedStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export interface Bed {
  id: number;
  code: string;
  hospital_id: number;
  hospital_name?: string | null;
  branch_name?: string | null;
  department_id: number;
  department_name?: string | null;
  bed_type: BedType;
  status: BedStatus;
  patient_id?: number | null;
  patient_name?: string | null;
  patient_mrn?: string | null;
  patient_diagnosis?: string | null;
  doctor_name?: string | null;
  nurse_name?: string | null;
  equipment: string; // JSON string array
  last_cleaned_at?: string | null;
  notes?: string | null;
}

export interface Staff {
  id: number;
  user_id?: number | null;
  staff_type: 'DOCTOR' | 'NURSE';
  name: string;
  employee_code: string;
  specialization: string;
  hospital_id: number;
  hospital_name?: string | null;
  department_id: number;
  department_name?: string | null;
  shift: 'MORNING' | 'EVENING' | 'NIGHT';
  is_available: boolean;
  phone: string;
  on_duty_status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_CALL';
  assigned_patients_count: number;
}

export type PatientStatus = 'CRITICAL' | 'HIGH_RISK' | 'STABLE' | 'DISCHARGED';
export type TriagePriority = 'RED' | 'YELLOW' | 'GREEN';

export interface PatientVital {
  id: number;
  patient_id: number;
  timestamp: string;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  spo2: number;
  respiratory_rate: number;
  temperature: number;
  pain_score: number;
  consciousness: 'ALERT' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE';
  news2_score: number;
  recorded_by_nurse_name: string;
}

export interface ClinicalNote {
  id: number;
  patient_id: number;
  doctor_id?: number | null;
  doctor_name: string;
  timestamp: string;
  note_type: 'ADMISSION' | 'PROGRESS' | 'SOAP' | 'DISCHARGE';
  content: string;
  plan?: string | null;
}

export interface LabResult {
  id: number;
  patient_id: number;
  test_name: string;
  category: string;
  value: string;
  unit: string;
  reference_range: string;
  status: 'NORMAL' | 'ABNORMAL' | 'CRITICAL' | 'HIGH' | 'LOW';
  timestamp: string;
}

export type MedicationStatus = 'ACTIVE' | 'PENDING' | 'ADMINISTERED' | 'SKIPPED' | 'MISSED' | 'COMPLETED' | 'HELD' | 'DISCONTINUED';

export interface Medication {
  id: number;
  patient_id: number;
  drug_name: string;
  dosage: string;
  frequency: string;
  route: string;
  status: MedicationStatus;
  start_date: string;
  administered_by: string;
}

export interface NurseTask {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  bed_code?: string | null;
  nurse_id?: number | null;
  hospital_id: number;
  task_type: 'VITALS' | 'MEDICATION' | 'IV_CHECK' | 'BED_PREP' | 'TRANSFER' | 'HANDOVER';
  description: string;
  due_time: string;
  is_completed: boolean;
  completed_at?: string | null;
}

export interface AIRiskEvaluation {
  risk_score: number; // 0-100
  risk_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  contributing_factors: string[];
  news2_score: number;
  recommended_action: string;
  label: string; // "Prototype AI Risk Estimate"
}

export interface Patient {
  id: number;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string;
  admission_date: string;
  discharge_date?: string | null;
  status: PatientStatus;
  triage_priority: TriagePriority;
  assigned_doctor_id?: number | null;
  assigned_doctor_name?: string | null;
  assigned_nurse_id?: number | null;
  assigned_nurse_name?: string | null;
  assigned_bed_id?: number | null;
  bed_code?: string | null;
  hospital_id: number;
  hospital_name?: string | null;
  department_id: number;
  department_name?: string | null;
  diagnosis: string;
  latest_vitals?: PatientVital | null;
  news2_score: number;
  ai_risk_score: number;
  ai_risk_level: string;
}

export interface PatientDetail extends Patient {
  medical_history: string;
  allergies: string;
  vitals: PatientVital[];
  clinical_notes: ClinicalNote[];
  lab_results: LabResult[];
  medications: Medication[];
  nurse_tasks: NurseTask[];
  ai_risk_evaluation?: AIRiskEvaluation | null;
}

export type AmbulanceStatus = 'AVAILABLE' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'TRANSPORTING' | 'RETURNING';

export interface Ambulance {
  id: number;
  code: string;
  vehicle_number: string;
  driver_name: string;
  paramedic_name: string;
  phone: string;
  status: AmbulanceStatus;
  lat: number;
  lng: number;
  destination_hospital_id?: number | null;
  destination_hospital_name?: string | null;
  current_patient_id?: number | null;
  current_patient_name?: string | null;
  assigned_emergency_case_id?: number | null;
  assigned_bed_id?: number | null;
  assigned_bed_code?: string | null;
  assigned_doctor_name?: string | null;
  eta_minutes: number;
  speed_kmh: number;
  equipment: string;
}

export interface EmergencyCase {
  id: number;
  case_number: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  condition_summary: string;
  priority: TriagePriority;
  required_icu: boolean;
  required_ventilator: boolean;
  required_oxygen: boolean;
  required_specialist: string;
  required_er: boolean;
  initial_vitals: string;
  pickup_lat: number;
  pickup_lng: number;
  assigned_hospital_id?: number | null;
  assigned_hospital_name?: string | null;
  assigned_ambulance_id?: number | null;
  assigned_ambulance_code?: string | null;
  assigned_bed_id?: number | null;
  assigned_bed_code?: string | null;
  status: 'TRIAGING' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'ADMITTED' | 'CANCELLED';
  created_at: string;
  arrived_at?: string | null;
}

export interface HospitalRanking {
  hospital_id: number;
  hospital_name: string;
  branch_name: string;
  code: string;
  address: string;
  lat: number;
  lng: number;
  distance_km: number;
  eta_minutes: number;
  suitability_score: number;
  has_icu_bed: boolean;
  available_icu_beds: number;
  has_general_bed: boolean;
  available_total_beds: number;
  has_ventilator: boolean;
  has_specialist: boolean;
  specialist_name?: string | null;
  emergency_status: EmergencyStatus;
  recommended_bed_id?: number | null;
  recommended_bed_code?: string | null;
  criteria_breakdown: {
    distance_score: number;
    bed_score: number;
    equipment_score: number;
    specialist_score: number;
    status_score: number;
    ventilators_available: number;
    trauma_level: string;
  };
}

export interface AlertItem {
  id: number;
  title: string;
  message: string;
  alert_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  hospital_id?: number | null;
  patient_id?: number | null;
  ambulance_id?: number | null;
  is_read: boolean;
  target_role: string;
  created_at: string;
}

export interface AnalyticsSummary {
  total_hospitals: number;
  total_beds: number;
  total_occupied_beds: number;
  total_available_beds: number;
  total_icu_beds: number;
  available_icu_beds: number;
  network_icu_occupancy_rate: number;
  network_overall_occupancy_rate: number;
  active_ambulances: number;
  critical_patients: number;
  high_risk_patients: number;
  active_alerts: number;
  avg_ambulance_response_mins: number;
  total_admissions_today: number;
  total_discharges_today: number;
}

export interface AuditLogItem {
  id: number;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: string | null;
  timestamp: string;
}

export interface Branch {
  id: number;
  hospital_id: number;
  hospital_name?: string | null;
  name: string;
  code: string;
  address: string;
  lat: number;
  lng: number;
  contact_phone?: string | null;
  emergency_status: EmergencyStatus;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  icu_capacity: number;
  available_icu_beds: number;
  emergency_capacity: number;
  occupancy_rate: number;
  department_count: number;
}

export interface Department {
  id: number;
  hospital_id: number;
  branch_id?: number | null;
  hospital_name?: string | null;
  branch_name?: string | null;
  name: string;
  code: string;
  floor: string;
  head_doctor_name?: string | null;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  occupancy_rate: number;
  status: 'NORMAL' | 'HIGH LOAD' | 'CRITICAL CAPACITY';
}

export interface Unit {
  id: number;
  department_id: number;
  department_name?: string | null;
  hospital_id?: number | null;
  hospital_name?: string | null;
  branch_name?: string | null;
  name: string;
  unit_type: 'ICU' | 'WARD' | 'ER' | 'OT';
  capacity: number;
  occupied: number;
  available: number;
  reserved: number;
  cleaning: number;
  occupancy_rate: number;
  status: 'NORMAL' | 'HIGH LOAD' | 'FULL' | 'CRITICAL CAPACITY';
}

export interface Resource {
  id: number;
  resource_id: string;
  hospital_id: number;
  branch_id?: number | null;
  hospital_name?: string | null;
  branch_name?: string | null;
  resource_type: string;
  name: string;
  quantity: number;
  available_quantity: number;
  in_use_quantity?: number;
  maintenance_quantity?: number;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  created_at: string;
}

export interface NetworkSummary {
  total_hospitals: number;
  total_branches: number;
  total_departments: number;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  cleaning_beds: number;
  maintenance_beds: number;
  out_of_service_beds: number;
  overall_occupancy_rate: number;
  total_icu_beds: number;
  available_icu_beds: number;
  occupied_icu_beds: number;
  icu_occupancy_rate: number;
  total_emergency_beds: number;
  available_emergency_beds: number;
  total_ventilators: number;
  available_ventilators: number;
  total_monitors: number;
  available_monitors: number;
  total_doctors: number;
  active_doctors: number;
  total_nurses: number;
  active_nurses: number;
  active_emergencies: number;
  active_ambulances: number;
}

export interface HospitalSummary {
  hospital_id: number;
  name: string;
  branch_name: string;
  code: string;
  emergency_status: EmergencyStatus;
  total_beds: number;
  available_beds: number;
  occupied_beds: number;
  reserved_beds: number;
  cleaning_beds: number;
  maintenance_beds: number;
  out_of_service_beds: number;
  overall_occupancy_rate: number;
  total_icu_beds: number;
  available_icu_beds: number;
  occupied_icu_beds: number;
  icu_occupancy_rate: number;
  total_emergency_beds: number;
  available_emergency_beds: number;
  ventilators_total: number;
  ventilators_available: number;
  ecmo_available: boolean;
  doctors_count: number;
  nurses_count: number;
}

// ==========================================
// NURSE WORKSPACE TYPES (PHASE 3)
// ==========================================

export interface NurseDashboardSummary {
  assigned_patients: number;
  critical_patients: number;
  high_risk_patients: number;
  pending_tasks: number;
  available_icu_beds: number;
  incoming_ambulances: number;
  active_alerts: number;
}

export interface NursingNote {
  id: number;
  patient_id: number;
  nurse_id?: number | null;
  nurse_name: string;
  content: string;
  timestamp: string;
}

export interface NursePatient {
  id: number;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string;
  admission_date: string;
  status: PatientStatus;
  triage_priority: TriagePriority;
  risk_level: 'STABLE' | 'WATCH' | 'HIGH RISK' | 'CRITICAL';
  hospital_id: number;
  hospital_name?: string | null;
  department_id: number;
  department_name?: string | null;
  bed_id?: number | null;
  bed_code?: string | null;
  diagnosis: string;
  assigned_doctor_id?: number | null;
  assigned_doctor_name?: string | null;
  assigned_nurse_id?: number | null;
  assigned_nurse_name?: string | null;
  latest_vitals?: PatientVital | null;
  last_vitals_updated?: string | null;
}

export interface NursePatientDetail extends NursePatient {
  vitals_history: PatientVital[];
  nursing_notes: NursingNote[];
  medications: Medication[];
  nurse_tasks: NurseTask[];
}

export interface DoctorRequest {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  patient_mrn?: string | null;
  hospital_id: number;
  department_id: number;
  department_name?: string | null;
  nurse_id?: number | null;
  nurse_name: string;
  doctor_id?: number | null;
  doctor_name?: string | null;
  reason: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';
  created_at: string;
}

export interface ShiftHandover {
  id: number;
  hospital_id: number;
  department_id: number;
  outgoing_nurse_id?: number | null;
  outgoing_nurse_name: string;
  incoming_nurse_id?: number | null;
  incoming_nurse_name: string;
  shift: string;
  general_notes: string;
  pending_tasks_summary?: string | null;
  critical_observations?: string | null;
  timestamp: string;
}

export interface NurseVitalsFormData {
  heart_rate: number;
  spo2: number;
  systolic_bp: number;
  diastolic_bp: number;
  respiratory_rate: number;
  temperature: number;
  pain_score?: number;
  consciousness?: 'ALERT' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE';
  recorded_by_nurse_name?: string;
}

// ----------------------------------------------------
// PHASE 4: DOCTOR PANEL INTERFACES
// ----------------------------------------------------

export interface DoctorDashboardSummary {
  my_patients: number;
  critical_patients: number;
  high_risk_patients: number;
  stable_patients: number;
  active_alerts: number;
  incoming_patients: number;
  pending_nurse_requests: number;
}

export interface AIRiskReport {
  risk_score: number;
  risk_level: 'CRITICAL' | 'HIGH RISK' | 'WATCH' | 'STABLE';
  factors: Record<string, number>;
  factor_labels: Record<string, string>;
  contributing_factors: string[];
  trend: number[];
  explanation: string;
  disclaimer: string;
}

export interface VitalTrendPoint {
  timestamp: string;
  time_label: string;
  heart_rate: number;
  spo2: number;
  systolic_bp: number;
  diastolic_bp: number;
  respiratory_rate: number;
  temperature: number;
  news2_score: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  time_label: string;
  event_type: 'ADMISSION' | 'VITALS' | 'LAB' | 'MEDICATION' | 'ALERT' | 'DOCTOR_NOTE' | 'NURSE_NOTE' | 'PROCEDURE' | 'ORDER' | 'TRANSFER' | 'DISCHARGE';
  title: string;
  description: string;
  actor_name?: string | null;
  severity?: string;
}

export interface DoctorOrder {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  patient_mrn?: string | null;
  doctor_id?: number | null;
  doctor_name: string;
  order_type: 'LAB' | 'IMAGING' | 'PROCEDURE' | 'MEDICATION' | 'CONSULT';
  description: string;
  priority: 'ROUTINE' | 'URGENT' | 'STAT';
  status: 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string | null;
  timestamp: string;
  completed_at?: string | null;
}

export interface PatientTransfer {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  patient_mrn?: string | null;
  doctor_name: string;
  from_department_id?: number | null;
  from_department_name?: string | null;
  to_department_id?: number | null;
  to_department_name?: string | null;
  from_unit_name?: string | null;
  to_unit_name?: string | null;
  from_bed_code?: string | null;
  to_bed_code?: string | null;
  reason: string;
  priority: 'ROUTINE' | 'URGENT' | 'EMERGENCY';
  status: string;
  notes?: string | null;
  timestamp: string;
}

export interface PatientDischarge {
  id: number;
  patient_id: number;
  patient_name?: string | null;
  patient_mrn?: string | null;
  doctor_name: string;
  bed_code?: string | null;
  reason: string;
  discharge_summary: string;
  instructions?: string | null;
  status: string;
  timestamp: string;
  completed_at?: string | null;
}

export interface DoctorPatient {
  id: number;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string;
  bed_code?: string | null;
  department_id: number;
  department_name?: string | null;
  unit_name?: string | null;
  diagnosis: string;
  risk_level: 'CRITICAL' | 'HIGH RISK' | 'WATCH' | 'STABLE';
  risk_score: number;
  news2_score: number;
  latest_vitals?: PatientVital | null;
  status: PatientStatus;
  assigned_doctor_id?: number | null;
  assigned_doctor_name?: string | null;
  assigned_nurse_name?: string | null;
  latest_alert?: string | null;
  admission_date: string;
  allergies: string[];
}

export interface DoctorPatientDetail {
  id: number;
  mrn: string;
  full_name: string;
  age: number;
  gender: string;
  blood_group: string;
  admission_date: string;
  discharge_date?: string | null;
  status: PatientStatus;
  triage_priority: TriagePriority;
  risk_level: 'CRITICAL' | 'HIGH RISK' | 'WATCH' | 'STABLE';
  risk_score: number;
  news2_score: number;
  hospital_id: number;
  hospital_name: string;
  branch_name: string;
  department_id: number;
  department_name: string;
  unit_name?: string | null;
  bed_code?: string | null;
  diagnosis: string;
  assigned_doctor_id?: number | null;
  assigned_doctor_name?: string | null;
  assigned_nurse_id?: number | null;
  assigned_nurse_name?: string | null;
  medical_history: Array<{ condition?: string; [key: string]: any } | string>;
  allergies: string[];
  latest_vitals?: PatientVital | null;
  latest_alert?: string | null;
  vitals_history: PatientVital[];
  lab_results: LabResult[];
  medications: Medication[];
  clinical_notes: ClinicalNote[];
  nursing_notes: NursingNote[];
  doctor_orders: DoctorOrder[];
  risk_prediction?: AIRiskReport | null;
  timeline_events: TimelineEvent[];
}

// ----------------------------------------------------
// PHASE 5: EMERGENCY & AMBULANCE INTELLIGENCE TYPES
// ----------------------------------------------------
export interface EmergencyCaseCreate {
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  emergency_type: string;
  priority: string;
  condition_summary: string;
  required_department: string;
  required_resources: string[];
  vitals_heart_rate: number;
  vitals_systolic_bp: number;
  vitals_diastolic_bp: number;
  vitals_spo2: number;
  vitals_respiratory_rate: number;
  vitals_temperature: number;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
}

export interface HospitalMatch {
  id: number;
  hospital_id: number;
  hospital_name: string;
  branch_name: string;
  address: string;
  lat: number;
  lng: number;
  is_eligible: boolean;
  ineligible_reason?: string | null;
  suitability_score: number;
  resource_score: number;
  clinical_score: number;
  eta_score: number;
  capacity_score: number;
  readiness_score: number;
  distance_km: number;
  eta_minutes: number;
  explanation: string[];
  breakdown_details: Record<string, any>;
  icu_available: number;
  icu_total: number;
  icu_occupancy: number;
  ventilators_available: number;
  specialist_on_duty?: string | null;
  emergency_status: string;
}

export interface BedCandidate {
  id: number;
  code: string;
  bed_type: string;
  department_id: number;
  department_name: string;
  unit_name: string;
  status: string;
  has_ventilator: boolean;
  has_monitor: boolean;
  has_oxygen: boolean;
}

export interface BedReservationRecord {
  id: number;
  emergency_case_id: number;
  bed_id: number;
  bed_code: string;
  hospital_id: number;
  hospital_name: string;
  department_name: string;
  status: string;
  reserved_at: string;
}

export interface AmbulanceCandidate {
  id: number;
  code: string;
  vehicle_number: string;
  driver_name: string;
  paramedic_name: string;
  phone: string;
  status: string;
  lat: number;
  lng: number;
  distance_km: number;
  eta_minutes: number;
}

export interface EmergencyTimelineItem {
  id: number;
  emergency_case_id: number;
  event_type: string;
  title: string;
  description: string;
  actor_name: string;
  timestamp: string;
}

export interface EmergencyNotificationItem {
  id: number;
  emergency_case_id: number;
  hospital_id: number;
  recipient_role: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface EmergencyCaseDetail {
  id: number;
  case_number: string;
  patient_name: string;
  patient_age: number;
  patient_gender: string;
  emergency_type: string;
  priority: string;
  condition_summary: string;
  required_department: string;
  required_resources: string[];
  vitals_heart_rate: number;
  vitals_systolic_bp: number;
  vitals_diastolic_bp: number;
  vitals_spo2: number;
  vitals_respiratory_rate: number;
  vitals_temperature: number;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  status: string;
  assigned_hospital_id?: number | null;
  assigned_hospital_name?: string | null;
  assigned_ambulance_id?: number | null;
  assigned_ambulance_code?: string | null;
  assigned_bed_id?: number | null;
  assigned_bed_code?: string | null;
  assigned_patient_id?: number | null;
  suitability_score: number;
  eta_minutes?: number | null;
  created_at: string;
  arrived_at?: string | null;
  completed_at?: string | null;
  matches: HospitalMatch[];
  timeline_events: EmergencyTimelineItem[];
  assigned_ambulance?: Ambulance | null;
}

export interface XRayPredictionResult {
  prediction: 'NORMAL' | 'PNEUMONIA';
  confidence: number;
  normal_probability: number;
  pneumonia_probability: number;
  model_version: string;
  architecture: string;
  disclaimer: string;
  record_id?: number | null;
  patient_id?: number | null;
  patient_name?: string | null;
  patient_mrn?: string | null;
  image_url?: string | null;
}

export interface XRayAnalysisRecord {
  id: number;
  patient_id?: number | null;
  patient_name?: string | null;
  patient_mrn?: string | null;
  prediction: 'NORMAL' | 'PNEUMONIA';
  confidence: number;
  normal_probability: number;
  pneumonia_probability: number;
  image_filename?: string | null;
  image_url?: string | null;
  original_filename?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
}



