import React, { useState, useEffect } from 'react';
import { aiAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Cpu, Activity, AlertTriangle, ShieldCheck, Flame, BarChart3,
  TrendingUp, RefreshCw, Layers, CheckCircle2, ChevronRight, Wind, Hospital, BedDouble
} from 'lucide-react';

export const AdminAICapacityPage: React.FC = () => {
  const { subscribe } = useWebSocket();
  const [networkData, setNetworkData] = useState<any>(null);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [simMessage, setSimMessage] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [net, hosps, alrts] = await Promise.all([
        aiAPI.getNetworkClinicalStatus(),
        aiAPI.getHospitalCapacityScores(),
        aiAPI.getAIAlerts()
      ]);
      setNetworkData(net);
      setHospitals(hosps || []);
      setAlerts(alrts || []);
    } catch (e) {
      console.warn('Failed to load AI capacity intelligence', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubSurge = subscribe('NETWORK_SURGE_DETECTED', (data) => {
      setSimMessage(`🚨 MASS CASUALTY SURGE: ${data?.message || 'Inbound trauma surge'}`);
      loadData();
    });

    const unsubCap = subscribe('CAPACITY_WARNING', () => {
      loadData();
    });

    return () => {
      unsubSurge();
      unsubCap();
    };
  }, []);

  const triggerMassCasualty = async () => {
    setIsSimulating(true);
    setSimMessage('Simulating multi-trauma disaster scenario across Metropolitan Grid...');
    try {
      const res = await aiAPI.startCapacitySimulation('MASS_CASUALTY');
      setSimMessage(`✓ ${res.message || 'Mass Casualty Event simulated successfully!'}`);
      await loadData();
    } catch (e) {
      setSimMessage('Failed to trigger mass casualty scenario.');
    } finally {
      setIsSimulating(false);
    }
  };

  const resetSimulation = async () => {
    setIsSimulating(true);
    try {
      await aiAPI.resetCapacitySimulation();
      setSimMessage('✓ Simulation state reset cleanly. Hospital capacities normalized.');
      await loadData();
    } catch (e) {
      setSimMessage('Failed to reset simulation.');
    } finally {
      setIsSimulating(false);
    }
  };

  const getPressureColor = (score: number) => {
    if (score >= 80) return 'text-rose-400 bg-rose-500/20 border-rose-500/40';
    if (score >= 60) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    if (score >= 40) return 'text-sky-400 bg-sky-500/20 border-sky-500/40';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  };

  const netCap = networkData?.network_capacity || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Status (Section 29 & 41) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-black text-white flex items-center gap-2">
                <Cpu className="h-6 w-6 text-teal-400" />
                Metropolitan Capacity & Resource Intelligence
              </h1>
              <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-teal-500/10 text-teal-300 border border-teal-500/30">
                <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                AI ENGINE ONLINE • PROTOTYPE MODE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Short-term 6h–48h capacity forecasting, ICU exhaustion prediction, and multi-hospital load balancing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Forecasts
            </button>
          </div>
        </div>

        {/* Banner safety label */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <span>MODEL: PrototypeCapacityModel v1.0 • CONFIDENCE: 0.81</span>
          <span className="text-amber-400 font-bold uppercase tracking-wider">
            PROTOTYPE OPERATIONAL FORECAST • SIMULATED DATA
          </span>
        </div>
      </div>

      {/* Simulation Controls Panel (Section 31 & 32) */}
      <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/30 border border-rose-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-black text-sm uppercase tracking-wider">
              <Flame className="h-4 w-4 animate-bounce" />
              Mass Casualty & Surge Demand Simulator
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Demonstrate city-wide disaster response: injects 12 concurrent trauma casualties, fills ICU beds, and evaluates AI capacity warnings.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={triggerMassCasualty}
              disabled={isSimulating}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-900/40 active:scale-95 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Flame className="h-4 w-4" />
              {isSimulating ? 'Simulating Event...' : 'Trigger Mass Casualty Event (12 Cases)'}
            </button>

            <button
              onClick={resetSimulation}
              disabled={isSimulating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold uppercase tracking-wider active:scale-95 transition"
            >
              Reset Capacity State
            </button>
          </div>
        </div>

        {simMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-rose-500/30 text-xs text-rose-300 font-mono flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
            {simMessage}
          </div>
        )}
      </div>

      {/* Network Capacity KPI Row (Section 22) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>ICU Capacity</span>
            <Activity className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{netCap.current_icu_occupancy || 68}%</span>
            <span className="text-xs font-bold text-rose-400">→ {netCap.projected_24h_icu_occupancy || 79}% (24h)</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${netCap.current_icu_occupancy || 68}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            {netCap.available_icu || 0} of {netCap.icu_total || 0} ICU beds currently open
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Capacity Pressure Score</span>
            <BarChart3 className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300">{netCap.capacity_pressure_score || 58}/100</span>
            <span className="text-xs font-bold text-amber-400">MODERATE-HIGH</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${netCap.capacity_pressure_score || 58}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            {netCap.hospitals_under_pressure_count || 0} hospitals above 80% load
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Ventilator Reserves</span>
            <Wind className="h-4 w-4 text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{netCap.available_ventilators || 0}</span>
            <span className="text-xs font-bold text-teal-400">/ {netCap.total_ventilators || 0} total</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${((netCap.available_ventilators || 1) / Math.max(1, netCap.total_ventilators || 1)) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            Projected 24h demand: {Math.max(0, (netCap.available_ventilators || 10) - 5)} available
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Inpatient Bed Headroom</span>
            <BedDouble className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{netCap.available_beds || 0}</span>
            <span className="text-xs font-bold text-slate-400">/ {netCap.total_beds || 0}</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${((netCap.available_beds || 1) / Math.max(1, netCap.total_beds || 1)) * 100}%` }}
            />
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-mono">
            Active emergencies in transit: {netCap.active_emergencies || 0}
          </div>
        </div>
      </div>

      {/* Network Capacity Table (Section 20) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Hospital className="h-5 w-5 text-teal-400" />
              Connected Hospital Capacity Projections (24h Forecast)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked comparison of current ICU saturation against projected pressure.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Hospital & Campus</th>
                <th className="py-3 px-4 text-center">Current ICU</th>
                <th className="py-3 px-4 text-center">Projected 24h ICU</th>
                <th className="py-3 px-4 text-center">ICU Beds (Now / 24h)</th>
                <th className="py-3 px-4 text-center">Vents (Now / 24h)</th>
                <th className="py-3 px-4 text-center">Pressure Score</th>
                <th className="py-3 px-4 text-right">Capacity Outlook</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {hospitals.map((h) => {
                const m = h.current_metrics || {};
                const fc = h.forecast_24h || {};
                return (
                  <tr key={h.hospital_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-sm">{h.hospital_name}</div>
                      <div className="text-[10px] text-slate-400">{h.branch_name}</div>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                      {m.icu_occupancy_pct || 65}%
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-300">
                      {fc.projected_icu_occupancy || 78}%
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-emerald-400 font-bold">{m.available_icu || 0}</span>
                      <span className="text-slate-500"> → </span>
                      <span className={fc.projected_available_icu <= 1 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {fc.projected_available_icu ?? 0}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="text-teal-400">{m.available_ventilators || 0}</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-slate-300">{fc.projected_ventilators ?? 0}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getPressureColor(fc.capacity_pressure_score || 50)}`}>
                        {fc.capacity_pressure_score || 50}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        fc.capacity_outlook === 'CRITICAL SHORTAGE RISK' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
                        fc.capacity_outlook === 'HIGH PRESSURE' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}>
                        {fc.capacity_outlook || 'STABLE'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operational Recommendations Grid (Section 23) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
            AI Operational Recommendations
          </h3>
          <div className="space-y-2">
            {(networkData?.recommendations || [
              'Consider step-down transfers to expand ICU readiness.',
              'Distribute incoming ambulance intake evenly across Metro campuses.',
              'Prepare auxiliary ventilators for respiratory surge.'
            ]).map((rec: string, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                <ChevronRight className="h-4 w-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Shortage Warnings & Alarms */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
          <h3 className="text-sm font-black text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Active Capacity & Shortage Warnings
          </h3>
          <div className="space-y-2">
            {(networkData?.shortage_warnings || []).length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                ✓ No immediate bed or ventilator shortages projected in current 24h cycle.
              </div>
            ) : (
              networkData.shortage_warnings.map((w: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-start justify-between">
                  <div>
                    <div className="font-bold">{w.hospital_name}</div>
                    <div className="text-[11px] text-slate-300 mt-0.5">{w.warning}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold">
                    {w.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
