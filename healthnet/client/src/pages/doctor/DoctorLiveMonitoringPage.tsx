import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI } from '../../services/api';
import { DoctorPatient } from '../../types';
import { ECGWaveform } from '../../components/common/ECGWaveform';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Radio, Activity, ShieldAlert, HeartPulse, Stethoscope,
  RefreshCw, ChevronRight, BedDouble, AlertTriangle, Sparkles
} from 'lucide-react';

export const DoctorLiveMonitoringPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [filterRisk, setFilterRisk] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      const data = await doctorAPI.getPatients({
        risk: filterRisk === 'ALL' ? undefined : filterRisk,
        sort_by: 'risk'
      });
      setPatients(data);
    } catch (e) {
      console.error('Error fetching monitoring patients:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    const unsubVitals = subscribe('PATIENT_VITALS_UPDATED', () => fetchPatients());
    return () => unsubVitals();
  }, [filterRisk]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">ICU Telemetry Wall</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Multi-Bed Live Telemetry Monitoring
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Continuous multi-lead ECG & vitals stream across active ICU census &bull; CareBridge Central Hospital
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl border border-gray-200">
            {['ALL', 'CRITICAL', 'HIGH RISK', 'STABLE'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRisk(r)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition uppercase ${filterRisk === r ? 'bg-sky-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setIsLoading(true); fetchPatients(); }}
            className="flex items-center gap-2 rounded-xl bg-gray-200 hover:bg-gray-300 px-3.5 py-2 text-xs font-bold text-gray-600 transition border border-gray-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Wall</span>
          </button>
        </div>
      </div>

      {/* Grid of Multi-Bed Telemetry Panels */}
      {patients.length === 0 ? (
        <div className="p-12 text-center text-gray-500 rounded-2xl border border-gray-200 bg-gray-100/60">
          <Activity className="h-8 w-8 mx-auto text-slate-600 mb-2" />
          <p className="text-xs">No active patients matching the telemetry criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((p) => {
            const v = p.latest_vitals;
            const isCrit = p.risk_level === 'CRITICAL';
            const isHigh = p.risk_level === 'HIGH RISK';

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/doctor/patients/${p.id}`)}
                className={`rounded-2xl border ${
                  isCrit ? 'border-rose-500/50 bg-rose-950/10' :
                  isHigh ? 'border-amber-500/40 bg-amber-950/10' :
                  'border-gray-200 bg-gray-100/70'
                } p-4 shadow-xl backdrop-blur-sm space-y-3 cursor-pointer hover:border-sky-500/60 transition group flex flex-col justify-between`}
              >
                {/* Panel Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${isCrit ? 'bg-rose-500 animate-pulse' : isHigh ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <h3 className="text-sm font-black text-white group-hover:text-sky-300 transition">
                        {p.full_name}
                      </h3>
                      <span className="font-mono text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                        {p.mrn}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-sky-300 font-bold">Bed {p.bed_code || 'N/A'}</span>
                      <span>&bull;</span>
                      <span>{p.age}y {p.gender}</span>
                    </div>
                  </div>

                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                    isCrit ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    isHigh ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    Risk {p.risk_score}%
                  </span>
                </div>

                {/* Simulated Realtime Waveform */}
                <div className="relative">
                  <ECGWaveform
                    heartRate={v?.heart_rate || 75}
                    height={75}
                    color={isCrit ? '#f43f5e' : isHigh ? '#fbbf24' : '#10b981'}
                    showControls={false}
                  />
                </div>

                {/* Vitals Matrix */}
                {v ? (
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div className={`p-1.5 rounded-lg border ${v.spo2 < 90 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold' : 'bg-gray-50/80 border-gray-200 text-gray-700'}`}>
                      <span className="text-[8px] text-gray-400 block uppercase">SpO2</span>
                      <span className="font-mono text-xs">{v.spo2}%</span>
                    </div>
                    <div className={`p-1.5 rounded-lg border ${v.heart_rate > 120 || v.heart_rate < 50 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold' : 'bg-gray-50/80 border-gray-200 text-gray-700'}`}>
                      <span className="text-[8px] text-gray-400 block uppercase">HR</span>
                      <span className="font-mono text-xs">{v.heart_rate}</span>
                    </div>
                    <div className="p-1.5 rounded-lg border bg-gray-50/80 border-gray-200 text-gray-700">
                      <span className="text-[8px] text-gray-400 block uppercase">BP</span>
                      <span className="font-mono text-[10px]">{v.systolic_bp}/{v.diastolic_bp}</span>
                    </div>
                    <div className={`p-1.5 rounded-lg border ${v.respiratory_rate >= 28 ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-bold' : 'bg-gray-50/80 border-gray-200 text-gray-700'}`}>
                      <span className="text-[8px] text-gray-400 block uppercase">RR</span>
                      <span className="font-mono text-xs">{v.respiratory_rate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-gray-400 italic">No telemetry data</div>
                )}

                {/* Panel Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/80 text-[11px] text-gray-500">
                  <span className="line-clamp-1">{p.diagnosis}</span>
                  <span className="text-sky-400 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition flex-shrink-0">
                    <span>Command Center</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
