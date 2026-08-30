import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Building2, BedDouble, Users, UserCheck, Stethoscope,
  Ambulance, Siren, Bell, BarChart3, History, Settings, HeartPulse,
  ClipboardList, ArrowRightLeft, Radio, FileText, FlaskConical, Pill,
  Sparkles, GitBranch, FolderTree, FileSpreadsheet, ShieldAlert, X, Cpu, Layers
} from 'lucide-react';

interface SidebarLinkItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
  comingSoon?: boolean;
}

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;
  const [phaseModal, setPhaseModal] = useState<string | null>(null);

  const adminLinks: SidebarLinkItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
    { to: '/admin/branches', label: 'Branches', icon: GitBranch },
    { to: '/admin/departments', label: 'Departments', icon: FolderTree },
    { to: '/admin/icu', label: 'ICU Network', icon: Layers, badge: 'ICU' },
    { to: '/admin/beds', label: 'Beds', icon: BedDouble },
    { to: '/admin/resources', label: 'Resources', icon: Sparkles },
    { to: '/admin/doctors', label: 'Staff Roster', icon: Stethoscope },
    { to: '/admin/ambulances', label: 'Ambulances', icon: Ambulance },
    { to: '/admin/patients', label: 'Patients', icon: Users },
    { to: '/admin/patients/critical', label: 'Critical Watch', icon: ShieldAlert, badge: 'ALERT' },
    { to: '/admin/emergency', label: 'Emergency', icon: Siren },
    { to: '/admin/ai-intelligence', label: 'AI Capacity', icon: Cpu, badge: 'AI' },
    { to: '/admin/simulation', label: 'Simulation Lab', icon: Radio },
    { to: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/admin/alerts', label: 'Alerts', icon: Bell },
    { to: '/admin/audit', label: 'Audit Log', icon: History },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const doctorLinks: SidebarLinkItem[] = [
    { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/doctor/patients', label: 'My Patients', icon: Users },
    { to: '/doctor/ai-risk', label: 'AI Risk Watch', icon: ShieldAlert, badge: 'AI' },
    { to: '/doctor/monitoring', label: 'Live Monitoring', icon: Radio },
    { to: '/doctor/incoming', label: 'Incoming Cases', icon: Siren },
    { to: '/doctor/alerts', label: 'Clinical Alerts', icon: Bell },
    { to: '/doctor/reports', label: 'Clinical Reports', icon: FileSpreadsheet },
  ];

  const nurseLinks: SidebarLinkItem[] = [
    { to: '/nurse', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/nurse/patients', label: 'My Patients', icon: Users },
    { to: '/nurse/beds', label: 'Bed Status', icon: BedDouble },
    { to: '/nurse/vitals', label: 'Vitals', icon: HeartPulse },
    { to: '/nurse/medications', label: 'Medications', icon: Pill },
    { to: '/nurse/tasks', label: 'Tasks', icon: ClipboardList },
    { to: '/nurse/ambulances', label: 'Ambulances', icon: Ambulance },
    { to: '/nurse/alerts', label: 'Alerts', icon: Bell },
    { to: '/nurse/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/nurse/handover', label: 'Handover', icon: ArrowRightLeft },
  ];

  const links = role === 'ADMIN' ? adminLinks : role === 'NURSE' ? nurseLinks : doctorLinks;

  return (
    <aside className="w-64 flex-shrink-0 border-r border-slate-800/80 bg-slate-950/70 p-4 backdrop-blur-md flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {role} WORKSPACE
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>
          </div>

          <nav className="space-y-1">
            {links.map((link, idx) => {
              const Icon = link.icon;
              if (link.comingSoon) {
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhaseModal(link.label)}
                    className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-900/60 hover:text-slate-400 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span>{link.label}</span>
                    </div>
                    <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono border border-slate-700/50">
                      Next Phase
                    </span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={idx}
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm shadow-teal-500/5'
                        : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && (
                    <span className="text-[9px] text-teal-400 bg-teal-500/10 px-1.5 py-0.2 rounded font-mono border border-teal-500/20">
                      {link.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Context & Network Footer */}
      <div className="space-y-3 mt-6">
        {role === 'DOCTOR' && (
          <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></div>
              <span className="font-bold text-sky-300">{user?.full_name || 'Dr. Arjun Sharma'}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-300">Critical Care Specialist</p>
            <p className="text-[10px] text-slate-400">HealthNet Central • Medical ICU</p>
          </div>
        )}

        {role === 'NURSE' && (
          <div className="rounded-xl border border-teal-500/20 bg-teal-950/20 p-3 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></div>
              <span className="font-bold text-teal-300">{user?.full_name || 'Nurse Elena Rostova'}</span>
            </div>
            <p className="text-[11px] font-medium text-slate-300">HealthNet Central Hospital</p>
            <p className="text-[10px] text-slate-400">Downtown Campus • Medical ICU</p>
          </div>
        )}

        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-slate-300">Network Status</span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              100% ONLINE
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-emerald-500 h-1 rounded-full w-full"></div>
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">12 Hospital Nodes Active</p>
        </div>
      </div>

      {/* Next Phase Informational Modal */}
      {phaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-400" />
                <span>{phaseModal} Module</span>
              </span>
              <button onClick={() => setPhaseModal(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This module is scheduled for implementation in the next phase as part of the HealthNet roadmap.
            </p>
            <button
              onClick={() => setPhaseModal(null)}
              className="w-full rounded-xl bg-teal-600 hover:bg-teal-500 py-2 text-xs font-bold text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
