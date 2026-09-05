import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Heart, Clock, UserCheck, Calendar, FileText,
  Menu, X, LogOut, Bell, Shield, MapPin, Pill,
  MessageSquare, Users, ChevronDown, CheckCircle2,
  Activity, ExternalLink
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSelector } from '../components/common/LanguageSelector';
import { patientAPI } from '../services/api';


export const PatientLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [authorizedPatients, setAuthorizedPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(1);
  const [isLiveConnected, setIsLiveConnected] = useState(true);

  // Load authorized patients for patient switcher
  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const data = await patientAPI.getMe();
        if (data.authorized_patients && data.authorized_patients.length > 0) {
          setAuthorizedPatients(data.authorized_patients);
          setSelectedPatientId(data.active_patient_id || data.authorized_patients[0].patient_id);
        }
      } catch (e) {
        console.warn('Failed to load patient identity', e);
      }
    };
    loadIdentity();
  }, []);

  const handlePatientSwitch = (pid: number) => {
    setSelectedPatientId(pid);
    navigate(`/patient/dashboard?patient_id=${pid}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/patient/login');
  };

  const primaryNavItems = [
    { label: t('navHome'), path: '/patient/dashboard', icon: Heart },
    { label: t('navUpdates'), path: '/patient/updates', icon: Clock },
    { label: t('navCareTeam'), path: '/patient/care-team', icon: UserCheck },
    { label: t('navAppointments'), path: '/patient/appointments', icon: Calendar },
    { label: t('navDocuments'), path: '/patient/documents', icon: FileText },
  ];

  const moreNavItems = [
    { label: t('navTimeline'), path: '/patient/timeline', icon: Activity },
    { label: t('navMedications'), path: '/patient/medications', icon: Pill },
    { label: t('navLabs'), path: '/patient/labs', icon: FileText },
    { label: t('navHospital'), path: '/patient/hospital', icon: MapPin },
    { label: t('navRequests'), path: '/patient/requests', icon: MessageSquare },
    { label: t('navFamily'), path: '/patient/family', icon: Users },
    { label: t('navNotifications'), path: '/patient/notifications', icon: Bell },
    { label: t('navProfile'), path: '/patient/profile', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Bar (Calm, Clean, White + Orange) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-sm font-black text-base tracking-tighter">
              HN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">{t('appName')}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                  {t('portalPatientFamily')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">{t('tagline')}</p>
            </div>
          </div>

          {/* Center: Live Connection Pill & Language Selector */}
          <div className="flex items-center gap-2.5">
            <LanguageSelector />
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t('liveConnected')}
            </div>
          </div>


          {/* Right Controls: Patient Switcher & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Patient Switcher (if family member has multiple or patient view) */}
            {authorizedPatients.length > 1 && (
              <div className="relative">
                <select
                  value={selectedPatientId || ''}
                  onChange={(e) => handlePatientSwitch(Number(e.target.value))}
                  className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-orange-500 pr-6 appearance-none cursor-pointer"
                >
                  {authorizedPatients.map((p) => (
                    <option key={p.patient_id} value={p.patient_id}>
                      {p.full_name} ({p.mrn})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-2.5 pointer-events-none" />
              </div>
            )}

            {/* Notifications Button */}
            <button
              onClick={() => navigate('/patient/notifications')}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-600 rounded-full" />
              )}
            </button>

            {/* User Profile Pill / Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center border border-orange-200">
                {user?.full_name ? user.full_name.charAt(0) : 'P'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name || 'Patient'}</p>
                <p className="text-[10px] text-slate-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body with Desktop Secondary Nav and Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-8 flex flex-col md:flex-row gap-6">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">Overview</p>
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 border border-orange-200 shadow-xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1.5">Care Details</p>
            {moreNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-orange-50 text-orange-600 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          {/* Calming Clinical Helpline Card */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-200/60 p-4 text-center">
            <Heart className="w-5 h-5 text-orange-500 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800">Need Immediate Help?</h4>
            <p className="text-[11px] text-slate-600 mt-1">If you have urgent questions, contact the patient liaison desk directly.</p>
            <a
              href="tel:+15550100"
              className="mt-3 block text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 py-1.5 px-3 rounded-lg shadow-xs transition-colors"
            >
              Call Main Desk
            </a>
          </div>
        </aside>

        {/* Dynamic Outlet View Container */}
        <main className="flex-1 min-w-0">
          <Outlet context={{ selectedPatientId, authorizedPatients }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Fixed for thumb navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 px-2 py-1 shadow-lg">
        <div className="flex items-center justify-around">
          {primaryNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-colors ${
                  isActive ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[10px] font-semibold mt-1">{item.label}</span>
              </NavLink>
            );
          })}

          {/* More Drawer Button */}
          <button
            onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-colors ${
              isMoreMenuOpen ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {isMoreMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-[10px] font-semibold mt-1">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Drawer Modal */}
      {isMoreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl border-t border-slate-200 p-5 max-h-[80vh] overflow-y-auto space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-sm font-bold text-slate-900">Care Navigation</span>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-orange-500" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out of Patient Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
