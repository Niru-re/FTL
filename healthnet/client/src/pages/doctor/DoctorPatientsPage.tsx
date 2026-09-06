import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI } from '../../services/api';
import { DoctorPatient } from '../../types';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Users, Search, Filter, ArrowUpDown, ChevronRight, Activity,
  ShieldAlert, HeartPulse, Stethoscope, AlertTriangle, Sparkles,
  RefreshCw, CheckCircle2, UserCheck, BedDouble
} from 'lucide-react';

export const DoctorPatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('risk');
  const [isLoading, setIsLoading] = useState(true);

  const fetchPatients = async () => {
    try {
      const data = await doctorAPI.getPatients({
        risk: selectedRisk === 'ALL' ? undefined : selectedRisk,
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        search: search || undefined,
        sort_by: sortBy
      });
      setPatients(data);
    } catch (e) {
      console.error('Error fetching doctor patients:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
    const unsubVitals = subscribe('PATIENT_VITALS_UPDATED', () => fetchPatients());
    return () => unsubVitals();
  }, [selectedRisk, selectedStatus, sortBy]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Inpatient Census</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            My Assigned Patients
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Active patient roster under Dr. Arjun Sharma &bull; Medical ICU & Inpatient Wards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor/monitoring')}
            className="flex items-center gap-2 rounded-xl bg-sky-600/20 border border-sky-500/30 px-3.5 py-2 text-xs font-bold text-sky-300 hover:bg-sky-600/30 transition"
          >
            <Activity className="h-4 w-4 text-sky-400 animate-pulse" />
            <span>Open Multi-Bed Telemetry</span>
          </button>
          <button
            onClick={() => { setIsLoading(true); fetchPatients(); }}
            className="flex items-center gap-2 rounded-xl bg-gray-200 hover:bg-gray-300 px-3.5 py-2 text-xs font-bold text-gray-600 transition border border-gray-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Census</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-4 space-y-4 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by patient name, MRN, diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-gray-50/80 border border-gray-200 pl-10 pr-4 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none transition"
            />
          </form>

          {/* Risk Filter */}
          <div className="relative">
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full rounded-xl bg-gray-50/80 border border-gray-200 px-3.5 py-2 text-xs text-gray-700 focus:border-sky-500 focus:outline-none appearance-none font-medium cursor-pointer"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="CRITICAL">Critical Risk (&gt;75%)</option>
              <option value="HIGH RISK">High Risk (60-75%)</option>
              <option value="WATCH">Watch (40-60%)</option>
              <option value="STABLE">Stable (&lt;40%)</option>
            </select>
          </div>

          {/* Sort Option */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl bg-gray-50/80 border border-gray-200 px-3.5 py-2 text-xs text-gray-700 focus:border-sky-500 focus:outline-none appearance-none font-medium cursor-pointer"
            >
              <option value="risk">Sort: Highest Risk Score</option>
              <option value="name">Sort: Patient Name</option>
              <option value="bed">Sort: Bed Code</option>
              <option value="alert">Sort: Active Alerts</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/60">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mr-2">Filter Quick:</span>
          {['ALL', 'CRITICAL', 'HIGH RISK', 'WATCH', 'STABLE'].map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                selectedRisk === risk
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-gray-50/60 text-gray-500 hover:text-gray-700 border border-gray-200'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table / Grid */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/60 backdrop-blur-sm shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">
            Assigned Inpatients ({patients.length})
          </h2>
          <span className="text-[10px] text-gray-500 font-mono">Real-time Telemetry Integrated</span>
        </div>

        {patients.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs">No patients match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/80">
            {patients.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/doctor/patients/${p.id}`)}
                className="p-4 hover:bg-gray-200/40 cursor-pointer transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
              >
                {/* Left: Demographics & Condition */}
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${p.risk_level === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : p.risk_level === 'HIGH RISK' ? 'bg-amber-500' : 'bg-emerald-400'}`} />
                    <span className="text-sm font-bold text-white group-hover:text-sky-300 transition">
                      {p.full_name}
                    </span>
                    <span className="font-mono text-xs text-sky-400 bg-sky-950/80 border border-sky-500/20 px-2 py-0.5 rounded">
                      {p.mrn}
                    </span>
                    <span className="text-xs text-gray-500">
                      {p.age} yrs &bull; {p.gender} &bull; Blood {p.blood_group}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                      Bed: <strong className="text-white font-mono">{p.bed_code || 'Unassigned'}</strong>
                    </span>
                  </div>

                  <p className="text-xs font-medium text-gray-700">
                    <span className="text-gray-500">Primary Diagnosis: </span>{p.diagnosis}
                  </p>

                  {/* Allergies & Care Team */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {p.allergies && p.allergies.length > 0 && p.allergies[0] !== 'None Known' && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-rose-400 font-bold uppercase">Allergies:</span>
                        {p.allergies.map((alg, i) => (
                          <span key={i} className="text-[10px] bg-rose-500/10 text-rose-300 border border-rose-500/20 px-1.5 py-0.2 rounded font-medium">
                            {alg}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="text-[11px] text-gray-500">
                      Nurse: <strong className="text-gray-600">{p.assigned_nurse_name || 'Staff Nurse'}</strong>
                    </span>
                  </div>
                </div>

                {/* Middle: Latest Live Vitals */}
                <div className="flex items-center gap-2 flex-wrap">
                  {p.latest_vitals ? (
                    <>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                        p.latest_vitals.spo2 < 90 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                        <span className="text-[9px] text-gray-400 block">SpO2</span>
                        {p.latest_vitals.spo2}%
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                        p.latest_vitals.heart_rate > 120 || p.latest_vitals.heart_rate < 50 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                        <span className="text-[9px] text-gray-400 block">HR</span>
                        {p.latest_vitals.heart_rate} bpm
                      </div>
                      <div className="px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-50 border border-gray-200 text-gray-600">
                        <span className="text-[9px] text-gray-400 block">BP</span>
                        {p.latest_vitals.systolic_bp}/{p.latest_vitals.diastolic_bp}
                      </div>
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                        p.latest_vitals.respiratory_rate >= 28 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}>
                        <span className="text-[9px] text-gray-400 block">RR</span>
                        {p.latest_vitals.respiratory_rate}/min
                      </div>
                      <div className="px-2.5 py-1 rounded-lg text-xs font-mono bg-gray-50 border border-gray-200 text-gray-600">
                        <span className="text-[9px] text-gray-400 block">NEWS2</span>
                        <strong className={p.news2_score >= 5 ? 'text-rose-400' : 'text-gray-700'}>{p.news2_score}</strong>
                      </div>
                    </>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No telemetry recorded</span>
                  )}
                </div>

                {/* Right: AI Risk Score & Open Command Center */}
                <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-200/60">
                  <div className="text-right">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border inline-flex items-center gap-1 ${
                      p.risk_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                      p.risk_level === 'HIGH RISK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      p.risk_level === 'WATCH' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>
                      <Sparkles className="h-3 w-3" />
                      <span>{p.risk_level} ({p.risk_score}%)</span>
                    </span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/doctor/patients/${p.id}`); }}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-bold text-white transition shadow-sm"
                  >
                    <span>Command Center</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
