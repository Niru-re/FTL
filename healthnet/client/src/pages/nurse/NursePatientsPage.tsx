import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, HeartPulse, ChevronRight, Activity,
  Stethoscope, BedDouble, RefreshCw, AlertTriangle, ShieldAlert
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { NursePatient } from '../../types';

export const NursePatientsPage: React.FC = () => {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const data = await nurseAPI.getPatients({
        risk: selectedRisk !== 'ALL' ? selectedRisk : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: search.trim() || undefined
      });
      setPatients(data);
    } catch (err) {
      console.error('Failed to load patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [selectedRisk, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Ward Census & Inpatient Management
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            My Assigned Patients
          </h1>
          <p className="text-xs text-slate-400">
            Active patient roster under direct nursing care at HealthNet Central Hospital
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchPatients}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            <span>Refresh</span>
          </button>
          <Link
            to="/nurse/vitals"
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition"
          >
            <HeartPulse className="h-4 w-4" />
            <span>Record Vitals</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, MRN (PT-1042), bed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Risk:
            </span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="bg-slate-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH RISK">High Risk</option>
              <option value="WATCH">Watch</option>
              <option value="STABLE">Stable</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-950/70 border border-slate-800 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH_RISK">High Risk</option>
              <option value="STABLE">Stable</option>
              <option value="DISCHARGED">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-bold uppercase text-slate-400">
                <th className="py-3.5 pl-4">Patient Info</th>
                <th className="py-3.5">Bed / Location</th>
                <th className="py-3.5">Department</th>
                <th className="py-3.5">Diagnosis</th>
                <th className="py-3.5">Risk Tier</th>
                <th className="py-3.5">Latest Vitals</th>
                <th className="py-3.5">Attending Doctor</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Loading patient records...
                  </td>
                </tr>
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No matching patients found.
                  </td>
                </tr>
              ) : (
                patients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 pl-4">
                      <div className="font-bold text-white text-sm">{patient.full_name}</div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {patient.mrn} • {patient.age}y {patient.gender} • Blood: {patient.blood_group}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-mono text-xs font-bold text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-500/30 inline-flex items-center gap-1.5">
                        <BedDouble className="h-3.5 w-3.5 text-teal-400" />
                        {patient.bed_code || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-300 font-medium">
                      {patient.department_name || 'Medical ICU'}
                    </td>
                    <td className="py-3.5 max-w-[180px] truncate text-slate-200" title={patient.diagnosis}>
                      {patient.diagnosis}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                          patient.risk_level === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : patient.risk_level === 'HIGH RISK'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : patient.risk_level === 'WATCH'
                            ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {patient.risk_level}
                      </span>
                    </td>
                    <td className="py-3.5">
                      {patient.latest_vitals ? (
                        <div className="space-y-0.5 font-mono text-[11px]">
                          <div>
                            <span className={patient.latest_vitals.spo2 < 92 ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                              SpO2: {patient.latest_vitals.spo2}%
                            </span>
                            <span className="text-slate-400"> • HR: {patient.latest_vitals.heart_rate}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            BP: {patient.latest_vitals.systolic_bp}/{patient.latest_vitals.diastolic_bp} • {patient.latest_vitals.temperature}°C
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">No vitals logged</span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-300">
                      {patient.assigned_doctor_name ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Stethoscope className="h-3.5 w-3.5 text-sky-400" />
                          <span>{patient.assigned_doctor_name}</span>
                        </div>
                      ) : (
                        <span className="text-amber-400 text-[11px] font-semibold">No Doctor Assigned</span>
                      )}
                    </td>
                    <td className="py-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/nurse/patients/${patient.id}`}
                          className="rounded-lg bg-teal-600/20 hover:bg-teal-600 text-teal-300 hover:text-white px-3 py-1.5 text-xs font-bold transition flex items-center gap-1"
                        >
                          <span>Open View</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
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
