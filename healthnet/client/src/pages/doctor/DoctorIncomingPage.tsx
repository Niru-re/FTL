import React, { useState, useEffect } from 'react';
import { doctorAPI } from '../../services/api';
import { Ambulance } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Siren, RefreshCw, Clock, MapPin, Stethoscope, BedDouble,
  Activity, CheckCircle2, ShieldAlert, Navigation
} from 'lucide-react';

export const DoctorIncomingPage: React.FC = () => {
  const { subscribe } = useWebSocket();
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchIncoming = async () => {
    try {
      const data = await doctorAPI.getIncoming();
      setAmbulances(data);
    } catch (e) {
      console.error('Error fetching incoming ambulances:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncoming();
    const unsub = subscribe('AMBULANCE_STATUS_UPDATED', () => fetchIncoming());
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Siren className="h-4 w-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Emergency Intake</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Incoming Emergency Cases & Ambulances
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ambulance telemetry, ETA countdown, and pre-arrival bed assignments
          </p>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchIncoming(); }}
          className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 transition border border-slate-700 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Transit</span>
        </button>
      </div>

      {/* Ambulances Grid */}
      {ambulances.length === 0 ? (
        <div className="p-12 text-center text-slate-400 rounded-2xl border border-slate-800 bg-slate-900/60">
          <Siren className="h-8 w-8 mx-auto text-slate-600 mb-2" />
          <p className="text-xs">No active ambulances currently en route to this facility.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ambulances.map((amb) => (
            <div
              key={amb.id}
              className="rounded-2xl border border-rose-500/30 bg-slate-900/70 p-5 shadow-xl backdrop-blur-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400">
                    <Siren className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-sky-400">{amb.code}</span>
                    <h3 className="text-base font-black text-white">{amb.current_patient_name || 'Emergency Intake'}</h3>
                    <span className="text-xs text-slate-400">Vehicle: {amb.vehicle_number}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black text-rose-400 font-mono block">
                    {amb.eta_minutes} <small className="text-xs text-slate-400">MIN</small>
                  </span>
                  <span className="text-[10px] font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded uppercase">
                    {amb.status}
                  </span>
                </div>
              </div>

              {/* Bed Assignment & Paramedic Team */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Bed</span>
                  <span className="font-mono font-bold text-sky-300">{amb.assigned_bed_code || 'Pre-assigned ICU'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Paramedic Crew</span>
                  <span className="font-semibold text-slate-200">{amb.paramedic_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Transit Speed</span>
                  <span className="font-mono text-slate-200">{amb.speed_kmh} km/h</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Contact</span>
                  <span className="font-mono text-slate-200">{amb.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Navigation className="h-4 w-4 text-emerald-400" />
                <span>En route to CareBridge Central Hospital Emergency Department</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
