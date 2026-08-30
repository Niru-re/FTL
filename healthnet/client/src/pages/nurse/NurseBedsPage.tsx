import React, { useState, useEffect } from 'react';
import {
  BedDouble, Filter, Search, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, ShieldAlert, Sparkles, User, X
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { Bed } from '../../types';

const ALLOWED_NURSE_TRANSITIONS: Record<string, string[]> = {
  OCCUPIED: ['CLEANING'],
  CLEANING: ['AVAILABLE'],
  AVAILABLE: ['RESERVED'],
  RESERVED: ['AVAILABLE']
};

export const NurseBedsPage: React.FC = () => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Transition Modal State
  const [activeBed, setActiveBed] = useState<Bed | null>(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [reason, setReason] = useState('Patient Discharge & Sanitization Protocol');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const data = await nurseAPI.getBeds({
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined
      });
      setBeds(data);
    } catch (err) {
      console.error('Failed to load nurse beds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBeds();
  }, [selectedStatus]);

  const openTransitionModal = (bed: Bed) => {
    const allowed = ALLOWED_NURSE_TRANSITIONS[bed.status] || [];
    if (allowed.length === 0) {
      alert(`Bed status '${bed.status}' has no permitted operational transitions for the Nurse role.`);
      return;
    }
    setActiveBed(bed);
    setTargetStatus(allowed[0]);
    setReason(
      bed.status === 'OCCUPIED'
        ? 'Patient Discharged / Transferred - Initiating Terminal Cleaning'
        : bed.status === 'CLEANING'
        ? 'Housekeeping Complete - Sanitized for Inpatient Intake'
        : 'Pre-reserving for incoming ambulance intake'
    );
    setNotes('');
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBed || !targetStatus) return;

    try {
      setSubmitting(true);
      await nurseAPI.updateBedStatus(activeBed.id, targetStatus, reason, notes);
      setSuccessNotice(`Bed ${activeBed.code} transitioned from ${activeBed.status} to ${targetStatus}.`);
      setActiveBed(null);
      await fetchBeds();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      console.error('Failed to update bed status:', err);
      alert(err.response?.data?.detail || 'Failed to update bed status');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBeds = beds.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      (b.patient_name && b.patient_name.toLowerCase().includes(q)) ||
      (b.doctor_name && b.doctor_name.toLowerCase().includes(q))
    );
  });

  // Summary Metrics
  const totalCount = beds.length;
  const occupiedCount = beds.filter((b) => b.status === 'OCCUPIED').length;
  const availableCount = beds.filter((b) => b.status === 'AVAILABLE').length;
  const cleaningCount = beds.filter((b) => b.status === 'CLEANING').length;
  const reservedCount = beds.filter((b) => b.status === 'RESERVED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Ward Floor Bed Matrix
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Bed Status & Sanitization
          </h1>
          <p className="text-xs text-slate-400">
            Operational bed management for Medical ICU & Inpatient Wards
          </p>
        </div>

        <button
          onClick={fetchBeds}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-950/60 p-4 text-xs font-semibold text-teal-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
            <span>{successNotice}</span>
          </div>
        </div>
      )}

      {/* Capacity Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] uppercase font-bold text-slate-500">Total Ward Beds</p>
          <p className="text-2xl font-black text-white font-mono mt-0.5">{totalCount}</p>
        </div>
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] uppercase font-bold text-emerald-400">Available Ready</p>
          <p className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{availableCount}</p>
        </div>
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] uppercase font-bold text-rose-400">Occupied</p>
          <p className="text-2xl font-black text-rose-400 font-mono mt-0.5">{occupiedCount}</p>
        </div>
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80">
          <p className="text-[10px] uppercase font-bold text-sky-400">Reserved (Incoming)</p>
          <p className="text-2xl font-black text-sky-400 font-mono mt-0.5">{reservedCount}</p>
        </div>
        <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800/80 col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold text-amber-400">Cleaning in Progress</p>
          <p className="text-2xl font-black text-amber-400 font-mono mt-0.5">{cleaningCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search bed code (ICU-01), patient..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
            <option value="CLEANING">Cleaning</option>
          </select>
        </div>
      </div>

      {/* Bed Grid Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => {
          const allowedTransitions = ALLOWED_NURSE_TRANSITIONS[bed.status] || [];
          const isOccupied = bed.status === 'OCCUPIED';
          const isAvailable = bed.status === 'AVAILABLE';
          const isCleaning = bed.status === 'CLEANING';
          const isReserved = bed.status === 'RESERVED';

          return (
            <div
              key={bed.id}
              className={`p-4 rounded-2xl border transition shadow-lg flex flex-col justify-between space-y-3 ${
                isOccupied
                  ? 'bg-rose-950/20 border-rose-500/30'
                  : isAvailable
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : isCleaning
                  ? 'bg-amber-950/20 border-amber-500/30'
                  : isReserved
                  ? 'bg-sky-950/20 border-sky-500/30'
                  : 'bg-slate-900/50 border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-sm font-black text-white flex items-center gap-1.5">
                    <BedDouble className="h-4 w-4 text-teal-400" />
                    {bed.code}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isOccupied
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : isAvailable
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isCleaning
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : isReserved
                        ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {bed.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <p className="text-slate-400 text-[11px]">{bed.department_name}</p>
                  {bed.patient_name ? (
                    <div className="pt-1">
                      <p className="font-bold text-white flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400" />
                        {bed.patient_name}
                      </p>
                      {bed.patient_mrn && (
                        <p className="text-[10px] font-mono text-slate-400">{bed.patient_mrn}</p>
                      )}
                      {bed.doctor_name && (
                        <p className="text-[10px] text-sky-300 mt-0.5">Doctor: {bed.doctor_name}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic pt-1">No patient currently assigned</p>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800/60">
                {allowedTransitions.length > 0 ? (
                  <button
                    onClick={() => openTransitionModal(bed)}
                    className="w-full py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 hover:text-white transition flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-teal-400" />
                    <span>Change Status</span>
                  </button>
                ) : (
                  <p className="text-[10px] text-center text-slate-500 font-mono">Administrative Managed</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transition Modal */}
      {activeBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BedDouble className="h-5 w-5 text-teal-400" />
                  <span>Update Bed Status ({activeBed.code})</span>
                </h3>
                <p className="text-xs text-slate-400">Permitted nurse operational transition</p>
              </div>
              <button onClick={() => setActiveBed(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select New Operational State
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-xl p-3 focus:outline-none focus:border-teal-500"
                >
                  {(ALLOWED_NURSE_TRANSITIONS[activeBed.status] || []).map((st) => (
                    <option key={st} value={st}>
                      {st} {st === 'CLEANING' ? '(Terminal Sanitization)' : st === 'AVAILABLE' ? '(Ready for Intake)' : '(Pre-reservation)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Clinical Action / Transition Reason
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Housekeeping / Nursing Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. UV decontamination completed; ready for new admission..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl p-2.5 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveBed(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
