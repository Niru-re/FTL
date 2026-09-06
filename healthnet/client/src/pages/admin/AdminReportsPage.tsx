import React, { useState, useEffect } from 'react';
import { networkAPI, hospitalsAPI, resourcesAPI, ambulancesAPI } from '../../services/api';
import {
  FileText, Download, Filter, Calendar, Building2, BedDouble,
  Siren, Wind, RefreshCw, Layers, CheckCircle2, TrendingUp
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [reportType, setReportType] = useState<string>('HOSPITAL_CAPACITY');
  const [timeRange, setTimeRange] = useState<string>('24H');
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const hospList = await hospitalsAPI.getAll();
      setHospitals(hospList);
    } catch (e) {
      console.error('Failed to load report data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType, timeRange]);

  // Export CSV generator
  const exportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = `CareBridge_${reportType}_${timeRange}.csv`;

    if (reportType === 'HOSPITAL_CAPACITY' || reportType === 'ICU_UTILIZATION') {
      headers = ['Hospital Name', 'Branch', 'Code', 'Total Beds', 'Available Beds', 'ICU Total', 'Available ICU', 'ICU Occupancy %', 'Emergency Status'];
      rows = hospitals.map(h => [
        `"${h.name}"`,
        `"${h.branch_name || ''}"`,
        h.code,
        h.total_beds?.toString() || '0',
        h.available_beds?.toString() || '0',
        h.icu_capacity?.toString() || '0',
        h.available_icu_beds?.toString() || '0',
        `${h.icu_occupancy_rate || 0}%`,
        h.emergency_status || 'NORMAL'
      ]);
    } else if (reportType === 'RESOURCE_USAGE') {
      headers = ['Hospital', 'Ventilators Total', 'Ventilators Available', 'ECMO Available', 'Doctors', 'Nurses'];
      rows = hospitals.map(h => [
        `"${h.name}"`,
        h.ventilators_total?.toString() || '0',
        h.ventilators_available?.toString() || '0',
        h.ecmo_available ? 'Yes' : 'No',
        h.doctors_on_duty?.toString() || '0',
        h.nurses_on_duty?.toString() || '0'
      ]);
    } else {
      headers = ['Hospital', 'Status', 'Occupancy Rate %', 'Available Beds'];
      rows = hospitals.map(h => [
        `"${h.name}"`,
        h.emergency_status || 'NORMAL',
        `${h.overall_occupancy_rate || 0}%`,
        h.available_beds?.toString() || '0'
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-100/80 p-6 rounded-2xl border border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              NETWORK AUDIT & ANALYTICS
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              PROTOTYPE OPERATIONAL REPORT
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <FileText className="w-7 h-7 text-sky-400" />
            Executive Reports & Utilization Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Consolidated operational reports across beds, ICU units, emergency demand, ambulances, and clinical equipment.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 transition-all self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV Report
        </button>
      </div>

      {/* Report Controls: Select Report Type & Time Period (Section 23 & 24) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Report Selector */}
        <div className="lg:col-span-2 bg-gray-100 border border-gray-200 rounded-xl p-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs font-bold text-gray-500 mr-2 uppercase">Report:</span>
          {[
            { id: 'HOSPITAL_CAPACITY', label: 'Hospital Capacity' },
            { id: 'ICU_UTILIZATION', label: 'ICU Utilization' },
            { id: 'BED_UTILIZATION', label: 'Bed Utilization' },
            { id: 'EMERGENCY_ACTIVITY', label: 'Emergency Activity' },
            { id: 'RESOURCE_USAGE', label: 'Resource Reserves' },
            { id: 'PATIENT_RISK', label: 'Patient Risk Summary' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                reportType === r.id
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Time Period Selector (Section 24) */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-sky-400" />
            Window:
          </span>
          <div className="flex items-center gap-1.5">
            {['6H', '24H', '7D', '30D'].map(t => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  timeRange === t
                    ? 'bg-gray-200 text-sky-400 border border-sky-500/40'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generated Report Table */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/40">
          <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">
            {reportType.replace('_', ' ')} • WINDOW: {timeRange} • {hospitals.length} HOSPITALS MONITORED
          </div>
          <div className="text-[10px] text-gray-400">
            PROTOTYPE REPORT • SIMULATED METRICS
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50/80 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Hospital Entity</th>
                <th className="px-4 py-3">Branch / Campus</th>
                <th className="px-3 py-3 text-center">Total Beds</th>
                <th className="px-3 py-3 text-center text-emerald-400">Available</th>
                <th className="px-3 py-3 text-center">ICU Capacity</th>
                <th className="px-3 py-3 text-center text-sky-400">Avail ICU</th>
                <th className="px-4 py-3">ICU Occupancy %</th>
                <th className="px-4 py-3">Ventilators</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/60">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                    Generating operational report...
                  </td>
                </tr>
              ) : (
                hospitals.map((h) => {
                  const occ = h.icu_occupancy_rate || 0;
                  return (
                    <tr key={h.id} className="hover:bg-gray-200/40 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-800">
                        {h.name}
                      </td>
                      <td className="px-4 py-3.5 text-gray-500">
                        {h.branch_name || 'Campus'} ({h.code})
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-white">
                        {h.total_beds}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-emerald-400">
                        {h.available_beds}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-semibold text-white">
                        {h.icu_capacity}
                      </td>
                      <td className="px-3 py-3.5 text-center font-mono font-bold text-sky-400">
                        {h.available_icu_beds}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full ${occ >= 85 ? 'bg-rose-500' : occ >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                              style={{ width: `${Math.min(100, occ)}%` }}
                            />
                          </div>
                          <span className="font-mono font-semibold text-gray-700">{Math.round(occ)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-gray-600">
                        {h.ventilators_available || 0} / {h.ventilators_total || 0}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          h.emergency_status === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          h.emergency_status === 'SURGE' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {h.emergency_status}
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
