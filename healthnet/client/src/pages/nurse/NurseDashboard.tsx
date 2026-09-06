import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, AlertTriangle, Activity, CheckCircle2, BedDouble,
  Ambulance as AmbulanceIcon, Bell, ChevronRight, ShieldAlert,
  Clock, Stethoscope, Pill, HeartPulse, RefreshCw, Radio
} from 'lucide-react';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { nurseAPI } from '../../services/api';
import { NurseDashboardSummary, NursePatient, Ambulance, NurseTask, AlertItem } from '../../types';

export const NurseDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<NurseDashboardSummary | null>(null);
  const [patients, setPatients] = useState<NursePatient[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [tasks, setTasks] = useState<NurseTask[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingBed, setPreparingBed] = useState<number | null>(null);
  const [preparedNotice, setPreparedNotice] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumData, ptsData, ambData, taskData, alertData] = await Promise.all([
        nurseAPI.getDashboard(),
        nurseAPI.getPatients(),
        nurseAPI.getAmbulances(),
        nurseAPI.getTasks('PENDING'),
        nurseAPI.getAlerts()
      ]);
      setSummary(sumData);
      setPatients(ptsData);
      setAmbulances(ambData);
      setTasks(taskData);
      setAlerts(alertData);
    } catch (err) {
      console.error('Failed to load nurse dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handlePrepareBed = async (ambId: number) => {
    try {
      setPreparingBed(ambId);
      const res = await nurseAPI.prepareBed(ambId);
      setPreparedNotice(res.message);
      await fetchDashboardData();
      setTimeout(() => setPreparedNotice(null), 5000);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to prepare bed');
    } finally {
      setPreparingBed(null);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await nurseAPI.updateTask(taskId, { is_completed: true });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await nurseAPI.acknowledgeAlert(alertId);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Find incoming ambulance
  const incomingAmb = ambulances.find(
    (a) => a.status === 'EN_ROUTE' || a.status === 'DISPATCHED' || a.status === 'TRANSPORTING'
  );

  const criticalPatients = patients.filter(
    (p) => p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH RISK'
  );

  const aiAlerts = alerts.filter(
    (a) => ['CRITICAL_RISK', 'RAPID_DETERIORATION', 'CRITICAL_DETERIORATION', 'MULTI_VITAL_DECLINE'].includes(a.alert_type)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
              Clinical Ward Station • ICU / Acute Unit
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 mt-1">
            Nurse Operations Command
          </h1>
          <p className="text-xs text-gray-500">
            CareBridge Central Hospital • Downtown Medical Campus • Shift: Morning
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-300/80 bg-gray-200/80 hover:bg-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-teal-400' : ''}`} />
            <span>Sync Live</span>
          </button>
          <Link
            to="/nurse/vitals"
            className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-teal-900/40 transition"
          >
            <HeartPulse className="h-4 w-4" />
            <span>Record Vitals</span>
          </Link>
        </div>
      </div>

      {/* Phase 7: Nurse AI Early Deterioration Alert Banner (Section 13) */}
      {aiAlerts.length > 0 && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-950/40 p-4 shadow-xl animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 font-black text-sm">🔴</span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-300">
                    PATIENT DETERIORATION ALERT
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-200 border border-rose-500/30">
                    PROTOTYPE AI • NOT A DIAGNOSIS
                  </span>
                </div>
                <p className="text-sm font-bold text-white mt-0.5">{aiAlerts[0].title}</p>
                <p className="text-xs text-rose-200/90 mt-0.5">{aiAlerts[0].message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {aiAlerts[0].patient_id && (
                <Link
                  to={`/nurse/patients/${aiAlerts[0].patient_id}`}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
                >
                  VIEW PATIENT
                </Link>
              )}
              <button
                onClick={() => handleAcknowledgeAlert(aiAlerts[0].id)}
                className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 text-xs font-bold transition"
              >
                ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bed Preparation Notification Banner */}
      {preparedNotice && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-950/60 p-4 text-xs font-semibold text-teal-200 flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">Bed Reservation Confirmed</p>
              <p className="text-teal-300/80">{preparedNotice}</p>
            </div>
          </div>
          <Link
            to="/nurse/beds"
            className="rounded-lg bg-teal-600/40 hover:bg-teal-600 px-3 py-1.5 text-xs text-white transition"
          >
            View Bed Matrix
          </Link>
        </div>
      )}

      {/* Top Real-Time KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3.5">
        <StatCard
          title="Assigned Patients"
          value={summary?.assigned_patients ?? 0}
          icon={Users}
          variant="sky"
        />
        <StatCard
          title="Critical Patients"
          value={summary?.critical_patients ?? 0}
          icon={AlertTriangle}
          variant="rose"
        />
        <StatCard
          title="High Risk"
          value={summary?.high_risk_patients ?? 0}
          icon={ShieldAlert}
          variant="amber"
        />
        <StatCard
          title="Pending Tasks"
          value={summary?.pending_tasks ?? 0}
          icon={CheckCircle2}
          variant="purple"
        />
        <StatCard
          title="Available ICU Beds"
          value={summary?.available_icu_beds ?? 0}
          icon={BedDouble}
          variant="emerald"
        />
        <StatCard
          title="Incoming Ambulances"
          value={summary?.incoming_ambulances ?? 0}
          icon={AmbulanceIcon}
          variant="blue"
        />
        <StatCard
          title="Active Alerts"
          value={summary?.active_alerts ?? 0}
          icon={Bell}
          variant="rose"
        />
      </div>

      {/* Prominent Incoming Ambulance Card */}
      {incomingAmb && (
        <div className="rounded-2xl border-2 border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-slate-900 p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
                <AmbulanceIcon className="h-6 w-6 text-rose-400 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-ping"></span>
                    INCOMING EMERGENCY AMBULANCE
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-gray-200 px-2 py-0.5 rounded border border-gray-300">
                    {incomingAmb.code}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  {incomingAmb.current_patient_name || 'Emergency Intake Patient'}
                </h3>
                <p className="text-xs text-gray-600">
                  <p className="text-xs text-rose-600">CRITICAL / ACUTE INTAKE &bull; Destination: CareBridge Central</p>
                </p>
              </div>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50/60 p-3.5 rounded-xl border border-gray-200/80">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">ETA</p>
                <p className="text-base font-black text-rose-400 font-mono">
                  {incomingAmb.eta_minutes.toString().padStart(2, '0')} MIN
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Assigned Bed</p>
                <p className="text-xs font-bold text-teal-300 font-mono">
                  {incomingAmb.assigned_bed_code || 'ICU-12 (Pending Prep)'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Equipment</p>
                <p className="text-xs font-bold text-gray-700">Ventilator + Telemetry</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Doctor</p>
                <p className="text-xs font-bold text-gray-700 truncate">
                  {incomingAmb.assigned_doctor_name || 'Dr. Ananya Mehta'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                onClick={() => handlePrepareBed(incomingAmb.id)}
                disabled={preparingBed === incomingAmb.id}
                className="flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/50 transition"
              >
                <BedDouble className="h-4 w-4" />
                <span>{preparingBed === incomingAmb.id ? 'Preparing...' : 'PREPARE BED'}</span>
              </button>
              <Link
                to="/nurse/ambulances"
                className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-gray-200/90 hover:bg-gray-300 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition"
              >
                <span>Details & Map</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Patients at Risk & Daily Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High Priority Assigned Patients */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-400" />
                  <span>My Assigned Patients</span>
                </h2>
                <p className="text-xs text-gray-500">
                  Real-time status monitoring for patients under your active care
                </p>
              </div>
              <Link
                to="/nurse/patients"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
              >
                <span>View All ({patients.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] font-bold uppercase text-gray-500">
                    <th className="pb-3 pl-2">Patient</th>
                    <th className="pb-3">Bed</th>
                    <th className="pb-3">Diagnosis</th>
                    <th className="pb-3">Risk Tier</th>
                    <th className="pb-3">Latest Vitals</th>
                    <th className="pb-3">Doctor</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60">
                  {patients.slice(0, 6).map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-200/40 transition">
                      <td className="py-3 pl-2">
                        <div className="font-bold text-gray-800">{patient.full_name}</div>
                        <div className="text-[10px] font-mono text-gray-500">
                          {patient.mrn} • {patient.age}y {patient.gender}
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="font-mono text-[11px] font-bold text-teal-300 bg-teal-950/40 px-2 py-0.5 rounded border border-teal-500/20">
                          {patient.bed_code || 'Unassigned'}
                        </span>
                      </td>
                      <td className="py-3 max-w-[160px] truncate text-gray-600" title={patient.diagnosis}>
                        {patient.diagnosis}
                      </td>
                      <td className="py-3">
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            patient.risk_level === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : patient.risk_level === 'HIGH RISK'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : patient.risk_level === 'WATCH'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {patient.risk_level}
                        </span>
                      </td>
                      <td className="py-3">
                        {patient.latest_vitals ? (
                          <div className="font-mono text-[11px]">
                            <span className={patient.latest_vitals.spo2 < 92 ? 'text-rose-400 font-bold' : 'text-gray-700'}>
                              SpO2: {patient.latest_vitals.spo2}%
                            </span>
                            <span className="text-gray-500"> • HR: {patient.latest_vitals.heart_rate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No vitals yet</span>
                        )}
                      </td>
                      <td className="py-3 text-gray-600 text-[11px]">
                        {patient.assigned_doctor_name || 'Unassigned'}
                      </td>
                      <td className="py-3 text-right pr-2">
                        <Link
                          to={`/nurse/patients/${patient.id}`}
                          className="rounded-lg bg-gray-200 hover:bg-teal-600 px-2.5 py-1 text-[11px] font-semibold text-gray-700 hover:text-white transition inline-flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Action Navigation Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/nurse/beds"
              className="rounded-xl border border-gray-200 bg-gray-100/50 hover:bg-gray-200/80 p-4 transition text-center group"
            >
              <BedDouble className="h-5 w-5 text-teal-400 mx-auto mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-gray-800 block">Bed Matrix</span>
              <span className="text-[10px] text-gray-500">Occupancy & Cleaning</span>
            </Link>

            <Link
              to="/nurse/medications"
              className="rounded-xl border border-gray-200 bg-gray-100/50 hover:bg-gray-200/80 p-4 transition text-center group"
            >
              <Pill className="h-5 w-5 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-gray-800 block">Medications</span>
              <span className="text-[10px] text-gray-500">Administration Log</span>
            </Link>

            <Link
              to="/nurse/doctors"
              className="rounded-xl border border-gray-200 bg-gray-100/50 hover:bg-gray-200/80 p-4 transition text-center group"
            >
              <Stethoscope className="h-5 w-5 text-sky-400 mx-auto mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-gray-800 block">On-Duty Doctors</span>
              <span className="text-[10px] text-gray-500">Request Evaluation</span>
            </Link>

            <Link
              to="/nurse/handover"
              className="rounded-xl border border-gray-200 bg-gray-100/50 hover:bg-gray-200/80 p-4 transition text-center group"
            >
              <Clock className="h-5 w-5 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-gray-800 block">Shift Handover</span>
              <span className="text-[10px] text-gray-500">Transfer Records</span>
            </Link>
          </div>
        </div>

        {/* Right Col: Tasks & Critical Alerts */}
        <div className="space-y-6">
          {/* Nursing Tasks */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                <span>Pending Nursing Tasks ({tasks.length})</span>
              </h2>
              <Link to="/nurse/tasks" className="text-xs font-semibold text-purple-400 hover:text-purple-300">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No pending nursing tasks.</p>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-gray-50/60 border border-gray-200/80 hover:border-gray-300 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 px-1.5 py-0.2 rounded border border-purple-500/30">
                          {task.task_type}
                        </span>
                        <span className="text-xs font-semibold text-white">{task.patient_name}</span>
                        {task.bed_code && (
                          <span className="text-[10px] font-mono text-gray-500">({task.bed_code})</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600">{task.description}</p>
                      <p className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3 text-gray-500" /> Due: {task.due_time}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white px-2.5 py-1 text-[11px] font-bold transition flex-shrink-0"
                    >
                      Complete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Department Alerts */}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-100/60 p-5 backdrop-blur-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Bell className="h-4 w-4 text-rose-400" />
                <span>Critical Alerts ({alerts.filter((a) => !a.is_read).length})</span>
              </h2>
              <Link to="/nurse/alerts" className="text-xs font-semibold text-rose-400 hover:text-rose-300">
                View All
              </Link>
            </div>

            <div className="space-y-2.5">
              {alerts.length === 0 ? (
                <p className="text-xs text-gray-500 py-4 text-center">No active alerts.</p>
              ) : (
                alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-xl border transition space-y-1.5 ${
                      alert.is_read
                        ? 'bg-gray-50/40 border-gray-200/60 opacity-60'
                        : alert.severity === 'CRITICAL'
                        ? 'bg-rose-950/30 border-rose-500/30'
                        : 'bg-amber-950/20 border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-white">{alert.title}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-500">
                        {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!alert.is_read && (
                        <button
                          onClick={() => handleAcknowledgeAlert(alert.id)}
                          className="text-[10px] font-bold text-teal-400 hover:text-teal-300"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
