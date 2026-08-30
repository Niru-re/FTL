import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bedsAPI, hospitalsAPI, departmentsAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Bed, Hospital, Department, BedStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { BedStatusModal } from '../../components/ui/BedStatusModal';
import {
  BedDouble, Search, Filter, RefreshCw, Activity, User,
  Stethoscope, UserCheck, Wind, Sparkles, ArrowRightLeft, X, CheckCircle, Info
} from 'lucide-react';

export const BedsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialHospId = searchParams.get('hospital_id') ? Number(searchParams.get('hospital_id')) : undefined;

  const { subscribe } = useWebSocket();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>(initialHospId ? String(initialHospId) : 'ALL');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Status transition modal & Detail modal
  const [activeBedForStatus, setActiveBedForStatus] = useState<Bed | null>(null);
  const [viewBedDetail, setViewBedDetail] = useState<Bed | null>(null);

  const fetchBedsAndHospitals = async () => {
    setIsLoading(true);
    try {
      const [hospList, deptList, bedList] = await Promise.all([
        hospitalsAPI.getAll(),
        departmentsAPI.getAll(selectedHospitalId !== 'ALL' ? Number(selectedHospitalId) : undefined),
        bedsAPI.getBeds({
          hospital_id: selectedHospitalId !== 'ALL' ? Number(selectedHospitalId) : undefined,
          department_id: selectedDeptId !== 'ALL' ? Number(selectedDeptId) : undefined,
          bed_type: selectedType !== 'ALL' ? selectedType : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined
        })
      ]);
      setHospitals(hospList);
      setDepartments(deptList);
      setBeds(bedList);
    } catch (e) {
      console.error('Error loading beds:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBedsAndHospitals();

    const unsubBed = subscribe('BED_STATUS_CHANGED', (data) => {
      setBeds(prev => prev.map(b => b.id === data.bed_id ? { ...b, status: data.new_status, ...data.bed } : b));
    });

    return () => {
      unsubBed();
    };
  }, [selectedHospitalId, selectedDeptId, selectedType, selectedStatus]);

  const handleBedStatusUpdated = (updatedBed: Bed) => {
    setBeds(prev => prev.map(b => b.id === updatedBed.id ? updatedBed : b));
    setActiveBedForStatus(null);
  };

  const filteredBeds = beds.filter(b => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return b.code.toLowerCase().includes(term) ||
      (b.patient_name && b.patient_name.toLowerCase().includes(term)) ||
      (b.patient_mrn && b.patient_mrn.toLowerCase().includes(term)) ||
      (b.hospital_name && b.hospital_name.toLowerCase().includes(term)) ||
      (b.department_name && b.department_name.toLowerCase().includes(term));
  });

  const availableCount = beds.filter(b => b.status === 'AVAILABLE').length;
  const occupiedCount = beds.filter(b => b.status === 'OCCUPIED').length;
  const reservedCount = beds.filter(b => b.status === 'RESERVED').length;
  const cleaningCount = beds.filter(b => b.status === 'CLEANING').length;
  const maintenanceCount = beds.filter(b => b.status === 'MAINTENANCE').length;
  const outOfServiceCount = beds.filter(b => b.status === 'OUT_OF_SERVICE').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <BedDouble className="h-6 w-6 text-teal-400" />
              <span>City-Wide Bed Command Matrix</span>
            </h1>
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20 font-mono">
              {beds.length} Tracked Beds
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-hospital bed orchestrator with valid clinical workflow transitions.
          </p>
        </div>

        <button
          onClick={fetchBedsAndHospitals}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Matrix</span>
        </button>
      </div>

      {/* Bed Status Quick Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'AVAILABLE' ? 'ALL' : 'AVAILABLE')}
          className={`rounded-2xl border p-3.5 transition cursor-pointer ${
            selectedStatus === 'AVAILABLE' ? 'border-emerald-500 bg-emerald-500/15' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Available</span>
          <span className="text-xl font-bold text-emerald-400">{availableCount}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'OCCUPIED' ? 'ALL' : 'OCCUPIED')}
          className={`rounded-2xl border p-3.5 transition cursor-pointer ${
            selectedStatus === 'OCCUPIED' ? 'border-rose-500 bg-rose-500/15' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Occupied</span>
          <span className="text-xl font-bold text-rose-400">{occupiedCount}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'RESERVED' ? 'ALL' : 'RESERVED')}
          className={`rounded-2xl border p-3.5 transition cursor-pointer ${
            selectedStatus === 'RESERVED' ? 'border-sky-500 bg-sky-500/15' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Reserved</span>
          <span className="text-xl font-bold text-sky-400">{reservedCount}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'CLEANING' ? 'ALL' : 'CLEANING')}
          className={`rounded-2xl border p-3.5 transition cursor-pointer ${
            selectedStatus === 'CLEANING' ? 'border-amber-500 bg-amber-500/15' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Cleaning</span>
          <span className="text-xl font-bold text-amber-400">{cleaningCount}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'MAINTENANCE' ? 'ALL' : 'MAINTENANCE')}
          className={`rounded-2xl border p-3.5 transition cursor-pointer ${
            selectedStatus === 'MAINTENANCE' ? 'border-orange-500 bg-orange-500/15' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Maintenance</span>
          <span className="text-xl font-bold text-orange-400">{maintenanceCount}</span>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'OUT_OF_SERVICE' ? 'ALL' : 'OUT_OF_SERVICE')}
          className={`rounded-2xl border p-3.5 transition cursor-pointer ${
            selectedStatus === 'OUT_OF_SERVICE' ? 'border-slate-500 bg-slate-700/50' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
          }`}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Out of Service</span>
          <span className="text-xl font-bold text-slate-400">{outOfServiceCount}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search bed code, patient name, MRN, or hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Hospital Filter */}
          <select
            value={selectedHospitalId}
            onChange={(e) => { setSelectedHospitalId(e.target.value); setSelectedDeptId('ALL'); }}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          {/* Bed Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Bed Types</option>
            <option value="ICU">ICU</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="GENERAL">General Ward</option>
            <option value="ISOLATION">Isolation</option>
            <option value="SURGICAL_STEPDOWN">OT / Stepdown</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-300 focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE (Green)</option>
            <option value="OCCUPIED">OCCUPIED (Red)</option>
            <option value="RESERVED">RESERVED (Blue)</option>
            <option value="CLEANING">CLEANING (Yellow)</option>
            <option value="MAINTENANCE">MAINTENANCE (Orange)</option>
            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE (Gray)</option>
          </select>
        </div>
      </div>

      {/* Bed Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredBeds.map((bed) => {
          const hasVent = bed.equipment && bed.equipment.includes('Ventilator');
          const hasMonitor = bed.equipment && bed.equipment.includes('Monitor');

          return (
            <div
              key={bed.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-white tracking-wide">{bed.code}</span>
                  <StatusBadge type="bed" status={bed.status} />
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-300 truncate">{bed.department_name || bed.bed_type}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{bed.hospital_name}</p>
                </div>

                {/* Equipment Tags */}
                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className={`px-2 py-0.5 rounded-md border ${
                    hasVent ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}>
                    Ventilator: {hasVent ? 'YES' : 'NO'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md border ${
                    hasMonitor ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-slate-950 text-slate-500 border-slate-800'
                  }`}>
                    Monitor: {hasMonitor ? 'YES' : 'NO'}
                  </span>
                </div>

                {/* Patient or Available status info */}
                {bed.status === 'OCCUPIED' && bed.patient_name ? (
                  <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Inpatient</span>
                    <span className="text-xs font-bold text-slate-200 block truncate">{bed.patient_name}</span>
                    {bed.patient_mrn && <span className="text-[10px] text-slate-400 font-mono">{bed.patient_mrn}</span>}
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-950/30 p-2.5 border border-slate-800/40 text-center">
                    <span className="text-[11px] font-semibold text-emerald-400">
                      {bed.status === 'AVAILABLE' ? 'Available for Admission' : bed.status}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: [View] [Change] */}
              <div className="border-t border-slate-800/80 pt-2.5 flex items-center gap-2">
                <button
                  onClick={() => setViewBedDetail(bed)}
                  className="flex-1 rounded-xl border border-slate-700 hover:bg-slate-800 py-1.5 text-xs font-bold text-slate-300 transition text-center"
                >
                  View
                </button>
                <button
                  onClick={() => setActiveBedForStatus(bed)}
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-1.5 text-xs font-bold text-white transition text-center"
                >
                  Change
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed Status Update Modal */}
      {activeBedForStatus && (
        <BedStatusModal
          bed={activeBedForStatus}
          onClose={() => setActiveBedForStatus(null)}
          onStatusUpdated={handleBedStatusUpdated}
        />
      )}

      {/* Bed View Detail Modal */}
      {viewBedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-base font-bold text-white flex items-center gap-2">
                <BedDouble className="h-5 w-5 text-teal-400" />
                <span>Bed {viewBedDetail.code}</span>
              </span>
              <button onClick={() => setViewBedDetail(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Hospital:</span>
                <span className="font-semibold text-white">{viewBedDetail.hospital_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-white">{viewBedDetail.department_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Bed Type:</span>
                <span className="font-semibold text-white">{viewBedDetail.bed_type}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Status:</span>
                <StatusBadge status={viewBedDetail.status} type="bed" />
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Patient:</span>
                <span className="font-semibold text-white">{viewBedDetail.patient_name || 'None (Available)'}</span>
              </div>
              {viewBedDetail.patient_mrn && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">MRN:</span>
                  <span className="font-mono text-teal-400">{viewBedDetail.patient_mrn}</span>
                </div>
              )}
              {viewBedDetail.patient_diagnosis && (
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-400">Diagnosis:</span>
                  <span className="font-semibold text-slate-200">{viewBedDetail.patient_diagnosis}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Assigned Doctor:</span>
                <span className="font-semibold text-white">{viewBedDetail.doctor_name || 'On Duty Physician'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Assigned Nurse:</span>
                <span className="font-semibold text-white">{viewBedDetail.nurse_name || 'Charge Nurse'}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-400 block mb-1">Equipment Attached:</span>
                <span className="font-mono text-teal-300 bg-slate-950 px-2 py-1 rounded block border border-slate-800">
                  {viewBedDetail.equipment || 'Standard Physiological Port'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setViewBedDetail(null)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const b = viewBedDetail;
                  setViewBedDetail(null);
                  setActiveBedForStatus(b);
                }}
                className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
              >
                Change Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
