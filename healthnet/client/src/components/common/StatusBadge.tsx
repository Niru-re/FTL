import React from 'react';
import { getBedStatusClasses, getAmbulanceStatusClasses, getAcuityClasses, getHospitalEmergencyStatusClasses } from '../../utils/formatters';

interface StatusBadgeProps {
  type: 'bed' | 'ambulance' | 'patient' | 'hospital' | 'alert' | 'priority' | 'icu';
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, status, className = '' }) => {
  let badgeClass = 'bg-gray-200 text-gray-600 border-gray-300';
  let label = status;

  if (type === 'bed') {
    const info = getBedStatusClasses(status);
    badgeClass = info.badge;
    label = info.label;
  } else if (type === 'ambulance') {
    badgeClass = getAmbulanceStatusClasses(status);
    label = status.replace('_', ' ');
  } else if (type === 'patient') {
    badgeClass = getAcuityClasses(status);
    label = status.replace('_', ' ');
  } else if (type === 'hospital') {
    badgeClass = getHospitalEmergencyStatusClasses(status);
    label = status;
  } else if (type === 'priority') {
    if (status === 'RED') badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
    else if (status === 'YELLOW') badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    else badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    label = `${status} Priority`;
  } else if (type === 'alert') {
    if (status === 'CRITICAL') badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse font-bold';
    else if (status === 'HIGH') badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
    else if (status === 'MEDIUM') badgeClass = 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    else badgeClass = 'bg-gray-300 text-gray-600 border-slate-600';
    label = status;
  } else if (type === 'icu') {
    if (status === 'CRITICAL CAPACITY' || status === 'FULL') badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold';
    else if (status === 'HIGH LOAD') badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
    else badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    label = status;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${badgeClass} ${className}`}>
      {label}
    </span>
  );
};
