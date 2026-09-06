import React, { useState, useEffect } from 'react';
import { alertsAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { AlertItem } from '../../types';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatTime, formatDate } from '../../utils/formatters';
import {
  Bell, Search, Filter, CheckCircle2, ShieldAlert, RefreshCw
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const { subscribe } = useWebSocket();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await alertsAPI.getAll({
        severity: severityFilter !== 'ALL' ? severityFilter : undefined
      });
      setAlerts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    const unsubAlert = subscribe('ALERT_TRIGGERED', () => {
      fetchAlerts();
    });

    return () => {
      unsubAlert();
    };
  }, [severityFilter]);

  const handleMarkRead = async (id: number) => {
    try {
      await alertsAPI.markAsRead(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-400" />
            <span>Central Network Alerts</span>
          </h1>
          <p className="text-xs text-gray-500">
            Real-time feed of physiological alarms, bed shortages, emergency arrivals, and hospital diverted traffic.
          </p>
        </div>

        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200 self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-100/60 p-4 glass-panel">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-xs text-gray-500">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none font-bold"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {alerts.map((al) => (
          <div
            key={al.id}
            className={`rounded-2xl border p-5 glass-panel transition flex items-start justify-between gap-4 ${
              al.is_read ? 'border-gray-200/60 bg-gray-50/40 opacity-70' : 'border-gray-200 bg-gray-100/80 shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border flex-shrink-0 ${
                al.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                al.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
              }`}>
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">{al.title}</h3>
                  <StatusBadge type="alert" status={al.severity} />
                  {al.is_read && (
                    <span className="text-[10px] text-gray-400 font-medium">Acknowledged</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 leading-relaxed max-w-2xl">{al.message}</p>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1">
                  <span>Type: <strong className="text-gray-500">{al.alert_type}</strong></span>
                  <span>Target: <strong className="text-gray-500">{al.target_role}</strong></span>
                  <span>Timestamp: {formatDate(al.created_at)} {formatTime(al.created_at)}</span>
                </div>
              </div>
            </div>

            {!al.is_read && (
              <button
                onClick={() => handleMarkRead(al.id)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-200 hover:bg-teal-600 hover:border-teal-500 hover:text-white transition flex-shrink-0"
              >
                <CheckCircle2 className="h-4 w-4 text-teal-400" />
                <span>Acknowledge</span>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
