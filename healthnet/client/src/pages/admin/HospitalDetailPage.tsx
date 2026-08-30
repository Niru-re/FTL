import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Building2, ArrowLeft, BedDouble, HeartPulse, Activity, Phone, MapPin,
  ShieldAlert, CheckCircle, RefreshCw, Users, Stethoscope, UserCheck,
  FolderTree, Wrench, Edit3, X, Sparkles, Layers, Search, Filter
} from 'lucide-react';
import { hospitalsAPI, departmentsAPI, unitsAPI, bedsAPI, resourcesAPI, staffAPI } from '../../services/api';
import { Hospital, Department, Unit, Bed, Resource, Staff, HospitalSummary } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StatCard } from '../../components/common/StatCard';
import { BedStatusModal } from '../../components/ui/BedStatusModal';

export const HospitalDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const hospitalId = Number(id);

  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [summary, setSummary] = useState<HospitalSummary | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'units' | 'beds' | 'resources' | 'staff'>('overview');

  // Modals & form states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    branch_name: '',
    address: '',
    contact_phone: '',
    emergency_status: 'NORMAL',
    trauma_level: 'Level 1 Comprehensive'
  });

  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [deptFormData, setDeptFormData] = useState({
    name: '',
    code: '',
    floor: 'Floor 1',
    head_doctor_name: ''
  });

  // Bed status modal
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [viewBedDetail, setViewBedDetail] = useState<Bed | null>(null);

  // Bed filters inside hospital
  const [bedStatusFilter, setBedStatusFilter] = useState('ALL');
  const [bedTypeFilter, setBedTypeFilter] = useState('ALL');
  const [bedSearch, setBedSearch] = useState('');

  // Resource edit modal
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceAvailQty, setResourceAvailQty] = useState<number>(0);
  const [resourceStatus, setResourceStatus] = useState<string>('AVAILABLE');

  useEffect(() => {
    if (hospitalId) {
      loadAllHospitalData();
    }
  }, [hospitalId]);

  const loadAllHospitalData = async () => {
    setIsLoading(true);
    try {
      const [hospData, summData, deptData, icuData, wardData, bedData, resData, staffData] = await Promise.all([
        hospitalsAPI.getById(hospitalId),
        hospitalsAPI.getSummary(hospitalId),
        departmentsAPI.getAll(hospitalId),
        unitsAPI.getICUs(hospitalId),
        unitsAPI.getWards(hospitalId),
        bedsAPI.getBeds({ hospital_id: hospitalId }),
        resourcesAPI.getAll({ hospital_id: hospitalId }),
        staffAPI.getAll({ hospital_id: hospitalId })
      ]);

      setHospital(hospData);
      setSummary(summData);
      setDepartments(deptData);
      setUnits([...icuData, ...wardData]);
      setBeds(bedData);
      setResources(resData);
      setStaff(staffData);

      setEditFormData({
        name: hospData.name,
        branch_name: hospData.branch_name,
        address: hospData.address,
        contact_phone: hospData.contact_phone,
        emergency_status: hospData.emergency_status,
        trauma_level: hospData.trauma_level
      });
    } catch (e) {
      console.error('Error loading hospital details:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await hospitalsAPI.update(hospitalId, {
        ...editFormData,
        emergency_status: editFormData.emergency_status as any
      });
      setShowEditModal(false);
      await loadAllHospitalData();
    } catch (e) {
      console.error('Error updating hospital:', e);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await departmentsAPI.create({
        ...deptFormData,
        hospital_id: hospitalId,
        branch_id: hospitalId
      });
      setShowAddDeptModal(false);
      setDeptFormData({ name: '', code: '', floor: 'Floor 1', head_doctor_name: '' });
      await loadAllHospitalData();
    } catch (e) {
      console.error('Error adding department:', e);
    }
  };

  const handleBedStatusUpdated = async (updatedBed: Bed) => {
    setBeds(prev => prev.map(b => b.id === updatedBed.id ? updatedBed : b));
    setSelectedBed(null);
    // Refresh capacity numbers
    const summ = await hospitalsAPI.getSummary(hospitalId);
    setSummary(summ);
  };

  const handleUpdateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResource) return;
    try {
      await resourcesAPI.update(selectedResource.id, {
        available_quantity: resourceAvailQty,
        status: resourceStatus as any
      });
      setSelectedResource(null);
      await loadAllHospitalData();
    } catch (e) {
      console.error('Error updating resource:', e);
    }
  };

  if (isLoading && !hospital) {
    return (
      <div className="flex h-96 items-center justify-center text-teal-400 font-bold text-xs uppercase tracking-wider">
        Loading Hospital Details...
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="p-8 text-center text-slate-400">
        Hospital not found.
        <button onClick={() => navigate('/admin/hospitals')} className="mt-4 block mx-auto text-teal-400 underline">
          Return to Hospitals
        </button>
      </div>
    );
  }

  // Filtered beds
  const filteredBeds = beds.filter(b => {
    if (bedStatusFilter !== 'ALL' && b.status !== bedStatusFilter) return false;
    if (bedTypeFilter !== 'ALL' && b.bed_type !== bedTypeFilter) return false;
    if (bedSearch) {
      const q = bedSearch.toLowerCase();
      return (
        b.code.toLowerCase().includes(q) ||
        (b.patient_name && b.patient_name.toLowerCase().includes(q)) ||
        (b.department_name && b.department_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/hospitals')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{hospital.name}</h1>
              <StatusBadge status={hospital.emergency_status} type="hospital" />
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{hospital.branch_name}</span>
              <span>•</span>
              <span className="font-mono text-teal-400">{hospital.code}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-500" />{hospital.address}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-700 transition"
          >
            <Edit3 className="h-4 w-4 text-teal-400" />
            <span>Edit Hospital</span>
          </button>
          <button
            onClick={loadAllHospitalData}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-teal-400 transition"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Top Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard
          title="Total Beds"
          value={summary?.total_beds ?? hospital.total_beds}
          icon={BedDouble}
          variant="teal"
          subValue={`${summary?.available_beds ?? hospital.available_beds} Available`}
        />
        <StatCard
          title="Occupied Beds"
          value={summary?.occupied_beds ?? hospital.occupied_beds}
          icon={BedDouble}
          variant="rose"
          subValue={`${summary?.cleaning_beds ?? hospital.cleaning_beds} Cleaning`}
        />
        <StatCard
          title="ICU Capacity"
          value={summary?.total_icu_beds ?? hospital.icu_capacity}
          icon={HeartPulse}
          variant="purple"
          subValue={`${summary?.available_icu_beds ?? hospital.available_icu_beds} Available`}
        />
        <StatCard
          title="ICU Occupancy"
          value={`${summary?.icu_occupancy_rate ?? hospital.icu_occupancy_rate}%`}
          icon={Activity}
          variant={(summary?.icu_occupancy_rate ?? hospital.icu_occupancy_rate) > 85 ? 'rose' : (summary?.icu_occupancy_rate ?? hospital.icu_occupancy_rate) >= 60 ? 'amber' : 'emerald'}
          subValue={(summary?.icu_occupancy_rate ?? hospital.icu_occupancy_rate) > 85 ? 'Critical' : 'Normal'}
        />
        <StatCard
          title="Emergency Capacity"
          value={summary?.total_emergency_beds ?? hospital.er_capacity}
          icon={ShieldAlert}
          variant="amber"
          subValue={`${summary?.available_emergency_beds ?? 5} Available`}
        />
        <StatCard
          title="Ventilators"
          value={`${summary?.ventilators_available ?? hospital.ventilators_available} / ${summary?.ventilators_total ?? hospital.ventilators_total}`}
          icon={Activity}
          variant="sky"
          subValue="Available / Total"
        />
        <StatCard
          title="Active Staff"
          value={staff.filter(s => s.on_duty_status === 'ON_DUTY').length}
          icon={Users}
          variant="teal"
          subValue={`${staff.filter(s => s.staff_type === 'DOCTOR').length} Docs, ${staff.filter(s => s.staff_type === 'NURSE').length} Nurses`}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto custom-scrollbar pb-px">
        {[
          { key: 'overview', label: 'Overview', icon: Building2 },
          { key: 'departments', label: `Departments (${departments.length})`, icon: FolderTree },
          { key: 'units', label: `ICU & Wards (${units.length})`, icon: Layers },
          { key: 'beds', label: `Beds (${beds.length})`, icon: BedDouble },
          { key: 'resources', label: `Resources (${resources.length})`, icon: Wrench },
          { key: 'staff', label: `Staff (${staff.length})`, icon: Users }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-teal-400 text-teal-300 bg-teal-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-400" />
              <span>Hospital Facility Profile</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-slate-400">Campus Code</span>
                <p className="text-sm font-bold text-white font-mono">{hospital.code}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-slate-400">Trauma Designation</span>
                <p className="text-sm font-bold text-white">{hospital.trauma_level}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-slate-400">Emergency Dispatch Phone</span>
                <p className="text-sm font-bold text-teal-400 font-mono">{hospital.contact_phone}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1">
                <span className="text-[11px] font-semibold uppercase text-slate-400">ECMO Availability</span>
                <p className="text-sm font-bold text-emerald-400">{hospital.ecmo_available ? 'Available (Ready for Cannulation)' : 'Not Equipped'}</p>
              </div>
            </div>

            {/* Capacity Distribution Bar */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Overall Bed Distribution</span>
                <span className="font-bold text-teal-300">{summary?.overall_occupancy_rate ?? hospital.overall_occupancy_rate}% Occupied</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-3 flex overflow-hidden">
                <div style={{ width: `${((summary?.occupied_beds ?? hospital.occupied_beds) / ((summary?.total_beds ?? hospital.total_beds) || 1)) * 100}%` }} className="bg-rose-500 h-full" title="Occupied"></div>
                <div style={{ width: `${((summary?.reserved_beds ?? hospital.reserved_beds) / ((summary?.total_beds ?? hospital.total_beds) || 1)) * 100}%` }} className="bg-sky-500 h-full" title="Reserved"></div>
                <div style={{ width: `${((summary?.cleaning_beds ?? hospital.cleaning_beds) / ((summary?.total_beds ?? hospital.total_beds) || 1)) * 100}%` }} className="bg-amber-500 h-full" title="Cleaning"></div>
                <div style={{ width: `${((summary?.available_beds ?? hospital.available_beds) / ((summary?.total_beds ?? hospital.total_beds) || 1)) * 100}%` }} className="bg-emerald-500 h-full" title="Available"></div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500"></span>Occupied ({summary?.occupied_beds ?? hospital.occupied_beds})</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-sky-500"></span>Reserved ({summary?.reserved_beds ?? hospital.reserved_beds})</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500"></span>Cleaning ({summary?.cleaning_beds ?? hospital.cleaning_beds})</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"></span>Available ({summary?.available_beds ?? hospital.available_beds})</span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Geo Info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
              <h4 className="text-sm font-bold text-white">Geographical Coordinates</h4>
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Latitude:</span>
                  <span className="font-mono text-slate-200">{hospital.lat.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Longitude:</span>
                  <span className="font-mono text-slate-200">{hospital.lng.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Protocol:</span>
                  <span className="font-bold text-teal-400">{hospital.emergency_status}</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setActiveTab('beds')}
                  className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition text-center"
                >
                  Manage Hospital Beds
                </button>
                <button
                  onClick={() => setActiveTab('resources')}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-200 transition text-center"
                >
                  Manage Medical Resources
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Departments */}
      {activeTab === 'departments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Clinical Departments ({departments.length})</h3>
            <button
              onClick={() => setShowAddDeptModal(true)}
              className="rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-2 text-xs font-bold text-white transition flex items-center gap-1.5"
            >
              <span>Add Department</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {departments.map(dept => (
              <div key={dept.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-teal-400">{dept.code}</span>
                  <StatusBadge status={dept.status} type="icu" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{dept.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{dept.floor}</p>
                </div>
                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Head:</span>
                  <span className="font-semibold text-slate-200">{dept.head_doctor_name || 'Dr. Attending'}</span>
                </div>
                <div className="flex items-center justify-between text-xs bg-slate-950/40 p-2.5 rounded-xl">
                  <span className="text-slate-400">Capacity:</span>
                  <span className="font-bold text-white">{dept.occupied_beds} / {dept.total_beds} Beds ({dept.occupancy_rate}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: ICU & Wards (Units) */}
      {activeTab === 'units' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">ICU Units & Inpatient Wards ({units.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {units.map(unit => (
              <div key={unit.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    unit.unit_type === 'ICU' ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                  }`}>
                    {unit.unit_type}
                  </span>
                  <StatusBadge status={unit.status} type="icu" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{unit.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{unit.department_name}</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Occupancy</span>
                    <span className="font-bold text-white">{unit.occupied} / {unit.capacity} ({unit.occupancy_rate}%)</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, unit.occupancy_rate)}%` }}
                      className={`h-full rounded-full ${
                        unit.occupancy_rate > 85 ? 'bg-rose-500' : unit.occupancy_rate >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                  <div className="rounded-lg bg-slate-950/40 p-2">
                    <span className="text-[10px] text-slate-400 block">Available</span>
                    <span className="font-bold text-emerald-400">{unit.available}</span>
                  </div>
                  <div className="rounded-lg bg-slate-950/40 p-2">
                    <span className="text-[10px] text-slate-400 block">Occupied</span>
                    <span className="font-bold text-rose-400">{unit.occupied}</span>
                  </div>
                  <div className="rounded-lg bg-slate-950/40 p-2">
                    <span className="text-[10px] text-slate-400 block">Cleaning</span>
                    <span className="font-bold text-amber-400">{unit.cleaning}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Beds */}
      {activeTab === 'beds' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search bed code or patient name..."
                value={bedSearch}
                onChange={(e) => setBedSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={bedStatusFilter}
                onChange={(e) => setBedStatusFilter(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="RESERVED">Reserved</option>
                <option value="CLEANING">Cleaning</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
              </select>

              <select
                value={bedTypeFilter}
                onChange={(e) => setBedTypeFilter(e.target.value)}
                className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-teal-500"
              >
                <option value="ALL">All Types</option>
                <option value="ICU">ICU</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="GENERAL">General Ward</option>
                <option value="SURGICAL_STEPDOWN">OT / Stepdown</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBeds.map(bed => (
              <div
                key={bed.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-white">{bed.code}</span>
                  <StatusBadge status={bed.status} type="bed" />
                </div>
                <p className="text-[11px] text-slate-400">{bed.department_name || bed.bed_type}</p>

                {bed.status === 'OCCUPIED' && bed.patient_name ? (
                  <div className="rounded-xl bg-slate-950/60 p-2.5 border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 block uppercase">Current Patient</span>
                    <span className="text-xs font-bold text-slate-200 block truncate">{bed.patient_name}</span>
                  </div>
                ) : (
                  <div className="rounded-xl bg-slate-950/30 p-2.5 border border-slate-800/40 text-center">
                    <span className="text-[11px] font-semibold text-emerald-400">Available for Admission</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setViewBedDetail(bed)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition"
                  >
                    View
                  </button>
                  <button
                    onClick={() => setSelectedBed(bed)}
                    className="flex-1 rounded-lg bg-teal-600 hover:bg-teal-500 py-1.5 text-xs font-bold text-white transition"
                  >
                    Change Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Resources */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Tracked Medical Equipment & Resources ({resources.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map(res => (
              <div key={res.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-teal-400">{res.resource_id}</span>
                  <StatusBadge status={res.status} type="hospital" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{res.name}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{res.resource_type}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-slate-950/40 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Total Quantity</span>
                    <span className="font-bold text-white">{res.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Available</span>
                    <span className="font-bold text-emerald-400">{res.available_quantity}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedResource(res);
                    setResourceAvailQty(res.available_quantity);
                    setResourceStatus(res.status);
                  }}
                  className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-teal-400 transition"
                >
                  Update Quantity / Status
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Staff */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Hospital Clinical Staff Roster ({staff.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staff.map(member => (
              <div key={member.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-teal-400 font-bold text-sm">
                    {member.staff_type === 'DOCTOR' ? <Stethoscope className="h-5 w-5 text-sky-400" /> : <UserCheck className="h-5 w-5 text-teal-400" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{member.name}</h4>
                    <p className="text-[11px] text-slate-400">{member.specialization}</p>
                    <span className="text-[10px] font-mono text-slate-500">{member.employee_code} • {member.shift}</span>
                  </div>
                </div>
                <StatusBadge status={member.on_duty_status} type="hospital" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bed Status Update Modal */}
      {selectedBed && (
        <BedStatusModal
          bed={selectedBed}
          onClose={() => setSelectedBed(null)}
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
                <span>Bed {viewBedDetail.code} Details</span>
              </span>
              <button onClick={() => setViewBedDetail(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-white">{viewBedDetail.department_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Type:</span>
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
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Equipment:</span>
                <span className="font-semibold text-teal-400">{viewBedDetail.equipment || 'Standard Ports'}</span>
              </div>
            </div>

            <button
              onClick={() => setViewBedDetail(null)}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Edit Hospital Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Edit Hospital Information</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateHospital} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Hospital Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Branch Campus Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.branch_name}
                  onChange={(e) => setEditFormData({ ...editFormData, branch_name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Address</label>
                <input
                  type="text"
                  required
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Contact Phone</label>
                  <input
                    type="text"
                    required
                    value={editFormData.contact_phone}
                    onChange={(e) => setEditFormData({ ...editFormData, contact_phone: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400">Emergency Status</label>
                  <select
                    value={editFormData.emergency_status}
                    onChange={(e) => setEditFormData({ ...editFormData, emergency_status: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
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
                  onClick={() => setShowEditModal(false)}
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

      {/* Add Department Modal */}
      {showAddDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Add Department</h3>
              <button onClick={() => setShowAddDeptModal(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddDepartment} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pediatric Intensive Care"
                  value={deptFormData.name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Department Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PICU"
                  value={deptFormData.code}
                  onChange={(e) => setDeptFormData({ ...deptFormData, code: e.target.value.toUpperCase() })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Floor Location</label>
                <input
                  type="text"
                  value={deptFormData.floor}
                  onChange={(e) => setDeptFormData({ ...deptFormData, floor: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Head of Department</label>
                <input
                  type="text"
                  placeholder="Dr. Physician Name"
                  value={deptFormData.head_doctor_name}
                  onChange={(e) => setDeptFormData({ ...deptFormData, head_doctor_name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Update Modal */}
      {selectedResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Update {selectedResource.name}</h3>
              <button onClick={() => setSelectedResource(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateResource} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400">Available Quantity (Max: {selectedResource.quantity})</label>
                <input
                  type="number"
                  min="0"
                  max={selectedResource.quantity}
                  value={resourceAvailQty}
                  onChange={(e) => setResourceAvailQty(Number(e.target.value))}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Resource Status</label>
                <select
                  value={resourceStatus}
                  onChange={(e) => setResourceStatus(e.target.value)}
                  className="w-full mt-1 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-teal-500"
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
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-600 hover:bg-teal-500 py-2.5 text-xs font-bold text-white transition"
                >
                  Save Resource
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
