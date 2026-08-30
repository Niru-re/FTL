import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doctorAPI } from '../../services/api';
import { AlertItem } from '../../types';
import { formatTime, formatDate } from '../../utils/formatters';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Bell, ShieldAlert, CheckCircle2, RefreshCw, AlertTriangle,
  ChevronRight, Filter, Eye, Check
} from 'lucide-react';

export const DoctorAlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      const data = await doctorAPI.getAlerts();
      setAlerts(data);
    } catch (e) {
      console.error('Error fetching doctor alerts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const unsub = subscribe('ALERT_CREATED', () => fetchAlerts());
    return () => unsub();
  }, []);

  const handleAcknowledge = async (alertId: number) => {
    try {
      await doctorAPI.acknowledgeAlert(alertId);
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_read: true } : a));
      setSuccessMsg('Alert acknowledged.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
    if (filterStatus === 'UNREAD' && a.is_read) return false;
    if (filterStatus === 'READ' && !a.is_read) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Clinical Alarms</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Clinical Alerts & Escalations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time telemetry threshold triggers, critical lab values, and incoming triage alerts
          </p>
        </div>
        <button
          onClick={() => { setIsLoading(true); fetchAlerts(); }}
          className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-slate-300 transition border border-slate-700 self-start md:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Alerts</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterSeverity(s)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition uppercase ${
                filterSeverity === s ? 'bg-sky-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Status:</span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${filterStatus === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-950 text-slate-400'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('UNREAD')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition ${filterStatus === 'UNREAD' ? 'bg-rose-600 text-white' : 'bg-slate-950 text-slate-400'}`}
          >
            Active Only
          </button>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-sm overflow-hidden divide-y divide-slate-800/80">
        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
            <p className="text-xs">No alerts currently match the filter criteria.</p>
          </div>
        ) : (
          filteredAlerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${
                !alt.is_read ? 'bg-slate-950/60' : 'bg-slate-900/20 opacity-75'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`mt-0.5 p-2 rounded-xl border flex-shrink-0 ${
                  alt.severity === 'CRITICAL' ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' :
                  alt.severity === 'HIGH' ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                  'bg-sky-500/20 border-sky-500/30 text-sky-400'
                }`}>
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.2 rounded uppercase ${
                      alt.severity === 'CRITICAL' ? 'bg-rose-500 text-white' :
                      alt.severity === 'HIGH' ? 'bg-amber-500 text-slate-950' : 'bg-sky-500 text-slate-950'
                    }`}>
                      {alt.severity}
                    </span>
                    <h3 className="text-sm font-bold text-white">{alt.title}</h3>
                    <span className="text-[10px] font-mono text-slate-400">{formatTime(alt.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{alt.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
                {alt.patient_id && (
                  <button
                    onClick={() => navigate(`/doctor/patients/${alt.patient_id}`)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3.5 py-2 text-xs font-bold text-sky-300 transition border border-slate-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Open Patient</span>
                  </button>
                )}
                {!alt.is_read ? (
                  <button
                    onClick={() => handleAcknowledge(alt.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-bold text-white transition"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Acknowledge</span>
                  </button>
                ) : (
                  <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Acknowledged</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
