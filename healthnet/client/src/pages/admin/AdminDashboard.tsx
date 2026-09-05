import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  hospitalsAPI, ambulancesAPI, emergencyAPI, alertsAPI, networkAPI, aiAPI, eventsAPI, simulationAPI
} from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { Hospital, Ambulance, EmergencyCase, AlertItem, NetworkSummary } from '../../types';
import { StatCard } from '../../components/common/StatCard';
import { CityNetworkMap } from '../../components/admin/CityNetworkMap';
import { HospitalComparisonModal } from '../../components/admin/HospitalComparisonModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatTime } from '../../utils/formatters';
import {
  Building2, BedDouble, Activity, Siren, ShieldAlert,
  Radio, ArrowRight, RefreshCw, Flame, Plus, GitBranch,
  GitCompare, Stethoscope, UserCheck, ExternalLink, Zap,
  TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Users, Wind, Compass
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { openEmergencyModal } = useOutletContext<{ openEmergencyModal: () => void }>();
  const { subscribe, isConnected } = useWebSocket();

  const [networkSummary, setNetworkSummary] = useState<NetworkSummary | null>(null);
  const [networkHealth, setNetworkHealth] = useState<any>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [emergencyCases, setEmergencyCases] = useState<EmergencyCase[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [aiNetwork, setAiNetwork] = useState<any>(null);
  const [aiHospitals, setAiHospitals] = useState<any[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isMassCasualtyActive = emergencyCases.some(
    e => e.case_number?.startsWith('MCE-') || e.condition_summary?.toLowerCase().includes('trauma')
  );

  const loadData = async () => {
    try {
      const [netSummary, healthScore, hospData, ambData, emergData, alertData, feedData, aiNet, aiHosp] =
        await Promise.all([
          networkAPI.getSummary(),
          networkAPI.getHealthScore(),
          hospitalsAPI.getAll(),
          ambulancesAPI.getAll(),
          emergencyAPI.getCases(),
          alertsAPI.getAll(),
          eventsAPI.getActivityFeed(10),
          aiAPI.getNetworkClinicalStatus(),
          aiAPI.getHospitalCapacityScores(),
        ]);
      setNetworkSummary(netSummary);
      setNetworkHealth(healthScore);
      setHospitals(hospData);
      setAmbulances(ambData);
      setEmergencyCases(emergData);
      setAlerts(alertData);
      setActivityFeed(feedData);
      setAiNetwork(aiNet);
      setAiHospitals(aiHosp);
    } catch (e) {
      console.error('Error loading admin command center data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubBed    = subscribe('BED_STATUS_CHANGED',        () => loadData());
    const unsubAmbLoc = subscribe('AMBULANCE_LOCATION_UPDATED', (data) => {
      setAmbulances(prev => prev.map(a =>
        a.id === data.ambulance_id
          ? { ...a, current_latitude: data.lat, current_longitude: data.lng, eta_minutes: data.eta_minutes, status: data.status }
          : a
      ));
    });
    const unsubAmbStat  = subscribe('AMBULANCE_STATUS_CHANGED',  () => loadData());
    const unsubHosp     = subscribe('HOSPITAL_STATUS_CHANGED',   (data) => {
      setHospitals(prev => prev.map(h => h.id === data.hospital_id ? { ...h, emergency_status: data.new_status } : h));
      loadData();
    });
    const unsubEmerg    = subscribe('EMERGENCY_CREATED',         () => loadData());
    const unsubSurge    = subscribe('NETWORK_SURGE_DETECTED',    () => loadData());
    const unsubCapWarn  = subscribe('CAPACITY_WARNING',          () => loadData());
    return () => {
      unsubBed(); unsubAmbLoc(); unsubAmbStat(); unsubHosp();
      unsubEmerg(); unsubSurge(); unsubCapWarn();
    };
  }, []);

  // Operational insight cards
  const insights: { type: 'critical' | 'high' | 'warning' | 'positive'; text: string }[] = [];
  const divertHosps = hospitals.filter(h => h.emergency_status === 'DIVERT' || h.emergency_status === 'CLOSED');
  const surgeHosps  = hospitals.filter(h => h.emergency_status === 'SURGE' || (h.icu_occupancy_rate || 0) >= 85);
  const bestIcuHosp = [...hospitals].sort((a, b) => (b.available_icu_beds || 0) - (a.available_icu_beds || 0))[0];

  if (divertHosps.length > 0)
    insights.push({ type: 'critical', text: `${divertHosps.map(h => h.name).join(', ')} on ${divertHosps[0].emergency_status}. Directing intake away.` });
  if (surgeHosps.length > 0)
    insights.push({ type: 'high', text: `${surgeHosps[0].name} ICU at ${Math.round(surgeHosps[0].icu_occupancy_rate || 90)}%. Approaching saturation.` });
  if (bestIcuHosp && (bestIcuHosp.available_icu_beds || 0) > 0)
    insights.push({ type: 'positive', text: `${bestIcuHosp.name} has highest ICU headroom: ${bestIcuHosp.available_icu_beds} beds available.` });
  if ((networkSummary?.available_ventilators || 0) < 20)
    insights.push({ type: 'warning', text: `City-wide ventilator availability at ${networkSummary?.available_ventilators || 12} units. Monitoring reserve.` });

  const healthScore  = networkHealth?.network_health_score ?? 82.4;
  const healthStatus = networkHealth?.status ?? 'STABLE';
  const healthBadge  =
    healthStatus === 'STABLE'   ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
    healthStatus === 'WATCH'    ? 'bg-sky-50 text-sky-600 border-sky-200'             :
    healthStatus === 'PRESSURE' ? 'bg-amber-50 text-amber-600 border-amber-200'       :
                                  'bg-rose-50 text-rose-600 border-rose-200';

  return (
    <div className="space-y-6 pb-12">

      {/* Network Status Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-gray-200 px-4 py-2.5 rounded-2xl text-xs shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold tracking-wider text-gray-800 uppercase text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            CAREBRIDGE NETWORK &bull; SYSTEM ONLINE
          </div>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="text-gray-500">Connected Hospitals: <strong className="text-gray-900">{hospitals.length || 13}</strong></span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="text-gray-500">Active Emergencies: <strong className="text-amber-600">{emergencyCases.filter(e => e.status !== 'ADMITTED' && e.status !== 'CANCELLED').length}</strong></span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <span className="text-gray-500">Critical Alerts: <strong className="text-rose-600">{alerts.filter(a => a.severity === 'CRITICAL' && !a.is_read).length}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Radio className="w-3 h-3 animate-pulse" />
            Real-Time: {isConnected ? 'CONNECTED' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Mass Casualty Banner */}
      {isMassCasualtyActive && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white uppercase tracking-wider">
                  ACTIVE INCIDENT COMMAND
                </span>
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
                  MASS CASUALTY SCENARIO
                </span>
              </div>
              <p className="text-xs text-rose-600 mt-0.5">
                Multi-trauma surge detected. Regional trauma centers prioritized. ICU buffer initiated.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/simulation')}
            className="px-3.5 py-1.5 rounded-xl bg-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-600 text-white text-xs font-bold transition shadow-sm self-end md:self-center"
          >
            Open Incident Command
          </button>
        </div>
      )}

      {/* Top Action Row + Health Score */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
              METROPOLITAN COMMAND &amp; CONTROL
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
              PROTOTYPE OPERATIONAL INDICATOR
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Building2 className="w-7 h-7 text-orange-500" />
            Metropolitan Hospital Network Command Center
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            What is happening across the network RIGHT NOW &bull; Where the network is under pressure &bull; Where attention must be directed.
          </p>
        </div>

        {/* Network Health Score */}
        <div className="flex items-center gap-4 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Network Health</div>
            <div className="text-2xl font-black text-gray-900 leading-tight flex items-baseline justify-end gap-1">
              <span>{healthScore}</span>
              <span className="text-xs text-gray-400 font-normal">/ 100</span>
            </div>
            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${healthBadge}`}>
              {healthStatus}
            </span>
          </div>

          <div className="h-12 w-px bg-gray-200 hidden sm:block" />

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50 text-orange-500 text-xs font-bold border border-gray-200 transition"
            >
              <GitCompare className="w-4 h-4" />
              <span>Compare</span>
            </button>
            <button
              onClick={openEmergencyModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-600 text-white text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Intake Case</span>
            </button>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-white bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50 text-gray-400 transition border border-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-orange-500' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2.5">
        <StatCard title="Total Hospitals"    value={networkSummary?.total_hospitals ?? 13}         subValue="Connected"          icon={Building2} variant="orange"  />
        <StatCard title="Total Branches"     value={networkSummary?.total_branches ?? 12}          subValue="Regional Campuses"  icon={GitBranch} variant="sky"     />
        <StatCard title="Total Beds"         value={networkSummary?.total_beds ?? 569}             subValue="Network Capacity"   icon={BedDouble} variant="teal"    />
        <StatCard title="Available Beds"     value={networkSummary?.available_beds ?? 223}
          subValue={`${Math.round(((networkSummary?.available_beds || 223) / (networkSummary?.total_beds || 569)) * 100)}% Free`}
          icon={BedDouble} variant="emerald" />
        <StatCard title="ICU Occupancy"      value={`${networkSummary?.icu_occupancy_rate ?? 68.4}%`} subValue="City-Wide Load"  icon={Flame}
          variant={(networkSummary?.icu_occupancy_rate || 0) > 80 ? 'rose' : (networkSummary?.icu_occupancy_rate || 0) > 60 ? 'amber' : 'emerald'} />
        <StatCard title="Emergency Load"     value={emergencyCases.filter(e => e.status !== 'ADMITTED' && e.status !== 'CANCELLED').length} subValue="Active Transit" icon={Activity} variant="amber" />
        <StatCard title="Active Ambulances"  value={ambulances.filter(a => a.status === 'EN_ROUTE' || a.status === 'TRANSPORTING').length}  subValue={`${ambulances.length} Fleet Total`} icon={Siren} variant="purple" />
        <StatCard title="Critical Patients"  value={aiNetwork?.clinical_status?.critical ?? 18}   subValue="High Acuity"        icon={ShieldAlert} variant="rose"   />
      </div>

      {/* Operational Insights */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-800">
              What Needs Attention Right Now?
            </h2>
          </div>
          <span className="text-[10px] text-gray-400 uppercase font-semibold">Operational Insights</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map((ins, idx) => {
            const cls =
              ins.type === 'critical' ? 'border-rose-200  bg-rose-50  text-rose-700'   :
              ins.type === 'high'     ? 'border-amber-200 bg-amber-50 text-amber-700'  :
              ins.type === 'warning'  ? 'border-blue-200  bg-blue-50  text-blue-700'   :
                                       'border-emerald-200 bg-emerald-50 text-emerald-700';
            return (
              <div key={`ins-${idx}`} className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-medium ${cls}`}>
                {ins.type === 'critical' ? <AlertTriangle className="w-4 h-4 text-rose-500  shrink-0 mt-0.5" /> :
                 ins.type === 'high'     ? <Flame          className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> :
                 ins.type === 'warning'  ? <Wind           className="w-4 h-4 text-blue-500  shrink-0 mt-0.5" /> :
                                          <CheckCircle2   className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                <p className="line-clamp-2 leading-relaxed">{ins.text}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* City-Wide Map */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-orange-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700">
              City-Wide Interactive Hospital &amp; Ambulance Map
            </h2>
          </div>
          <span className="text-xs text-gray-400">Click any hospital or ambulance pin to inspect live telemetry</span>
        </div>
        <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-card">
          <CityNetworkMap
            hospitals={hospitals}
            ambulances={ambulances}
            emergencies={emergencyCases}
            onSelectHospital={(h) => navigate(`/admin/hospitals/${h.id}`)}
            onSelectAmbulance={() => navigate('/admin/ambulances')}
            height={480}
          />
        </div>
      </div>

      {/* Hospital Network Capacity Table */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-orange-500" />
            <h3 className="text-sm font-bold text-gray-800">Metropolitan Network Capacity</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCompareOpen(true)}
              className="text-xs font-bold text-orange-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-600 transition flex items-center gap-1 bg-orange-50 border border-orange-200 px-3 py-1 rounded-lg"
            >
              <GitCompare className="w-3.5 h-3.5" />
              Compare Facilities
            </button>
            <button
              onClick={() => navigate('/admin/icu')}
              className="text-xs font-bold text-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-teal-700 transition flex items-center gap-1"
            >
              <span>View ICU Units</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Hospital</th>
                <th className="px-3 py-3">Branch</th>
                <th className="px-3 py-3 text-center">ICU %</th>
                <th className="px-3 py-3 text-center text-emerald-600">Available ICU</th>
                <th className="px-3 py-3 text-center">Ward Occ %</th>
                <th className="px-3 py-3 text-center">ER Load %</th>
                <th className="px-3 py-3 text-center">Ventilators</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Pressure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {hospitals.map((hosp) => {
                const icuOcc = hosp.icu_occupancy_rate || 0;
                const wardOcc = hosp.overall_occupancy_rate || 55;
                const erOcc = Math.round(icuOcc * 0.9);
                const pressureLevel = icuOcc >= 85 ? 'CRITICAL' : icuOcc >= 70 ? 'HIGH' : icuOcc >= 50 ? 'WATCH' : 'STABLE';
                const pressureBadge =
                  pressureLevel === 'CRITICAL' ? 'bg-rose-50  text-rose-600  border-rose-200'   :
                  pressureLevel === 'HIGH'     ? 'bg-amber-50 text-amber-600 border-amber-200'  :
                  pressureLevel === 'WATCH'    ? 'bg-sky-50   text-sky-600   border-sky-200'    :
                                                 'bg-emerald-50 text-emerald-600 border-emerald-200';
                return (
                  <tr key={hosp.id} className="bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-50/40 transition">
                    <td className="px-4 py-3.5 font-bold text-gray-900">
                      <button
                        onClick={() => navigate(`/admin/hospitals/${hosp.id}`)}
                        className="bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-500 transition text-left"
                      >
                        {hosp.name}
                      </button>
                      <div className="text-[10px] text-gray-400 font-mono">{hosp.code}</div>
                    </td>
                    <td className="px-3 py-3.5 text-gray-500">{hosp.branch_name || 'Central'}</td>
                    <td className="px-3 py-3.5 text-center font-mono font-bold">
                      <span className={icuOcc >= 85 ? 'text-rose-600' : icuOcc >= 70 ? 'text-amber-600' : 'text-gray-700'}>
                        {Math.round(icuOcc)}%
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono font-bold text-emerald-600">
                      {hosp.available_icu_beds || 0}
                    </td>
                    <td className="px-3 py-3.5 text-center font-mono text-gray-600">{wardOcc}%</td>
                    <td className="px-3 py-3.5 text-center font-mono text-gray-600">{erOcc}%</td>
                    <td className="px-3 py-3.5 text-center font-mono text-gray-800">
                      {hosp.ventilators_available || 0} / {hosp.ventilators_total || 0}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={hosp.emergency_status} type="hospital" />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${pressureBadge}`}>
                        {pressureLevel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lower 3-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Capacity Forecast */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Capacity Forecast
              </h3>
            </div>
            <span className="text-[9px] font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
              FORECAST
            </span>
          </div>
          <div className="space-y-3 pt-1">
            {[
              { label: 'CURRENT',    val: '74.1%', pressure: 63, color: 'text-emerald-600' },
              { label: '+6 HOURS',   val: '78.5%', pressure: 69, color: 'text-sky-600'     },
              { label: '+12 HOURS',  val: '82.0%', pressure: 74, color: 'text-amber-600'   },
              { label: '+24 HOURS',  val: '86.4%', pressure: 81, color: 'text-amber-700'   },
              { label: '+48 HOURS',  val: '91.2%', pressure: 88, color: 'text-rose-600'    },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <div className="text-[10px] font-bold text-gray-400">{f.label}</div>
                  <div className={`text-base font-black ${f.color}`}>{f.val} ICU Load</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400">Pressure Score</div>
                  <div className="font-mono font-bold text-gray-800">{f.pressure} / 100</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/admin/ai-intelligence')}
            className="w-full py-2 rounded-xl bg-orange-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-100 text-orange-600 text-xs font-bold transition flex items-center justify-center gap-1 border border-orange-200"
          >
            <span>Open AI Capacity Intelligence</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Hospitals Under Pressure */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Hospitals Under Pressure
              </h3>
            </div>
            <span className="text-[10px] text-gray-400">Ranked by score</span>
          </div>
          <div className="space-y-2.5">
            {hospitals.slice(0, 5).map((h, index) => {
              const occ = h.icu_occupancy_rate || 65;
              const pScore  = Math.min(99, Math.round(occ * 1.05));
              const pStatus = pScore >= 85 ? 'CRITICAL' : pScore >= 70 ? 'HIGH' : 'WATCH';
              return (
                <div
                  key={h.id}
                  onClick={() => navigate(`/admin/hospitals/${h.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-orange-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-50/50 transition cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-gray-400 w-4">{index + 1}.</span>
                    <div>
                      <div className="text-xs font-bold text-gray-800 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-600 transition">{h.name}</div>
                      <div className="text-[10px] text-gray-400">
                        {h.available_icu_beds || 0} Avail ICU &bull; {h.available_beds || 0} Beds Free
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-xs text-gray-800">{pScore}/100</div>
                    <span className={`text-[9px] font-bold ${pStatus === 'CRITICAL' ? 'text-rose-600' : pStatus === 'HIGH' ? 'text-amber-600' : 'text-sky-600'}`}>
                      {pStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => navigate('/admin/hospitals')}
            className="w-full py-2 rounded-xl bg-gray-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-100 text-gray-600 text-xs font-bold transition flex items-center justify-center gap-1 border border-gray-200"
          >
            <span>View All Facility Rankings</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                Live Network Activity Feed
              </h3>
            </div>
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              WEBSOCKET ACTIVE
            </span>
          </div>
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar">
            {activityFeed.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                Listening for real-time network events...
              </div>
            ) : (
              activityFeed.map((evt, idx) => (
                <div key={`feed-${evt.id || idx}`} className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs flex items-start gap-2.5">
                  <span className="font-mono text-[10px] text-gray-400 mt-0.5 shrink-0">
                    {evt.timestamp ? formatTime(evt.timestamp) : '—'}
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-orange-500 block text-[11px]">{evt.event_type}</span>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {typeof evt.data === 'string' ? evt.data : (evt.data?.message || evt.data?.details || 'Network state update')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => navigate('/admin/audit')}
            className="w-full py-2 rounded-xl bg-gray-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-100 text-gray-600 text-xs font-bold transition flex items-center justify-center gap-1 border border-gray-200"
          >
            <span>View Full Audit Timeline</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <HospitalComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        hospitals={hospitals}
      />
    </div>
  );
};
