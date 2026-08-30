import React, { useState, useEffect } from 'react';
import {
  ArrowRightLeft, CheckCircle2, Clock, Plus, RefreshCw,
  User, ShieldAlert, FileText, BedDouble, HeartPulse, X, AlertTriangle
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { ShiftHandover, NursePatient } from '../../types';

export const NurseHandoverPage: React.FC = () => {
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [loading, setLoading] = useState(true);

  // New Handover Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [incomingNurseName, setIncomingNurseName] = useState('Nurse Maya Lin');
  const [shift, setShift] = useState('MORNING_TO_EVENING');
  const [generalNotes, setGeneralNotes] = useState('');
  const [pendingTasksSummary, setPendingTasksSummary] = useState('');
  const [criticalObservations, setCriticalObservations] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchHandoverData = async () => {
    try {
      setLoading(true);
      const [hoData, ptsData] = await Promise.all([
        nurseAPI.getHandovers(),
        nurseAPI.getPatients()
      ]);
      setHandovers(hoData);
      setPatients(ptsData);
    } catch (err) {
      console.error('Failed to load handover logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHandoverData();
  }, []);

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalNotes.trim()) return;

    try {
      setSubmitting(true);
      await nurseAPI.createHandover({
        incoming_nurse_name: incomingNurseName,
        shift,
        general_notes: generalNotes.trim(),
        pending_tasks_summary: pendingTasksSummary.trim() || undefined,
        critical_observations: criticalObservations.trim() || undefined
      });
      setSuccessNotice('Shift handover record successfully logged and transferred.');
      setShowCreateModal(false);
      setGeneralNotes('');
      setPendingTasksSummary('');
      setCriticalObservations('');
      await fetchHandoverData();
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err) {
      console.error('Failed to create handover:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Shift Transition & Continuity of Care
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Nurse Shift Handover Station
          </h1>
          <p className="text-xs text-slate-400">
            Clinical handover protocol, inpatient census transfer, and shift sign-off
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchHandoverData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-amber-900/40 transition"
          >
            <Plus className="h-4 w-4" />
            <span>CREATE SHIFT HANDOVER</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-950/70 p-4 text-xs font-semibold text-amber-200 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Handover Logged</p>
              <p>{successNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Inpatient Census Snapshot */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 backdrop-blur-md shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-teal-400" />
              <span>Active Ward Patient Transfer Matrix ({patients.length})</span>
            </h2>
            <p className="text-[11px] text-slate-400">Current status and risk overview for shift transfer</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            Dept: Medical ICU
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase text-slate-400">
                <th className="py-3 pl-2">Patient</th>
                <th className="py-3">Bed</th>
                <th className="py-3">Diagnosis</th>
                <th className="py-3">Risk Tier</th>
                <th className="py-3">Latest Vitals</th>
                <th className="py-3">Attending Doctor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {patients.slice(0, 8).map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 pl-2 font-bold text-white">
                    {p.full_name}
                    <span className="block text-[10px] font-mono text-slate-400 font-normal">{p.mrn}</span>
                  </td>
                  <td className="py-3 font-mono font-bold text-teal-300">
                    {p.bed_code || 'Unassigned'}
                  </td>
                  <td className="py-3 text-slate-300 max-w-[200px] truncate">{p.diagnosis}</td>
                  <td className="py-3">
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        p.risk_level === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : p.risk_level === 'HIGH RISK'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {p.risk_level}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-[11px]">
                    {p.latest_vitals ? (
                      <span>
                        SpO2: {p.latest_vitals.spo2}% • HR: {p.latest_vitals.heart_rate} • BP: {p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">No vitals logged</span>
                    )}
                  </td>
                  <td className="py-3 text-slate-300">{p.assigned_doctor_name || 'Dr. Ananya Mehta'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Previous Handover Logs */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <span>Historical Shift Handover Logs</span>
        </h2>

        <div className="space-y-3">
          {handovers.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400 text-xs">
              No historical shift handovers found.
            </div>
          ) : (
            handovers.map((h) => (
              <div
                key={h.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-400 font-mono uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {h.shift}
                    </span>
                    <span className="text-xs font-bold text-white">
                      Outgoing: <strong className="text-teal-300">{h.outgoing_nurse_name}</strong> &rarr; Incoming: <strong className="text-sky-300">{h.incoming_nurse_name}</strong>
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">General Shift Notes</p>
                    <p className="text-slate-200 mt-0.5 leading-relaxed">{h.general_notes}</p>
                  </div>

                  {h.pending_tasks_summary && (
                    <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      <p className="text-[10px] font-bold text-purple-400 uppercase">Pending Care Tasks</p>
                      <p className="text-slate-300 mt-0.5">{h.pending_tasks_summary}</p>
                    </div>
                  )}

                  {h.critical_observations && (
                    <div className="bg-rose-950/20 p-3 rounded-xl border border-rose-500/30">
                      <p className="text-[10px] font-bold text-rose-400 uppercase">Critical Observations & High Risk</p>
                      <p className="text-rose-200 mt-0.5">{h.critical_observations}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Handover Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-amber-400" />
                <span>Create Shift Handover Record</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateHandover} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Incoming Nurse Name
                  </label>
                  <input
                    type="text"
                    required
                    value={incomingNurseName}
                    onChange={(e) => setIncomingNurseName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Shift Change
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                  >
                    <option value="MORNING_TO_EVENING">Morning &rarr; Evening</option>
                    <option value="EVENING_TO_NIGHT">Evening &rarr; Night</option>
                    <option value="NIGHT_TO_MORNING">Night &rarr; Morning</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  General Ward Notes & Census
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize ward census, intubated patients, incoming admissions, bed availability..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Pending Tasks Summary (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q2H vitals for Bed 03, antibiotic IV due at 17:00..."
                  value={pendingTasksSummary}
                  onChange={(e) => setPendingTasksSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Critical Observations & High Risk Flags (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Watch PT-1042 for SpO2 desaturation; Arterial line flush required..."
                  value={criticalObservations}
                  onChange={(e) => setCriticalObservations(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !generalNotes.trim()}
                  className="rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-amber-900/40 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save & Transfer Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
