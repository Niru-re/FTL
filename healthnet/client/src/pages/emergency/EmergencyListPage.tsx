import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { emergencyAPI } from '../../services/api';
import { EmergencyCaseDetail } from '../../types';
import { formatTime, formatDate } from '../../utils/formatters';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Siren, Plus, Search, Filter, RefreshCw, ChevronRight,
  ShieldAlert, Clock, MapPin, Building2, BedDouble, CheckCircle2
} from 'lucide-react';

export const EmergencyListPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [cases, setCases] = useState<EmergencyCaseDetail[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const data = await emergencyAPI.getAll({
        status: selectedStatus === 'ALL' ? undefined : selectedStatus,
        priority: selectedPriority === 'ALL' ? undefined : selectedPriority,
        search: search || undefined
      });
      setCases(data);
    } catch (e) {
      console.error('Error fetching emergency cases:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
    const unsub = subscribe('AMBULANCE_STATUS_UPDATED', () => fetchCases());
    return () => unsub();
  }, [selectedStatus, selectedPriority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCases();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Siren className="h-4 w-4 text-rose-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Emergency Operations</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Emergency Cases & Smart Triage
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Active city-wide emergency dispatch, hospital routing matches, and transit telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/emergency/new')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Emergency Intake</span>
          </button>
          <button
            onClick={() => { setIsLoading(true); fetchCases(); }}
            className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 transition border border-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <form onSubmit={handleSearchSubmit} className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search case code (EMG-2026-...), patient name, bed..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-slate-950/80 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </form>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SEARCHING">Searching</option>
              <option value="HOSPITAL_SELECTED">Hospital Selected</option>
              <option value="BED_RESERVED">Bed Reserved</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ARRIVED">Arrived</option>
              <option value="PATIENT_RECEIVED">Patient Received</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full rounded-xl bg-slate-950/80 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-rose-500 focus:outline-none font-medium cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">CRITICAL (Red)</option>
              <option value="HIGH">HIGH (Yellow)</option>
              <option value="MEDIUM">MEDIUM (Green)</option>
            </select>
          </div>
        </div>

        {/* Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">Quick Status:</span>
          {['ALL', 'EN_ROUTE', 'ARRIVED', 'PATIENT_RECEIVED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                selectedStatus === st
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Cases List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Emergency Cases Registry ({cases.length})
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">Routing Intelligence Integrated</span>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Siren className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs">No emergency cases match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {cases.map((c) => {
              const isCrit = c.priority === 'CRITICAL';
              const isEnRoute = c.status === 'EN_ROUTE';

              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/admin/emergency/${c.id}`)}
                  className="p-4 hover:bg-slate-800/40 cursor-pointer transition flex flex-col lg:flex-row lg:items-center justify-between gap-4 group"
                >
                  {/* Left: Info */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${isCrit ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />
                      <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-500/30 px-2 py-0.5 rounded">
                        {c.case_number}
                      </span>
                      <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition">
                        {c.patient_name}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {c.patient_age}y &bull; {c.patient_gender} &bull; {c.emergency_type}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                        isCrit ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {c.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-1">
                      <strong className="text-slate-400">Condition: </strong>{c.condition_summary}
                    </p>

                    {/* Routing Details */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-1">
                      <div className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Hospital: <strong className="text-slate-200">{c.assigned_hospital_name || 'Searching...'}</strong></span>
                      </div>
                      {c.assigned_bed_code && (
                        <div className="flex items-center gap-1">
                          <BedDouble className="h-3.5 w-3.5 text-teal-400" />
                          <span>Bed: <strong className="text-teal-300 font-mono">{c.assigned_bed_code}</strong></span>
                        </div>
                      )}
                      {c.assigned_ambulance_code && (
                        <div className="flex items-center gap-1">
                          <Siren className="h-3.5 w-3.5 text-sky-400" />
                          <span>Ambulance: <strong className="text-sky-300 font-mono">{c.assigned_ambulance_code}</strong></span>
                        </div>
                      )}
                      <span className="text-slate-500 font-mono">{formatTime(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Right: Status & Action */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                      c.status === 'PATIENT_RECEIVED' || c.status === 'COMPLETED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : isEnRoute
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                      ● {c.status}
                    </span>

                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/emergency/${c.id}`); }}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-white transition border border-slate-700"
                    >
                      <span>Mission Control</span>
                      <ChevronRight className="h-3.5 w-3.5 text-rose-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
