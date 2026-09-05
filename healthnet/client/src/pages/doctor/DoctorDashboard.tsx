import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { doctorAPI } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { DoctorDashboardSummary, DoctorPatient, DoctorRequest, AlertItem, Ambulance } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatTime } from '../../utils/formatters';
import {
  Users, Activity, ShieldAlert, HeartPulse, Bell, Radio,
  Stethoscope, ArrowRight, RefreshCw, Siren, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, UserCheck, Sparkles
} from 'lucide-react';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [summary, setSummary] = useState<DoctorDashboardSummary | null>(null);
  const [patients, setPatients] = useState<DoctorPatient[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [requests, setRequests] = useState<DoctorRequest[]>([]);
  const [incomingAmbs, setIncomingAmbs] = useState<Ambulance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchDoctorData = async () => {
    try {
      const [sumData, ptData, alertData, reqData, incData] = await Promise.all([
        doctorAPI.getDashboard(),
        doctorAPI.getPatients({ sort_by: 'risk' }),
        doctorAPI.getAlerts(),
        doctorAPI.getRequests(),
        doctorAPI.getIncoming()
      ]);

      setSummary(sumData);
      setPatients(ptData);
      setAlerts(alertData.slice(0, 6));
      setRequests(reqData.filter(r => r.status === 'PENDING'));
      setIncomingAmbs(incData);
    } catch (e) {
      console.error('Error fetching doctor dashboard data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorData();

    const unsubVitals = subscribe('PATIENT_VITALS_UPDATED', () => fetchDoctorData());
    const unsubReq = subscribe('NURSE_DOCTOR_REQUEST_CREATED', () => fetchDoctorData());
    const unsubAlert = subscribe('ALERT_CREATED', () => fetchDoctorData());
    const unsubAmb = subscribe('AMBULANCE_STATUS_UPDATED', () => fetchDoctorData());

    return () => {
      unsubVitals();
      unsubReq();
      unsubAlert();
      unsubAmb();
    };
  }, []);

  const handleAcknowledgeAlert = async (alertId: number) => {
    try {
      await doctorAPI.acknowledgeAlert(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      setActionSuccess('Clinical alert acknowledged.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAcknowledgeRequest = async (reqId: number) => {
    try {
      await doctorAPI.acknowledgeRequest(reqId);
      setRequests(prev => prev.filter(r => r.id !== reqId));
      setActionSuccess('Nurse consultation request accepted.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const highPriorityPatients = patients.filter(p => p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH RISK').slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Clinical Operations Center</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Welcome, {user?.full_name || 'Dr. Arjun Sharma'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Specialist in Critical Care &bull; CareBridge Central Hospital &bull; Medical ICU (Downtown Campus)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/doctor/monitoring')}
            className="flex items-center gap-2 rounded-xl bg-sky-600/20 border border-sky-500/30 px-3.5 py-2 text-xs font-bold text-sky-300 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-sky-600/30 transition shadow-sm"
          >
            <Radio className="h-4 w-4 text-sky-400 animate-pulse" />
            <span>ICU Telemetry Wall</span>
          </button>
          <button
            onClick={() => { setIsLoading(true); fetchDoctorData(); }}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 px-3.5 py-2 text-xs font-bold text-gray-600 transition border border-gray-300"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Inbound Critical Ambulance Alert (if any) */}
      {incomingAmbs.length > 0 && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 relative overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex-shrink-0 mt-0.5">
                <Siren className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Inbound Emergency Transit</span>
                  <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-300 border border-rose-500/30">
                    ETA: {incomingAmbs[0].eta_minutes} MIN
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {incomingAmbs[0].code} &bull; {incomingAmbs[0].current_patient_name || 'Emergency Intake'}
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Assigned Bed: <span className="font-mono text-rose-300 font-semibold">{incomingAmbs[0].assigned_bed_code || 'Pre-assigned ICU'}</span> &bull; Paramedic: {incomingAmbs[0].paramedic_name}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/doctor/incoming')}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-500 px-4 py-2 text-xs font-bold text-white transition self-start sm:self-auto"
            >
              <span>View Inbound Cases</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="My Patients"
          value={summary?.my_patients ?? patients.length}
          icon={Users}
          variant="teal"
          trend={{ value: 'Assigned census' }}
        />
        <StatCard
          title="Critical Status"
          value={summary?.critical_patients ?? 0}
          icon={ShieldAlert}
          variant="rose"
          trend={{ value: 'Immediate attention', isPositive: false }}
        />
        <StatCard
          title="High Risk Watch"
          value={summary?.high_risk_patients ?? 0}
          icon={HeartPulse}
          variant="amber"
          trend={{ value: 'Continuous telemetry' }}
        />
        <StatCard
          title="Active Alarms"
          value={summary?.active_alerts ?? alerts.length}
          icon={Bell}
          variant="sky"
          trend={{ value: 'Awaiting review' }}
        />
        <StatCard
          title="Nurse Requests"
          value={requests.length}
          icon={Stethoscope}
          variant="purple"
          trend={{ value: 'Consultations' }}
        />
        <StatCard
          title="Incoming Cases"
          value={incomingAmbs.length}
          icon={Siren}
          variant="emerald"
          trend={{ value: 'En route to ICU' }}
        />
      </div>

      {/* Main Grid: Priority Patients & Live Clinical Alarms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: High Attention Patient Census */}
        <div className="lg:col-span-2 space-y-4">
          {/* Phase 7: AI Watchlist (Section 38) */}
          <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/20 p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
                  <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-teal-400" />
                    <span>AI Deterioration Watchlist</span>
                  </h2>
                  <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    PROTOTYPE AI
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Patients showing rising physiological instability and rapid risk velocity.</p>
              </div>

              <button
                onClick={() => navigate('/doctor/ai-risk')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600/20 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-600/30 text-teal-300 border border-teal-500/30 text-xs font-bold transition self-start sm:self-auto"
              >
                <span>View Full AI Risk Registry</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {patients.slice(0, 3).map((p) => {
                const riskVal = p.risk_score ?? (p.risk_level === 'CRITICAL' ? 82 : p.risk_level === 'HIGH RISK' ? 67 : 45);
                const isHigh = riskVal >= 70;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/doctor/patients/${p.id}`)}
                    className="p-3 rounded-xl bg-gray-50/70 border border-gray-200/80 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-teal-500/40 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-teal-300 font-bold">{p.mrn}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${isHigh ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                        {riskVal}%
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white mt-1 truncate">{p.full_name}</div>
                    <div className="flex items-center justify-between mt-2 text-[10px] font-mono text-gray-500">
                      <span>Bed: {p.bed_code || 'ICU'}</span>
                      <span className="text-amber-400 font-bold">↑ +{Math.floor(riskVal * 0.12)}% / 15m</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="h-4 w-4 text-rose-400" />
                  <span>High Attention Patients</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Patients ranked by dynamic physiological risk & NEWS2 score</p>
              </div>
              <button
                onClick={() => navigate('/doctor/patients')}
                className="text-xs font-semibold text-sky-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-sky-300 flex items-center gap-1 transition"
              >
                <span>Full Census ({patients.length})</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {highPriorityPatients.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  No high-risk or critical patients currently flagged.
                </div>
              ) : (
                highPriorityPatients.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/doctor/patients/${p.id}`)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200/40 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300 cursor-pointer transition gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-3 w-3 rounded-full flex-shrink-0 ${p.risk_level === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-sky-300 transition">
                            {p.full_name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                            {p.mrn}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {p.age}y &bull; {p.gender} &bull; {p.blood_group}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5 font-medium line-clamp-1">
                          {p.diagnosis}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-gray-500">
                          <span className="font-mono text-gray-600">
                            Bed: <strong className="text-sky-300">{p.bed_code || 'Unassigned'}</strong>
                          </span>
                          <span>&bull;</span>
                          <span>Nurse: {p.assigned_nurse_name || 'Staff Nurse'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vitals & Risk Badges */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-gray-200/60 pt-2 sm:pt-0">
                      {p.latest_vitals && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`font-mono px-2 py-0.5 rounded ${p.latest_vitals.spo2 < 90 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-gray-200 text-gray-600'}`}>
                            SpO2 {p.latest_vitals.spo2}%
                          </span>
                          <span className={`font-mono px-2 py-0.5 rounded ${p.latest_vitals.heart_rate > 120 ? 'bg-rose-500/20 text-rose-300 font-bold' : 'bg-gray-200 text-gray-600'}`}>
                            {p.latest_vitals.heart_rate} bpm
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                          p.risk_level === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
                          p.risk_level === 'HIGH RISK' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          Risk {p.risk_score}%
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white transition" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Nurse-to-Doctor Consultation Requests */}
          <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-indigo-400" />
                  <span>Pending Nurse Consultation Requests</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Urgent nursing escalations requiring physician review</p>
              </div>
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                {requests.length} Pending
              </span>
            </div>

            <div className="space-y-2.5">
              {requests.length === 0 ? (
                <div className="text-center py-6 text-xs text-gray-500">
                  No pending nurse consult requests at this time.
                </div>
              ) : (
                requests.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-950/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${r.priority === 'STAT' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {r.priority}
                        </span>
                        <span className="text-xs font-bold text-white">{r.patient_name || `Patient #${r.patient_id}`}</span>
                        <span className="text-[10px] text-gray-500 font-mono">({r.patient_mrn || 'MRN-N/A'})</span>
                        <span className="text-[10px] text-gray-500">&bull; Paged by {r.nurse_name}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 font-medium">{r.reason}</p>
                      <span className="text-[10px] text-gray-500 mt-1 block">
                        Logged {formatTime(r.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <button
                        onClick={() => navigate(`/doctor/patients/${r.patient_id}`)}
                        className="rounded-lg bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition"
                      >
                        Open Patient
                      </button>
                      <button
                        onClick={() => handleAcknowledgeRequest(r.id)}
                        className="rounded-lg bg-indigo-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Clinical Alarms & Quick Tools */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-5 backdrop-blur-sm shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bell className="h-4 w-4 text-sky-400" />
                  <span>Clinical Alarms Feed</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Real-time critical telemetry triggers</p>
              </div>
              <button
                onClick={() => navigate('/doctor/alerts')}
                className="text-xs font-semibold text-sky-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-sky-300"
              >
                View All
              </button>
            </div>

            <div className="space-y-2.5">
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500">
                  No active clinical alarms in this hospital.
                </div>
              ) : (
                alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-xl border border-gray-200/80 bg-gray-50/60 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${alt.severity === 'CRITICAL' ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />
                        <h4 className="text-xs font-bold text-white leading-tight">{alt.title}</h4>
                      </div>
                      <span className="text-[9px] font-mono text-gray-500">{formatTime(alt.created_at)}</span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">{alt.message}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60">
                      {alt.patient_id ? (
                        <button
                          onClick={() => navigate(`/doctor/patients/${alt.patient_id}`)}
                          className="text-[10px] font-bold text-sky-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:underline"
                        >
                          View Patient Record &rarr;
                        </button>
                      ) : <span />}
                      <button
                        onClick={() => handleAcknowledgeAlert(alt.id)}
                        className="text-[10px] font-semibold text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white bg-gray-200 px-2 py-0.5 rounded transition"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Doctor Protocol Summary Card */}
          <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">Clinical Guidance Protocol</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Medical ICU parameters configured for continuous SpO2, arterial blood gas clearance, and automated NEWS2 calculation.
            </p>
            <div className="space-y-1.5 text-[11px] text-gray-500">
              <div className="flex justify-between">
                <span>Critical SpO2 Threshold:</span>
                <span className="font-mono text-rose-300 font-bold">&lt; 90%</span>
              </div>
              <div className="flex justify-between">
                <span>Severe Tachypnea:</span>
                <span className="font-mono text-amber-300 font-bold">&ge; 28 /min</span>
              </div>
              <div className="flex justify-between">
                <span>Telemetry Mode:</span>
                <span className="font-mono text-emerald-400 font-bold">12-Lead Continuous</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
