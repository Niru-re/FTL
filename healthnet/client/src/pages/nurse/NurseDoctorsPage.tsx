import React, { useState, useEffect } from 'react';
import {
  Stethoscope, Search, CheckCircle2, Phone, Clock,
  RefreshCw, X, User, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { Staff, NursePatient } from '../../types';

export const NurseDoctorsPage: React.FC = () => {
  const [doctors, setDoctors] = useState<Staff[]>([]);
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Consultation Request Modal
  const [activeDoctor, setActiveDoctor] = useState<Staff | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [priority, setPriority] = useState('ROUTINE');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchDoctorsAndPatients = async () => {
    try {
      setLoading(true);
      const [docsData, ptsData] = await Promise.all([
        nurseAPI.getDoctors(),
        nurseAPI.getPatients()
      ]);
      setDoctors(docsData);
      setPatients(ptsData);
      if (ptsData.length > 0 && !selectedPatientId) {
        setSelectedPatientId(ptsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load doctors roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorsAndPatients();
  }, []);

  const handleOpenRequestModal = (doc: Staff) => {
    setActiveDoctor(doc);
    setReason('');
    setPriority('ROUTINE');
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !reason.trim()) return;

    try {
      setSubmitting(true);
      const res = await nurseAPI.requestDoctor({
        patient_id: selectedPatientId,
        doctor_id: activeDoctor?.id,
        reason: reason.trim(),
        priority
      });
      setSuccessNotice(
        `Consultation request successfully submitted for ${res.patient_name || 'Patient'} to ${activeDoctor?.name || 'Physician'}.`
      );
      setActiveDoctor(null);
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to request doctor');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDoctors = doctors.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.specialization.toLowerCase().includes(q) ||
      (d.department_name && d.department_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Medical Staff Roster & Availability
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            On-Duty Attending Physicians
          </h1>
          <p className="text-xs text-gray-500">
            Available medical specialists and clinical consultation dispatch
          </p>
        </div>

        <button
          onClick={fetchDoctorsAndPatients}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-300/80 bg-gray-200/80 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Roster</span>
        </button>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="rounded-2xl border border-sky-500/40 bg-sky-950/70 p-4 text-xs font-semibold text-sky-200 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-sky-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Request Emitted</p>
              <p>{successNotice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search doctor name, specialty, dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50/70 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs">
            Loading physicians roster...
          </div>
        ) : filteredDoctors.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs">
            No doctors found matching the search query.
          </div>
        ) : (
          filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-2xl border border-gray-200/80 bg-gray-100/60 shadow-xl space-y-4 flex flex-col justify-between bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold flex-shrink-0">
                      <Stethoscope className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{doc.name}</h3>
                      <p className="text-[11px] font-mono text-gray-500">{doc.employee_code}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      doc.on_duty_status === 'ON_DUTY'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-gray-200 text-gray-500 border-gray-300'
                    }`}
                  >
                    {doc.on_duty_status}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-gray-400">Specialization:</span>
                    <span className="font-bold text-sky-300">{doc.specialization}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-gray-400">Department:</span>
                    <span>{doc.department_name || 'General Medicine'}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-gray-400">Active Shift:</span>
                    <span className="font-mono">{doc.shift}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-gray-400">Current Inpatients:</span>
                    <span className="font-mono font-bold text-white">{doc.assigned_patients_count} patients</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600">
                    <span className="text-gray-400">Direct Contact:</span>
                    <span className="font-mono text-[11px] flex items-center gap-1">
                      <Phone className="h-3 w-3 text-gray-400" /> {doc.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200/80">
                <button
                  onClick={() => handleOpenRequestModal(doc)}
                  className="w-full rounded-xl bg-sky-600/20 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-sky-600 text-sky-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white py-2 text-xs font-bold transition flex items-center justify-center gap-2 border border-sky-500/30 shadow-sm"
                >
                  <Stethoscope className="h-3.5 w-3.5" />
                  <span>Request Bedside Evaluation</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Doctor Request Modal */}
      {activeDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-sky-400" />
                  <span>Request Physician Consultation</span>
                </h3>
                <p className="text-xs text-gray-500">Target Doctor: {activeDoctor.name} ({activeDoctor.specialization})</p>
              </div>
              <button onClick={() => setActiveDoctor(null)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRequestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Select Patient
                </label>
                <select
                  value={selectedPatientId || ''}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn}) • Bed: {p.bed_code || 'N/A'} • {p.risk_level}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Consultation Urgency / Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-sky-500"
                >
                  <option value="ROUTINE">Routine Daily Rounding</option>
                  <option value="URGENT">Urgent Evaluation (within 30 mins)</option>
                  <option value="STAT">STAT / Code Bedside Evaluation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Clinical Reason & Summary of Findings
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Patient having acute drops in SpO2 with elevated troponin markers..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveDoctor(null)}
                  className="rounded-xl border border-gray-300 bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !reason.trim()}
                  className="rounded-xl bg-sky-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-sky-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-sky-900/40 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Dispatch Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
