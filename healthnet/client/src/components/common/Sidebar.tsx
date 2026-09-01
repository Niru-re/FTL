import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  LayoutDashboard, Building2, BedDouble, Users, UserCheck, Stethoscope,
  Ambulance, Siren, Bell, BarChart3, History, Settings, HeartPulse,
  ClipboardList, ArrowRightLeft, Radio, FileText, FlaskConical, Pill,
  Sparkles, GitBranch, FolderTree, FileSpreadsheet, ShieldAlert, X, Cpu, Layers, ScanLine
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
    { to: '/doctor/xray-screening', label: 'AI X-Ray Screen', icon: ScanLine, badge: 'AI' },
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

  const roleLabel: Record<string, string> = {
    ADMIN: 'Admin Workspace',
    DOCTOR: 'Doctor Workspace',
    NURSE: 'Nurse Workspace',
  };

  return (
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col justify-between min-h-[calc(100vh-5rem)]">
      {/* Workspace label */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-4 pt-4 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {roleLabel[role || ''] || 'Workspace'}
          </span>
        </div>

        <nav className="px-3 pb-4 space-y-0.5">
          {links.map((link, idx) => {
            const Icon = link.icon;
            if (link.comingSoon) {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPhaseModal(link.label)}
                  className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-50 hover:text-gray-500 transition"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{link.label}</span>
                  </div>
                  <span className="text-[9px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded font-mono border border-gray-200">
                    Soon
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
                  `flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition ${
                    isActive
                      ? 'bg-orange-50 text-orange-600 border border-orange-200/60'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span>{link.label}</span>
                </div>
                {link.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold border bg-orange-50 text-orange-500 border-orange-200">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Context & Network Footer */}
      <div className="border-t border-gray-200 p-3 space-y-3">
        {role === 'DOCTOR' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="font-semibold text-blue-700">{user?.full_name || 'Dr. Arjun Sharma'}</span>
            </div>
            <p className="text-[11px] font-medium text-gray-600">Critical Care Specialist</p>
            <p className="text-[10px] text-gray-400">CareBridge Central • Medical ICU</p>
          </div>
        )}

        {role === 'NURSE' && (
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-semibold text-teal-700">{user?.full_name || 'Nurse Elena Rostova'}</span>
            </div>
            <p className="text-[11px] font-medium text-gray-600">CareBridge Central Hospital</p>
            <p className="text-[10px] text-gray-400">Downtown Campus • Medical ICU</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-600">Network Status</span>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1 overflow-hidden">
            <div className="bg-emerald-500 h-1 rounded-full w-full" />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">12 Hospital Nodes Active</p>
        </div>
      </div>

      {/* Next Phase Informational Modal */}
      {phaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-500" />
                <span>{phaseModal} Module</span>
              </span>
              <button onClick={() => setPhaseModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              This module is scheduled for implementation in the next phase as part of the CareBridge roadmap.
            </p>
            <button
              onClick={() => setPhaseModal(null)}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 py-2 text-xs font-bold text-white transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
