import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doctorAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  DoctorPatientDetail, VitalTrendPoint, LabResult, Medication,
  ClinicalNote, DoctorOrder, TimelineEvent, AIRiskReport
} from '../../types';
import { ECGWaveform } from '../../components/common/ECGWaveform';
import { formatTime, formatDate } from '../../utils/formatters';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts';
import {
  Users, Activity, ShieldAlert, HeartPulse, Stethoscope, ArrowLeft,
  Pill, FileText, FlaskConical, History, Sparkles, Clock, AlertTriangle,
  Plus, CheckCircle2, ChevronRight, BedDouble, ArrowRightLeft, LogOut,
  Send, RefreshCw, X, FileSpreadsheet, Eye
} from 'lucide-react';

export const DoctorPatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id) || 1;
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [patient, setPatient] = useState<DoctorPatientDetail | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'risk' | 'history' | 'labs' | 'medications' | 'notes' | 'nursing' | 'orders' | 'timeline'>('overview');
  const [vitalRange, setVitalRange] = useState('24h');
  const [vitalTrends, setVitalTrends] = useState<VitalTrendPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMedModal, setShowMedModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);

  // Form states
  const [noteForm, setNoteForm] = useState({ note_type: 'PROGRESS', content: '', plan: '' });
  const [orderForm, setOrderForm] = useState({ order_type: 'LAB', description: '', priority: 'ROUTINE', notes: '' });
  const [medForm, setMedForm] = useState<{ drug_name: string; dosage: string; frequency: string; route: string; status: any }>({ drug_name: '', dosage: '', frequency: 'Q12H', route: 'ORAL', status: 'ACTIVE' });
  const [labForm, setLabForm] = useState<{ test_name: string; category: string; value: string; unit: string; reference_range: string; status: any }>({ test_name: '', category: 'Biochemistry', value: '', unit: '', reference_range: '', status: 'NORMAL' });
  const [transferForm, setTransferForm] = useState({ to_department_id: 1, to_unit_name: 'Surgical ICU', reason: '', priority: 'URGENT', notes: '' });
  const [dischargeForm, setDischargeForm] = useState({ reason: 'RECOVERY', discharge_summary: '', instructions: '' });

  const fetchPatientData = async () => {
    try {
      const [ptData, trendsData] = await Promise.all([
        doctorAPI.getPatientDetail(patientId),
        doctorAPI.getPatientVitals(patientId, vitalRange)
      ]);
      setPatient(ptData);
      setVitalTrends(trendsData);
    } catch (e) {
      console.error('Error fetching patient detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
    const unsubVitals = subscribe('PATIENT_VITALS_UPDATED', () => fetchPatientData());
    return () => unsubVitals();
  }, [patientId, vitalRange]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Action Handlers
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.content) return;
    try {
      await doctorAPI.addPatientNote(patientId, noteForm);
      setShowNoteModal(false);
      setNoteForm({ note_type: 'PROGRESS', content: '', plan: '' });
      showToast('Clinical note added successfully.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.description) return;
    try {
      await doctorAPI.createOrder(patientId, orderForm);
      setShowOrderModal(false);
      setOrderForm({ order_type: 'LAB', description: '', priority: 'ROUTINE', notes: '' });
      showToast('Physician order created.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrescribeMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.drug_name) return;
    try {
      await doctorAPI.prescribeMedication(patientId, medForm);
      setShowMedModal(false);
      setMedForm({ drug_name: '', dosage: '', frequency: 'Q12H', route: 'ORAL', status: 'ACTIVE' });
      showToast('Medication prescribed.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDiscontinueMed = async (medId: number) => {
    try {
      await doctorAPI.discontinueMedication(medId);
      showToast('Medication marked as discontinued.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.test_name || !labForm.value) return;
    try {
      await doctorAPI.addPatientLab(patientId, labForm);
      setShowLabModal(false);
      setLabForm({ test_name: '', category: 'Biochemistry', value: '', unit: '', reference_range: '', status: 'NORMAL' });
      showToast('Lab result recorded.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.reason) return;
    try {
      await doctorAPI.requestTransfer(patientId, transferForm);
      setShowTransferModal(false);
      showToast('Department transfer request submitted.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDischargePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dischargeForm.discharge_summary) return;
    try {
      await doctorAPI.dischargePatient(patientId, dischargeForm);
      setShowDischargeModal(false);
      showToast('Patient discharge order submitted.');
      fetchPatientData();
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading || !patient) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-sky-400 animate-spin" />
          <p className="text-xs text-slate-400">Loading Clinical Command Center...</p>
        </div>
      </div>
    );
  }

  const latestV = patient.latest_vitals;
  const risk = patient.risk_prediction;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-xs font-bold text-emerald-200 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Back Button & Patient Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/doctor/patients')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Inpatient Census</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsLoading(true); fetchPatientData(); }}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 transition"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* STICKY CLINICAL COMMAND HEADER */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`h-4 w-4 rounded-full ${patient.risk_level === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : patient.risk_level === 'HIGH RISK' ? 'bg-amber-500' : 'bg-emerald-400'}`} />
            <h1 className="text-2xl font-black text-white">{patient.full_name}</h1>
            <span className="font-mono text-xs font-bold text-sky-400 bg-sky-950 px-2.5 py-1 rounded-lg border border-sky-500/30">
              {patient.mrn}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {patient.age}y &bull; {patient.gender} &bull; Blood {patient.blood_group}
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg font-mono">
              Bed: <strong className="text-sky-300">{patient.bed_code || 'Unassigned'}</strong>
            </span>
            <span className="text-xs text-slate-400">
              {patient.department_name}
            </span>
          </div>

          {/* Quick Action Command Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white transition border border-slate-700"
            >
              <Plus className="h-3.5 w-3.5 text-sky-400" />
              <span>Add Note</span>
            </button>
            <button
              onClick={() => setShowOrderModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white transition border border-slate-700"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-400" />
              <span>New Order</span>
            </button>
            <button
              onClick={() => setShowMedModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-white transition border border-slate-700"
            >
              <Pill className="h-3.5 w-3.5 text-teal-400" />
              <span>Prescribe</span>
            </button>
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-amber-300 transition border border-slate-700"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Transfer</span>
            </button>
            <button
              onClick={() => setShowDischargeModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2 text-xs font-bold text-white transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Discharge</span>
            </button>
          </div>
        </div>

        {/* Diagnosis and Allergy Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="space-y-1">
            <div className="text-xs">
              <span className="text-slate-400 font-semibold">Primary Diagnosis: </span>
              <span className="text-white font-bold">{patient.diagnosis}</span>
            </div>
            <div className="text-xs text-slate-400">
              Admitted {formatDate(patient.admission_date)} &bull; Attending: <strong className="text-slate-200">{patient.assigned_doctor_name}</strong> &bull; Bedside Nurse: <strong className="text-slate-200">{patient.assigned_nurse_name}</strong>
            </div>
          </div>

          {/* Allergy Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Allergies:</span>
            {patient.allergies && patient.allergies.length > 0 && patient.allergies[0] !== 'None Known' ? (
              patient.allergies.map((alg, idx) => (
                <span key={idx} className="rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-rose-400" />
                  <span>{alg}</span>
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">None Documented</span>
            )}
          </div>
        </div>

        {/* Live Vitals Snapshot Strip */}
        {latestV && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2">
            <div className={`p-2.5 rounded-xl border ${latestV.spo2 < 90 ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-200'}`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">SpO2 Oxygen</span>
              <span className="font-mono text-base font-black">{latestV.spo2}%</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${latestV.heart_rate > 120 || latestV.heart_rate < 50 ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-200'}`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Heart Rate</span>
              <span className="font-mono text-base font-black">{latestV.heart_rate} <small className="text-[10px]">BPM</small></span>
            </div>
            <div className="p-2.5 rounded-xl border bg-slate-950/60 border-slate-800 text-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Blood Pressure</span>
              <span className="font-mono text-base font-black">{latestV.systolic_bp}/{latestV.diastolic_bp}</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${latestV.respiratory_rate >= 28 ? 'bg-rose-950/40 border-rose-500/40 text-rose-300' : 'bg-slate-950/60 border-slate-800 text-slate-200'}`}>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Respiration</span>
              <span className="font-mono text-base font-black">{latestV.respiratory_rate} <small className="text-[10px]">/min</small></span>
            </div>
            <div className="p-2.5 rounded-xl border bg-slate-950/60 border-slate-800 text-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Temperature</span>
              <span className="font-mono text-base font-black">{latestV.temperature}&deg;C</span>
            </div>
            <div className="p-2.5 rounded-xl border bg-sky-950/30 border-sky-500/30 text-sky-300">
              <span className="text-[10px] text-sky-400 uppercase font-bold block">AI Risk / NEWS2</span>
              <span className="font-mono text-base font-black">{patient.risk_score}% / {patient.news2_score}</span>
            </div>
          </div>
        )}
      </div>

      {/* 10 TABBED NAVIGATION */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {[
          { key: 'overview', label: 'Overview', icon: Eye },
          { key: 'monitoring', label: 'Monitoring & ECG', icon: Activity, badge: 'Live' },
          { key: 'risk', label: 'AI Risk Engine', icon: Sparkles, badge: 'AI' },
          { key: 'history', label: 'Medical History', icon: History },
          { key: 'labs', label: `Labs (${patient.lab_results.length})`, icon: FlaskConical },
          { key: 'medications', label: `Meds (${patient.medications.length})`, icon: Pill },
          { key: 'notes', label: `Doctor Notes (${patient.clinical_notes.length})`, icon: FileText },
          { key: 'nursing', label: `Nursing (${patient.nursing_notes.length})`, icon: Stethoscope },
          { key: 'orders', label: `Orders (${patient.doctor_orders.length})`, icon: Clock },
          { key: 'timeline', label: 'Timeline', icon: History }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-sky-500/20 text-sky-300'}`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT AREA */}

      {/* 1. OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Live Telemetry Snapshot & ECG */}
            <div className="lg:col-span-2 space-y-6">
              <ECGWaveform heartRate={latestV?.heart_rate || 78} height={120} />

              {/* Latest Clinical Note & Plan */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-sky-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Latest Physician Assessment</h3>
                  </div>
                  <button onClick={() => setActiveTab('notes')} className="text-xs text-sky-400 hover:underline">
                    View All ({patient.clinical_notes.length})
                  </button>
                </div>
                {patient.clinical_notes.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                      {patient.clinical_notes[0].content}
                    </p>
                    {patient.clinical_notes[0].plan && (
                      <div className="p-3.5 rounded-xl bg-sky-950/20 border border-sky-500/20">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">Active Treatment Plan:</span>
                        <p className="text-xs text-slate-300 whitespace-pre-line font-mono">{patient.clinical_notes[0].plan}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No physician progress notes recorded yet.</p>
                )}
              </div>
            </div>

            {/* Right 1 Col: AI Risk Breakdown Snapshot & Active Orders */}
            <div className="space-y-6">
              {/* AI Risk Snapshot */}
              {risk && (
                <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-sky-400" />
                      <span>AI Risk Evaluation</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      risk.risk_level === 'CRITICAL' ? 'bg-rose-500 text-white' :
                      risk.risk_level === 'HIGH RISK' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                    }`}>
                      {risk.risk_level}
                    </span>
                  </div>
                  <div className="text-center py-2">
                    <div className="text-3xl font-black text-white font-mono">{risk.risk_score}%</div>
                    <span className="text-[11px] text-slate-400">Composite Deterioration Index</span>
                  </div>
                  <div className="space-y-1.5 border-t border-sky-500/20 pt-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Top Physiological Drivers:</span>
                    {risk.contributing_factors.slice(0, 3).map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                        <span className="line-clamp-1">{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('risk')}
                    className="w-full text-center py-1.5 text-xs font-bold text-sky-400 hover:text-sky-300 bg-sky-950/60 rounded-lg border border-sky-500/30 transition mt-2"
                  >
                    View Full Factor Decomposition &rarr;
                  </button>
                </div>
              )}

              {/* Active Orders Quick Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 shadow-xl backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    <span>Active Orders</span>
                  </span>
                  <button onClick={() => setActiveTab('orders')} className="text-xs text-sky-400 hover:underline">
                    Manage
                  </button>
                </div>
                <div className="space-y-2">
                  {patient.doctor_orders.slice(0, 3).map((ord) => (
                    <div key={ord.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-2">
                      <div>
                        <div className="font-bold text-white">{ord.order_type}: {ord.description}</div>
                        <span className="text-[10px] text-slate-400">{formatTime(ord.timestamp)}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${ord.priority === 'STAT' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'}`}>
                        {ord.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MONITORING & VITALS TAB (RECHARTS + ECG) */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <ECGWaveform heartRate={latestV?.heart_rate || 78} height={140} />

          {/* Time range selector */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-300 tracking-wider">Multi-Parameter Vital Trends</span>
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['1h', '6h', '12h', '24h', 'all'].map((r) => (
                <button
                  key={r}
                  onClick={() => setVitalRange(r)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition uppercase ${vitalRange === r ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Recharts Vital Graphs Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Heart Rate & SpO2 Area Graph */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Cardiac & Oxygenation Trend</h3>
                <span className="text-[10px] text-slate-400 font-mono">HR (BPM) &bull; SpO2 (%)</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time_label" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[60, 160]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="heart_rate" stroke="#10b981" name="Heart Rate (bpm)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="spo2" stroke="#38bdf8" name="SpO2 (%)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Blood Pressure & Respiratory Rate */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Hemodynamics & Respiration Trend</h3>
                <span className="text-[10px] text-slate-400 font-mono">BP (mmHg) &bull; RR (/min)</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vitalTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time_label" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} domain={[10, 180]} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="systolic_bp" stroke="#f43f5e" name="Systolic BP" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="diastolic_bp" stroke="#fb7185" strokeDasharray="4 4" name="Diastolic BP" strokeWidth={2} />
                    <Line type="monotone" dataKey="respiratory_rate" stroke="#fbbf24" name="Respiration Rate" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. AI RISK ENGINE TAB */}
      {activeTab === 'risk' && risk && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-sky-500/30 bg-sky-950/20 p-6 space-y-6 shadow-2xl backdrop-blur-md">
            {/* Header Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-500/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-sky-400" />
                  <h2 className="text-lg font-black text-white">Prototype AI Deterioration Engine</h2>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">Continuous physiological risk modeling & factor attribution</p>
              </div>
              <span className="text-[10px] font-mono text-sky-300 bg-sky-900/60 border border-sky-500/30 px-3 py-1 rounded-full">
                {risk.disclaimer}
              </span>
            </div>

            {/* Score & Progression */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6 text-center space-y-2 flex flex-col items-center justify-center">
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Composite Risk Index</span>
                <div className="text-5xl font-black text-white font-mono">{risk.risk_score}%</div>
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  risk.risk_level === 'CRITICAL' ? 'bg-rose-500 text-white' :
                  risk.risk_level === 'HIGH RISK' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
                }`}>
                  {risk.risk_level}
                </span>
                <p className="text-[11px] text-slate-400 mt-2">{risk.explanation}</p>
              </div>

              {/* 4-Point Trend Line */}
              <div className="md:col-span-2 rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-3">
                <span className="text-xs uppercase font-bold text-slate-300 tracking-wider block">
                  Historical Risk Progression (4-Point Trend)
                </span>
                <div className="grid grid-cols-4 gap-3 pt-4">
                  {risk.trend.map((score, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                      <span className="text-[10px] text-slate-500 font-mono block">T - {(3 - i) * 2}H</span>
                      <span className="text-lg font-black font-mono text-sky-400">{score}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Factor Contribution Breakdown */}
            <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-6 space-y-4">
              <h3 className="text-xs uppercase font-bold text-white tracking-wider">
                Contributing Factor Breakdown (% Attribution)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(risk.factors).map(([key, val]) => (
                  <div key={key} className="space-y-1.5 p-3 rounded-xl bg-slate-900 border border-slate-800/80">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-300">{risk.factor_labels[key] || key}</span>
                      <span className="font-mono text-sky-400 font-bold">{val.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${val > 25 ? 'bg-rose-500' : val > 15 ? 'bg-amber-500' : 'bg-sky-500'}`}
                        style={{ width: `${Math.min(100, val * 2.5)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MEDICAL HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-sky-400" />
              <span>Comprehensive Medical & Surgical History</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Chronic Conditions */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold uppercase text-sky-300 tracking-wider block">Documented Chronic Conditions</span>
                <ul className="space-y-2 text-xs text-slate-200">
                  {patient.medical_history.map((item: any, i: number) => (
                    <li key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800/80">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                      <span>{typeof item === 'string' ? item : item.condition || JSON.stringify(item)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Past Admissions & Procedures */}
              <div className="space-y-3 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold uppercase text-teal-300 tracking-wider block">Prior Inpatient Admissions</span>
                <div className="space-y-2 text-xs text-slate-200">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white">2024-03-12 &bull; Acute Exacerbation Bronchitis</div>
                    <p className="text-[11px] text-slate-400">HealthNet Central Hospital &bull; Inpatient recovery completed</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-bold text-white">2022-11-04 &bull; Arthroscopy Elective</div>
                    <p className="text-[11px] text-slate-400">HealthNet North Hospital &bull; Uneventful surgical recovery</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. LAB REPORTS TAB */}
      {activeTab === 'labs' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-sky-400" />
                  <span>Clinical Laboratory Reports</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Biomarkers, arterial blood gas, hematology, and metabolic panels</p>
              </div>
              <button
                onClick={() => setShowLabModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-bold text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Lab Result</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                    <th className="pb-3">Test Name</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Result Value</th>
                    <th className="pb-3">Reference Range</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Reported Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {patient.lab_results.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-850/40 transition">
                      <td className="py-3 font-bold text-white">{l.test_name}</td>
                      <td className="py-3 text-slate-400">{l.category}</td>
                      <td className="py-3 font-mono font-bold text-sky-300">
                        {l.value} <span className="text-[10px] text-slate-500">{l.unit}</span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">{l.reference_range}</td>
                      <td className="py-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                          l.status === 'CRITICAL' ? 'bg-rose-500 text-white' :
                          l.status === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          l.status === 'LOW' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-400 font-mono">{formatTime(l.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. MEDICATIONS TAB */}
      {activeTab === 'medications' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Pill className="h-4 w-4 text-teal-400" />
                  <span>Inpatient Medication Orders & Continuous Infusions</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Active prescriptions, antimicrobial therapy, and pressors</p>
              </div>
              <button
                onClick={() => setShowMedModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-2 text-xs font-bold text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Prescribe Medication</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patient.medications.map((m) => (
                <div
                  key={m.id}
                  className={`p-4 rounded-xl border ${m.status === 'DISCONTINUED' ? 'bg-slate-950/40 border-slate-800 opacity-60' : 'bg-slate-950 border-slate-800'} space-y-2`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{m.drug_name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {m.dosage} &bull; Route: <strong className="text-slate-200">{m.route}</strong> &bull; Freq: {m.frequency}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      m.status === 'ACTIVE' ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' :
                      m.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span>Started: {formatDate(m.start_date)}</span>
                    {m.status !== 'DISCONTINUED' && (
                      <button
                        onClick={() => handleDiscontinueMed(m.id)}
                        className="text-[10px] font-bold text-rose-400 hover:underline"
                      >
                        Discontinue
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. CLINICAL NOTES TAB */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-sky-400" />
                  <span>Physician Clinical Notes</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Progress notes, SOAP assessments, procedures, and discharge summaries</p>
              </div>
              <button
                onClick={() => setShowNoteModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-bold text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="space-y-4">
              {patient.clinical_notes.map((n) => (
                <div key={n.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-sky-950 border border-sky-500/30 text-sky-300 px-2 py-0.5 rounded">
                        {n.note_type} NOTE
                      </span>
                      <span className="text-xs font-bold text-white">{n.doctor_name}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{formatTime(n.timestamp)}</span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                    {n.content}
                  </p>

                  {n.plan && (
                    <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/20">
                      <span className="text-[10px] font-bold uppercase text-sky-400 block mb-1">Physician Plan:</span>
                      <p className="text-xs text-slate-300 whitespace-pre-line font-mono">{n.plan}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. NURSING CARE NOTES TAB */}
      {activeTab === 'nursing' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-teal-400" />
              <span>Bedside Nursing Shift Notes</span>
            </h2>
            <p className="text-xs text-slate-400">Continuous observations logged by floor & ICU nurses</p>

            <div className="space-y-3">
              {patient.nursing_notes.map((nn) => (
                <div key={nn.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-300">{nn.nurse_name || 'Staff Nurse'}</span>
                    <span className="text-xs text-slate-400 font-mono">{formatTime(nn.timestamp)}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{nn.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 9. DOCTOR ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-400" />
                  <span>Physician Clinical Orders</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Labs, bedside imaging, procedures, and specialist consultations</p>
              </div>
              <button
                onClick={() => setShowOrderModal(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-bold text-white transition"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Order</span>
              </button>
            </div>

            <div className="space-y-3">
              {patient.doctor_orders.map((ord) => (
                <div key={ord.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase bg-indigo-950 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded">
                        {ord.order_type}
                      </span>
                      <span className="text-xs font-bold text-white">{ord.description}</span>
                    </div>
                    {ord.notes && <p className="text-[11px] text-slate-400">{ord.notes}</p>}
                    <span className="text-[10px] text-slate-500 font-mono block">Ordered by {ord.doctor_name} &bull; {formatTime(ord.timestamp)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      ord.priority === 'STAT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {ord.priority}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 10. TIMELINE TAB */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl backdrop-blur-sm space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-sky-400" />
              <span>Patient Clinical Event Stream</span>
            </h2>

            <div className="relative pl-6 border-l border-slate-800 space-y-6">
              {patient.timeline_events.map((evt) => (
                <div key={evt.id} className="relative group">
                  {/* Timeline node */}
                  <div className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
                    evt.severity === 'CRITICAL' ? 'bg-rose-500 animate-pulse' :
                    evt.severity === 'HIGH' ? 'bg-amber-400' : 'bg-sky-400'
                  }`} />
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{evt.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">{formatTime(evt.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{evt.description}</p>
                    {evt.actor_name && (
                      <span className="text-[10px] text-slate-500 block pt-1">
                        Recorded by {evt.actor_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}

      {/* Add Clinical Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-sky-400" />
                <span>Add Clinical Note</span>
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Note Type</label>
                <select
                  value={noteForm.note_type}
                  onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                >
                  <option value="PROGRESS">Progress Note</option>
                  <option value="OBSERVATION">Observation Note</option>
                  <option value="ASSESSMENT">Assessment / SOAP</option>
                  <option value="PROCEDURE">Procedure Note</option>
                  <option value="DISCHARGE">Discharge Summary Note</option>
                  <option value="GENERAL">General Physician Note</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Clinical Narrative</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter detailed clinical impressions, examination findings..."
                  value={noteForm.content}
                  onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Treatment Plan (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="1. Continue IV fluids..."
                  value={noteForm.plan}
                  onChange={(e) => setNoteForm({ ...noteForm, plan: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Doctor Order Modal */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-400" />
                <span>Create Physician Order</span>
              </h3>
              <button onClick={() => setShowOrderModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Order Type</label>
                <select
                  value={orderForm.order_type}
                  onChange={(e) => setOrderForm({ ...orderForm, order_type: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                >
                  <option value="LAB">Laboratory Diagnostic</option>
                  <option value="IMAGING">Bedside / Radiology Imaging</option>
                  <option value="PROCEDURE">Bedside Procedure</option>
                  <option value="MEDICATION">Special Medication Protocol</option>
                  <option value="CONSULT">Specialist Consult</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Order Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 12-Lead ECG Stat, Portable CXR..."
                  value={orderForm.description}
                  onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Priority</label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="STAT">STAT (Immediate)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Submit Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescribe Medication Modal */}
      {showMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Pill className="h-4 w-4 text-teal-400" />
                <span>Prescribe Medication</span>
              </h3>
              <button onClick={() => setShowMedModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handlePrescribeMed} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Drug Name & Formulation</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meropenem IV, Levophed..."
                  value={medForm.drug_name}
                  onChange={(e) => setMedForm({ ...medForm, drug_name: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Dosage</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1000 mg"
                    value={medForm.dosage}
                    onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Frequency</label>
                  <select
                    value={medForm.frequency}
                    onChange={(e) => setMedForm({ ...medForm, frequency: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  >
                    <option value="STAT">STAT</option>
                    <option value="Q6H">Q6H</option>
                    <option value="Q8H">Q8H</option>
                    <option value="Q12H">Q12H</option>
                    <option value="DAILY">Daily</option>
                    <option value="CONTINUOUS">Continuous IV</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Route</label>
                <select
                  value={medForm.route}
                  onChange={(e) => setMedForm({ ...medForm, route: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                >
                  <option value="IV">Intravenous (IV)</option>
                  <option value="ORAL">Oral (PO)</option>
                  <option value="SC">Subcutaneous (SC)</option>
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="NEB">Nebulized</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMedModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Sign & Prescribe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Lab Result Modal */}
      {showLabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-sky-400" />
                <span>Add Lab Result</span>
              </h3>
              <button onClick={() => setShowLabModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddLab} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Test Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Troponin I, Serum Lactate..."
                  value={labForm.test_name}
                  onChange={(e) => setLabForm({ ...labForm, test_name: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2.4"
                    value={labForm.value}
                    onChange={(e) => setLabForm({ ...labForm, value: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. mmol/L, mg/dL"
                    value={labForm.unit}
                    onChange={(e) => setLabForm({ ...labForm, unit: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Reference Range</label>
                  <input
                    type="text"
                    placeholder="0.5 - 2.0"
                    value={labForm.reference_range}
                    onChange={(e) => setLabForm({ ...labForm, reference_range: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase">Status</label>
                  <select
                    value={labForm.status}
                    onChange={(e) => setLabForm({ ...labForm, status: e.target.value })}
                    className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="LOW">LOW</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLabModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Log Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Patient Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-amber-400" />
                <span>Request Department Transfer</span>
              </h3>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRequestTransfer} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Target Unit / Department</label>
                <select
                  value={transferForm.to_department_id}
                  onChange={(e) => setTransferForm({ ...transferForm, to_department_id: Number(e.target.value) })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                >
                  <option value={1}>Medical ICU</option>
                  <option value={2}>Surgical Step-Down</option>
                  <option value={3}>Cardiology Step-Down</option>
                  <option value={4}>General Inpatient Ward</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Transfer Rationale</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Clinical stabilization, stepdown care, specialized surgical monitoring..."
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm({ ...transferForm, reason: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Discharge Patient Modal */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LogOut className="h-4 w-4 text-rose-400" />
                <span>Confirm Patient Discharge</span>
              </h3>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleDischargePatient} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Discharge Reason</label>
                <select
                  value={dischargeForm.reason}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, reason: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                >
                  <option value="RECOVERY">Clinical Recovery / Fit for Home</option>
                  <option value="HOME_CARE">Home Care / Telehealth Follow-up</option>
                  <option value="TRANSFER">External Facility Transfer</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Discharge Summary</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Comprehensive inpatient hospital course summary and discharge criteria met..."
                  value={dischargeForm.discharge_summary}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, discharge_summary: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase">Discharge Instructions & Follow-up</label>
                <textarea
                  rows={2}
                  placeholder="Post-discharge medication regimen, clinic follow-up in 1 week..."
                  value={dischargeForm.instructions}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, instructions: e.target.value })}
                  className="w-full mt-1 rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-xs font-bold text-white"
                >
                  Confirm Discharge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
