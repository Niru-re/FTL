import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Building2, MapPin, Phone, Search, Plus, Edit3,
  ExternalLink, Layers, RefreshCw, X, ShieldAlert
} from 'lucide-react';
import { branchesAPI, hospitalsAPI } from '../../services/api';
import { Branch, Hospital, EmergencyStatus } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const BranchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Add / Edit Branch Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<{
    hospital_id: number;
    name: string;
    code: string;
    address: string;
    lat: number;
    lng: number;
    contact_phone: string;
    emergency_status: EmergencyStatus;
  }>({
    hospital_id: 1,
    name: '',
    code: '',
    address: '',
    lat: 40.7128,
    lng: -74.0060,
    contact_phone: '+1-555-0100',
    emergency_status: 'NORMAL'
  });

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const [branchList, hospList] = await Promise.all([
        branchesAPI.getAll(),
        hospitalsAPI.getAll()
      ]);
      setBranches(branchList);
      setHospitals(hospList);
      if (hospList.length > 0) {
        setFormData(prev => ({ ...prev, hospital_id: hospList[0].id }));
      }
    } catch (e) {
      console.error('Error loading branches:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await branchesAPI.create(formData);
      setShowAddModal(false);
      setFormData({
        hospital_id: hospitals[0]?.id || 1,
        name: '',
        code: '',
        address: '',
        lat: 40.7128,
        lng: -74.0060,
        contact_phone: '+1-555-0100',
        emergency_status: 'NORMAL'
      });
      await loadBranches();
    } catch (e) {
      console.error('Error creating branch:', e);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;
    try {
      await branchesAPI.update(selectedBranch.id, {
        name: formData.name,
        address: formData.address,
        contact_phone: formData.contact_phone,
        emergency_status: formData.emergency_status
      });
      setSelectedBranch(null);
      await loadBranches();
    } catch (e) {
      console.error('Error updating branch:', e);
    }
  };

  const filteredBranches = branches.filter(b => {
    const q = searchTerm.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      (b.hospital_name && b.hospital_name.toLowerCase().includes(q)) ||
      b.address.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Hospital Branch Network</h1>
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20">
              {branches.length} Branches
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Regional and metropolitan branch campuses associated with parent hospital medical centers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-teal-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Branch</span>
          </button>
          <button
            onClick={loadBranches}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-500 hover:text-teal-400 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-100/60 p-4 rounded-2xl border border-gray-200">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search branch name, code, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
        <div className="text-xs text-gray-500">
          Showing <span className="font-bold text-gray-800">{filteredBranches.length}</span> of {branches.length} campuses
        </div>
      </div>

      {/* Branches Table / Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBranches.map(branch => (
          <div
            key={branch.id}
            className="rounded-2xl border border-gray-200 bg-gray-100/70 p-5 space-y-4 hover:border-gray-300 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-teal-400">{branch.code}</span>
                <StatusBadge status={branch.emergency_status} type="hospital" />
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{branch.name}</h3>
                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                  <span>{branch.hospital_name}</span>
                </p>
                <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-1">
                  <MapPin className="h-3 w-3 text-slate-600" />
                  <span className="truncate">{branch.address}</span>
                </p>
              </div>

              {/* Branch Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50/40 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-gray-500 block">Total Beds</span>
                  <span className="font-bold text-gray-800">{branch.total_beds}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Available Beds</span>
                  <span className="font-bold text-emerald-400">{branch.available_beds}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">ICU Capacity</span>
                  <span className="font-bold text-purple-400">{branch.icu_capacity} Beds</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Occupancy</span>
                  <span className="font-bold text-teal-300">{branch.occupancy_rate}%</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-200/80 pt-3 flex items-center gap-2">
              <button
                onClick={() => navigate(`/admin/hospitals/${branch.hospital_id}`)}
                className="flex-1 rounded-xl bg-gray-200 hover:bg-gray-300 py-2 text-xs font-bold text-teal-400 transition flex items-center justify-center gap-1.5"
              >
                <span>View Hospital</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedBranch(branch);
                  setFormData({
                    hospital_id: branch.hospital_id,
                    name: branch.name,
                    code: branch.code,
                    address: branch.address,
                    lat: branch.lat,
                    lng: branch.lng,
                    contact_phone: branch.contact_phone || '+1-555-0100',
                    emergency_status: branch.emergency_status
                  });
                }}
                className="flex-1 rounded-xl border border-gray-300 hover:bg-gray-200 py-2 text-xs font-bold text-gray-600 transition flex items-center justify-center gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-900">Add Branch Campus</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Parent Hospital</label>
                <select
                  value={formData.hospital_id}
                  onChange={(e) => setFormData({ ...formData, hospital_id: Number(e.target.value) })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Branch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CareBridge Central - East Wing"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Branch Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HNC-BR-02"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Address</label>
                <input
                  type="text"
                  required
                  placeholder="123 Hospital Way, Metro City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Emergency Status</label>
                  <select
                    value={formData.emergency_status}
                    onChange={(e) => setFormData({ ...formData, emergency_status: e.target.value as any })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="DIVERT">DIVERT</option>
                    <option value="SURGE">SURGE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Create Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Branch Modal */}
      {selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-gray-900">Edit Branch: {selectedBranch.code}</h3>
              <button onClick={() => setSelectedBranch(null)} className="text-gray-500 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBranch} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Branch Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Contact Phone</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Emergency Status</label>
                  <select
                    value={formData.emergency_status}
                    onChange={(e) => setFormData({ ...formData, emergency_status: e.target.value as any })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="DIVERT">DIVERT</option>
                    <option value="SURGE">SURGE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedBranch(null)}
                  className="flex-1 rounded-xl border border-gray-300 bg-gray-200 py-2.5 text-xs font-bold text-gray-600 hover:text-white transition"
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
