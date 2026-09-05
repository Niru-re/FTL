import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { emergencyAPI } from '../../services/api';
import {
  EmergencyCaseCreate, HospitalMatch, BedCandidate, AmbulanceCandidate, EmergencyCaseDetail
} from '../../types';
import { EmergencyMap } from '../../components/emergency/EmergencyMap';
import {
  Siren, ShieldAlert, Sparkles, Building2, BedDouble, ChevronRight,
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, MapPin, HeartPulse,
  Wind, Stethoscope, Activity, Radio, Check, X, RefreshCw
} from 'lucide-react';

export const NewEmergencyPage: React.FC = () => {
  const navigate = useNavigate();

  // Wizard Step: 1 (Intake) -> 2 (Ranking) -> 3 (Bed Selection) -> 4 (Ambulance Dispatch)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [createdCase, setCreatedCase] = useState<EmergencyCaseDetail | null>(null);

  // Form State
  const [formData, setFormData] = useState<EmergencyCaseCreate>({
    patient_name: 'Arthur Pendelton',
    patient_age: 62,
    patient_gender: 'Male',
    emergency_type: 'CARDIAC',
    priority: 'CRITICAL',
    condition_summary: 'Severe acute crushing substernal chest pain with diaphoresis and ST elevation in leads V1-V4.',
    required_department: 'ICU',
    required_resources: ['ICU bed', 'Ventilator', 'Oxygen', 'Cardiologist'],
    vitals_heart_rate: 135,
    vitals_systolic_bp: 85,
    vitals_diastolic_bp: 50,
    vitals_spo2: 89.0,
    vitals_respiratory_rate: 28,
    vitals_temperature: 37.4,
    pickup_address: 'Central Plaza Intersection, Downtown Metro',
    pickup_lat: 40.7150,
    pickup_lng: -74.0020
  });

  // Step 2 & 3 & 4 data
  const [matches, setMatches] = useState<HospitalMatch[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalMatch | null>(null);
  const [availableBeds, setAvailableBeds] = useState<BedCandidate[]>([]);
  const [selectedBed, setSelectedBed] = useState<BedCandidate | null>(null);
  const [availableAmbulances, setAvailableAmbulances] = useState<AmbulanceCandidate[]>([]);
  const [selectedAmbulance, setSelectedAmbulance] = useState<AmbulanceCandidate | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState<HospitalMatch | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PRESET DEMO SCENARIO LOADER
  const loadScenario = (type: 'CARDIAC' | 'RESPIRATORY' | 'TRAUMA' | 'STROKE') => {
    if (type === 'CARDIAC') {
      setFormData({
        patient_name: 'Arthur Pendelton',
        patient_age: 62,
        patient_gender: 'Male',
        emergency_type: 'CARDIAC',
        priority: 'CRITICAL',
        condition_summary: 'Severe acute crushing substernal chest pain radiating to left jaw. ECG shows ST elevation in V1-V4.',
        required_department: 'ICU',
        required_resources: ['ICU bed', 'Ventilator', 'Oxygen', 'Cardiologist'],
        vitals_heart_rate: 135,
        vitals_systolic_bp: 85,
        vitals_diastolic_bp: 50,
        vitals_spo2: 89.0,
        vitals_respiratory_rate: 28,
        vitals_temperature: 37.4,
        pickup_address: 'Downtown Financial Hub (Gate 3)',
        pickup_lat: 40.7150,
        pickup_lng: -74.0020
      });
    } else if (type === 'RESPIRATORY') {
      setFormData({
        patient_name: 'Evelyn Vasquez',
        patient_age: 54,
        patient_gender: 'Female',
        emergency_type: 'RESPIRATORY',
        priority: 'CRITICAL',
        condition_summary: 'Acute hypoxemic respiratory failure with bilateral wheezing and intercostal retractions.',
        required_department: 'ICU',
        required_resources: ['ICU bed', 'Ventilator', 'Oxygen', 'Pulmonologist'],
        vitals_heart_rate: 118,
        vitals_systolic_bp: 130,
        vitals_diastolic_bp: 80,
        vitals_spo2: 82.0,
        vitals_respiratory_rate: 34,
        vitals_temperature: 38.6,
        pickup_address: 'Northside Industrial Park, Sector 4',
        pickup_lat: 40.7600,
        pickup_lng: -73.9800
      });
    } else if (type === 'TRAUMA') {
      setFormData({
        patient_name: 'Marcus Brody',
        patient_age: 28,
        patient_gender: 'Male',
        emergency_type: 'TRAUMA',
        priority: 'CRITICAL',
        condition_summary: 'High-speed motor vehicle collision with blunt thoracic trauma, pelvic instability, and hemorrhagic shock.',
        required_department: 'TRAUMA',
        required_resources: ['ICU bed', 'Ventilator', 'Oxygen', 'Trauma specialist'],
        vitals_heart_rate: 142,
        vitals_systolic_bp: 75,
        vitals_diastolic_bp: 40,
        vitals_spo2: 90.0,
        vitals_respiratory_rate: 30,
        vitals_temperature: 36.4,
        pickup_address: 'Highway Expressway Kilometer 14 Overpass',
        pickup_lat: 40.7350,
        pickup_lng: -74.0100
      });
    } else if (type === 'STROKE') {
      setFormData({
        patient_name: 'Clara Oswald',
        patient_age: 71,
        patient_gender: 'Female',
        emergency_type: 'NEUROLOGICAL',
        priority: 'HIGH',
        condition_summary: 'Acute left-sided hemiparesis and expressive aphasia with symptom onset 50 minutes prior (tPA window).',
        required_department: 'ICU',
        required_resources: ['ICU bed', 'Neurologist', 'Patient monitor'],
        vitals_heart_rate: 88,
        vitals_systolic_bp: 175,
        vitals_diastolic_bp: 105,
        vitals_spo2: 96.0,
        vitals_respiratory_rate: 18,
        vitals_temperature: 37.1,
        pickup_address: 'East Riverview Senior Living Center',
        pickup_lat: 40.7250,
        pickup_lng: -73.9500
      });
    }
  };

  const toggleResource = (resName: string) => {
    if (formData.required_resources.includes(resName)) {
      setFormData({
        ...formData,
        required_resources: formData.required_resources.filter(r => r !== resName)
      });
    } else {
      setFormData({
        ...formData,
        required_resources: [...formData.required_resources, resName]
      });
    }
  };

  // STEP 1 -> STEP 2: RUN ROUTING INTELLIGENCE
  const handleFindBestHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // 1. Create emergency in backend
      const caseDetail = await emergencyAPI.create(formData);
      setCreatedCase(caseDetail);
      setMatches(caseDetail.matches);
      if (caseDetail.matches.length > 0) {
        setSelectedHospital(caseDetail.matches[0]);
      }
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to create emergency case or run routing engine.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2 -> STEP 3: SELECT HOSPITAL & LOAD BEDS
  const handleSelectHospital = async (match: HospitalMatch) => {
    if (!createdCase) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await emergencyAPI.selectHospital(createdCase.id, match.hospital_id);
      setSelectedHospital(match);
      const beds = await emergencyAPI.getBeds(createdCase.id);
      setAvailableBeds(beds);
      if (beds.length > 0) {
        setSelectedBed(beds[0]);
      }
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to select hospital or retrieve beds.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3 -> STEP 4: RESERVE BED & LOAD AMBULANCES
  const handleReserveBed = async () => {
    if (!createdCase || !selectedBed) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await emergencyAPI.reserveBed(createdCase.id, selectedBed.id);
      const ambs = await emergencyAPI.getAmbulances(createdCase.id);
      setAvailableAmbulances(ambs);
      if (ambs.length > 0) {
        setSelectedAmbulance(ambs[0]);
      }
      setStep(4);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Bed no longer available. Please select another available bed.');
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 4 -> COMPLETE: ASSIGN AMBULANCE & DISPATCH
  const handleAssignAndDispatch = async () => {
    if (!createdCase || !selectedAmbulance) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await emergencyAPI.assignAmbulance(createdCase.id, selectedAmbulance.id);
      navigate(`/admin/emergency/${createdCase.id}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to assign and dispatch ambulance.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Breadcrumb & Back */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <button
          onClick={() => navigate('/admin/emergency')}
          className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Emergency Central</span>
        </button>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-2">
          {[
            { num: 1, label: 'Intake' },
            { num: 2, label: 'Hospital Match' },
            { num: 3, label: 'Bed Lock' },
            { num: 4, label: 'Ambulance' }
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition ${
                step === s.num
                  ? 'bg-rose-600 text-white shadow-md'
                  : step > s.num
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              <span>{s.num}.</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/60 p-4 text-xs font-bold text-rose-200">
          <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: INTAKE & TRIAGE FORM WITH DEMO SCENARIO PRESETS */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Preset Scenario Bar */}
          <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 space-y-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-rose-400" />
                <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                  Quick-Load Demo Scenarios (Hackathon Mode)
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-500">1-Click Auto-Fill</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => loadScenario('CARDIAC')}
                className="flex flex-col items-start p-3 rounded-xl bg-gray-100/90 border border-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-rose-500/60 transition group text-left"
              >
                <span className="text-xs font-bold text-white group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-300">1. Critical Cardiac</span>
                <span className="text-[10px] text-gray-500">STEMI, ICU, Cardiologist</span>
              </button>
              <button
                type="button"
                onClick={() => loadScenario('RESPIRATORY')}
                className="flex flex-col items-start p-3 rounded-xl bg-gray-100/90 border border-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-rose-500/60 transition group text-left"
              >
                <span className="text-xs font-bold text-white group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-300">2. Severe Respiratory</span>
                <span className="text-[10px] text-gray-500">Hypoxemic, Ventilator</span>
              </button>
              <button
                type="button"
                onClick={() => loadScenario('TRAUMA')}
                className="flex flex-col items-start p-3 rounded-xl bg-gray-100/90 border border-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-rose-500/60 transition group text-left"
              >
                <span className="text-xs font-bold text-white group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-300">3. Multi-Trauma</span>
                <span className="text-[10px] text-gray-500">MVC, Trauma Surgeon</span>
              </button>
              <button
                type="button"
                onClick={() => loadScenario('STROKE')}
                className="flex flex-col items-start p-3 rounded-xl bg-gray-100/90 border border-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-rose-500/60 transition group text-left"
              >
                <span className="text-xs font-bold text-white group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-300">4. Acute Stroke</span>
                <span className="text-[10px] text-gray-500">tPA Window, Neurologist</span>
              </button>
            </div>
          </div>

          {/* Main Intake Form */}
          <form onSubmit={handleFindBestHospital} className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-gray-100/70 p-6 space-y-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-4">
                <Siren className="h-5 w-5 text-rose-400 animate-pulse" />
                <div>
                  <h2 className="text-base font-black text-white">Emergency Patient Intake & Triage</h2>
                  <p className="text-xs text-gray-500">Enter patient vitals and required clinical resources</p>
                </div>
              </div>

              {/* Patient Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Patient Name</label>
                  <input
                    type="text"
                    required
                    value={formData.patient_name}
                    onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Age</label>
                    <input
                      type="number"
                      required
                      value={formData.patient_age}
                      onChange={(e) => setFormData({ ...formData, patient_age: Number(e.target.value) })}
                      className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Gender</label>
                    <select
                      value={formData.patient_gender}
                      onChange={(e) => setFormData({ ...formData, patient_gender: e.target.value })}
                      className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Type</label>
                    <select
                      value={formData.emergency_type}
                      onChange={(e) => setFormData({ ...formData, emergency_type: e.target.value })}
                      className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900"
                    >
                      <option value="CARDIAC">Cardiac</option>
                      <option value="RESPIRATORY">Respiratory</option>
                      <option value="TRAUMA">Trauma</option>
                      <option value="NEUROLOGICAL">Neurological</option>
                      <option value="GENERAL_CRITICAL">General Critical</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs font-bold text-rose-400"
                    >
                      <option value="CRITICAL">CRITICAL (Red)</option>
                      <option value="HIGH">HIGH (Yellow)</option>
                      <option value="MEDIUM">MEDIUM (Green)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Condition Summary */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase">Clinical Condition Description</label>
                <textarea
                  rows={2}
                  required
                  value={formData.condition_summary}
                  onChange={(e) => setFormData({ ...formData, condition_summary: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900 leading-relaxed"
                />
              </div>

              {/* Live Vitals Grid */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-2">Emergency Baseline Vitals</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Heart Rate</span>
                    <input
                      type="number"
                      value={formData.vitals_heart_rate}
                      onChange={(e) => setFormData({ ...formData, vitals_heart_rate: Number(e.target.value) })}
                      className="w-full mt-1 bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Blood Pressure</span>
                    <div className="flex items-center gap-1 font-mono text-sm font-bold text-white mt-1">
                      <input
                        type="number"
                        value={formData.vitals_systolic_bp}
                        onChange={(e) => setFormData({ ...formData, vitals_systolic_bp: Number(e.target.value) })}
                        className="w-10 bg-transparent focus:outline-none"
                      />
                      <span>/</span>
                      <input
                        type="number"
                        value={formData.vitals_diastolic_bp}
                        onChange={(e) => setFormData({ ...formData, vitals_diastolic_bp: Number(e.target.value) })}
                        className="w-10 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">SpO2 Oxygen</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.vitals_spo2}
                      onChange={(e) => setFormData({ ...formData, vitals_spo2: Number(e.target.value) })}
                      className="w-full mt-1 bg-transparent font-mono text-sm font-bold text-sky-400 focus:outline-none"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Respiration (/min)</span>
                    <input
                      type="number"
                      value={formData.vitals_respiratory_rate}
                      onChange={(e) => setFormData({ ...formData, vitals_respiratory_rate: Number(e.target.value) })}
                      className="w-full mt-1 bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Temp (&deg;C)</span>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.vitals_temperature}
                      onChange={(e) => setFormData({ ...formData, vitals_temperature: Number(e.target.value) })}
                      className="w-full mt-1 bg-transparent font-mono text-sm font-bold text-white focus:outline-none"
                    />
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Dept</span>
                    <select
                      value={formData.required_department}
                      onChange={(e) => setFormData({ ...formData, required_department: e.target.value })}
                      className="w-full mt-1 bg-transparent font-mono text-xs font-bold text-teal-400 focus:outline-none"
                    >
                      <option value="ICU">ICU</option>
                      <option value="EMERGENCY">Emergency</option>
                      <option value="CARDIOLOGY">Cardiology</option>
                      <option value="NEUROLOGY">Neurology</option>
                      <option value="TRAUMA">Trauma</option>
                      <option value="PULMONOLOGY">Pulmonology</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Required Resources Multi-Select Checklist */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase block mb-2">
                  Mandatory Required Clinical Capabilities & Resources
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'ICU bed', icon: BedDouble },
                    { id: 'Ventilator', icon: Wind },
                    { id: 'Oxygen', icon: Activity },
                    { id: 'Patient monitor', icon: Radio },
                    { id: 'Cardiologist', icon: HeartPulse },
                    { id: 'Neurologist', icon: Stethoscope },
                    { id: 'Trauma specialist', icon: ShieldAlert },
                    { id: 'Critical care doctor', icon: Stethoscope }
                  ].map((res) => {
                    const isChecked = formData.required_resources.includes(res.id);
                    const Icon = res.icon;
                    return (
                      <button
                        type="button"
                        key={res.id}
                        onClick={() => toggleResource(res.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition text-left ${
                          isChecked
                            ? 'bg-sky-950/80 border-sky-500/60 text-sky-300 shadow-md'
                            : 'bg-gray-50/60 border-gray-200 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-700'
                        }`}
                      >
                        <div className={`p-1 rounded-lg ${isChecked ? 'bg-sky-500 text-slate-950' : 'bg-gray-200 text-gray-500'}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="line-clamp-1">{res.id}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pickup Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-gray-500 uppercase">Incident Address</label>
                  <input
                    type="text"
                    required
                    value={formData.pickup_address}
                    onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Latitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.pickup_lat}
                      onChange={(e) => setFormData({ ...formData, pickup_lat: Number(e.target.value) })}
                      className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase">Longitude</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.pickup_lng}
                      onChange={(e) => setFormData({ ...formData, pickup_lng: Number(e.target.value) })}
                      className="w-full mt-1 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-xs text-gray-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button: FIND BEST HOSPITAL */}
              <div className="pt-4 border-t border-gray-200 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:from-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:to-rose-400 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-rose-600/30 transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{isLoading ? 'Searching City Hospitals...' : 'FIND BEST HOSPITAL'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: RANKED HOSPITAL RESULTS & SUITABILITY SCORES */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Routing Intelligence</span>
              </div>
              <h1 className="text-2xl font-black text-white">
                Best Hospital Matches for {formData.patient_name}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Evaluated {matches.length} hospitals against {formData.emergency_type} requirements &bull; Ranked by Prototype Suitability Score
              </p>
            </div>

            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 px-3.5 py-2 text-xs font-bold text-gray-600"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Modify Requirements</span>
            </button>
          </div>

          {/* Interactive Map */}
          <EmergencyMap
            pickupLat={formData.pickup_lat}
            pickupLng={formData.pickup_lng}
            pickupAddress={formData.pickup_address}
            candidateHospitals={matches}
            selectedHospital={selectedHospital}
            height={260}
          />

          {/* Hospital Cards Grid */}
          <div className="space-y-4">
            {matches.map((m, idx) => {
              const isBest = idx === 0 && m.is_eligible;
              const isSelected = selectedHospital?.hospital_id === m.hospital_id;

              return (
                <div
                  key={m.hospital_id}
                  className={`rounded-2xl border p-5 shadow-2xl backdrop-blur-sm transition ${
                    isBest
                      ? 'border-emerald-500/50 bg-emerald-950/20 ring-2 ring-emerald-500/20'
                      : m.is_eligible
                      ? 'border-gray-200 bg-gray-100/70'
                      : 'border-gray-200/60 bg-gray-50/40 opacity-60'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Info & Badges */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {isBest && (
                          <span className="rounded-full bg-emerald-500 text-slate-950 px-2.5 py-0.5 text-[10px] font-black uppercase flex items-center gap-1">
                            <span>🏆 TOP MATCH</span>
                          </span>
                        )}
                        <h3 className="text-base font-black text-white">{m.hospital_name}</h3>
                        <span className="text-xs text-gray-500">({m.branch_name})</span>
                        {!m.is_eligible && (
                          <span className="text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded uppercase">
                            NOT ELIGIBLE
                          </span>
                        )}
                      </div>

                      {/* Metrics Strip */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-sky-400" />
                          <span>Simulated ETA: <strong className="text-white font-mono">{m.eta_minutes} mins</strong> ({m.distance_km} km)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <BedDouble className="h-3.5 w-3.5 text-teal-400" />
                          <span>ICU Beds: <strong className="text-emerald-400 font-mono">{m.icu_available} / {m.icu_total}</strong> ({m.icu_occupancy}% Occ)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Wind className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Ventilators: <strong className="text-white font-mono">{m.ventilators_available}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-amber-400" />
                          <span>{m.specialist_on_duty}</span>
                        </div>
                      </div>

                      {/* Explanation Checklist */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {m.explanation.map((item, i) => (
                          <span
                            key={i}
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                              item.startsWith('✓')
                                ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                                : item.startsWith('✗')
                                ? 'bg-rose-950/60 border-rose-500/30 text-rose-300'
                                : 'bg-gray-200 text-gray-600 border-gray-300'
                            }`}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Right: Suitability Score Badge & Action */}
                    <div className="flex items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-200">
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Prototype Suitability</span>
                        <div className="text-3xl font-black text-white font-mono">
                          {m.suitability_score} <small className="text-xs text-gray-500">/ 100</small>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowExplanationModal(m)}
                          className="rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 px-3.5 py-2 text-xs font-bold text-sky-300 transition border border-gray-300"
                        >
                          Why This Hospital?
                        </button>

                        {m.is_eligible ? (
                          <button
                            type="button"
                            onClick={() => handleSelectHospital(m)}
                            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition shadow-md shadow-emerald-600/20"
                          >
                            <span>Select & Lock Bed</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            disabled
                            className="rounded-xl bg-gray-200/40 px-3.5 py-2 text-xs font-bold text-gray-400 cursor-not-allowed"
                          >
                            Ineligible
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: BED SELECTION & ATOMIC LOCKING */}
      {/* ========================================================================= */}
      {step === 3 && selectedHospital && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Target Destination Selected</span>
                <h2 className="text-lg font-black text-white">{selectedHospital.hospital_name}</h2>
                <span className="text-xs text-gray-500">{selectedHospital.branch_name} &bull; Suitability {selectedHospital.suitability_score}% &bull; ETA {selectedHospital.eta_minutes} mins</span>
              </div>
            </div>
            <button onClick={() => setStep(2)} className="text-xs text-sky-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:underline">
              Change Hospital
            </button>
          </div>

          {/* Beds Grid */}
          <div className="rounded-2xl border border-gray-200 bg-gray-100/70 p-6 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-teal-400" />
                  <span>Select & Lock Inpatient Bed</span>
                </h3>
                <p className="text-xs text-gray-500">Choose from immediately available ICU / Critical Care beds</p>
              </div>
              <span className="text-xs font-mono text-gray-600">
                {availableBeds.length} Available Beds
              </span>
            </div>

            {availableBeds.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-xs">No available beds found at this hospital.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableBeds.map((bed) => {
                  const isSelected = selectedBed?.id === bed.id;
                  return (
                    <div
                      key={bed.id}
                      onClick={() => setSelectedBed(bed)}
                      className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                        isSelected
                          ? 'bg-teal-950/80 border-teal-500 text-teal-200 ring-2 ring-teal-500/30'
                          : 'bg-gray-50 border-gray-200 text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-mono text-sm font-black text-white">{bed.code}</div>
                          <span className="text-[10px] text-gray-500">{bed.department_name} ({bed.unit_name})</span>
                        </div>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                          {bed.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-1 border-t border-gray-200/80">
                        <span>Vent: <strong className={bed.has_ventilator ? 'text-emerald-400' : 'text-gray-400'}>{bed.has_ventilator ? 'Ready' : 'N/A'}</strong></span>
                        <span>&bull;</span>
                        <span>Monitor: <strong className={bed.has_monitor ? 'text-emerald-400' : 'text-gray-400'}>{bed.has_monitor ? 'Active' : 'N/A'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="rounded-xl bg-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600"
              >
                Back to Hospitals
              </button>
              <button
                type="button"
                disabled={!selectedBed || isLoading}
                onClick={handleReserveBed}
                className="flex items-center gap-2 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 px-6 py-2.5 text-xs font-bold text-white transition shadow-md"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isLoading ? 'Locking Bed...' : `Reserve Bed ${selectedBed?.code || ''}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: AMBULANCE SELECTION & FINAL DISPATCH */}
      {/* ========================================================================= */}
      {step === 4 && selectedHospital && selectedBed && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-100 border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-500 uppercase">Receiving Facility</span>
              <div className="font-bold text-white">{selectedHospital.hospital_name}</div>
              <p className="text-xs text-gray-500">{selectedHospital.address}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-100 border border-teal-500/30 space-y-1">
              <span className="text-[10px] font-bold text-teal-400 uppercase">Reserved Inpatient Bed</span>
              <div className="font-mono font-bold text-white">{selectedBed.code} ({selectedBed.unit_name})</div>
              <p className="text-xs text-emerald-400">Bed Status: RESERVED (Locked for Arthur Pendelton)</p>
            </div>
          </div>

          {/* Ambulances List */}
          <div className="rounded-2xl border border-gray-200 bg-gray-100/70 p-6 space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <Siren className="h-4 w-4 text-rose-400" />
                  <span>Select Emergency Transit Ambulance</span>
                </h3>
                <p className="text-xs text-gray-500">Assign nearby emergency vehicle with telemetry integration</p>
              </div>
              <span className="text-xs font-mono text-gray-600">{availableAmbulances.length} Units Online</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableAmbulances.map((amb) => {
                const isSelected = selectedAmbulance?.id === amb.id;
                return (
                  <div
                    key={amb.id}
                    onClick={() => setSelectedAmbulance(amb)}
                    className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-950/80 border-sky-500 text-sky-200 ring-2 ring-sky-500/30'
                        : 'bg-gray-50 border-gray-200 text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-white">{amb.code}</span>
                        <span className="text-[10px] text-gray-500">({amb.vehicle_number})</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-gray-200 text-gray-600 uppercase">
                          {amb.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Crew: <strong className="text-gray-700">{amb.paramedic_name}</strong> &bull; Driver: {amb.driver_name}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">Contact: {amb.phone}</div>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-sky-400 font-mono block">
                        {amb.eta_minutes} <small className="text-xs">MIN</small>
                      </span>
                      <span className="text-[10px] text-gray-500">{amb.distance_km} km away</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl bg-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600"
              >
                Back to Bed
              </button>
              <button
                type="button"
                disabled={!selectedAmbulance || isLoading}
                onClick={handleAssignAndDispatch}
                className="flex items-center gap-2 rounded-2xl bg-rose-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-500 px-8 py-3 text-xs font-black text-white transition shadow-xl shadow-rose-600/30"
              >
                <Siren className="h-4 w-4 animate-pulse" />
                <span>{isLoading ? 'Dispatching...' : `DISPATCH AMBULANCE ${selectedAmbulance?.code || ''}`}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPLANATION MODAL ("WHY THIS HOSPITAL?") */}
      {/* ========================================================================= */}
      {showExplanationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/85 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Explainable AI Routing</span>
                <h3 className="text-base font-black text-white">Why {showExplanationModal.hospital_name}?</h3>
              </div>
              <button onClick={() => setShowExplanationModal(null)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Score Overview */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <span className="text-xs font-bold text-gray-500">Total Prototype Suitability Score</span>
                <p className="text-[11px] text-gray-400">Normalized weighted multi-criteria index</p>
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">
                {showExplanationModal.suitability_score} / 100
              </div>
            </div>

            {/* 5-Pillar Score Breakdown */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">5-Pillar Score Breakdown</span>
              <div className="space-y-2">
                <div className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-600">1. Resource Availability (30% weight)</span>
                  <strong className="font-mono text-sky-300">{showExplanationModal.resource_score} / 30 pts</strong>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-600">2. Clinical Capability & Specialists (25% weight)</span>
                  <strong className="font-mono text-sky-300">{showExplanationModal.clinical_score} / 25 pts</strong>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-600">3. Travel Time & Simulated ETA (20% weight)</span>
                  <strong className="font-mono text-sky-300">{showExplanationModal.eta_score} / 20 pts</strong>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-600">4. Hospital Capacity & ICU Load (15% weight)</span>
                  <strong className="font-mono text-sky-300">{showExplanationModal.capacity_score} / 15 pts</strong>
                </div>
                <div className="flex justify-between text-xs p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-gray-600">5. Emergency Department Readiness (10% weight)</span>
                  <strong className="font-mono text-sky-300">{showExplanationModal.readiness_score} / 10 pts</strong>
                </div>
              </div>
            </div>

            {/* Checklist items */}
            <div className="space-y-2 pt-2 border-t border-gray-200">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Clinical Checklist Rationale</span>
              <ul className="space-y-1.5 text-xs">
                {showExplanationModal.explanation.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setShowExplanationModal(null)}
              className="w-full py-2.5 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 text-xs font-bold text-white transition"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
