import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  ShieldAlert, Activity, ArrowUpRight, ArrowDownRight, ArrowRight,
  TrendingUp, AlertTriangle, CheckCircle, RefreshCw, User, Stethoscope, Search
} from 'lucide-react';

export const DoctorAIRiskPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();
  const [riskList, setRiskList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await aiAPI.getDoctorRiskList();
      setRiskList(data || []);
    } catch (e) {
      console.warn('Failed to load AI risk registry', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubRisk = subscribe('AI_RISK_UPDATED', () => {
      loadData();
    });

    const unsubAlert = subscribe('AI_CRITICAL_RISK', () => {
      loadData();
    });

    return () => {
      unsubRisk();
      unsubAlert();
    };
  }, []);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'VERY HIGH':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MODERATE':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getVelocityBadge = (status: string) => {
    switch (status) {
      case 'RAPIDLY RISING':
        return 'text-rose-400 font-black flex items-center gap-1';
      case 'RISING':
        return 'text-amber-400 font-bold flex items-center gap-1';
      case 'FALLING':
        return 'text-emerald-400 font-semibold flex items-center gap-1';
      default:
        return 'text-gray-500 font-normal flex items-center gap-1';
    }
  };

  const filtered = riskList.filter(p => {
    const matchSearch = p.full_name.toLowerCase().includes(search.toLowerCase()) ||
                        p.mrn.toLowerCase().includes(search.toLowerCase()) ||
                        p.bed_code.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === 'ALL' || p.risk_level === filterLevel;
    return matchSearch && matchLevel;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-100/90 border border-gray-200 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-teal-400" />
              Inpatient Deterioration Risk Registry
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-rose-500/10 text-rose-300 border border-rose-500/30">
              PROTOTYPE AI • SIMULATED DATA • NOT A MEDICAL DIAGNOSIS
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Early detection of clinical deterioration combining continuous NEWS2 telemetry, multi-vital trend vectors, and factor attribution.
          </p>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 text-xs font-bold uppercase tracking-wider transition active:scale-95 self-start md:self-auto"
        >
          <RefreshCw className={`h-4 w-4 text-teal-400 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patient, MRN, or bed code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', 'CRITICAL', 'VERY HIGH', 'HIGH', 'MODERATE', 'LOW'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition ${
                filterLevel === lvl
                  ? 'bg-teal-500 text-slate-950 font-black shadow-md'
                  : 'bg-gray-100 border border-gray-200 text-gray-500 hover:text-gray-900'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Risk Table */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
              <tr>
                <th className="py-3.5 px-4">Patient MRN & Name</th>
                <th className="py-3.5 px-4">Location / Bed</th>
                <th className="py-3.5 px-4 text-center">AI Risk Index</th>
                <th className="py-3.5 px-4">Risk Velocity</th>
                <th className="py-3.5 px-4">Primary Factor</th>
                <th className="py-3.5 px-4">Last Evaluated</th>
                <th className="py-3.5 px-4 text-right">Clinical Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    No patients match the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((pt) => (
                  <tr
                    key={pt.patient_id}
                    className="hover:bg-gray-200/40 transition cursor-pointer"
                    onClick={() => navigate(`/doctor/patients/${pt.patient_id}`)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-teal-400 font-bold text-xs">
                          {pt.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800 text-sm hover:text-teal-300">{pt.full_name}</div>
                          <div className="text-[10px] text-gray-500 font-mono">{pt.mrn} • {pt.age}y {pt.gender}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="font-mono font-bold text-teal-300">{pt.bed_code}</div>
                      <div className="text-[10px] text-gray-500">{pt.department_name}</div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getRiskBadge(pt.risk_level)}`}>
                          {pt.risk_score}% — {pt.risk_level}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className={getVelocityBadge(pt.risk_velocity_status)}>
                        {pt.risk_velocity_status === 'RAPIDLY RISING' && <ArrowUpRight className="h-4 w-4" />}
                        {pt.risk_velocity_status === 'RISING' && <ArrowUpRight className="h-3.5 w-3.5" />}
                        {pt.risk_velocity_status === 'FALLING' && <ArrowDownRight className="h-3.5 w-3.5" />}
                        {pt.risk_velocity_status === 'STABLE' && <ArrowRight className="h-3.5 w-3.5" />}
                        <span className="font-mono text-xs">{pt.risk_velocity}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono uppercase">{pt.risk_velocity_status}</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 border border-gray-300 text-[11px] font-mono">
                        {pt.primary_factor}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-gray-500 font-mono text-[11px]">
                      {new Date(pt.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/doctor/patients/${pt.patient_id}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold tracking-wider transition"
                      >
                        Inspect Command Center &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
