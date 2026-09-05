import React, { useState, useEffect } from 'react';
import { networkAPI, hospitalsAPI } from '../../services/api';
import { Hospital } from '../../types';
import {
  BedDouble, Activity, AlertTriangle, ShieldCheck, Filter,
  RefreshCw, Building2, Search, ArrowUpDown, Layers
} from 'lucide-react';

export const ICUNetworkPage: React.FC = () => {
  const [icus, setIcus] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hospList, icuList] = await Promise.all([
        hospitalsAPI.getAll(),
        networkAPI.getICUs(selectedHospital !== 'ALL' ? Number(selectedHospital) : undefined, selectedStatus)
      ]);
      setHospitals(hospList);
      setIcus(icuList);
    } catch (e) {
      console.error('Failed to load ICU network data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedHospital, selectedStatus]);

  // Aggregate bed states across all loaded ICUs
  const totalBeds = icus.reduce((acc, u) => acc + (u.total_beds || 0), 0);
  const occupiedBeds = icus.reduce((acc, u) => acc + (u.occupied_beds || 0), 0);
  const availableBeds = icus.reduce((acc, u) => acc + (u.available_beds || 0), 0);
  const reservedBeds = icus.reduce((acc, u) => acc + (u.reserved_beds || 0), 0);
  const cleaningBeds = icus.reduce((acc, u) => acc + (u.cleaning_beds || 0), 0);
  const maintenanceBeds = icus.reduce((acc, u) => acc + (u.maintenance_beds || 0), 0);

  const filteredIcus = icus.filter(u => {
    if (search) {
      const q = search.toLowerCase();
      return (
        u.icu_name?.toLowerCase().includes(q) ||
        u.hospital_name?.toLowerCase().includes(q) ||
        u.branch_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-100/80 p-6 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              NETWORK INTENSIVE CARE COMMAND
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              PROTOTYPE OPERATIONAL VIEW
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <BedDouble className="w-7 h-7 text-sky-400" />
            ICU Network & Bed Allocation Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            City-wide intensive care units, high-dependency telemetry, and real-time bed capacity states.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 text-gray-700 text-xs font-semibold border border-gray-300 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          Refresh ICU Units
        </button>
      </div>

      {/* Aggregate Segmented Bed Capacity Breakdown (Section 8) */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              METROPOLITAN ICU BED SEGMENTATION ({totalBeds} TOTAL BEDS)
            </h2>
          </div>
          <div className="text-xs text-gray-500">
            Overall Occupancy: <span className="font-bold text-white">{totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0}%</span>
          </div>
        </div>

        {/* Stacked Capacity Bar */}
        <div className="w-full h-5 rounded-xl bg-gray-50 overflow-hidden flex p-0.5 gap-0.5 border border-gray-200">
          <div
            title={`Occupied: ${occupiedBeds}`}
            className="h-full bg-rose-500 rounded-l-lg transition-all"
            style={{ width: `${totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0}%` }}
          />
          <div
            title={`Reserved: ${reservedBeds}`}
            className="h-full bg-amber-500 transition-all"
            style={{ width: `${totalBeds > 0 ? (reservedBeds / totalBeds) * 100 : 0}%` }}
          />
          <div
            title={`Cleaning: ${cleaningBeds}`}
            className="h-full bg-indigo-500 transition-all"
            style={{ width: `${totalBeds > 0 ? (cleaningBeds / totalBeds) * 100 : 0}%` }}
          />
          <div
            title={`Maintenance: ${maintenanceBeds}`}
            className="h-full bg-slate-600 transition-all"
            style={{ width: `${totalBeds > 0 ? (maintenanceBeds / totalBeds) * 100 : 0}%` }}
          />
          <div
            title={`Available: ${availableBeds}`}
            className="h-full bg-emerald-500 rounded-r-lg transition-all"
            style={{ width: `${totalBeds > 0 ? (availableBeds / totalBeds) * 100 : 0}%` }}
          />
        </div>

        {/* Segment Legend Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Available</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{availableBeds}</div>
            <div className="text-[9px] text-gray-400">Ready for intake</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Occupied</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">{occupiedBeds}</div>
            <div className="text-[9px] text-gray-400">Active inpatients</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Reserved</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{reservedBeds}</div>
            <div className="text-[9px] text-gray-400">Inbound transit</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Cleaning</div>
            <div className="text-xl font-bold text-indigo-400 mt-0.5">{cleaningBeds}</div>
            <div className="text-[9px] text-gray-400">Sanitation turnover</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Maintenance</div>
            <div className="text-xl font-bold text-gray-600 mt-0.5">{maintenanceBeds}</div>
            <div className="text-[9px] text-gray-400">Service repairs</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Total ICU</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalBeds}</div>
            <div className="text-[9px] text-gray-400">Connected network</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-100/60 p-4 rounded-xl border border-gray-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ICU unit or hospital..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-gray-900 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Hospital Filter */}
          <select
            value={selectedHospital}
            onChange={(e) => setSelectedHospital(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Connected Hospitals</option>
            {hospitals.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:border-sky-500"
          >
            <option value="ALL">All Pressure Levels</option>
            <option value="CRITICAL">Critical (≥85% or 0 Avail)</option>
            <option value="HIGH">High (≥70%)</option>
            <option value="MODERATE">Moderate (≥50%)</option>
            <option value="STABLE">Stable (&lt;50%)</option>
          </select>
        </div>
      </div>

      {/* ICU Table Matrix */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">ICU Unit / Department</th>
                <th className="px-4 py-3">Hospital & Campus</th>
                <th className="px-3 py-3 text-center">Total</th>
                <th className="px-3 py-3 text-center text-rose-400">Occupied</th>
                <th className="px-3 py-3 text-center text-emerald-400">Available</th>
                <th className="px-3 py-3 text-center text-amber-400">Reserved</th>
                <th className="px-3 py-3 text-center text-indigo-400">Cleaning</th>
                <th className="px-4 py-3">Occupancy</th>
                <th className="px-4 py-3 text-right">Pressure Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Loading network intensive care units...
                  </td>
                </tr>
              ) : filteredIcus.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    No matching ICU units found.
                  </td>
                </tr>
              ) : (
                filteredIcus.map((u) => {
                  const occ = u.occupancy_rate || 0;
                  const pressureBadge =
                    u.pressure_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                    u.pressure_level === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                    u.pressure_level === 'MODERATE' ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' :
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

                  return (
                    <tr key={u.id} className="bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                        <BedDouble className="w-4 h-4 text-sky-400 shrink-0" />
                        {u.icu_name}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-gray-700">{u.hospital_name}</div>
                        <div className="text-[10px] text-gray-400">{u.branch_name} ({u.hospital_code})</div>
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-white">
                        {u.total_beds}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-rose-400">
                        {u.occupied_beds}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-emerald-400">
                        {u.available_beds}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-amber-400">
                        {u.reserved_beds}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono text-indigo-400">
                        {u.cleaning_beds}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full ${occ >= 85 ? 'bg-rose-500' : occ >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, occ)}%` }}
                            />
                          </div>
                          <span className="font-mono font-semibold text-gray-700">{Math.round(occ)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pressureBadge}`}>
                          {u.pressure_level}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
