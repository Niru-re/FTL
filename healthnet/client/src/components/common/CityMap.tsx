import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import { Hospital, Ambulance } from '../../types';
import { Building2, Ambulance as AmbulanceIcon, Activity, Flame, ShieldAlert } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

// Helper to create custom SVG Hospital icon
const createHospitalIcon = (occupancyRate: number, emergencyStatus: string) => {
  let color = '#10b981'; // Green
  let stroke = '#059669';

  if (emergencyStatus === 'DIVERT' || emergencyStatus === 'CLOSED') {
    color = '#f43f5e'; // Red
    stroke = '#e11d48';
  } else if (occupancyRate >= 90 || emergencyStatus === 'SURGE') {
    color = '#f43f5e'; // Red
    stroke = '#e11d48';
  } else if (occupancyRate >= 70) {
    color = '#f59e0b'; // Amber
    stroke = '#d97706';
  }

  const svgHtml = `
    <div style="position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center;">
      <div style="
        width: 38px; height: 38px; border-radius: 50%; background: ${color}20; border: 2px solid ${color};
        display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px ${color}60;
      ">
        <div style="width: 26px; height: 26px; border-radius: 50%; background: ${color}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">
          +
        </div>
      </div>
      <div style="
        position: absolute; bottom: -16px; background: #0f172a; border: 1px solid rgba(255,255,255,0.2);
        color: white; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 4px; white-space: nowrap;
      ">
        ${Math.round(occupancyRate)}% ICU
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-hospital-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

// Helper for Ambulance icon
const createAmbulanceIcon = (status: string) => {
  const isEnRoute = status === 'EN_ROUTE' || status === 'TRANSPORTING';
  const color = isEnRoute ? '#06b6d4' : '#10b981';

  const svgHtml = `
    <div style="position: relative; display: flex; align-items: center; justify-content: center;">
      <div style="
        width: 32px; height: 32px; border-radius: 8px; background: #0f172a; border: 2px solid ${color};
        display: flex; align-items: center; justify-content: center; color: ${color};
        box-shadow: 0 0 12px ${color}80;
      " class="${isEnRoute ? 'beacon-live' : ''}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.28a1 1 0 0 0-.684-.948l-1.923-.641a1 1 0 0 1-.578-.502l-1.539-3.076A1 1 0 0 0 14.382 7H14"/>
          <circle cx="7" cy="18" r="2"/>
          <path d="M9 18h6"/>
          <circle cx="17" cy="18" r="2"/>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-ambulance-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17]
  });
};

interface CityMapProps {
  hospitals: Hospital[];
  ambulances: Ambulance[];
  onSelectHospital?: (hospital: Hospital) => void;
  selectedHospitalId?: number | null;
  className?: string;
}

export const CityMap: React.FC<CityMapProps> = ({
  hospitals,
  ambulances,
  onSelectHospital,
  selectedHospitalId,
  className = 'h-[500px]'
}) => {
  // Metro center coordinate
  const center: [number, number] = [40.7306, -73.9866];

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-gray-200 shadow-2xl glass-panel ${className}`}>
      {/* Map Legend */}
      <div className="absolute top-3 right-3 z-[1000] rounded-xl border border-gray-200 bg-gray-100/90 p-3 shadow-xl backdrop-blur-md text-xs space-y-2">
        <span className="font-semibold text-gray-600 block border-b border-gray-200 pb-1">Hospital ICU Load</span>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
          <span className="text-gray-500">&lt; 70% (Low)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-amber-500"></span>
          <span className="text-gray-500">70% - 89% (Medium)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-500"></span>
          <span className="text-gray-500">&ge; 90% / Surge / Divert</span>
        </div>
        <div className="border-t border-gray-200 pt-1.5 flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-cyan-500"></span>
          <span className="text-gray-500">Active Ambulance</span>
        </div>
      </div>

      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Hospital Markers */}
        {hospitals.map((hosp) => (
          <Marker
            key={`hosp-${hosp.id}`}
            position={[hosp.lat, hosp.lng]}
            icon={createHospitalIcon(hosp.icu_occupancy_rate || 0, hosp.emergency_status)}
            eventHandlers={{
              click: () => {
                if (onSelectHospital) {
                  onSelectHospital(hosp);
                }
              }
            }}
          >
            <Popup>
              <div className="p-1 space-y-2 text-gray-700">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-gray-900">{hosp.name}</h4>
                    <p className="text-xs text-gray-500">{hosp.branch_name}</p>
                  </div>
                  <StatusBadge type="hospital" status={hosp.emergency_status} />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-200">
                  <div className="bg-gray-100 p-1.5 rounded">
                    <span className="text-gray-500 block text-[10px]">Available ICU</span>
                    <span className="font-bold text-teal-400">{hosp.available_icu_beds} / {hosp.icu_capacity}</span>
                  </div>
                  <div className="bg-gray-100 p-1.5 rounded">
                    <span className="text-gray-500 block text-[10px]">Total Free Beds</span>
                    <span className="font-bold text-gray-700">{hosp.available_beds} / {hosp.total_beds}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={`/admin/hospitals/${hosp.id}`}
                    className="flex-1 text-center bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold py-1.5 rounded-lg transition"
                  >
                    Open Facility &rarr;
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ambulance Markers */}
        {ambulances.map((amb) => (
          <Marker
            key={`amb-${amb.id}`}
            position={[amb.lat, amb.lng]}
            icon={createAmbulanceIcon(amb.status)}
          >
            <Popup>
              <div className="p-1 space-y-1.5 text-gray-700 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-cyan-400">{amb.code}</span>
                  <StatusBadge type="ambulance" status={amb.status} />
                </div>
                <p className="text-gray-600">Driver: {amb.driver_name}</p>
                {amb.destination_hospital_name && (
                  <p className="text-gray-500 text-[11px]">
                    Destination: <span className="text-gray-900 font-medium">{amb.destination_hospital_name}</span>
                  </p>
                )}
                {amb.eta_minutes > 0 && (
                  <div className="bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 px-2 py-1 rounded text-center font-bold">
                    ETA: {amb.eta_minutes} Mins
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
