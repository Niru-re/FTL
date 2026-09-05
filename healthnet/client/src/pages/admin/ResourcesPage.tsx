import React, { useState, useEffect } from 'react';
import {
  Wrench, Building2, Search, Plus, Edit3,
  ExternalLink, Layers, RefreshCw, X, Activity, Filter, CheckCircle
} from 'lucide-react';
import { resourcesAPI, hospitalsAPI } from '../../services/api';
import { Resource, Hospital } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');

  // Edit Resource Modal
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editAvailQty, setEditAvailQty] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<string>('AVAILABLE');

  // Add Resource Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newResource, setNewResource] = useState({
    resource_id: '',
    hospital_id: 1,
    resource_type: 'Ventilator',
    name: '',
    quantity: 5,
    available_quantity: 5,
    status: 'AVAILABLE'
  });

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    setIsLoading(true);
    try {
      const [resList, hospList] = await Promise.all([
        resourcesAPI.getAll(),
        hospitalsAPI.getAll()
      ]);
      setResources(resList);
      setHospitals(hospList);
      if (hospList.length > 0) {
        setNewResource(prev => ({ ...prev, hospital_id: hospList[0].id }));
      }
    } catch (e) {
      console.error('Error loading resources:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    try {
      await resourcesAPI.update(selectedResource.id, {
        quantity: editQty,
        available_quantity: editAvailQty,
        status: editStatus as any
      });
      setSelectedResource(null);
      await loadResources();
    } catch (e) {
      console.error('Error updating resource:', e);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resourcesAPI.create({
        ...newResource,
        status: newResource.status as any,
        resource_id: newResource.resource_id || `RES-HN-${Math.floor(100 + Math.random() * 900)}`
      });
      setShowAddModal(false);
      setNewResource({
        resource_id: '',
        hospital_id: hospitals[0]?.id || 1,
        resource_type: 'Ventilator',
        name: '',
        quantity: 5,
        available_quantity: 5,
        status: 'AVAILABLE'
      });
      await loadResources();
    } catch (e) {
      console.error('Error creating resource:', e);
    }
  };

  const filteredResources = resources.filter(r => {
    if (selectedHospitalFilter !== 'ALL' && r.hospital_id !== Number(selectedHospitalFilter)) return false;
    if (selectedTypeFilter !== 'ALL' && r.resource_type !== selectedTypeFilter) return false;
    if (selectedStatusFilter !== 'ALL' && r.status !== selectedStatusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.resource_id.toLowerCase().includes(q) ||
        r.resource_type.toLowerCase().includes(q) ||
        (r.hospital_name && r.hospital_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalVentilators = resources.filter(r => r.resource_type === 'Ventilator').reduce((sum, r) => sum + r.quantity, 0);
  const availVentilators = resources.filter(r => r.resource_type === 'Ventilator').reduce((sum, r) => sum + r.available_quantity, 0);
  const totalMonitors = resources.filter(r => r.resource_type.includes('Monitor')).reduce((sum, r) => sum + r.quantity, 0);
  const availMonitors = resources.filter(r => r.resource_type.includes('Monitor')).reduce((sum, r) => sum + r.available_quantity, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Medical Equipment & Resource Management</h1>
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20">
              {resources.length} Equipment Groups
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Track, assign, and orchestrate critical hospital equipment across all network medical facilities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-teal-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Resource</span>
          </button>
          <button
            onClick={loadResources}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-teal-400 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 10. Dynamic Resource Shortage Alert (Section 10) */}
      {availVentilators < 10 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/80 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-lg">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white uppercase">
                  RESOURCE SHORTAGE ALERT
                </span>
                <h2 className="text-xs font-bold text-rose-300">
                  Ventilator availability has fallen below network safety threshold
                </h2>
              </div>
              <p className="text-xs text-rose-200/90 mt-0.5">
                Available: <strong className="text-white">{availVentilators}</strong> • Threshold: <strong className="text-white">10</strong> • Hospitals critically constrained: <strong className="text-white">4 facilities</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedTypeFilter('Ventilator')}
            className="px-4 py-2 rounded-xl bg-rose-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-500 text-white text-xs font-bold transition shadow whitespace-nowrap self-end sm:self-auto"
          >
            VIEW AFFECTED HOSPITALS
          </button>
        </div>
      )}

      {/* 9. Resource Command Center: 5 Core Resources (Section 9) */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            Network Medical Equipment Command Matrix
          </h2>
          <span className="text-[10px] text-gray-400 font-semibold uppercase">PROTOTYPE RESERVES</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { name: 'Ventilators', total: totalVentilators, avail: availVentilators, inUse: totalVentilators - availVentilators, maint: 2, thresh: 10 },
            { name: 'Oxygen Systems', total: 120, avail: 78, inUse: 38, maint: 4, thresh: 30 },
            { name: 'Patient Monitors', total: totalMonitors || 216, avail: availMonitors || 160, inUse: (totalMonitors || 216) - (availMonitors || 160), maint: 6, thresh: 25 },
            { name: 'Infusion Pumps', total: 320, avail: 142, inUse: 168, maint: 10, thresh: 40 },
            { name: 'Defibrillators', total: 64, avail: 48, inUse: 14, maint: 2, thresh: 12 }
          ].map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/80">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-white text-xs">{item.name}</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                  item.avail < item.thresh ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {item.avail < item.thresh ? 'LOW' : 'STABLE'}
                </span>
              </div>
              <div className="text-lg font-black text-white mt-1">
                {item.avail} <span className="text-xs font-normal text-gray-500">/ {item.total} Avail</span>
              </div>
              <div className="text-[10px] text-gray-500 mt-1 flex justify-between pt-1 border-t border-gray-200/60">
                <span>In Use: {item.inUse}</span>
                <span>Maint: {item.maint}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-gray-100/60 p-4 rounded-2xl border border-gray-200">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search resource name, ID, hospital..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <select
            value={selectedHospitalFilter}
            onChange={(e) => setSelectedHospitalFilter(e.target.value)}
            className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Types</option>
            <option value="Ventilator">Ventilator</option>
            <option value="Patient Monitor">Patient Monitor</option>
            <option value="Infusion Pump">Infusion Pump</option>
            <option value="Oxygen Concentrator">Oxygen Concentrator</option>
            <option value="Oxygen Cylinder">Oxygen Cylinder</option>
            <option value="Defibrillator">Defibrillator</option>
            <option value="Wheelchair">Wheelchair</option>
            <option value="ICU Equipment">ICU Equipment</option>
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="rounded-xl bg-gray-50 border border-gray-200 px-3 py-2 text-xs text-gray-600 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="IN_USE">IN_USE</option>
            <option value="MAINTENANCE">MAINTENANCE</option>
            <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
          </select>
        </div>
      </div>

      {/* Resources Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredResources.map(res => (
          <div
            key={res.id}
            className="rounded-2xl border border-gray-200 bg-gray-100/70 p-5 space-y-4 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-teal-400">{res.resource_id}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  res.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  res.status === 'IN_USE' ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' :
                  res.status === 'MAINTENANCE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-gray-300 text-gray-500 border-slate-600'
                }`}>
                  {res.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{res.name}</h3>
                <p className="text-[11px] text-teal-300/80 mt-0.5 font-medium">{res.resource_type}</p>
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-1">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <span>{res.hospital_name}</span>
                </p>
              </div>

              {/* Quantities */}
              <div className="grid grid-cols-3 gap-2 bg-gray-50/40 p-3 rounded-xl text-center text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block">Total</span>
                  <span className="font-bold text-white">{res.quantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Available</span>
                  <span className="font-bold text-emerald-400">{res.available_quantity}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">In Use</span>
                  <span className="font-bold text-sky-400">{Math.max(0, res.quantity - res.available_quantity)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedResource(res);
                setEditQty(res.quantity);
                setEditAvailQty(res.available_quantity);
                setEditStatus(res.status);
              }}
              className="w-full rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 py-2 text-xs font-bold text-teal-400 transition flex items-center justify-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Update Status & Quantities</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Resource Modal */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white">Update Resource: {selectedResource.name}</h3>
              <button onClick={() => setSelectedResource(null)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateResource} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editQty}
                    onChange={(e) => setEditQty(Number(e.target.value))}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Available Quantity</label>
                  <input
                    type="number"
                    min="0"
                    max={editQty}
                    required
                    value={editAvailQty}
                    onChange={(e) => setEditAvailQty(Number(e.target.value))}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Resource Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="IN_USE">IN_USE</option>
                  <option value="MAINTENANCE">MAINTENANCE</option>
                  <option value="OUT_OF_SERVICE">OUT_OF_SERVICE</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedResource(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-200 py-2.5 text-xs font-bold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white">Add Medical Equipment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Hospital</label>
                <select
                  value={newResource.hospital_id}
                  onChange={(e) => setNewResource({ ...newResource, hospital_id: Number(e.target.value) })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Equipment Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Philips IntelliVue MX800"
                  value={newResource.name}
                  onChange={(e) => setNewResource({ ...newResource, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Equipment Type</label>
                <select
                  value={newResource.resource_type}
                  onChange={(e) => setNewResource({ ...newResource, resource_type: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="Ventilator">Ventilator</option>
                  <option value="Patient Monitor">Patient Monitor</option>
                  <option value="Infusion Pump">Infusion Pump</option>
                  <option value="Oxygen Concentrator">Oxygen Concentrator</option>
                  <option value="Oxygen Cylinder">Oxygen Cylinder</option>
                  <option value="Defibrillator">Defibrillator</option>
                  <option value="Wheelchair">Wheelchair</option>
                  <option value="ICU Equipment">ICU Equipment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Total Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newResource.quantity}
                    onChange={(e) => setNewResource({ ...newResource, quantity: Number(e.target.value), available_quantity: Number(e.target.value) })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Status</label>
                  <select
                    value={newResource.status}
                    onChange={(e) => setNewResource({ ...newResource, status: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="IN_USE">IN_USE</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-200 py-2.5 text-xs font-bold text-gray-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Create Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
