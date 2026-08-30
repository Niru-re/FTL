import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { LiveIndicator } from './LiveIndicator';
import { alertsAPI, networkAPI } from '../../services/api';
import { AlertItem } from '../../types';
import {
  Activity, Bell, ShieldAlert, User, LogOut, ChevronDown, CheckCircle,
  Siren, Hospital as HospitalIcon, Sparkles, Search
} from 'lucide-react';
import { formatTime } from '../../utils/formatters';

interface NavbarProps {
  onOpenEmergencyModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenEmergencyModal }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isConnected, subscribe } = useWebSocket();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [activeEmergencyTicker, setActiveEmergencyTicker] = useState<string | null>("Incoming Emergency: Harold Finch (STEMI) en route to CityCare Central - ETA 5 mins");

  // Global Network Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setSearchResults(null);
      setShowSearchResults(false);
      return;
    }
    setIsSearching(true);
    setShowSearchResults(true);
    try {
      const results = await networkAPI.globalSearch(val.trim());
      setSearchResults(results);
    } catch (e) {
      console.warn('Global search query failed', e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    const unsubAlert = subscribe('ALERT_TRIGGERED', (data) => {
      fetchAlerts();
    });

    const unsubEmerg = subscribe('EMERGENCY_CASE_CREATED', (data) => {
      setActiveEmergencyTicker(`🚨 New Emergency: ${data.patient_name} (${data.priority} Priority) dispatched to ${data.hospital_name} - Bed ${data.bed_code}`);
      fetchAlerts();
    });

    return () => {
      unsubAlert();
      unsubEmerg();
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await alertsAPI.getAll({ is_read: false });
      setAlerts(data.slice(0, 8));
    } catch (e) {
      console.warn('Could not fetch alerts', e);
    }
  };

  const handleMarkRead = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await alertsAPI.markAsRead(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'DOCTOR':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'NURSE':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      default:
        return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/90 px-6 backdrop-blur-md">
      {/* Brand & Ticker */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 shadow-lg shadow-teal-500/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white">HEALTHNET</span>
              <span className="rounded bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal-400 border border-teal-500/20">v1.0 PROTOTYPE</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">Connected Care. Smarter Response.</p>
          </div>
        </div>

        {/* System Online & Clinical Status Ribbon */}
        <div className="hidden lg:flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300">
          <span className="flex items-center gap-1.5 text-emerald-400 font-bold font-mono text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            SYSTEM ONLINE
          </span>
          <span className="text-slate-600">|</span>
          <span className="font-semibold text-white">{user?.full_name || 'User'}</span>
          <span className="text-slate-600">|</span>
          <span className="font-semibold text-teal-400">{user?.role}</span>
        </div>
      </div>

      {/* 22. Global Network Search Centerpiece */}
      <div className="relative hidden md:block w-72 lg:w-96">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchQuery.trim().length > 1) setShowSearchResults(true); }}
            placeholder="Search Hospital, Bed, MRN, Doctor, Ambulance, Case..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {isSearching && (
            <span className="w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Grouped Search Results Popover */}
        {showSearchResults && searchResults && (
          <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-1.5 px-1">
              <span>GLOBAL SEARCH RESULTS: "{searchQuery}"</span>
              <button onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Hospitals */}
            {searchResults.hospitals?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-sky-400 px-2 py-0.5">Hospitals</div>
                {searchResults.hospitals.map((h: any) => (
                  <div
                    key={`sh-${h.id}`}
                    onClick={() => { setShowSearchResults(false); navigate(`/admin/hospitals/${h.id}`); }}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-white">{h.name} ({h.code})</span>
                    <span className="text-[10px] text-slate-400">{h.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Beds */}
            {searchResults.beds?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-400 px-2 py-0.5">Beds</div>
                {searchResults.beds.map((b: any) => (
                  <div
                    key={`sb-${b.id}`}
                    onClick={() => { setShowSearchResults(false); navigate('/admin/beds'); }}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-white">{b.code} ({b.type})</span>
                    <span className="text-[10px] text-emerald-400">{b.status}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Patients */}
            {searchResults.patients?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-400 px-2 py-0.5">Patients</div>
                {searchResults.patients.map((p: any) => (
                  <div
                    key={`sp-${p.id}`}
                    onClick={() => { setShowSearchResults(false); navigate('/admin/patients/critical'); }}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-white">{p.name} ({p.mrn})</span>
                    <span className="text-[10px] text-rose-400 font-semibold">{p.risk}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Ambulances */}
            {searchResults.ambulances?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-400 px-2 py-0.5">Ambulances</div>
                {searchResults.ambulances.map((a: any) => (
                  <div
                    key={`sa-${a.id}`}
                    onClick={() => { setShowSearchResults(false); navigate('/admin/ambulances'); }}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-white">{a.code}</span>
                    <span className="text-[10px] text-amber-400">{a.status} (ETA: {a.eta}m)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Emergencies */}
            {searchResults.emergencies?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-purple-400 px-2 py-0.5">Emergencies</div>
                {searchResults.emergencies.map((e: any) => (
                  <div
                    key={`se-${e.id}`}
                    onClick={() => { setShowSearchResults(false); navigate(`/admin/emergency/${e.id}`); }}
                    className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 cursor-pointer flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-white">#{e.case_number} - {e.patient}</span>
                    <span className="text-[10px] text-purple-400 font-bold">{e.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* WebSocket Live Indicator */}
        <LiveIndicator isConnected={isConnected} />

        {/* Emergency Intake Quick Action Button */}
        {onOpenEmergencyModal && (
          <button
            onClick={onOpenEmergencyModal}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/20 hover:from-rose-500 hover:to-amber-500 transition-all transform active:scale-95"
          >
            <Siren className="h-4 w-4 animate-bounce" />
            <span>Emergency Intake</span>
          </button>
        )}

        {/* Alerts Popover */}
        <div className="relative">
          <button
            onClick={() => { setShowAlertDropdown(!showAlertDropdown); setShowUserDropdown(false); }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-slate-900 shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3 bg-slate-950/50">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Active Alerts ({alerts.length})</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No active critical alerts. Network operating smoothly.
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setShowAlertDropdown(false);
                        if (user?.role === 'NURSE') {
                          if (alert.patient_id) {
                            navigate(`/nurse/patients/${alert.patient_id}`);
                          } else {
                            navigate('/nurse/alerts');
                          }
                        } else if (user?.role === 'DOCTOR') {
                          navigate('/doctor/alerts');
                        } else {
                          navigate('/admin/alerts');
                        }
                      }}
                      className="p-3 hover:bg-slate-800/60 transition flex items-start justify-between gap-2 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            alert.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' :
                            alert.severity === 'HIGH' ? 'bg-amber-500' : 'bg-sky-400'
                          }`} />
                          <span className="text-xs font-semibold text-slate-200">{alert.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">{alert.message}</p>
                        <span className="text-[10px] text-slate-500">{formatTime(alert.created_at)}</span>
                      </div>
                      <button
                        onClick={(e) => handleMarkRead(alert.id, e)}
                        title="Mark as Read"
                        className="text-slate-500 hover:text-teal-400 p-1 flex-shrink-0"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge & Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowUserDropdown(!showUserDropdown); setShowAlertDropdown(false); }}
            className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 hover:border-slate-700 transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-teal-400 font-bold text-xs border border-slate-700">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-white max-w-[130px] truncate">{user?.full_name}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border w-fit ${getRoleBadge(user?.role)}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-800 bg-slate-900 p-2 shadow-2xl z-50">
              <div className="border-b border-slate-800 px-3 py-2 mb-1">
                <p className="text-xs font-semibold text-white">{user?.full_name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                <p className="text-[10px] text-teal-400 font-mono mt-0.5">{user?.hospital_name || 'Central Command'}</p>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
