import React, { useState } from 'react';
import { Hospital } from '../../types';
import {
  X, GitCompare, Building2, BedDouble, Wind, Users,
  Activity, AlertTriangle, CheckCircle2, ShieldAlert
} from 'lucide-react';

interface HospitalComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospitals: Hospital[];
}

export const HospitalComparisonModal: React.FC<HospitalComparisonModalProps> = ({
  isOpen,
  onClose,
  hospitals = []
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    return hospitals.slice(0, 3).map(h => h.id);
  });

  if (!isOpen) return null;

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length > 2) {
        setSelectedIds(selectedIds.filter(i => i !== id));
      }
    } else {
      if (selectedIds.length < 4) {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const selectedHospitals = hospitals.filter(h => selectedIds.includes(h.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                HOSPITAL NETWORK COMPARISON
              </h2>
              <p className="text-xs text-slate-400">
                Select 2 to 4 hospitals to compare operational capacity, staffing, and ICU reserves.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hospital Selector Chips */}
        <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-semibold text-slate-400 mr-2">Connected Hospitals:</span>
          {hospitals.map(h => {
            const isSelected = selectedIds.includes(h.id);
            return (
              <button
                key={h.id}
                onClick={() => toggleSelect(h.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20 border border-sky-400'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                {h.name}
              </button>
            );
          })}
        </div>

        {/* Comparison Matrix Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Card Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {selectedHospitals.map(h => {
              const icuOcc = h.icu_occupancy_rate || 0;
              const pressure = icuOcc >= 85 ? 'CRITICAL' : icuOcc >= 70 ? 'HIGH' : icuOcc >= 50 ? 'WATCH' : 'STABLE';
              const pressureColor =
                pressure === 'CRITICAL' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
                pressure === 'HIGH' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' :
                pressure === 'WATCH' ? 'text-sky-400 bg-sky-500/10 border-sky-500/30' :
                'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';

              return (
                <div key={h.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{h.name}</h4>
                        <p className="text-[11px] text-slate-400">{h.branch_name || 'Campus'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {h.code}
                      </span>
                    </div>

                    <div className={`mt-3 px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center justify-between ${pressureColor}`}>
                      <span>Capacity Pressure</span>
                      <span>{pressure}</span>
                    </div>

                    {/* Key Metrics */}
                    <div className="mt-4 space-y-2.5 text-xs text-slate-300">
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Emergency Status:</span>
                        <span className="font-bold text-white">{h.emergency_status}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">ICU Occupancy:</span>
                        <span className="font-bold text-white">{Math.round(icuOcc)}%</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Available Beds:</span>
                        <span className="font-bold text-emerald-400">{h.available_beds || 0} / {h.total_beds || 0}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Available ICU:</span>
                        <span className="font-bold text-sky-400">{h.available_icu_beds || 0} / {h.icu_capacity || 0}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Ventilators:</span>
                        <span className="font-bold text-white">{h.ventilators_available || 0} / {h.ventilators_total || 0}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/80">
                        <span className="text-slate-400">Doctors On Duty:</span>
                        <span className="font-bold text-white">{h.doctors_on_duty || 0}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-slate-400">Nurses On Duty:</span>
                        <span className="font-bold text-white">{h.nurses_on_duty || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparative Progress Bars */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Direct Metric Comparative Visualizer
            </h3>

            {/* ICU Occupancy comparison */}
            <div>
              <div className="text-xs text-slate-400 mb-2">ICU Occupancy Rate (%)</div>
              <div className="space-y-2">
                {selectedHospitals.map(h => (
                  <div key={`bar-${h.id}`} className="flex items-center gap-3 text-xs">
                    <span className="w-36 text-slate-300 font-medium truncate">{h.name}</span>
                    <div className="flex-1 h-3 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          (h.icu_occupancy_rate || 0) >= 85 ? 'bg-rose-500' :
                          (h.icu_occupancy_rate || 0) >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, h.icu_occupancy_rate || 0)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono font-bold text-white">
                      {Math.round(h.icu_occupancy_rate || 0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>PROTOTYPE OPERATIONAL COMPARISON • SIMULATED DATA</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
