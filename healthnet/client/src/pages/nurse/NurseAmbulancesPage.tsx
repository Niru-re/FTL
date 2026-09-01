import React, { useState, useEffect } from 'react';
import {
  Ambulance as AmbulanceIcon, BedDouble, CheckCircle2, Clock,
  RefreshCw, MapPin, Stethoscope, AlertTriangle, ShieldAlert, X, ChevronRight
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { Ambulance } from '../../types';

export const NurseAmbulancesPage: React.FC = () => {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAmbulance, setActiveAmbulance] = useState<Ambulance | null>(null);
  const [showArrivalModal, setShowArrivalModal] = useState<Ambulance | null>(null);
  const [preparingId, setPreparingId] = useState<number | null>(null);
  const [confirmingArrival, setConfirmingArrival] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchAmbulances = async () => {
    try {
      setLoading(true);
      const data = await nurseAPI.getAmbulances();
      setAmbulances(data);
    } catch (err) {
      console.error('Failed to load nurse ambulances:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmbulances();
    const interval = setInterval(fetchAmbulances, 8000);
    return () => clearInterval(interval);
  }, []);

  const handlePrepareBed = async (ambulanceId: number) => {
    try {
      setPreparingId(ambulanceId);
      const res = await nurseAPI.prepareBed(ambulanceId);
      setNotice(res.message);
      await fetchAmbulances();
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to prepare bed');
    } finally {
      setPreparingId(null);
    }
  };

  const handleConfirmArrival = async () => {
    if (!showArrivalModal) return;
    try {
      setConfirmingArrival(true);
      const res = await nurseAPI.confirmArrival(showArrivalModal.id);
      setNotice(res.message);
      setShowArrivalModal(null);
      await fetchAmbulances();
      setTimeout(() => setNotice(null), 6000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to confirm arrival');
    } finally {
      setConfirmingArrival(false);
    }
  };

  const incomingAmbulances = ambulances.filter(
    (a) => a.status === 'EN_ROUTE' || a.status === 'DISPATCHED' || a.status === 'TRANSPORTING'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Emergency Pre-Hospital Intake & Triage
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Incoming Ambulances & Ingress
          </h1>
          <p className="text-xs text-slate-400">
            Real-time ambulance telemetry, pre-arrival bed readiness, and patient reception
          </p>
        </div>

        <button
          onClick={fetchAmbulances}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {notice && (
        <div className="rounded-2xl border border-teal-500/40 bg-teal-950/70 p-4 text-xs font-semibold text-teal-200 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">Action Complete</p>
              <p>{notice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Incoming Ambulances Spotlight */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <AmbulanceIcon className="h-4 w-4 text-rose-400" />
          <span>Inbound to Facility ({incomingAmbulances.length})</span>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {incomingAmbulances.length === 0 ? (
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center text-slate-400 text-xs">
              No emergency ambulances currently inbound to CareBridge Central Hospital.
            </div>
          ) : (
            incomingAmbulances.map((amb) => (
              <div
                key={amb.id}
                className="rounded-2xl border-2 border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900 p-5 shadow-xl space-y-4 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
                      <AmbulanceIcon className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {amb.code}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30">
                          {amb.status}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-1">
                        {amb.current_patient_name || 'Emergency Trauma Intake'}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <p className="text-[10px] uppercase font-bold text-slate-500">ETA</p>
                    <p className="text-lg font-black text-rose-400">{amb.eta_minutes} MIN</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Pre-Assigned Bed</p>
                    <p className="font-mono font-bold text-teal-300 mt-0.5">
                      {amb.assigned_bed_code || 'Pending Prep'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Attending Doctor</p>
                    <p className="font-semibold text-slate-200 mt-0.5 truncate">
                      {amb.assigned_doctor_name || 'Dr. Ananya Mehta'}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Paramedic Lead</p>
                    <p className="text-slate-300 mt-0.5 truncate">{amb.paramedic_name}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    onClick={() => setActiveAmbulance(amb)}
                    className="text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1"
                  >
                    <span>View Map & Equipment</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrepareBed(amb.id)}
                      disabled={preparingId === amb.id}
                      className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                    >
                      <BedDouble className="h-3.5 w-3.5" />
                      <span>{preparingId === amb.id ? 'Prepping...' : 'PREPARE BED'}</span>
                    </button>

                    <button
                      onClick={() => setShowArrivalModal(amb)}
                      className="rounded-xl bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>CONFIRM ARRIVAL</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Network Fleet Table */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <MapPin className="h-4 w-4 text-sky-400" />
          <span>Regional Ambulance Fleet Status</span>
        </h2>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase text-slate-400">
                  <th className="py-3.5 pl-4">Ambulance</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5">Current Patient</th>
                  <th className="py-3.5">Destination</th>
                  <th className="py-3.5">ETA</th>
                  <th className="py-3.5">Assigned Bed</th>
                  <th className="py-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ambulances.map((amb) => (
                  <tr key={amb.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 pl-4">
                      <div className="font-bold text-white font-mono">{amb.code}</div>
                      <div className="text-[10px] text-slate-400">{amb.vehicle_number}</div>
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          amb.status === 'EN_ROUTE'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : amb.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                        }`}
                      >
                        {amb.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-200">
                      {amb.current_patient_name || <span className="text-slate-500 italic">None</span>}
                    </td>
                    <td className="py-3.5 text-slate-300">
                      {amb.destination_hospital_name || 'CareBridge Central'}
                    </td>
                    <td className="py-3.5 font-mono text-xs font-bold text-slate-200">
                      {amb.eta_minutes > 0 ? `${amb.eta_minutes} min` : 'At Facility'}
                    </td>
                    <td className="py-3.5">
                      {amb.assigned_bed_code ? (
                        <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/20">
                          {amb.assigned_bed_code}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">—</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <button
                        onClick={() => setActiveAmbulance(amb)}
                        className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ambulance Detail Modal */}
      {activeAmbulance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <AmbulanceIcon className="h-5 w-5 text-rose-400" />
                  <span>Ambulance Telemetry ({activeAmbulance.code})</span>
                </h3>
                <p className="text-xs text-slate-400">Pre-Hospital Ingress Telemetry</p>
              </div>
              <button onClick={() => setActiveAmbulance(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Patient</p>
                  <p className="font-bold text-white text-sm">
                    {activeAmbulance.current_patient_name || 'Emergency Intake'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Telemetry ETA</p>
                  <p className="font-mono font-black text-rose-400 text-sm">
                    {activeAmbulance.eta_minutes} MINUTES
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Assigned Bed</p>
                  <p className="font-mono font-bold text-teal-300">
                    {activeAmbulance.assigned_bed_code || 'Pending Reservation'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-bold uppercase text-[10px]">Assigned Doctor</p>
                  <p className="font-semibold text-slate-200">
                    {activeAmbulance.assigned_doctor_name || 'Dr. Ananya Mehta'}
                  </p>
                </div>
              </div>

              {/* Simulated Map / Coordinates visualization */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
                <div className="h-28 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col items-center justify-center p-3 relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial from-teal-500/10 to-transparent"></div>
                  <MapPin className="h-6 w-6 text-rose-400 animate-bounce relative z-10" />
                  <p className="text-xs font-bold text-white mt-1 relative z-10">
                    Coordinates: {activeAmbulance.lat.toFixed(4)}, {activeAmbulance.lng.toFixed(4)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono relative z-10">
                    Speed: {activeAmbulance.speed_kmh} km/h • Route: Direct Metropolitan Corridor
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Onboard Equipment</p>
                <p className="text-xs text-slate-300">
                  Transport Ventilator, Biphasic Defibrillator, Lucas CPR, Telemetry 12-Lead ECG
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveAmbulance(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Arrival Confirmation Modal */}
      {showArrivalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-rose-400" />
                <span>Confirm Patient Arrival</span>
              </h3>
              <button onClick={() => setShowArrivalModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Has ambulance <strong className="text-white font-mono">{showArrivalModal.code}</strong> arrived at the emergency bay with patient <strong className="text-white">{showArrivalModal.current_patient_name || 'Emergency Intake'}</strong>?
            </p>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
              <p className="text-slate-400">
                • Ambulance Status &rarr; <strong className="text-emerald-400">ARRIVED</strong>
              </p>
              <p className="text-slate-400">
                • Patient Status &rarr; <strong className="text-emerald-400">RECEIVED / ADMITTED</strong>
              </p>
              <p className="text-slate-400">
                • Assigned Bed &rarr; <strong className="text-rose-400">OCCUPIED</strong>
              </p>
              <p className="text-slate-400">
                • Attending Physician notified immediately.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowArrivalModal(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmArrival}
                disabled={confirmingArrival}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-950/50 transition disabled:opacity-50"
              >
                {confirmingArrival ? 'Confirming...' : 'Yes, Confirm Arrival'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
