import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderTree, Building2, Search, Plus, Edit3,
  ExternalLink, Layers, RefreshCw, X, Stethoscope, BedDouble
} from 'lucide-react';
import { departmentsAPI, hospitalsAPI } from '../../services/api';
import { Department, Hospital } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';

export const DepartmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHospitalFilter, setSelectedHospitalFilter] = useState<string>('ALL');

  // Add / Edit Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    hospital_id: 1,
    name: '',
    code: '',
    floor: 'Floor 1',
    head_doctor_name: ''
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const [deptList, hospList] = await Promise.all([
        departmentsAPI.getAll(),
        hospitalsAPI.getAll()
      ]);
      setDepartments(deptList);
      setHospitals(hospList);
      if (hospList.length > 0) {
        setFormData(prev => ({ ...prev, hospital_id: hospList[0].id }));
      }
    } catch (e) {
      console.error('Error loading departments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await departmentsAPI.create(formData);
      setShowAddModal(false);
      setFormData({
        hospital_id: hospitals[0]?.id || 1,
        name: '',
        code: '',
        floor: 'Floor 1',
        head_doctor_name: ''
      });
      await loadDepartments();
    } catch (e) {
      console.error('Error creating department:', e);
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept) return;
    try {
      await departmentsAPI.update(selectedDept.id, {
        name: formData.name,
        floor: formData.floor,
        head_doctor_name: formData.head_doctor_name
      });
      setSelectedDept(null);
      await loadDepartments();
    } catch (e) {
      console.error('Error updating department:', e);
    }
  };

  const filteredDepartments = departments.filter(d => {
    if (selectedHospitalFilter !== 'ALL' && d.hospital_id !== Number(selectedHospitalFilter)) return false;
    const q = searchTerm.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.code.toLowerCase().includes(q) ||
      (d.hospital_name && d.hospital_name.toLowerCase().includes(q)) ||
      (d.head_doctor_name && d.head_doctor_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Clinical Departments</h1>
            <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/20">
              {departments.length} Departments
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Departmental structures across the network including ICU, Emergency, Surgery, Cardiology, Neurology, and Wards.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 px-4 py-2 text-xs font-bold text-white transition shadow-lg shadow-teal-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Department</span>
          </button>
          <button
            onClick={loadDepartments}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-teal-400 transition"
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
            placeholder="Search department, code, doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
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
          <div className="text-xs text-gray-500 whitespace-nowrap">
            Showing <span className="font-bold text-white">{filteredDepartments.length}</span>
          </div>
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredDepartments.map(dept => (
          <div
            key={dept.id}
            className="rounded-2xl border border-gray-200 bg-gray-100/70 p-5 space-y-4 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 transition flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-teal-400">{dept.code}</span>
                <StatusBadge status={dept.status} type="icu" />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{dept.name}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-gray-400" />
                  <span className="truncate">{dept.hospital_name}</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-1 font-mono">{dept.floor}</p>
              </div>

              <div className="border-t border-gray-200/80 pt-2.5 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Head Physician:</span>
                  <span className="font-semibold text-gray-700 truncate max-w-[120px]">{dept.head_doctor_name || 'Dr. Attending'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Beds:</span>
                  <span className="font-bold text-white">{dept.total_beds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Occupancy:</span>
                  <span className="font-bold text-teal-400">{dept.occupied_beds} ({dept.occupancy_rate}%)</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200/80 pt-3 flex items-center gap-2">
              <button
                onClick={() => navigate(`/admin/hospitals/${dept.hospital_id}`)}
                className="flex-1 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 py-1.5 text-xs font-bold text-teal-400 transition text-center"
              >
                View
              </button>
              <button
                onClick={() => {
                  setSelectedDept(dept);
                  setFormData({
                    hospital_id: dept.hospital_id,
                    name: dept.name,
                    code: dept.code,
                    floor: dept.floor,
                    head_doctor_name: dept.head_doctor_name || ''
                  });
                }}
                className="flex-1 rounded-xl border border-gray-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200 py-1.5 text-xs font-bold text-gray-600 transition text-center"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Department Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white">Add Department</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Hospital</label>
                <select
                  value={formData.hospital_id}
                  onChange={(e) => setFormData({ ...formData, hospital_id: Number(e.target.value) })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology Department"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CARD"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Floor Location</label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Head Physician</label>
                <input
                  type="text"
                  placeholder="Dr. Physician Name"
                  value={formData.head_doctor_name}
                  onChange={(e) => setFormData({ ...formData, head_doctor_name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
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
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {selectedDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h3 className="text-base font-bold text-white">Edit Department: {selectedDept.code}</h3>
              <button onClick={() => setSelectedDept(null)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Floor Location</label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Head Physician</label>
                <input
                  type="text"
                  value={formData.head_doctor_name}
                  onChange={(e) => setFormData({ ...formData, head_doctor_name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedDept(null)}
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
    </div>
  );
};
