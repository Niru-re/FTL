import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, HeartPulse, Stethoscope, BedDouble, Plus,
  CheckCircle2, Clock, Pill, FileText, AlertTriangle, ShieldAlert,
  Activity, RefreshCw, X, User
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { NursePatientDetail, PatientVital, NursingNote, Medication, NurseTask } from '../../types';

export const NursePatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const patientId = Number(id);

  const [patient, setPatient] = useState<NursePatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [doctorReason, setDoctorReason] = useState('');
  const [doctorPriority, setDoctorPriority] = useState('ROUTINE');
  const [submittingDocReq, setSubmittingDocReq] = useState(false);
  const [docReqSuccess, setDocReqSuccess] = useState<string | null>(null);

  const fetchPatientDetail = async () => {
    try {
      setLoading(true);
      const data = await nurseAPI.getPatientDetail(patientId);
      setPatient(data);
    } catch (err) {
      console.error('Failed to load patient detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchPatientDetail();
    }
  }, [patientId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      setSubmittingNote(true);
      await nurseAPI.addNursingNote(patientId, newNote.trim());
      setNewNote('');
      setShowNoteModal(false);
      await fetchPatientDetail();
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleRequestDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorReason.trim()) return;
    try {
      setSubmittingDocReq(true);
      const res = await nurseAPI.requestDoctor({
        patient_id: patientId,
        reason: doctorReason.trim(),
        priority: doctorPriority
      });
      setDocReqSuccess(`Physician request submitted successfully for ${res.patient_name || 'patient'}. Priority: ${doctorPriority}`);
      setShowDoctorModal(false);
      setDoctorReason('');
      setTimeout(() => setDocReqSuccess(null), 6000);
    } catch (err) {
      console.error('Failed to request doctor:', err);
    } finally {
      setSubmittingDocReq(false);
    }
  };

  const handleAdministerMed = async (medId: number) => {
    if (!confirm('Confirm administration of this scheduled medication?')) return;
    try {
      await nurseAPI.administerMedication(medId, { status: 'ADMINISTERED' });
      await fetchPatientDetail();
    } catch (err) {
      console.error('Failed to administer med:', err);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await nurseAPI.updateTask(taskId, { is_completed: true });
      await fetchPatientDetail();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="h-5 w-5 animate-spin text-teal-400" />
          <span className="text-sm">Loading patient profile...</span>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-8 text-center space-y-4">
        <p className="text-sm text-gray-500">Patient not found or unauthorized access.</p>
        <Link
          to="/nurse/patients"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to My Patients
        </Link>
      </div>
    );
  }

  const latestV = patient.latest_vitals;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/nurse/patients"
            className="rounded-xl border border-gray-200 bg-gray-100 p-2.5 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-900 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-teal-400 font-bold">{patient.mrn}</span>
              <span className="text-gray-400">•</span>
              <span className="text-xs text-gray-500">{patient.department_name}</span>
            </div>
            <h1 className="text-2xl font-black text-white">{patient.full_name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setShowDoctorModal(true)}
            className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-950/40 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-sky-900/50 px-3.5 py-2 text-xs font-bold text-sky-300 transition"
          >
            <Stethoscope className="h-4 w-4" />
            <span>Request Doctor</span>
          </button>

          <Link
            to="/nurse/vitals"
            className="flex items-center gap-2 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition"
          >
            <HeartPulse className="h-4 w-4" />
            <span>Record Vitals</span>
          </Link>
        </div>
      </div>

      {/* Success notification */}
      {docReqSuccess && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-950/60 p-4 text-xs text-sky-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-400" />
            <span>{docReqSuccess}</span>
          </div>
        </div>
      )}

      {/* Patient Profile & Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Profile Card */}
        <div className="md:col-span-3 rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Inpatient Profile
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Current Status:</span>
              <span
                className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${
                  patient.risk_level === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : patient.risk_level === 'HIGH RISK'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                    : patient.risk_level === 'WATCH'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {patient.risk_level}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="text-gray-400 font-medium">Age / Gender</p>
              <p className="font-bold text-white text-sm">{patient.age} years • {patient.gender}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Blood Group</p>
              <p className="font-bold text-white text-sm">{patient.blood_group}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Assigned Bed</p>
              <p className="font-mono font-bold text-teal-300 text-sm flex items-center gap-1">
                <BedDouble className="h-3.5 w-3.5" />
                {patient.bed_code || 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Admission Date</p>
              <p className="font-medium text-gray-700">
                {new Date(patient.admission_date).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-200/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-1">
              <p className="text-gray-400 font-medium">Primary Clinical Diagnosis</p>
              <p className="font-semibold text-rose-300 mt-0.5">{patient.diagnosis}</p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Attending Physician</p>
              <p className="font-semibold text-gray-700 mt-0.5 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5 text-sky-400" />
                {patient.assigned_doctor_name || 'Pending assignment'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-medium">Charge Nurse</p>
              <p className="font-semibold text-gray-700 mt-0.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-teal-400" />
                {patient.assigned_nurse_name || 'Nurse Elena Rostova'}
              </p>
            </div>
          </div>
        </div>

        {/* Status Callout */}
        <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
              Clinical Care Scope
            </span>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Care Tier:</span>
                <span className="font-bold text-white font-mono">ICU Level 1</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Telemetry:</span>
                <span className="font-bold text-emerald-400">CONTINUOUS</span>
              </div>
              <div className="flex items-center justify-between">
                <span>IV Lines:</span>
                <span className="font-bold text-white">2 Peripheral + Port</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 text-[11px] text-gray-500">
            Confidential medical chart • Authorized nursing workspace
          </div>
        </div>
      </div>

      {/* Latest Vitals Strip */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-rose-400" />
            <span>Latest Recorded Vitals</span>
          </h2>
          <span className="text-xs text-gray-500">
            {latestV ? `Updated ${new Date(latestV.timestamp).toLocaleTimeString()}` : 'No vitals logged yet'}
          </span>
        </div>

        {latestV ? (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">SpO2</p>
              <p className={`text-xl font-black font-mono ${latestV.spo2 < 90 ? 'text-rose-400' : latestV.spo2 <= 93 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {latestV.spo2}%
              </p>
              <span className="text-[9px] font-bold text-gray-500">
                {latestV.spo2 >= 94 ? 'NORMAL' : latestV.spo2 >= 90 ? 'WARNING' : 'CRITICAL'}
              </span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Heart Rate</p>
              <p className={`text-xl font-black font-mono ${latestV.heart_rate > 120 ? 'text-rose-400' : latestV.heart_rate > 100 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {latestV.heart_rate} <span className="text-xs font-normal">bpm</span>
              </p>
              <span className="text-[9px] font-bold text-gray-500">
                {latestV.heart_rate <= 100 ? 'NORMAL' : latestV.heart_rate <= 120 ? 'WARNING' : 'CRITICAL'}
              </span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Blood Pressure</p>
              <p className="text-xl font-black font-mono text-white">
                {latestV.systolic_bp}/{latestV.diastolic_bp}
              </p>
              <span className="text-[9px] font-bold text-gray-500">mmHg</span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Resp. Rate</p>
              <p className={`text-xl font-black font-mono ${latestV.respiratory_rate > 28 ? 'text-rose-400' : latestV.respiratory_rate > 20 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {latestV.respiratory_rate} <span className="text-xs font-normal">/min</span>
              </p>
              <span className="text-[9px] font-bold text-gray-500">
                {latestV.respiratory_rate <= 20 ? 'NORMAL' : latestV.respiratory_rate <= 28 ? 'WARNING' : 'CRITICAL'}
              </span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Temperature</p>
              <p className={`text-xl font-black font-mono ${latestV.temperature > 38.5 ? 'text-rose-400' : latestV.temperature > 37.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {latestV.temperature}°C
              </p>
              <span className="text-[9px] font-bold text-gray-500">
                {latestV.temperature <= 37.5 ? 'NORMAL' : latestV.temperature <= 38.5 ? 'WARNING' : 'HIGH'}
              </span>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-center">
              <p className="text-[10px] uppercase font-bold text-gray-400">Consciousness</p>
              <p className="text-base font-black font-mono text-teal-300 mt-1">
                {latestV.consciousness || 'ALERT'}
              </p>
              <span className="text-[9px] font-bold text-gray-500">AVPU Score</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">No vitals logged yet for this patient.</p>
        )}
      </div>

      {/* Grid: Nursing Notes & Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Nursing Notes */}
        <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-teal-400" />
                <span>Nursing Progress Notes ({patient.nursing_notes.length})</span>
              </h2>
              <p className="text-[11px] text-gray-500">Ward observations and nursing documentation</p>
            </div>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 px-3 py-1.5 text-xs font-bold text-white transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Note</span>
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {patient.nursing_notes.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No nursing notes logged yet.</p>
            ) : (
              patient.nursing_notes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-xl bg-gray-50/60 border border-gray-200/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-teal-300">{note.nurse_name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {new Date(note.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {note.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Medications & Administration */}
        <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Pill className="h-4 w-4 text-purple-400" />
                <span>Medication Schedule ({patient.medications.length})</span>
              </h2>
              <p className="text-[11px] text-gray-500">Active doses & administration verification</p>
            </div>
            <Link
              to="/nurse/medications"
              className="text-xs font-semibold text-purple-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-purple-300"
            >
              All Meds
            </Link>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {patient.medications.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-6">No active medications scheduled.</p>
            ) : (
              patient.medications.map((med) => (
                <div
                  key={med.id}
                  className="p-3 rounded-xl bg-gray-50/60 border border-gray-200/80 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5 text-xs">
                    <p className="font-bold text-white">{med.drug_name}</p>
                    <p className="text-gray-500 text-[11px]">
                      Dose: <span className="text-gray-700">{med.dosage}</span> • Route: <span className="font-mono text-teal-300">{med.route}</span> • Freq: {med.frequency}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Status: <span className={med.status === 'ADMINISTERED' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>{med.status}</span>
                    </p>
                  </div>

                  {med.status === 'PENDING' || med.status === 'ACTIVE' ? (
                    <button
                      onClick={() => handleAdministerMed(med.id)}
                      className="rounded-lg bg-purple-600/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-purple-600 text-purple-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white px-3 py-1.5 text-xs font-bold transition flex-shrink-0"
                    >
                      Administer
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold flex-shrink-0">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Given
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Nursing Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-400" />
                <span>Add Nursing Progress Note</span>
              </h3>
              <button onClick={() => setShowNoteModal(false)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Clinical Observation / Nursing Assessment
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record patient response to therapy, telemetry patterns, wound status, or mobility..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="rounded-xl border border-gray-300 bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote || !newNote.trim()}
                  className="rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition disabled:opacity-50"
                >
                  {submittingNote ? 'Saving Note...' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-sky-400" />
                <span>Request Physician Evaluation</span>
              </h3>
              <button onClick={() => setShowDoctorModal(false)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRequestDoctor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Priority Level
                </label>
                <select
                  value={doctorPriority}
                  onChange={(e) => setDoctorPriority(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                >
                  <option value="ROUTINE">Routine Review</option>
                  <option value="URGENT">Urgent Consultation (within 30 mins)</option>
                  <option value="STAT">STAT / Emergency Bedside Evaluation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Clinical Reason & Summary
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe patient vital deterioration, chest pain, new arrhythmia, altered mental status..."
                  value={doctorReason}
                  onChange={(e) => setDoctorReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDoctorModal(false)}
                  className="rounded-xl border border-gray-300 bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDocReq || !doctorReason.trim()}
                  className="rounded-xl bg-sky-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-sky-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-900/40 transition disabled:opacity-50"
                >
                  {submittingDocReq ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
