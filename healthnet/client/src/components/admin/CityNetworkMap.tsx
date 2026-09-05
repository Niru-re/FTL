import React, { useState } from 'react';
import { Hospital, Ambulance, EmergencyCase } from '../../types';
import {
  Building2, Siren, AlertTriangle, Activity, ShieldAlert,
  Radio, BedDouble, Wind, Compass, X, ChevronRight, Users
} from 'lucide-react';

interface CityNetworkMapProps {
  hospitals: Hospital[];
  ambulances?: Ambulance[];
  emergencies?: EmergencyCase[];
  onSelectHospital?: (hospital: Hospital) => void;
  onSelectAmbulance?: (ambulance: Ambulance) => void;
  onSelectEmergency?: (emergency: EmergencyCase) => void;
  height?: number | string;
}

export const CityNetworkMap: React.FC<CityNetworkMapProps> = ({
  hospitals = [],
  ambulances = [],
  emergencies = [],
  onSelectHospital,
  onSelectAmbulance,
  onSelectEmergency,
  height = 480
}) => {
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'hospital' | 'ambulance' | 'emergency';
    data: any;
  } | null>(null);

  // Dynamic bounds calculation with fallback coordinates for NYC metro area
  const lats = hospitals.map(h => h.lat || 40.7128).concat(ambulances.map(a => a.lat || 40.7128));
  const lngs = hospitals.map(h => h.lng || -74.0060).concat(ambulances.map(a => a.lng || -74.0060));

  const minLat = Math.min(...lats, 40.6900);
  const maxLat = Math.max(...lats, 40.8200);
  const minLng = Math.min(...lngs, -74.0500);
  const maxLng = Math.max(...lngs, -73.8800);

  const getPosition = (lat?: number, lng?: number) => {
    const validLat = typeof lat === 'number' ? lat : 40.7128;
    const validLng = typeof lng === 'number' ? lng : -74.0060;
    const latSpan = maxLat - minLat || 0.1;
    const lngSpan = maxLng - minLng || 0.1;

    // Convert to percentage with padding
    const xPct = Math.max(5, Math.min(95, ((validLng - minLng) / lngSpan) * 90 + 5));
    const yPct = Math.max(5, Math.min(95, 100 - (((validLat - minLat) / latSpan) * 90 + 5)));

    return { xPct, yPct };
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'NORMAL':
        return { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/50', ring: 'ring-emerald-500/20' };
      case 'SURGE':
        return { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/50', ring: 'ring-amber-500/20' };
      case 'DIVERT':
        return { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/50', ring: 'ring-rose-500/20' };
      case 'CLOSED':
        return { bg: 'bg-slate-500', text: 'text-gray-500', border: 'border-slate-500/50', ring: 'ring-slate-500/20' };
      default:
        return { bg: 'bg-sky-500', text: 'text-sky-400', border: 'border-sky-500/50', ring: 'ring-sky-500/20' };
    }
  };

  return (
    <div
      className="relative w-full rounded-2xl border border-gray-200 bg-gray-50 overflow-hidden shadow-2xl select-none"
      style={{ height }}
    >
      {/* Background Cartographic Grid Styling */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* City Arteries & Grid Lines (Simulated Metropolitan Map Overlay) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800/40" xmlns="http://www.w3.org/2000/svg">
        <line x1="12%" y1="20%" x2="88%" y2="82%" strokeWidth="1.5" strokeDasharray="6 6" />
        <line x1="20%" y1="80%" x2="85%" y2="18%" strokeWidth="1.5" strokeDasharray="6 6" />
        <line x1="45%" y1="8%" x2="52%" y2="92%" strokeWidth="2" />
        <line x1="8%" y1="48%" x2="92%" y2="54%" strokeWidth="2" />
        <circle cx="50%" cy="50%" r="35%" fill="none" strokeWidth="1" stroke="#1e293b" />
        <circle cx="50%" cy="50%" r="20%" fill="none" strokeWidth="1" stroke="#1e293b" />
      </svg>

      {/* Map Header Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-gray-100/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-gray-200 shadow-lg">
        <Compass className="w-4 h-4 text-sky-400 animate-spin" style={{ animationDuration: '24s' }} />
        <div>
          <div className="text-xs font-semibold text-gray-900 tracking-wide flex items-center gap-2">
            METROPOLITAN CAREBRIDGE GRID
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          </div>
          <div className="text-[10px] text-gray-500">
            {hospitals.length} Hospitals • {ambulances.length} Ambulances • {emergencies.length} Emergencies
          </div>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-3 bg-gray-100/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 text-[10px] text-gray-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> NORMAL</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> SURGE</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> DIVERT</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" /> AMBULANCE</span>
      </div>

      {/* Hospital Nodes */}
      {hospitals.map((hosp) => {
        const { xPct, yPct } = getPosition(hosp.lat, hosp.lng);
        const statusTheme = getStatusColor(hosp.emergency_status);
        const occRate = hosp.icu_occupancy_rate || 0;

        return (
          <div
            key={`hosp-${hosp.id}`}
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 z-20"
            onClick={() => {
              setSelectedEntity({ type: 'hospital', data: hosp });
              if (onSelectHospital) onSelectHospital(hosp);
            }}
          >
            {/* Pulsing ring for surge/divert */}
            {hosp.emergency_status !== 'NORMAL' && (
              <span className={`absolute -inset-2 rounded-full ${statusTheme.bg} opacity-25 animate-ping`} />
            )}

            {/* Marker Icon */}
            <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 border ${statusTheme.border} shadow-lg bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:scale-110 transition-transform ${statusTheme.ring}`}>
              <Building2 className={`w-4 h-4 ${statusTheme.text}`} />
              {/* ICU Load Pill */}
              <span className={`absolute -top-2 -right-2 px-1 py-0.2 rounded-full text-[9px] font-bold ${statusTheme.bg} text-gray-900`}>
                {Math.round(occRate)}%
              </span>
            </div>

            {/* Tooltip / Label */}
            <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-gray-100/95 border border-gray-200 text-[10px] font-medium text-gray-700 whitespace-nowrap opacity-0 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:opacity-100 transition-opacity pointer-events-none shadow-xl z-30">
              {hosp.name} ({hosp.code})
            </div>
          </div>
        );
      })}

      {/* Ambulance Beacons */}
      {ambulances.map((amb) => {
        const { xPct, yPct } = getPosition(amb.lat, amb.lng);
        const isInTransit = amb.status === 'EN_ROUTE' || amb.status === 'TRANSPORTING';

        return (
          <div
            key={`amb-${amb.id}`}
            style={{ left: `${xPct}%`, top: `${yPct}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 z-20"
            onClick={() => {
              setSelectedEntity({ type: 'ambulance', data: amb });
              if (onSelectAmbulance) onSelectAmbulance(amb);
            }}
          >
            {isInTransit && (
              <span className="absolute -inset-2 rounded-full bg-sky-400 opacity-40 animate-ping" />
            )}
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-sky-950 border border-sky-500/80 shadow-md bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:scale-125 transition-transform text-sky-400">
              <Siren className="w-3.5 h-3.5 animate-pulse" />
              {amb.eta_minutes !== undefined && amb.eta_minutes > 0 && (
                <span className="absolute -bottom-2 px-1 rounded bg-sky-600 text-white text-[8px] font-bold">
                  {amb.eta_minutes}m
                </span>
              )}
            </div>

            <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-gray-100/95 border border-gray-200 text-[10px] font-medium text-gray-700 whitespace-nowrap opacity-0 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:opacity-100 transition-opacity pointer-events-none shadow-xl z-30">
              {amb.code} ({amb.status})
            </div>
          </div>
        );
      })}

      {/* Entity Details Popup Card */}
      {selectedEntity && (
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 z-30 bg-gray-100/95 backdrop-blur-md rounded-xl border border-gray-200 p-4 shadow-2xl animate-in fade-in duration-200">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectedEntity.type === 'hospital' ? (
                <Building2 className="w-5 h-5 text-emerald-400" />
              ) : selectedEntity.type === 'ambulance' ? (
                <Siren className="w-5 h-5 text-sky-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <div>
                <h4 className="text-xs font-bold text-gray-900">
                  {selectedEntity.type === 'hospital' ? selectedEntity.data.name : selectedEntity.data.code}
                </h4>
                <p className="text-[10px] text-gray-500">
                  {selectedEntity.type === 'hospital' ? selectedEntity.data.branch_name : `Paramedic: ${selectedEntity.data.paramedic_name || 'Assigned'}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedEntity.type === 'hospital' && (
            <div className="space-y-2 text-[11px] text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Emergency Status:</span>
                <span className={`font-semibold ${getStatusColor(selectedEntity.data.emergency_status).text}`}>
                  {selectedEntity.data.emergency_status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>ICU Occupancy:</span>
                <span className="font-semibold text-gray-900">
                  {selectedEntity.data.occupied_icu_beds || 0} / {selectedEntity.data.icu_capacity || 0} ({selectedEntity.data.icu_occupancy_rate || 0}%)
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Available Beds:</span>
                <span className="font-semibold text-emerald-400">
                  {selectedEntity.data.available_beds || 0}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span>Ventilators:</span>
                <span className="font-semibold text-gray-900">
                  {selectedEntity.data.ventilators_available || 0} / {selectedEntity.data.ventilators_total || 0}
                </span>
              </div>
            </div>
          )}

          {selectedEntity.type === 'ambulance' && (
            <div className="space-y-2 text-[11px] text-gray-600">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Operational Status:</span>
                <span className="font-semibold text-sky-400">{selectedEntity.data.status}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Plate Number:</span>
                <span className="font-mono text-gray-900">{selectedEntity.data.plate_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span>Current Patient:</span>
                <span className="font-semibold text-gray-900">{selectedEntity.data.current_patient_name || 'None'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Simulated ETA:</span>
                <span className="font-bold text-amber-400">{selectedEntity.data.eta_minutes || 0} min</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
