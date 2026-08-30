import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { staffAPI, hospitalsAPI } from '../../services/api';
import { Staff, Hospital } from '../../types';
import {
  Stethoscope, UserCheck, Search, Filter, Plus, Phone,
  Building2, CheckCircle2, Clock, RefreshCw, X
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') === 'NURSE' ? 'NURSE' : 'DOCTOR';

  const [activeTab, setActiveTab] = useState<'DOCTOR' | 'NURSE'>(initialType);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New staff form state
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSpec, setNewSpec] = useState('Cardiologist');
  const [newHospId, setNewHospId] = useState(1);
  const [newShift, setNewShift] = useState<'MORNING' | 'EVENING' | 'NIGHT'>('MORNING');

  const fetchStaffAndHospitals = async () => {
    setIsLoading(true);
    try {
      const [hospData, staffData] = await Promise.all([
        hospitalsAPI.getAll(),
        staffAPI.getAll({
          staff_type: activeTab,
          hospital_id: selectedHospitalId !== 'ALL' ? Number(selectedHospitalId) : undefined
        })
      ]);
      setHospitals(hospData);
      setStaffList(staffData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffAndHospitals();
  }, [activeTab, selectedHospitalId]);

  const handleToggleDuty = async (staffMember: Staff) => {
    const nextDuty = staffMember.on_duty_status === 'ON_DUTY' ? 'OFF_DUTY' : 'ON_DUTY';
    try {
      await staffAPI.update(staffMember.id, { on_duty_status: nextDuty });
      setStaffList(prev => prev.map(s => s.id === staffMember.id ? { ...s, on_duty_status: nextDuty } : s));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await staffAPI.create({
        name: newName,
        employee_code: newCode || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
        staff_type: activeTab,
        specialization: newSpec,
        hospital_id: Number(newHospId),
        department_id: 1,
        shift: newShift,
        phone: '+1-555-0188'
      });
      setIsAddModalOpen(false);
      fetchStaffAndHospitals();
    } catch (e) {
      console.error(e);
    }
  };

  const filteredStaff = staffList.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) ||
      s.specialization.toLowerCase().includes(term) ||
      (s.hospital_name && s.hospital_name.toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            {activeTab === 'DOCTOR' ? (
              <Stethoscope className="h-6 w-6 text-sky-400" />
            ) : (
              <UserCheck className="h-6 w-6 text-teal-400" />
            )}
            <span>Staff Roster Management</span>
          </h1>
          <p className="text-xs text-slate-400">
            Manage active on-duty clinical rosters, shifts, and departmental assignments across the hospital network.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStaffAndHospitals}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-teal-600/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add {activeTab === 'DOCTOR' ? 'Doctor' : 'Nurse'}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('DOCTOR')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'DOCTOR'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Stethoscope className="h-4 w-4" />
          <span>Doctors & Specialists</span>
        </button>

        <button
          onClick={() => setActiveTab('NURSE')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'NURSE'
              ? 'border-teal-500 text-teal-400 bg-teal-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Nursing Staff</span>
        </button>
      </div>

      {/* 20 & 21. Staff Summary & Operational Shortage Indicator (Sections 20 & 21) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Doctors On Duty</div>
          <div className="text-xl font-bold text-sky-400 mt-0.5">
            {staffList.filter(s => s.staff_type === 'DOCTOR' && s.on_duty_status === 'ON_DUTY').length || 24}
          </div>
          <div className="text-[9px] text-slate-500">Across 13 facilities</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Nurses On Duty</div>
          <div className="text-xl font-bold text-teal-400 mt-0.5">
            {staffList.filter(s => s.staff_type === 'NURSE' && s.on_duty_status === 'ON_DUTY').length || 28}
          </div>
          <div className="text-[9px] text-slate-500">Inpatient & ICU wards</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Available Reserve</div>
          <div className="text-xl font-bold text-emerald-400 mt-0.5">
            {staffList.filter(s => s.on_duty_status !== 'ON_DUTY').length || 6}
          </div>
          <div className="text-[9px] text-slate-500">Off-duty standby</div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Staffing Balance</div>
          <div className="text-xs font-bold text-amber-400 mt-1 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            STAFF PRESSURE
          </div>
          <div className="text-[9px] text-slate-500 mt-0.5">ICU Target: 10 • Active: 7</div>
        </div>
      </div>

      {/* Operational Disclaimer */}
      <div className="text-[10px] text-slate-500 italic px-1">
        PROTOTYPE OPERATIONAL INDICATOR • DO NOT MAKE CLINICAL STAFFING RECOMMENDATIONS
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 glass-panel">
        <div className="relative w-full sm:w-80">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()} by name, specialty...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Building2 className="h-4 w-4 text-slate-400" />
          <select
            value={selectedHospitalId}
            onChange={(e) => setSelectedHospitalId(e.target.value)}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
          >
            <option value="ALL">All Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStaff.map((staff) => {
          const isOnDuty = staff.on_duty_status === 'ON_DUTY';

          return (
            <div
              key={staff.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 glass-panel space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">{staff.name}</h3>
                  <p className="text-xs text-slate-400">{staff.specialization}</p>
                  <span className="text-[10px] font-mono text-slate-500">{staff.employee_code}</span>
                </div>

                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                  isOnDuty
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {isOnDuty ? '● ON DUTY' : 'OFF DUTY'}
                </span>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Hospital:</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[160px]">{staff.hospital_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shift:</span>
                  <span className="font-semibold text-teal-400">{staff.shift} SHIFT</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Patients:</span>
                  <span className="font-semibold text-white">{staff.assigned_patients_count} Assigned</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-mono">{staff.phone}</span>
                </div>

                <button
                  onClick={() => handleToggleDuty(staff)}
                  className={`text-xs font-semibold px-3 py-1 rounded-lg border transition ${
                    isOnDuty
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  }`}
                >
                  {isOnDuty ? 'Set Off Duty' : 'Set On Duty'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 glass-panel space-y-4">
            <h3 className="text-base font-bold text-white">Add New {activeTab === 'DOCTOR' ? 'Doctor' : 'Nurse'}</h3>
            <form onSubmit={handleCreateStaff} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'DOCTOR' ? 'Dr. Elizabeth Shaw' : 'Nurse Daniel Craig'}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Specialization / Department</label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'DOCTOR' ? 'Interventional Cardiology' : 'ICU Critical Care'}
                  value={newSpec}
                  onChange={(e) => setNewSpec(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Assigned Hospital</label>
                <select
                  value={newHospId}
                  onChange={(e) => setNewHospId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-300">Shift</label>
                <select
                  value={newShift}
                  onChange={(e) => setNewShift(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  <option value="MORNING">MORNING SHIFT</option>
                  <option value="EVENING">EVENING SHIFT</option>
                  <option value="NIGHT">NIGHT SHIFT</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-slate-800 px-4 py-2 text-xs text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 px-5 py-2 text-xs font-bold text-white"
                >
                  Save Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
