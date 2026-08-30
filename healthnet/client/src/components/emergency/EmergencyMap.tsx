import React, { useState } from 'react';
import { HospitalMatch, Ambulance, AmbulanceCandidate } from '../../types';
import {
  Building2, Siren, MapPin, Navigation, ShieldCheck,
  AlertTriangle, BedDouble, Wind, Zap, Info
} from 'lucide-react';

interface EmergencyMapProps {
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;
  selectedHospital?: HospitalMatch | null;
  candidateHospitals?: HospitalMatch[];
  assignedAmbulance?: Ambulance | AmbulanceCandidate | null;
  candidateAmbulances?: (Ambulance | AmbulanceCandidate)[];
  height?: number | string;
  showRoute?: boolean;
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({
  pickupLat = 28.6139,
  pickupLng = 77.2090,
  pickupAddress = 'City Medical Incident Location',
  selectedHospital,
  candidateHospitals = [],
  assignedAmbulance,
  candidateAmbulances = [],
  height = 360,
  showRoute = true
}) => {
  const [activePopup, setActivePopup] = useState<string | null>(null);

  // Dynamic coordinate normalization based on visible points
  const allLats = [pickupLat, ...(candidateHospitals.map(h => h.lat)), selectedHospital?.lat, assignedAmbulance?.lat].filter((v): v is number => typeof v === 'number');
  const allLngs = [pickupLng, ...(candidateHospitals.map(h => h.lng)), selectedHospital?.lng, assignedAmbulance?.lng].filter((v): v is number => typeof v === 'number');

  const minLat = allLats.length ? Math.min(...allLats) - 0.03 : 40.65;
  const maxLat = allLats.length ? Math.max(...allLats) + 0.03 : 40.85;
  const minLng = allLngs.length ? Math.min(...allLngs) - 0.04 : -74.15;
  const maxLng = allLngs.length ? Math.max(...allLngs) + 0.04 : -73.85;

  const getPosition = (lat: number, lng: number) => {
    const latSpan = Math.max(0.01, maxLat - minLat);
    const lngSpan = Math.max(0.01, maxLng - minLng);
    const x = Math.min(92, Math.max(8, ((lng - minLng) / lngSpan) * 100));
    // Invert Y so higher latitude is at top
    const y = Math.min(88, Math.max(12, (1 - (lat - minLat) / latSpan) * 100));
    return { left: `${x}%`, top: `${y}%`, xPct: x, yPct: y };
  };

  const pickupPos = getPosition(pickupLat, pickupLng);
  const hospPos = selectedHospital ? getPosition(selectedHospital.lat, selectedHospital.lng) : null;
  const ambPos = assignedAmbulance ? getPosition(assignedAmbulance.lat, assignedAmbulance.lng) : null;

  return (
    <div
      className="relative w-full rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl select-none"
      style={{ height }}
    >
      {/* Background City Grid Styling */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      {/* Simulated Road Arteries */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-slate-800/60" xmlns="http://www.w3.org/2000/svg">
        <line x1="10%" y1="20%" x2="90%" y2="80%" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="20%" y1="85%" x2="80%" y2="15%" strokeWidth="2" strokeDasharray="4 4" />
        <line x1="50%" y1="5%" x2="50%" y2="95%" strokeWidth="1.5" />
        <line x1="5%" y1="50%" x2="95%" y2="50%" strokeWidth="1.5" />
        <circle cx="50%" cy="50%" r="28%" fill="none" strokeWidth="1" stroke="#1e293b" />

        {/* Dynamic Route Polyline */}
        {showRoute && hospPos && (
          <g>
            {ambPos ? (
              <>
                <line
                  x1={`${ambPos.xPct}%`}
                  y1={`${ambPos.yPct}%`}
                  x2={`${pickupPos.xPct}%`}
                  y2={`${pickupPos.yPct}%`}
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
                <line
                  x1={`${pickupPos.xPct}%`}
                  y1={`${pickupPos.yPct}%`}
                  x2={`${hospPos.xPct}%`}
                  y2={`${hospPos.yPct}%`}
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                />
              </>
            ) : (
              <line
                x1={`${pickupPos.xPct}%`}
                y1={`${pickupPos.yPct}%`}
                x2={`${hospPos.xPct}%`}
                y2={`${hospPos.yPct}%`}
                stroke="#38bdf8"
                strokeWidth="3"
                strokeDasharray="6 4"
                className="animate-pulse"
              />
            )}
          </g>
        )}
      </svg>

      {/* Watermark / Simulated Label */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 rounded-xl bg-slate-900/80 border border-slate-800 px-3 py-1.5 backdrop-blur-md">
        <Navigation className="h-3.5 w-3.5 text-sky-400" />
        <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">
          Simulated GPS Network Map
        </span>
      </div>

      {/* 1. PICKUP ORIGIN MARKER */}
      <div
        className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
        style={{ left: pickupPos.left, top: pickupPos.top }}
        onClick={() => setActivePopup(activePopup === 'pickup' ? null : 'pickup')}
      >
        <div className="relative flex items-center justify-center">
          <div className="absolute h-8 w-8 rounded-full bg-rose-500/30 animate-ping" />
          <div className="relative p-2 rounded-full bg-rose-600 text-white shadow-lg border-2 border-slate-950">
            <MapPin className="h-4 w-4" />
          </div>
        </div>
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/90 text-rose-300 border border-rose-500/30">
          Emergency Incident
        </div>

        {/* Pickup Popup */}
        {activePopup === 'pickup' && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 w-48 rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-2xl text-xs space-y-1">
            <div className="font-bold text-white flex items-center gap-1">
              <MapPin className="h-3 w-3 text-rose-400" />
              <span>Incident Location</span>
            </div>
            <p className="text-[11px] text-slate-300">{pickupAddress}</p>
            <span className="text-[9px] font-mono text-slate-500 block">{pickupLat.toFixed(4)}, {pickupLng.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* 2. CANDIDATE & SELECTED HOSPITAL MARKERS */}
      {(candidateHospitals.length > 0 ? candidateHospitals : (selectedHospital ? [selectedHospital] : [])).map((h) => {
        const pos = getPosition(h.lat, h.lng);
        const isSelected = selectedHospital?.hospital_id === h.hospital_id;

        return (
          <div
            key={h.hospital_id}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: pos.left, top: pos.top }}
            onClick={() => setActivePopup(activePopup === `hosp-${h.hospital_id}` ? null : `hosp-${h.hospital_id}`)}
          >
            <div className={`p-2 rounded-xl border flex items-center justify-center transition shadow-lg ${
              isSelected
                ? 'bg-emerald-600 text-white border-emerald-400 scale-110 shadow-emerald-600/30 ring-4 ring-emerald-500/20'
                : h.is_eligible
                ? 'bg-slate-900/90 text-sky-400 border-sky-500/30 hover:border-sky-400'
                : 'bg-slate-900/60 text-slate-500 border-slate-800 opacity-60'
            }`}>
              <Building2 className="h-4 w-4" />
            </div>

            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-white">
              <span>{h.hospital_name.split(' ')[0]}</span>
              {h.suitability_score > 0 && (
                <span className={`px-1 rounded text-[9px] font-mono ${isSelected ? 'bg-emerald-500 text-slate-950' : 'text-sky-300'}`}>
                  {h.suitability_score}%
                </span>
              )}
            </div>

            {/* Hospital Popup */}
            {activePopup === `hosp-${h.hospital_id}` && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 w-56 rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-2xl text-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div className="font-bold text-white leading-tight">{h.hospital_name}</div>
                  <span className="font-mono text-[10px] font-bold text-emerald-400">{h.suitability_score}%</span>
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>ETA: <strong className="text-white">{h.eta_minutes} mins</strong></span>
                  <span>Dist: <strong className="text-white">{h.distance_km} km</strong></span>
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-800 text-[10px]">
                  <div className="text-slate-300">ICU Beds: <strong className="text-emerald-400">{h.icu_available} avail</strong></div>
                  <div className="text-slate-300">Vents: <strong className="text-sky-400">{h.ventilators_available}</strong></div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 3. ASSIGNED & CANDIDATE AMBULANCE MARKERS */}
      {(assignedAmbulance ? [assignedAmbulance] : candidateAmbulances).map((amb) => {
        const pos = getPosition(amb.lat, amb.lng);
        const isAssigned = assignedAmbulance?.id === amb.id;

        return (
          <div
            key={amb.id}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
            style={{ left: pos.left, top: pos.top }}
            onClick={() => setActivePopup(activePopup === `amb-${amb.id}` ? null : `amb-${amb.id}`)}
          >
            <div className={`relative p-2 rounded-full border shadow-xl flex items-center justify-center ${
              isAssigned
                ? 'bg-sky-600 text-white border-sky-300 animate-bounce'
                : 'bg-slate-900 text-sky-400 border-sky-500/40'
            }`}>
              <Siren className="h-3.5 w-3.5" />
            </div>

            <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-900/90 text-sky-300 border border-sky-500/30">
              {amb.code} {amb.eta_minutes ? `(${amb.eta_minutes}m)` : ''}
            </div>

            {/* Ambulance Popup */}
            {activePopup === `amb-${amb.id}` && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-40 w-48 rounded-xl bg-slate-900 border border-slate-800 p-3 shadow-2xl text-xs space-y-1.5">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>{amb.code}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-300 uppercase">{amb.status}</span>
                </div>
                <div className="text-[11px] text-slate-300">Paramedic: {amb.paramedic_name}</div>
                <div className="text-[11px] text-slate-400">Vehicle: {amb.vehicle_number}</div>
                {amb.eta_minutes !== undefined && (
                  <div className="text-[11px] font-bold text-emerald-400">Transit ETA: {amb.eta_minutes} mins</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Map Legend */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-3 rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-1.5 backdrop-blur-md text-[10px] text-slate-300">
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span>Incident</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>Hospital</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" />
          <span>Ambulance</span>
        </div>
      </div>
    </div>
  );
};
