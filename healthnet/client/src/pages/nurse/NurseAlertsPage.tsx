import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell, CheckCircle2, AlertTriangle, ShieldAlert,
  RefreshCw, ChevronRight, User, Filter
} from 'lucide-react';
import { nurseAPI } from '../../services/api';
import { AlertItem } from '../../types';

export const NurseAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedReadStatus, setSelectedReadStatus] = useState('ALL');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const data = await nurseAPI.getAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load nurse alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await nurseAPI.acknowledgeAlert(id);
      await fetchAlerts();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (selectedSeverity !== 'ALL' && a.severity !== selectedSeverity) return false;
    if (selectedReadStatus === 'UNREAD' && a.is_read) return false;
    if (selectedReadStatus === 'READ' && !a.is_read) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Clinical Alert Feed & Notifications
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-1">
            Department & Patient Alerts
          </h1>
          <p className="text-xs text-gray-500">
            Real-time critical alarms, telemetry deviations, and physician notifications
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-300/80 bg-gray-200/80 hover:bg-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-rose-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-4 backdrop-blur-md shadow-xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" /> Severity:
            </span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-gray-50/70 border border-gray-200 text-xs text-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">Read Status:</span>
            <select
              value={selectedReadStatus}
              onChange={(e) => setSelectedReadStatus(e.target.value)}
              className="bg-gray-50/70 border border-gray-200 text-xs text-gray-700 rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
            >
              <option value="ALL">All Alerts</option>
              <option value="UNREAD">Active / Unread Only</option>
              <option value="READ">Acknowledged Only</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-gray-500 font-mono">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </span>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-gray-500 text-xs">Loading alerts...</div>
        ) : filteredAlerts.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-100/40 p-8 text-center text-gray-500 text-xs">
            No alerts found matching the selected filters.
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                alert.is_read
                  ? 'bg-gray-50/40 border-gray-200/60 opacity-65'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-gradient-to-r from-rose-950/30 via-slate-900 to-slate-900 border-rose-500/40'
                  : alert.severity === 'HIGH'
                  ? 'bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-500/30'
                  : 'bg-gray-100/60 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`mt-1 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-rose-500/20 text-rose-400'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-sky-500/20 text-sky-400'
                  }`}
                >
                  <Bell className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        alert.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : alert.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded">
                      {alert.alert_type}
                    </span>
                    <span className="text-xs text-gray-400 font-mono">
                      {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{alert.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">{alert.message}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                {alert.patient_id && (
                  <Link
                    to={`/nurse/patients/${alert.patient_id}`}
                    className="rounded-xl border border-gray-300 bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1"
                  >
                    <span>View Patient</span>
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                )}

                {!alert.is_read ? (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Acknowledge</span>
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Acknowledged
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
