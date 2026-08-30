import React, { useState, useEffect } from 'react';
import { aiAPI, patientsAPI, hospitalsAPI } from '../../services/api';
import {
  AlertTriangle, ShieldAlert, Activity, Building2, User,
  Stethoscope, BedDouble, RefreshCw, Search, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

export const CriticalPatientsPage: React.FC = () => {
  const [criticalPatients, setCriticalPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  const fetchCritical = async () => {
    setLoading(true);
    try {
      // Fetch AI risk registry which has patient velocity, risk level, bed, doctor
      const res = await aiAPI.getDoctorRiskList();
      // Filter for high/critical or all
      const list = res.filter((p: any) =>
        p.risk_level === 'CRITICAL' || p.risk_level === 'VERY HIGH' || p.risk_level === 'HIGH'
      );
      setCriticalPatients(list);
    } catch (e) {
      console.error('Failed to load critical patient network roster', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCritical();
  }, []);

  const filtered = criticalPatients.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.patient_name?.toLowerCase().includes(q) ||
      p.mrn?.toLowerCase().includes(q) ||
      p.bed_code?.toLowerCase().includes(q) ||
      p.doctor_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              OPERATIONAL WATCHLIST
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              NON-CLINICAL ADMINISTRATIVE VIEW
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Metropolitan Critical Patient Watchlist
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Network-wide high-acuity and rapid deterioration patients for administrative resource and ICU bed allocation.
          </p>
        </div>

        <button
          onClick={fetchCritical}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          Refresh Watchlist
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold uppercase">Total Critical Inpatients</div>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {criticalPatients.filter(p => p.risk_level === 'CRITICAL').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Requiring intensive 1:1 care & monitoring</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold uppercase">Rapid Deterioration Alert</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {criticalPatients.filter(p => p.velocity_direction === 'RAPIDLY RISING' || p.velocity_direction === 'RISING').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Positive risk velocity within last 15 min</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-400 font-semibold uppercase">ICU Bed Utilization</div>
          <div className="text-2xl font-black text-sky-400 mt-1">
            {criticalPatients.filter(p => p.bed_code?.includes('ICU')).length} Beds
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Critical patients assigned to ICU beds</div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Patient MRN, Name, Bed, or Doctor..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="font-bold text-white">{filtered.length}</span> patients
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-bold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Patient MRN & Identifier</th>
                <th className="px-4 py-3">Location & Bed</th>
                <th className="px-4 py-3">Assigned Physician</th>
                <th className="px-4 py-3">Assigned Nurse</th>
                <th className="px-4 py-3 text-center">Risk Score</th>
                <th className="px-4 py-3">Velocity Trend</th>
                <th className="px-4 py-3 text-right">Risk Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-500" />
                    Loading metropolitan critical patient watchlist...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No critical patients currently flagged across the network.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isCritical = p.risk_level === 'CRITICAL';
                  const isRising = p.velocity_direction === 'RAPIDLY RISING' || p.velocity_direction === 'RISING';

                  return (
                    <tr key={p.patient_id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white">{p.patient_name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.mrn}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <BedDouble className="w-3.5 h-3.5 text-sky-400" />
                          {p.bed_code || 'Unassigned Bed'}
                        </div>
                        <div className="text-[10px] text-slate-500">{p.department_name || 'Inpatient'}</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{p.doctor_name || 'Duty Hospitalist'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{p.nurse_name || 'Staff Nurse'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`font-mono font-bold text-sm ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                          {Math.round(p.risk_score)}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-semibold text-[11px]">
                          {isRising ? (
                            <ArrowUpRight className="w-4 h-4 text-rose-400" />
                          ) : p.velocity_direction === 'FALLING' ? (
                            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Minus className="w-4 h-4 text-slate-400" />
                          )}
                          <span className={isRising ? 'text-rose-400' : 'text-slate-300'}>
                            {p.risk_velocity > 0 ? `+${p.risk_velocity}` : p.risk_velocity} / 15m ({p.velocity_direction})
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500">
                          Driver: {p.primary_factor_driver || 'Multi-vital'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }`}>
                          {p.risk_level}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
