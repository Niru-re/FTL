import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hospitalsAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Hospital, EmergencyStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { HospitalDetailDrawer } from '../../components/common/HospitalDetailDrawer';
import {
  Building2, Plus, Search, Filter, Phone, MapPin, Activity,
  Wind, Stethoscope, UserCheck, ArrowUpRight, RefreshCw, Check,
  Edit3, ExternalLink, LayoutGrid, Table, X
} from 'lucide-react';

export const HospitalsPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Add / Edit Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    branch_name: string;
    code: string;
    address: string;
    lat: number;
    lng: number;
    contact_phone: string;
    emergency_status: EmergencyStatus;
    total_beds: number;
    icu_capacity: number;
    er_capacity: number;
    ventilators_total: number;
    ventilators_available: number;
  }>({
    name: '',
    branch_name: '',
    code: '',
    address: '',
    lat: 40.7128,
    lng: -74.0060,
    contact_phone: '+1-555-0100',
    emergency_status: 'NORMAL',
    total_beds: 50,
    icu_capacity: 15,
    er_capacity: 10,
    ventilators_total: 10,
    ventilators_available: 5
  });

  const fetchHospitals = async () => {
    try {
      const data = await hospitalsAPI.getAll();
      setHospitals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();

    const unsubHosp = subscribe('HOSPITAL_STATUS_CHANGED', () => {
      fetchHospitals();
    });

    const unsubBed = subscribe('BED_STATUS_CHANGED', () => {
      fetchHospitals();
    });

    return () => {
      unsubHosp();
      unsubBed();
    };
  }, []);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hospitalsAPI.create({
        name: formData.name,
        branch_name: formData.branch_name,
        code: formData.code || `HN-${Math.floor(100 + Math.random() * 900)}`,
        address: formData.address,
        lat: Number(formData.lat) || 40.7128,
        lng: Number(formData.lng) || -74.0060,
        total_beds: Number(formData.total_beds),
        icu_capacity: Number(formData.icu_capacity),
        ward_capacity: Number(formData.total_beds) - Number(formData.icu_capacity) - Number(formData.er_capacity),
        er_capacity: Number(formData.er_capacity),
        ventilators_total: Number(formData.ventilators_total),
        ventilators_available: Number(formData.ventilators_available),
        emergency_status: formData.emergency_status,
        contact_phone: formData.contact_phone
      });
      setIsAddModalOpen(false);
      resetForm();
      fetchHospitals();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHospital) return;
    try {
      await hospitalsAPI.update(editingHospital.id, {
        name: formData.name,
        branch_name: formData.branch_name,
        address: formData.address,
        contact_phone: formData.contact_phone,
        emergency_status: formData.emergency_status,
        ventilators_total: Number(formData.ventilators_total),
        ventilators_available: Number(formData.ventilators_available)
      });
      setEditingHospital(null);
      resetForm();
      fetchHospitals();
    } catch (e) {
      console.error(e);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      branch_name: '',
      code: '',
      address: '',
      lat: 40.7128,
      lng: -74.0060,
      contact_phone: '+1-555-0100',
      emergency_status: 'NORMAL',
      total_beds: 50,
      icu_capacity: 15,
      er_capacity: 10,
      ventilators_total: 10,
      ventilators_available: 5
    });
  };

  const filteredHospitals = hospitals.filter(h => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = h.name.toLowerCase().includes(q) ||
      h.branch_name.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || h.emergency_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-teal-400" />
            <span>Hospital Network Management</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time capacity, ventilators, and emergency protocol status across all {hospitals.length} network hospitals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <Table className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={fetchHospitals}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-teal-400 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => { resetForm(); setIsAddModalOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-teal-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Hospital</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by hospital name, branch, or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-xs text-slate-400">Emergency Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NORMAL">NORMAL</option>
            <option value="SURGE">SURGE</option>
            <option value="DIVERT">DIVERT</option>
            <option value="CLOSED">CLOSED</option>
          </select>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHospitals.map((hosp) => {
            const icuPct = hosp.icu_occupancy_rate || 0;
            const overallPct = hosp.overall_occupancy_rate || 0;

            return (
              <div
                key={hosp.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{hosp.name}</h3>
                        <span className="rounded bg-slate-800 text-[10px] font-mono px-1.5 py-0.5 text-teal-400 border border-slate-700">
                          {hosp.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">{hosp.branch_name}</p>
                    </div>
                    <StatusBadge type="hospital" status={hosp.emergency_status} />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{hosp.address}</span>
                  </div>

                  {/* Capacity Progress Bars */}
                  <div className="space-y-3 pt-2 border-t border-slate-800/80">
                    {/* ICU Capacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Activity className="h-3.5 w-3.5 text-teal-400" />
                          ICU Beds: <strong className="text-white">{hosp.available_icu_beds} / {hosp.icu_capacity} Free</strong>
                        </span>
                        <span className="font-mono text-teal-400 font-bold">{icuPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${icuPct >= 85 ? 'bg-rose-500' : icuPct >= 60 ? 'bg-amber-500' : 'bg-teal-500'}`}
                          style={{ width: `${Math.min(100, icuPct)}%` }}
                        />
                      </div>
                    </div>

                    {/* Ward Capacity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Total Free Beds: <strong className="text-white">{hosp.available_beds} / {hosp.total_beds}</strong></span>
                        <span className="font-mono text-sky-400 font-bold">{overallPct}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${overallPct >= 85 ? 'bg-rose-500' : 'bg-sky-500'}`}
                          style={{ width: `${Math.min(100, overallPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resource & Staff Tags */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-2.5 rounded-xl text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Wind className="h-3.5 w-3.5 text-cyan-400" />
                      {hosp.ventilators_available} / {hosp.ventilators_total} Vents
                    </span>
                    <span className="flex items-center gap-1">
                      <Stethoscope className="h-3.5 w-3.5 text-purple-400" />
                      {hosp.doctors_on_duty} Docs, {hosp.nurses_on_duty} Nurses
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t border-slate-800/80 pt-3 flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/admin/hospitals/${hosp.id}`)}
                    className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-teal-400 transition flex items-center justify-center gap-1"
                  >
                    <span>View</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingHospital(hosp);
                      setFormData({
                        name: hosp.name,
                        branch_name: hosp.branch_name,
                        code: hosp.code,
                        address: hosp.address,
                        lat: hosp.lat,
                        lng: hosp.lng,
                        contact_phone: hosp.contact_phone,
                        emergency_status: hosp.emergency_status,
                        total_beds: hosp.total_beds,
                        icu_capacity: hosp.icu_capacity,
                        er_capacity: hosp.er_capacity,
                        ventilators_total: hosp.ventilators_total,
                        ventilators_available: hosp.ventilators_available
                      });
                    }}
                    className="flex-1 rounded-xl border border-slate-700 hover:bg-slate-800 py-2 text-xs font-bold text-slate-300 transition flex items-center justify-center gap-1"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Mode */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Hospital & Branch</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Total Beds</th>
                  <th className="px-4 py-3.5">Available Beds</th>
                  <th className="px-4 py-3.5">ICU (Free / Total)</th>
                  <th className="px-4 py-3.5">ICU Occ.</th>
                  <th className="px-4 py-3.5">Ventilators</th>
                  <th className="px-4 py-3.5">Staff</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredHospitals.map(hosp => (
                  <tr key={hosp.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-white">{hosp.name}</div>
                      <div className="text-[11px] text-slate-400">{hosp.branch_name} • <span className="font-mono text-teal-400">{hosp.code}</span></div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={hosp.emergency_status} type="hospital" />
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white">{hosp.total_beds}</td>
                    <td className="px-4 py-3.5 font-bold text-emerald-400">{hosp.available_beds}</td>
                    <td className="px-4 py-3.5 font-mono">{hosp.available_icu_beds} / {hosp.icu_capacity}</td>
                    <td className="px-4 py-3.5">
                      <span className={`font-bold ${
                        (hosp.icu_occupancy_rate || 0) > 85 ? 'text-rose-400' :
                        (hosp.icu_occupancy_rate || 0) >= 60 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {hosp.icu_occupancy_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-cyan-300">{hosp.ventilators_available} / {hosp.ventilators_total}</td>
                    <td className="px-4 py-3.5 text-[11px]">{hosp.doctors_on_duty} Docs / {hosp.nurses_on_duty} Nurses</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/hospitals/${hosp.id}`)}
                          className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-bold text-teal-400 transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setEditingHospital(hosp);
                            setFormData({
                              name: hosp.name,
                              branch_name: hosp.branch_name,
                              code: hosp.code,
                              address: hosp.address,
                              lat: hosp.lat,
                              lng: hosp.lng,
                              contact_phone: hosp.contact_phone,
                              emergency_status: hosp.emergency_status,
                              total_beds: hosp.total_beds,
                              icu_capacity: hosp.icu_capacity,
                              er_capacity: hosp.er_capacity,
                              ventilators_total: hosp.ventilators_total,
                              ventilators_available: hosp.ventilators_available
                            });
                          }}
                          className="rounded-lg border border-slate-700 hover:bg-slate-800 px-2.5 py-1 text-[11px] font-bold text-slate-300 transition"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Hospital Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Add Hospital Node</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Hospital Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HealthNet Midtown"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Branch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midtown Main"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Hospital Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HNM-13"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street Address, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Total Beds</label>
                  <input
                    type="number"
                    min="10"
                    required
                    value={formData.total_beds}
                    onChange={(e) => setFormData({ ...formData, total_beds: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">ICU Capacity</label>
                  <input
                    type="number"
                    min="2"
                    required
                    value={formData.icu_capacity}
                    onChange={(e) => setFormData({ ...formData, icu_capacity: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Ventilators</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.ventilators_total}
                    onChange={(e) => setFormData({ ...formData, ventilators_total: Number(e.target.value), ventilators_available: Math.floor(Number(e.target.value) / 2) })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Create Hospital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Hospital Modal */}
      {editingHospital && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Hospital: {editingHospital.name}</h3>
              <button onClick={() => setEditingHospital(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateHospital} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Hospital Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Emergency Status</label>
                  <select
                    value={formData.emergency_status}
                    onChange={(e) => setFormData({ ...formData, emergency_status: e.target.value as any })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="DIVERT">DIVERT</option>
                    <option value="SURGE">SURGE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Total Ventilators</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.ventilators_total}
                    onChange={(e) => setFormData({ ...formData, ventilators_total: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Available Ventilators</label>
                  <input
                    type="number"
                    min="0"
                    max={formData.ventilators_total}
                    value={formData.ventilators_available}
                    onChange={(e) => setFormData({ ...formData, ventilators_available: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingHospital(null)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
