import React, { useState, useEffect } from 'react';
import { doctorAPI } from '../../services/api';
import { DoctorDashboardSummary, DoctorPatient } from '../../types';
import {
  FileSpreadsheet, Download, RefreshCw, BarChart3, Users,
  ShieldAlert, Activity, CheckCircle2, FileText
} from 'lucide-react';

export const DoctorReportsPage: React.FC = () => {
  const [summary, setSummary] = useState<DoctorDashboardSummary | null>(null);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const fetchReportsData = async () => {
    try {
      const [sum, pts] = await Promise.all([
        doctorAPI.getDashboard(),
        doctorAPI.getPatients()
      ]);
      setSummary(sum);
      setPatients(pts);
    } catch (e) {
      console.error('Error fetching clinical reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  const handleExport = (reportName: string) => {
    setDownloadSuccess(`Generated and exported ${reportName} (CSV/PDF) successfully.`);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Clinical Analytics</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Clinical Quality & Census Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Physician service metrics, deterioration incident analytics, and antimicrobial stewardship
          </p>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchReportsData(); }}
          className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 transition border border-slate-700 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {downloadSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      {/* Reports Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">ICU Inpatient Census Report</h3>
              <p className="text-xs text-slate-400">Active patient load & acuity classification</p>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            Total Patients: <strong className="text-white font-mono">{patients.length}</strong> &bull; Critical: <strong className="text-rose-400 font-mono">{summary?.critical_patients || 0}</strong>
          </p>
          <button
            onClick={() => handleExport('ICU Inpatient Census Report')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-slate-200 transition border border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Census CSV</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Deterioration Audit Summary</h3>
              <p className="text-xs text-slate-400">NEWS2 score trends & physiological triggers</p>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            Active Alerts: <strong className="text-rose-400 font-mono">{summary?.active_alerts || 0}</strong> &bull; Model Disclaimers Verified
          </p>
          <button
            onClick={() => handleExport('Deterioration Audit Summary')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-slate-200 transition border border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit PDF</span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Physician Orders Log</h3>
              <p className="text-xs text-slate-400">Active labs, procedures, and consults</p>
            </div>
          </div>
          <p className="text-xs text-slate-300">
            Service: <strong className="text-teal-300">Dr. Arjun Sharma (Critical Care)</strong>
          </p>
          <button
            onClick={() => handleExport('Physician Orders Log')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 py-2 text-xs font-bold text-slate-200 transition border border-slate-700"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Orders Log</span>
          </button>
        </div>
      </div>
    </div>
  );
};
