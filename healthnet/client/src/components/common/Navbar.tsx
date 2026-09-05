import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { LiveIndicator } from './LiveIndicator';
import { alertsAPI, networkAPI } from '../../services/api';
import { AlertItem } from '../../types';
import {
  Bell, ShieldAlert, User, LogOut, ChevronDown, CheckCircle,
  Siren, Sparkles, Search
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

    const unsubAlert = subscribe('ALERT_TRIGGERED', () => { fetchAlerts(); });
    const unsubEmerg = subscribe('EMERGENCY_CASE_CREATED', (data) => { fetchAlerts(); });

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

  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case 'ADMIN':   return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'DOCTOR':  return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'NURSE':   return 'bg-teal-100 text-teal-700 border-teal-200';
      default:        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">

      {/* Brand */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img
            src="/images/carebridge-logo.png"
            alt="CareBridge Logo"
            className="h-16 w-auto object-contain"
            style={{ minWidth: '48px', maxWidth: '160px' }}
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-gray-900">CareBridge</span>
              <span className="rounded bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
                HMS
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-medium tracking-wide">Hospital Management System</p>
          </div>
        </div>

        {/* System status pill */}
        <div className="hidden lg:flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600">
          <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            SYSTEM ONLINE
          </span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-gray-800">{user?.full_name || 'User'}</span>
          <span className="text-gray-300">|</span>
          <span className="font-semibold text-orange-500">{user?.role}</span>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative hidden md:block w-72 lg:w-96">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => { if (searchQuery.trim().length > 1) setShowSearchResults(true); }}
            placeholder="Search Hospital, Bed, MRN, Doctor, Ambulance, Case..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          {isSearching && (
            <span className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
          )}
        </div>

        {/* Search Results Popover */}
        {showSearchResults && searchResults && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-2xl shadow-lg z-50 max-h-96 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            <div className="flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-100 pb-1.5 px-1">
              <span className="uppercase font-semibold">Results for "{searchQuery}"</span>
              <button onClick={() => setShowSearchResults(false)} className="text-gray-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-600">✕</button>
            </div>

            {searchResults.hospitals?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-orange-500 px-2 py-0.5">Hospitals</div>
                {searchResults.hospitals.map((h: any) => (
                  <div key={`sh-${h.id}`} onClick={() => { setShowSearchResults(false); navigate(`/admin/hospitals/${h.id}`); }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-50 cursor-pointer flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800">{h.name} ({h.code})</span>
                    <span className="text-[10px] text-gray-400">{h.status}</span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.beds?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-emerald-600 px-2 py-0.5">Beds</div>
                {searchResults.beds.map((b: any) => (
                  <div key={`sb-${b.id}`} onClick={() => { setShowSearchResults(false); navigate('/admin/beds'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50 cursor-pointer flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800">{b.code} ({b.type})</span>
                    <span className="text-[10px] text-emerald-600">{b.status}</span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.patients?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-rose-500 px-2 py-0.5">Patients</div>
                {searchResults.patients.map((p: any) => (
                  <div key={`sp-${p.id}`} onClick={() => { setShowSearchResults(false); navigate('/admin/patients/critical'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50 cursor-pointer flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800">{p.name} ({p.mrn})</span>
                    <span className="text-[10px] text-rose-500 font-semibold">{p.risk}</span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.ambulances?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-amber-600 px-2 py-0.5">Ambulances</div>
                {searchResults.ambulances.map((a: any) => (
                  <div key={`sa-${a.id}`} onClick={() => { setShowSearchResults(false); navigate('/admin/ambulances'); }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50 cursor-pointer flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800">{a.code}</span>
                    <span className="text-[10px] text-amber-600">{a.status} (ETA: {a.eta}m)</span>
                  </div>
                ))}
              </div>
            )}

            {searchResults.emergencies?.length > 0 && (
              <div>
                <div className="text-[10px] uppercase font-bold text-purple-500 px-2 py-0.5">Emergencies</div>
                {searchResults.emergencies.map((e: any) => (
                  <div key={`se-${e.id}`} onClick={() => { setShowSearchResults(false); navigate(`/admin/emergency/${e.id}`); }}
                    className="px-2.5 py-1.5 rounded-lg bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50 cursor-pointer flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-800">#{e.case_number} - {e.patient}</span>
                    <span className="text-[10px] text-purple-500 font-bold">{e.priority}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        <LiveIndicator isConnected={isConnected} />

        {/* Emergency Intake */}
        {onOpenEmergencyModal && (
          <button
            onClick={onOpenEmergencyModal}
            className="flex items-center gap-2 rounded-lg bg-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-600 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all active:scale-95"
          >
            <Siren className="h-4 w-4" />
            <span className="hidden sm:inline">Emergency Intake</span>
          </button>
        )}

        {/* Alerts */}
        <div className="relative">
          <button
            onClick={() => { setShowAlertDropdown(!showAlertDropdown); setShowUserDropdown(false); }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-700 transition"
          >
            <Bell className="h-4 w-4" />
            {alerts.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {alerts.length}
              </span>
            )}
          </button>

          {showAlertDropdown && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-800">Active Alerts ({alerts.length})</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    No active critical alerts. Network operating smoothly.
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setShowAlertDropdown(false);
                        if (user?.role === 'NURSE') {
                          navigate(alert.patient_id ? `/nurse/patients/${alert.patient_id}` : '/nurse/alerts');
                        } else if (user?.role === 'DOCTOR') {
                          navigate('/doctor/alerts');
                        } else {
                          navigate('/admin/alerts');
                        }
                      }}
                      className="p-3 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-50 transition flex items-start justify-between gap-2 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            alert.severity === 'CRITICAL' ? 'bg-rose-500 animate-ping' :
                            alert.severity === 'HIGH' ? 'bg-amber-500' : 'bg-sky-400'
                          }`} />
                          <span className="text-xs font-semibold text-gray-800">{alert.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-relaxed">{alert.message}</p>
                        <span className="text-[10px] text-gray-400">{formatTime(alert.created_at)}</span>
                      </div>
                      <button
                        onClick={(e) => handleMarkRead(alert.id, e)}
                        title="Mark as Read"
                        className="text-gray-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-500 p-1 flex-shrink-0 transition"
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

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowUserDropdown(!showUserDropdown); setShowAlertDropdown(false); }}
            className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 transition"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-bold text-xs border border-orange-200">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-medium text-gray-800 max-w-[130px] truncate">{user?.full_name}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 rounded border w-fit ${getRoleBadgeClass(user?.role)}`}>
                {user?.role}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-50">
              <div className="border-b border-gray-100 px-3 py-2 mb-1">
                <p className="text-xs font-semibold text-gray-800">{user?.full_name}</p>
                <p className="text-[11px] text-gray-400 truncate">{user?.email}</p>
                <p className="text-[10px] text-orange-500 font-medium mt-0.5">{user?.hospital_name || 'CareBridge Central'}</p>
              </div>
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-50 transition"
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
