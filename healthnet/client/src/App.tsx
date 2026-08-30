import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { UserRole } from './types';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { DoctorLayout } from './layouts/DoctorLayout';
import { NurseLayout } from './layouts/NurseLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { HospitalsPage } from './pages/admin/HospitalsPage';
import { HospitalDetailPage } from './pages/admin/HospitalDetailPage';
import { BranchesPage } from './pages/admin/BranchesPage';
import { DepartmentsPage } from './pages/admin/DepartmentsPage';
import { ResourcesPage } from './pages/admin/ResourcesPage';
import { BedsPage } from './pages/admin/BedsPage';
import { StaffPage } from './pages/admin/StaffPage';
import { AmbulancesPage } from './pages/admin/AmbulancesPage';
import { EmergencyCasesPage } from './pages/admin/EmergencyCasesPage';
import { AlertsPage } from './pages/admin/AlertsPage';
import { AnalyticsPage } from './pages/admin/AnalyticsPage';
import { AuditLogsPage } from './pages/admin/AuditLogsPage';
import { SettingsPage } from './pages/admin/SettingsPage';
import { SimulationControlPage } from './pages/admin/SimulationControlPage';

// Emergency Intelligence Pages (Phase 5)
import { EmergencyListPage } from './pages/emergency/EmergencyListPage';
import { NewEmergencyPage } from './pages/emergency/NewEmergencyPage';
import { EmergencyDetailPage } from './pages/emergency/EmergencyDetailPage';

// Nurse Pages
import { NurseDashboard } from './pages/nurse/NurseDashboard';
import { NursePatientsPage } from './pages/nurse/NursePatientsPage';
import { NursePatientDetailPage } from './pages/nurse/NursePatientDetailPage';
import { NurseBedsPage } from './pages/nurse/NurseBedsPage';
import { NurseVitalsPage } from './pages/nurse/NurseVitalsPage';
import { NurseMedicationsPage } from './pages/nurse/NurseMedicationsPage';
import { NurseTasksPage } from './pages/nurse/NurseTasksPage';
import { NurseAmbulancesPage } from './pages/nurse/NurseAmbulancesPage';
import { NurseAlertsPage } from './pages/nurse/NurseAlertsPage';
import { NurseDoctorsPage } from './pages/nurse/NurseDoctorsPage';
import { NurseHandoverPage } from './pages/nurse/NurseHandoverPage';

// Doctor Pages
import { DoctorDashboard } from './pages/doctor/DoctorDashboard';
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage';
import { DoctorPatientDetailPage } from './pages/doctor/DoctorPatientDetailPage';
import { DoctorLiveMonitoringPage } from './pages/doctor/DoctorLiveMonitoringPage';
import { DoctorAlertsPage } from './pages/doctor/DoctorAlertsPage';
import { DoctorIncomingPage } from './pages/doctor/DoctorIncomingPage';
import { DoctorReportsPage } from './pages/doctor/DoctorReportsPage';
import { DoctorAIRiskPage } from './pages/doctor/DoctorAIRiskPage';
import { AdminAICapacityPage } from './pages/admin/AdminAICapacityPage';
import { ICUNetworkPage } from './pages/admin/ICUNetworkPage';
import { CriticalPatientsPage } from './pages/admin/CriticalPatientsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRole: UserRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400 font-bold text-xs uppercase tracking-wider">
        Loading HealthNet Platform...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== allowedRole) {
    // Redirect to user's assigned dashboard
    if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
    if (user.role === 'NURSE') return <Navigate to="/nurse" replace />;
  }

  return children;
};

// Root Router Redirector
const RootRedirect: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-teal-400 font-bold text-xs uppercase tracking-wider">
        Loading HealthNet Platform...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'DOCTOR') return <Navigate to="/doctor" replace />;
  if (user.role === 'NURSE') return <Navigate to="/nurse" replace />;

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ADMIN ROUTES */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="hospitals" element={<HospitalsPage />} />
        <Route path="hospitals/:id" element={<HospitalDetailPage />} />
        <Route path="branches" element={<BranchesPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="icu" element={<ICUNetworkPage />} />
        <Route path="beds" element={<BedsPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="patients" element={<DoctorPatientsPage />} />
        <Route path="patients/critical" element={<CriticalPatientsPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="doctors" element={<StaffPage />} />
        <Route path="nurses" element={<StaffPage />} />
        <Route path="ambulances" element={<AmbulancesPage />} />
        <Route path="emergency" element={<EmergencyListPage />} />
        <Route path="emergency/new" element={<NewEmergencyPage />} />
        <Route path="emergency/:id" element={<EmergencyDetailPage />} />
        <Route path="alerts" element={<AlertsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="ai-intelligence" element={<AdminAICapacityPage />} />
        <Route path="simulation" element={<SimulationControlPage />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* NURSE ROUTES */}
      <Route
        path="/nurse"
        element={
          <ProtectedRoute allowedRole="NURSE">
            <NurseLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<NurseDashboard />} />
        <Route path="dashboard" element={<NurseDashboard />} />
        <Route path="patients" element={<NursePatientsPage />} />
        <Route path="patients/:id" element={<NursePatientDetailPage />} />
        <Route path="beds" element={<NurseBedsPage />} />
        <Route path="vitals" element={<NurseVitalsPage />} />
        <Route path="medications" element={<NurseMedicationsPage />} />
        <Route path="tasks" element={<NurseTasksPage />} />
        <Route path="ambulances" element={<NurseAmbulancesPage />} />
        <Route path="emergency" element={<EmergencyListPage />} />
        <Route path="emergency/new" element={<NewEmergencyPage />} />
        <Route path="emergency/:id" element={<EmergencyDetailPage />} />
        <Route path="alerts" element={<NurseAlertsPage />} />
        <Route path="doctors" element={<NurseDoctorsPage />} />
        <Route path="handover" element={<NurseHandoverPage />} />
      </Route>

      {/* DOCTOR ROUTES */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRole="DOCTOR">
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorDashboard />} />
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="patients" element={<DoctorPatientsPage />} />
        <Route path="patients/:id" element={<DoctorPatientDetailPage />} />
        <Route path="patients/:id/risk" element={<DoctorPatientDetailPage />} />
        <Route path="ai-risk" element={<DoctorAIRiskPage />} />
        <Route path="monitoring" element={<DoctorLiveMonitoringPage />} />
        <Route path="incoming" element={<DoctorIncomingPage />} />
        <Route path="alerts" element={<DoctorAlertsPage />} />
        <Route path="reports" element={<DoctorReportsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
