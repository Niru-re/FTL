import React, { useState, useEffect } from 'react';
import {
  Pill, Filter, CheckCircle2, Clock, ShieldAlert,
  AlertTriangle, RefreshCw, X, User
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { Medication } from '../../types';

export const NurseMedicationsPage: React.FC = () => {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [activeMed, setActiveMed] = useState<Medication | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [adminAction, setAdminAction] = useState<'ADMINISTERED' | 'SKIPPED' | 'MISSED'>('ADMINISTERED');
  const [submitting, setSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fetchMedications = async () => {
    try {
      setLoading(true);
      const data = await nurseAPI.getMedications(selectedStatus !== 'ALL' ? selectedStatus : undefined);
      setMedications(data);
    } catch (err) {
      console.error('Failed to load medications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedications();
  }, [selectedStatus]);

  const handleAdministerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMed) return;

    try {
      setSubmitting(true);
      await nurseAPI.administerMedication(activeMed.id, {
        status: adminAction,
        notes: adminNotes.trim() || undefined
      });
      setSuccessNotice(`Medication '${activeMed.drug_name}' marked as ${adminAction}.`);
      setActiveMed(null);
      setAdminNotes('');
      await fetchMedications();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err) {
      console.error('Failed to administer medication:', err);
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
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
              Electronic Medication Administration Record (eMAR)
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Ward Medication Administration
          </h1>
          <p className="text-xs text-gray-500">
            Medication verification, administration tracking, and dosage log
          </p>
        </div>

        <button
          onClick={fetchMedications}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-300/80 bg-gray-200/80 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification */}
      {successNotice && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/60 p-4 text-xs font-semibold text-purple-200 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
            <span>{successNotice}</span>
          </div>
        </div>
      )}

      {/* Disclaimer Banner */}
      <div className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 text-[11px] text-gray-500 flex items-start gap-2.5">
        <ShieldAlert className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p>
          <strong className="text-gray-600">DEMO PROTOTYPE DATA:</strong> The pharmaceuticals, dosages, and schedules displayed are simulated for prototype demonstrations only and must not be used as clinical guidance.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Filter by Status:
          </span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-50/70 border border-gray-200 text-xs text-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Medications</option>
            <option value="PENDING">Pending / Due</option>
            <option value="ACTIVE">Active</option>
            <option value="ADMINISTERED">Administered</option>
            <option value="SKIPPED">Skipped</option>
            <option value="MISSED">Missed</option>
          </select>
        </div>
      </div>

      {/* Medication List */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50 text-[11px] font-bold uppercase text-gray-500">
                <th className="py-3.5 pl-4">Medication</th>
                <th className="py-3.5">Dosage</th>
                <th className="py-3.5">Route</th>
                <th className="py-3.5">Frequency</th>
                <th className="py-3.5">Status</th>
                <th className="py-3.5">Administered By</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading medication schedules...
                  </td>
                </tr>
              ) : medications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No medications found for the selected status.
                  </td>
                </tr>
              ) : (
                medications.map((med) => (
                  <tr key={med.id} className="bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200/40 transition">
                    <td className="py-3.5 pl-4">
                      <div className="font-bold text-white text-sm flex items-center gap-2">
                        <Pill className="h-3.5 w-3.5 text-purple-400" />
                        <span>{med.drug_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 font-semibold text-gray-700">{med.dosage}</td>
                    <td className="py-3.5">
                      <span className="font-mono text-[11px] font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/20">
                        {med.route}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-600">{med.frequency}</td>
                    <td className="py-3.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          med.status === 'ADMINISTERED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : med.status === 'PENDING' || med.status === 'ACTIVE'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {med.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-gray-600">{med.administered_by || 'Staff Nurse'}</td>
                    <td className="py-3.5 pr-4 text-right">
                      {med.status === 'PENDING' || med.status === 'ACTIVE' ? (
                        <button
                          onClick={() => {
                            setActiveMed(med);
                            setAdminAction('ADMINISTERED');
                          }}
                          className="rounded-lg bg-purple-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-purple-500 text-white px-3 py-1.5 text-xs font-bold transition shadow-sm"
                        >
                          Mark Given
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-400 flex items-center justify-end gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Administration Modal */}
      {activeMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-400" />
                <span>Verify Medication Administration</span>
              </h3>
              <button onClick={() => setActiveMed(null)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-gray-50/60 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
              <p className="font-bold text-white text-sm">{activeMed.drug_name}</p>
              <p className="text-gray-600">
                Dose: <strong className="text-white">{activeMed.dosage}</strong> • Route:{' '}
                <strong className="text-teal-300">{activeMed.route}</strong>
              </p>
              <p className="text-gray-500">Scheduled: {activeMed.frequency}</p>
            </div>

            <form onSubmit={handleAdministerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Action Status
                </label>
                <select
                  value={adminAction}
                  onChange={(e) => setAdminAction(e.target.value as any)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
                >
                  <option value="ADMINISTERED">Administered (Dose Given)</option>
                  <option value="SKIPPED">Skipped (Clinically Held)</option>
                  <option value="MISSED">Missed (Patient Unavailable)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Administration Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Infused over 30 mins via peripheral IV..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-xs text-gray-900 rounded-xl p-2.5 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveMed(null)}
                  className="rounded-xl border border-gray-300 bg-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-purple-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-purple-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-900/40 transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Confirm Administration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
