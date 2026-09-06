import React, { useState } from 'react';
import { Hospital, Bed, Staff } from '../../types';
import { hospitalsAPI } from '../../services/api';
import { StatusBadge } from './StatusBadge';
import {
  X, Building2, Phone, MapPin, BedDouble, Wind, UserCheck, Stethoscope,
  ShieldAlert, Activity, ArrowUpRight, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HospitalDetailDrawerProps {
  hospital: Hospital | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const HospitalDetailDrawer: React.FC<HospitalDetailDrawerProps> = ({
  hospital,
  onClose,
  onStatusUpdated
}) => {
  const navigate = useNavigate();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(hospital?.emergency_status || 'NORMAL');

  if (!hospital) return null;

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      await hospitalsAPI.updateEmergencyStatus(hospital.id, newStatus);
      setCurrentStatus(newStatus as any);
      if (onStatusUpdated) onStatusUpdated();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const icuPercent = hospital.icu_occupancy_rate || Math.round(((hospital.icu_capacity - hospital.available_icu_beds) / hospital.icu_capacity) * 100) || 0;
  const overallPercent = hospital.overall_occupancy_rate || Math.round(((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100) || 0;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-gray-100/95 border-l border-gray-200 shadow-2xl backdrop-blur-xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between p-6 border-b border-gray-200 bg-gray-50/60">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">{hospital.name}</h3>
              </div>
              <p className="text-xs text-gray-500 font-medium">{hospital.branch_name}</p>
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
                <MapPin className="h-3 w-3" />
                <span>{hospital.address}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-900 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-14rem)] overflow-y-auto custom-scrollbar">
          {/* Emergency Status Control */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Emergency Routing Status</span>
              <StatusBadge type="hospital" status={currentStatus} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['NORMAL', 'SURGE', 'DIVERT', 'CLOSED'] as const).map((st) => (
                <button
                  key={st}
                  disabled={isUpdatingStatus}
                  onClick={() => handleStatusChange(st)}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                    currentStatus === st
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-sm'
                      : 'bg-gray-100 border-gray-200 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-700'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* ICU & Bed Capacities */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Resource Occupancy</h4>

            {/* ICU Capacity Bar */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-teal-400" />
                  ICU Bed Occupancy
                </span>
                <span className="font-mono text-teal-400 font-bold">{icuPercent}% ({hospital.available_icu_beds} Available)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    icuPercent >= 90 ? 'bg-rose-500' : icuPercent >= 70 ? 'bg-amber-500' : 'bg-teal-500'
                  }`}
                  style={{ width: `${icuPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Occupied: {hospital.icu_capacity - hospital.available_icu_beds}</span>
                <span>Total Capacity: {hospital.icu_capacity}</span>
              </div>
            </div>

            {/* Ward Capacity Bar */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4 text-sky-400" />
                  Total Network Beds
                </span>
                <span className="font-mono text-sky-400 font-bold">{overallPercent}% ({hospital.available_beds} Available)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    overallPercent >= 90 ? 'bg-rose-500' : overallPercent >= 70 ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Occupied: {hospital.occupied_beds || hospital.total_beds - hospital.available_beds}</span>
                <span>Total Beds: {hospital.total_beds}</span>
              </div>
            </div>
          </div>

          {/* Critical Equipment & Staff Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Wind className="h-4 w-4 text-cyan-400" />
                <span>Ventilators</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {hospital.ventilators_available} <span className="text-xs text-gray-400 font-normal">/ {hospital.ventilators_total} free</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-medium block">
                {hospital.ecmo_available ? '✓ ECMO Ready' : 'Standard Vent Only'}
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Stethoscope className="h-4 w-4 text-purple-400" />
                <span>On-Duty Staff</span>
              </div>
              <div className="text-xl font-bold text-gray-900">
                {hospital.doctors_on_duty} <span className="text-xs text-gray-400 font-normal">Docs</span> &bull; {hospital.nurses_on_duty} <span className="text-xs text-gray-400 font-normal">Nurses</span>
              </div>
              <span className="text-[10px] text-gray-500 font-medium block">
                {hospital.trauma_level} Designation
              </span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/30 p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-500" />
              <span>Emergency Command Hotline</span>
            </div>
            <span className="font-mono text-teal-400 font-bold">{hospital.contact_phone}</span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50/80 flex items-center gap-3">
        <button
          onClick={() => {
            onClose();
            navigate(`/admin/beds?hospital_id=${hospital.id}`);
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-teal-600/20 transition"
        >
          <span>View Hospital Beds</span>
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
