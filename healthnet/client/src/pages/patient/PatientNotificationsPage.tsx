import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, Check, Info } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientNotificationItem } from '../../types';

export const PatientNotificationsPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [notifs, setNotifs] = useState<PatientNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      setIsLoading(true);
      const res = await patientAPI.getNotifications(selectedPatientId || undefined);
      setNotifs(res);
    } catch (err) {
      console.warn('Failed to load notifications', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [selectedPatientId]);

  const handleMarkRead = async (id: number) => {
    try {
      await patientAPI.markNotificationRead(id);
      setNotifs((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.warn('Failed to mark read', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Activity Feed</span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Notifications & Alerts
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Real-time notices on care team updates, released reports, doctor responses, and appointments.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading notifications...
        </div>
      ) : notifs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-gray-400">
          <Bell className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No active notifications</p>
          <p className="text-xs text-gray-500 mt-1">You are completely up to date.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifs.map((notif) => (
            <div
              key={notif.id}
              className={`p-4.5 rounded-2xl border transition-colors flex items-start justify-between gap-4 ${
                notif.is_read
                  ? 'bg-white border-slate-200 opacity-80'
                  : 'bg-orange-50/40 border-orange-200 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    notif.is_read
                      ? 'bg-slate-100 text-gray-400'
                      : 'bg-orange-500 text-white shadow-xs'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{notif.title}</h3>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {new Date(notif.timestamp).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => handleMarkRead(notif.id)}
                  className="shrink-0 p-1.5 rounded-lg text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-emerald-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-emerald-50 transition-colors cursor-pointer"
                  title="Mark as Read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
