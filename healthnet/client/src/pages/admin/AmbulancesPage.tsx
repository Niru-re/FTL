import React, { useState, useEffect } from 'react';
import { ambulancesAPI, hospitalsAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Ambulance, Hospital } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { CityMap } from '../../components/common/CityMap';
import {
  Ambulance as AmbulanceIcon, Search, Filter, Phone, MapPin,
  Clock, Activity, Radio, RefreshCw, CheckCircle2, FastForward, Check
} from 'lucide-react';

export const AmbulancesPage: React.FC = () => {
  const { subscribe } = useWebSocket();
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'CARDS' | 'MAP'>('CARDS');
  const [isLoading, setIsLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchFleet = async () => {
    setIsLoading(true);
    try {
      const [ambData, hospData] = await Promise.all([
        ambulancesAPI.getAll({ status: statusFilter !== 'ALL' ? statusFilter : undefined }),
        hospitalsAPI.getAll()
      ]);
      setAmbulances(ambData);
      setHospitals(hospData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();

    const unsubAmb = subscribe('AMBULANCE_STATUS_UPDATED', (data) => {
      setAmbulances(prev => prev.map(a => a.id === data.ambulance_id ? {
        ...a,
        lat: data.lat ?? a.lat,
        lng: data.lng ?? a.lng,
        eta_minutes: data.eta_minutes ?? a.eta_minutes,
        status: data.status ?? a.status
      } : a));
    });

    const unsubArr = subscribe('AMBULANCE_ARRIVED', (data) => {
      setAmbulances(prev => prev.map(a => a.id === data.ambulance_id ? {
        ...a,
        status: 'ARRIVED',
        eta_minutes: 0
      } : a));
    });

    return () => {
      unsubAmb();
      unsubArr();
    };
  }, [statusFilter]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStepSim = async (id: number) => {
    try {
      await ambulancesAPI.stepSimulation(id);
      showToast('Simulated transit progressed (-2m ETA)');
      fetchFleet();
    } catch (e) {
      console.error(e);
    }
  };

  const handleArrive = async (id: number) => {
    try {
      await ambulancesAPI.triggerArrival(id);
      showToast('Ambulance marked as ARRIVED at hospital');
      fetchFleet();
    } catch (e) {
      console.error(e);
    }
  };

  const handleReturn = async (id: number) => {
    try {
      await ambulancesAPI.returnAmbulance(id);
      showToast('Ambulance returned to fleet (AVAILABLE)');
      fetchFleet();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAmbulances = ambulances.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return a.code.toLowerCase().includes(term) ||
      a.driver_name.toLowerCase().includes(term) ||
      (a.destination_hospital_name && a.destination_hospital_name.toLowerCase().includes(term)) ||
      (a.current_patient_name && a.current_patient_name.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/90 px-4 py-3 text-xs font-bold text-sky-200 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-sky-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <AmbulanceIcon className="h-6 w-6 text-sky-400" />
            <span>Emergency Ambulance Fleet Tracking</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time simulated GPS telemetry, live ETA countdown, and route tracking for city emergency transport units.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'CARDS' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Fleet Grid
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                viewMode === 'MAP' ? 'bg-sky-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Map View
            </button>
          </div>

          <button
            onClick={fetchFleet}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-sm">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search ambulance code, driver, hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
          >
            <option value="ALL">All Ambulance Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="EN_ROUTE">EN_ROUTE</option>
            <option value="TRANSPORTING">TRANSPORTING</option>
            <option value="DISPATCHED">DISPATCHED</option>
            <option value="ARRIVED">ARRIVED</option>
          </select>
        </div>
      </div>

      {/* Map or Cards View */}
      {viewMode === 'MAP' ? (
        <div className="space-y-2">
          <CityMap
            hospitals={hospitals}
            ambulances={filteredAmbulances}
            className="h-[580px]"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAmbulances.map((amb) => {
            const isEnRoute = amb.status === 'EN_ROUTE' || amb.status === 'TRANSPORTING';

            return (
              <div
                key={amb.id}
                className={`rounded-2xl border p-5 backdrop-blur-sm space-y-4 transition hover:border-sky-500/50 ${
                  isEnRoute ? 'border-sky-500/40 bg-sky-950/20 shadow-lg shadow-sky-500/10' : 'border-slate-800 bg-slate-900/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                      <AmbulanceIcon className={`h-5 w-5 ${isEnRoute ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-white">{amb.code}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{amb.vehicle_number}</span>
                      </div>
                      <p className="text-xs text-slate-400">Driver: {amb.driver_name}</p>
                    </div>
                  </div>
                  <StatusBadge type="ambulance" status={amb.status} />
                </div>

                {/* Destination & ETA if active */}
                <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Destination:</span>
                    <span className="font-bold text-white truncate max-w-[180px]">
                      {amb.destination_hospital_name || 'Station Standby'}
                    </span>
                  </div>

                  {amb.current_patient_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Patient:</span>
                      <span className="font-semibold text-rose-300">{amb.current_patient_name}</span>
                    </div>
                  )}

                  {amb.assigned_bed_code && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Allocated Bed:</span>
                      <span className="font-mono text-teal-400 font-bold">{amb.assigned_bed_code}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-sky-400" />
                      Estimated ETA:
                    </span>
                    <span className="font-mono text-sm font-bold text-sky-300">
                      {amb.eta_minutes > 0 ? `${amb.eta_minutes} Mins` : amb.status === 'ARRIVED' ? 'ARRIVED AT DEST' : 'Standby'}
                    </span>
                  </div>
                </div>

                {/* Simulation Action Controls */}
                {isEnRoute && (
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/60">
                    <button
                      onClick={() => handleStepSim(amb.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 py-1.5 text-[11px] font-bold text-sky-300 transition"
                    >
                      <FastForward className="h-3 w-3" />
                      <span>Step (-2m)</span>
                    </button>
                    <button
                      onClick={() => handleArrive(amb.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 py-1.5 text-[11px] font-bold text-amber-300 transition"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Arrive</span>
                    </button>
                  </div>
                )}

                {(amb.status === 'ARRIVED' || amb.status === 'TRANSPORTING') && (
                  <button
                    onClick={() => handleReturn(amb.id)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 py-1.5 text-[11px] font-bold text-slate-300 transition border border-slate-700"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Return Ambulance to Available</span>
                  </button>
                )}

                {/* Paramedic & Contact */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Paramedic: <strong className="text-slate-300">{amb.paramedic_name}</strong></span>
                  <div className="flex items-center gap-1 font-mono text-slate-400">
                    <Phone className="h-3 w-3 text-slate-500" />
                    <span>{amb.phone}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
