import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  HeartPulse, Activity, AlertTriangle, CheckCircle2, ShieldAlert,
  Clock, ArrowLeft, RefreshCw, User, BedDouble
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { NursePatient, NurseVitalsFormData } from '../../types';

export const NurseVitalsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patient_id');

  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(
    initialPatientId ? Number(initialPatientId) : null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCriticalAlert, setIsCriticalAlert] = useState(false);

  // Form State
  const [heartRate, setHeartRate] = useState<number>(78);
  const [spo2, setSpo2] = useState<number>(98);
  const [systolicBp, setSystolicBp] = useState<number>(120);
  const [diastolicBp, setDiastolicBp] = useState<number>(80);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(16);
  const [temperature, setTemperature] = useState<number>(37.0);
  const [painScore, setPainScore] = useState<number>(0);
  const [consciousness, setConsciousness] = useState<'ALERT' | 'VOICE' | 'PAIN' | 'UNRESPONSIVE'>('ALERT');

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await nurseAPI.getPatients();
        setPatients(data);
        if (!selectedPatientId && data.length > 0) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load patients:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  // Prototype Threshold Calculations
  const getSpo2Status = (val: number) => {
    if (val >= 94) return { label: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    if (val >= 90) return { label: 'WARNING', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    return { label: 'CRITICAL', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' };
  };

  const getHrStatus = (val: number) => {
    if (val >= 60 && val <= 100) return { label: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    if (val > 100 && val <= 120) return { label: 'WARNING', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    return { label: 'CRITICAL', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' };
  };

  const getRrStatus = (val: number) => {
    if (val >= 12 && val <= 20) return { label: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    if (val > 20 && val <= 28) return { label: 'WARNING', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    return { label: 'CRITICAL', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' };
  };

  const getTempStatus = (val: number) => {
    if (val >= 36.0 && val <= 37.5) return { label: 'NORMAL', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30' };
    if (val > 37.5 && val <= 38.5) return { label: 'WARNING', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30' };
    return { label: 'HIGH / CRITICAL', color: 'text-rose-400', bg: 'bg-rose-500/20 border-rose-500/30' };
  };

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    try {
      setSubmitting(true);
      const payload: NurseVitalsFormData = {
        heart_rate: Number(heartRate),
        spo2: Number(spo2),
        systolic_bp: Number(systolicBp),
        diastolic_bp: Number(diastolicBp),
        respiratory_rate: Number(respiratoryRate),
        temperature: Number(temperature),
        pain_score: Number(painScore),
        consciousness
      };

      const result = await nurseAPI.recordVitals(selectedPatientId, payload);
      const isCrit = payload.spo2 < 90 || payload.heart_rate > 120 || payload.respiratory_rate > 28 || payload.temperature > 39.0;
      setIsCriticalAlert(isCrit);

      setSuccessMessage(
        `Vitals recorded successfully for ${selectedPatient?.full_name || 'Patient'}. ${
          isCrit ? '⚠️ Critical vital thresholds detected - Emergency alert emitted to on-duty team.' : ''
        }`
      );

      setTimeout(() => {
        setSuccessMessage(null);
      }, 7000);
    } catch (err: any) {
      console.error('Failed to record vitals:', err);
      alert(err.response?.data?.detail || 'Failed to record vitals');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/nurse/patients"
            className="rounded-xl border border-gray-200 bg-gray-100 p-2.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                Bedside Telemetry & Triage
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 mt-1">Record Patient Vitals</h1>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold shadow-xl flex items-center justify-between ${
            isCriticalAlert
              ? 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              : 'bg-teal-950/70 border-teal-500/40 text-teal-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {isCriticalAlert ? (
              <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 animate-bounce" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
            )}
            <div>
              <p className="font-bold text-white text-sm">Vitals Saved to Clinical Database</p>
              <p>{successMessage}</p>
            </div>
          </div>
          {selectedPatientId && (
            <Link
              to={`/nurse/patients/${selectedPatientId}`}
              className="rounded-xl bg-gray-200 hover:bg-gray-300 px-3.5 py-1.5 text-xs text-white transition flex-shrink-0"
            >
              View Patient Chart
            </Link>
          )}
        </div>
      )}

      {/* Main Recording Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient Selection Card */}
        <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
            Select Assigned Inpatient
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <select
                value={selectedPatientId || ''}
                onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 font-semibold focus:outline-none focus:border-teal-500 transition"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} ({p.mrn}) • Bed: {p.bed_code || 'N/A'} • {p.diagnosis}
                  </option>
                ))}
              </select>
            </div>

            {selectedPatient && (
              <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-200 text-xs flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{selectedPatient.full_name}</p>
                  <p className="text-[11px] text-gray-500">
                    {selectedPatient.age}y {selectedPatient.gender} • Doctor: {selectedPatient.assigned_doctor_name || 'Unassigned'}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950/60 px-2 py-1 rounded border border-teal-500/20">
                  {selectedPatient.bed_code || 'Unassigned'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Vital Parameters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SpO2 */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-teal-400" />
                <span>Oxygen Saturation (SpO2)</span>
              </label>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getSpo2Status(spo2).bg} ${getSpo2Status(spo2).color}`}>
                {getSpo2Status(spo2).label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="50"
                max="100"
                required
                value={spo2}
                onChange={(e) => setSpo2(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black font-mono text-gray-900 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-bold text-gray-500">%</span>
            </div>
            <p className="text-[11px] text-gray-500">Normal: &ge;94% • Warning: 90–93% • Critical: &lt;90%</p>
          </div>

          {/* Heart Rate */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-rose-400" />
                <span>Heart Rate (Pulse)</span>
              </label>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getHrStatus(heartRate).bg} ${getHrStatus(heartRate).color}`}>
                {getHrStatus(heartRate).label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="30"
                max="250"
                required
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black font-mono text-gray-900 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-bold text-gray-500">bpm</span>
            </div>
            <p className="text-[11px] text-gray-500">Normal: 60–100 • Warning: 101–120 • Critical: &gt;120</p>
          </div>

          {/* Blood Pressure */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 shadow-xl space-y-3">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-sky-400" />
              <span>Blood Pressure (Systolic / Diastolic)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="260"
                  required
                  placeholder="Systolic"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black font-mono text-gray-900 focus:outline-none focus:border-teal-500"
                />
                <span className="text-gray-400 font-bold">/</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="30"
                  max="160"
                  required
                  placeholder="Diastolic"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black font-mono text-gray-900 focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs font-bold text-gray-500">mmHg</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">Standard Target: 120 / 80 mmHg</p>
          </div>

          {/* Respiratory Rate */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-amber-400" />
                <span>Respiratory Rate</span>
              </label>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getRrStatus(respiratoryRate).bg} ${getRrStatus(respiratoryRate).color}`}>
                {getRrStatus(respiratoryRate).label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="5"
                max="60"
                required
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black font-mono text-gray-900 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-bold text-gray-500">breaths/min</span>
            </div>
            <p className="text-[11px] text-gray-500">Normal: 12–20 • Warning: 21–28 • Critical: &gt;28</p>
          </div>

          {/* Temperature */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                <Activity className="h-4 w-4 text-rose-400" />
                <span>Core Temperature</span>
              </label>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${getTempStatus(temperature).bg} ${getTempStatus(temperature).color}`}>
                {getTempStatus(temperature).label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="32"
                max="44"
                required
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-lg font-black font-mono text-gray-900 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs font-bold text-gray-500">°C</span>
            </div>
            <p className="text-[11px] text-gray-500">Normal: 36.0–37.5°C • Warning: 37.6–38.5°C • High: &gt;38.5°C</p>
          </div>

          {/* Consciousness & Pain */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 shadow-xl space-y-3">
            <label className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-purple-400" />
              <span>Consciousness Level (AVPU) & Pain</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={consciousness}
                onChange={(e) => setConsciousness(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-teal-500"
              >
                <option value="ALERT">Alert (A)</option>
                <option value="VOICE">Voice Response (V)</option>
                <option value="PAIN">Pain Response (P)</option>
                <option value="UNRESPONSIVE">Unresponsive (U)</option>
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="Pain (0-10)"
                  value={painScore}
                  onChange={(e) => setPainScore(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-900 focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-gray-500 font-medium">/ 10</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500">AVPU scale + Numeric Pain Rating</p>
          </div>
        </div>

        {/* Prototype Threshold Disclaimer */}
        <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-[11px] text-gray-500 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong className="text-gray-600">PROTOTYPE THRESHOLDS:</strong> The threshold ranges and warnings shown are prototype demo indicators and do not constitute clinical decision support or formal medical recommendations.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/nurse/patients"
            className="rounded-xl border border-gray-300 bg-gray-200 px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-300 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !selectedPatientId}
            className="rounded-xl bg-teal-600 hover:bg-teal-500 px-8 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition disabled:opacity-50 flex items-center gap-2"
          >
            <HeartPulse className="h-4 w-4" />
            <span>{submitting ? 'Recording Vitals...' : 'SAVE VITALS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
