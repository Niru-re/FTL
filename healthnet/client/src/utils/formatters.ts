export const formatDate = (isoString?: string | null): string => {
  if (!isoString) return '--';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatTime = (isoString?: string | null): string => {
  if (!isoString) return '--';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export const formatDateTime = (isoString?: string | null): string => {
  if (!isoString) return '--';
  const d = new Date(isoString);
  return `${formatDate(isoString)} ${formatTime(isoString)}`;
};

export const getBedStatusClasses = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        indicator: 'bg-emerald-500',
        label: 'Available'
      };
    case 'OCCUPIED':
      return {
        bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        indicator: 'bg-rose-500',
        label: 'Occupied'
      };
    case 'RESERVED':
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        indicator: 'bg-amber-500',
        label: 'Reserved'
      };
    case 'CLEANING':
      return {
        bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
        badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        indicator: 'bg-sky-400',
        label: 'Cleaning'
      };
    case 'MAINTENANCE':
      return {
        bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        indicator: 'bg-purple-400',
        label: 'Maintenance'
      };
    case 'OUT_OF_SERVICE':
    default:
      return {
        bg: 'bg-slate-700/20 border-slate-700 text-slate-400',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        indicator: 'bg-slate-500',
        label: 'Out of Service'
      };
  }
};

export const getAmbulanceStatusClasses = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'AVAILABLE':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'DISPATCHED':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    case 'EN_ROUTE':
    case 'TRANSPORTING':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse';
    case 'ARRIVED':
      return 'bg-emerald-500/30 text-emerald-200 border-emerald-400 font-bold';
    case 'RETURNING':
      return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    default:
      return 'bg-slate-700 text-slate-300 border-slate-600';
  }
};

export const getAcuityClasses = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'HIGH_RISK':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'STABLE':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'DISCHARGED':
      return 'bg-slate-600/20 text-slate-400 border-slate-600';
    default:
      return 'bg-slate-700 text-slate-300';
  }
};

export const getHospitalEmergencyStatusClasses = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'NORMAL':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'SURGE':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'DIVERT':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'CLOSED':
      return 'bg-slate-800 text-slate-400 border-slate-700';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
};
