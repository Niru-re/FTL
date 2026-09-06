import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { emergencyAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { EmergencyCase } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatTime, formatDate } from '../../utils/formatters';
import {
  Siren, Search, Filter, Plus, Clock, Building2, BedDouble,
  Ambulance as AmbulanceIcon, Activity, RefreshCw, CheckCircle2
} from 'lucide-react';

export const EmergencyCasesPage: React.FC = () => {
  const { openEmergencyModal } = useOutletContext<{ openEmergencyModal: () => void }>();
  const { subscribe } = useWebSocket();
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = async () => {
    setIsLoading(true);
    try {
      const data = await emergencyAPI.getCases(statusFilter !== 'ALL' ? statusFilter : undefined);
      setCases(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();

    const unsubEmerg = subscribe('EMERGENCY_CASE_CREATED', () => {
      fetchCases();
    });

    const unsubArr = subscribe('AMBULANCE_ARRIVED', () => {
      fetchCases();
    });

    return () => {
      unsubEmerg();
      unsubArr();
    };
  }, [statusFilter]);

  const filteredCases = cases.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return c.case_number.toLowerCase().includes(term) ||
      c.patient_name.toLowerCase().includes(term) ||
      (c.assigned_hospital_name && c.assigned_hospital_name.toLowerCase().includes(term)) ||
      c.condition_summary.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Siren className="h-6 w-6 text-rose-400" />
            <span>Emergency Intake & Dispatch Log</span>
          </h1>
          <p className="text-xs text-gray-500">
            Audit trail and live tracking of all emergency hospital routings, bed reservations, and patient transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCases}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openEmergencyModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 hover:from-rose-500 hover:to-amber-500 transition transform active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Emergency Intake</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-100/60 p-4 glass-panel">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by case #, patient, hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Case Statuses</option>
            <option value="EN_ROUTE">EN_ROUTE</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="ARRIVED">ARRIVED</option>
            <option value="ADMITTED">ADMITTED</option>
          </select>
        </div>
      </div>

      {/* Cases List */}
      <div className="space-y-3">
        {filteredCases.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-gray-200 bg-gray-100/80 p-5 glass-panel hover:border-gray-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-sm font-extrabold text-teal-400">{c.case_number}</span>
                <span className="text-sm font-bold text-gray-800">{c.patient_name} ({c.patient_age}y {c.patient_gender})</span>
                <StatusBadge type="priority" status={c.priority} />
                <StatusBadge type="ambulance" status={c.status} />
              </div>

              <p className="text-xs text-gray-600 max-w-3xl leading-relaxed">{c.condition_summary}</p>

              {/* Resource Requirements Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {c.required_icu && (
                  <span className="rounded bg-teal-500/10 border border-teal-500/30 text-[10px] font-bold text-teal-300 px-2 py-0.5">
                    ✓ ICU Bed Required
                  </span>
                )}
                {c.required_ventilator && (
                  <span className="rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 px-2 py-0.5">
                    ✓ Ventilator Required
                  </span>
                )}
                {c.required_specialist && c.required_specialist !== 'General' && (
                  <span className="rounded bg-purple-500/10 border border-purple-500/30 text-[10px] font-bold text-purple-300 px-2 py-0.5">
                    ✓ {c.required_specialist}
                  </span>
                )}
              </div>
            </div>

            {/* Destination Hospital & Bed Allocation */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 min-w-[240px] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Assigned Hospital:</span>
                <span className="font-bold text-gray-800 truncate max-w-[130px]">{c.assigned_hospital_name || 'Allocated'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Reserved Bed:</span>
                <span className="font-mono font-bold text-teal-400">{c.assigned_bed_code || 'Bed Pre-Reserved'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Ambulance:</span>
                <span className="font-mono font-bold text-cyan-400">{c.assigned_ambulance_code || 'Transport Unit'}</span>
              </div>
              <div className="pt-1 border-t border-gray-200 flex items-center justify-between text-[10px] text-gray-400">
                <span>Dispatched:</span>
                <span>{formatDate(c.created_at)} {formatTime(c.created_at)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
