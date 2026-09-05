import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { simulationAPI, patientsAPI, ambulancesAPI } from '../../services/api';
import {
  Activity, Play, Square, RotateCcw, AlertTriangle, Truck,
  HeartPulse, Zap, ShieldAlert, CheckCircle, Sliders, Radio, Sparkles
} from 'lucide-react';

export const SimulationControlPage: React.FC = () => {
  const { isConnected, connectionState, subscribe } = useWebSocket();

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>('DETERIORATING');
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [selectedAmbulanceId, setSelectedAmbulanceId] = useState<number | null>(null);

  const [simulationStatus, setSimulationStatus] = useState<any>({
    is_running: false,
    active_patient_simulations: {},
    active_ambulance_simulations: {}
  });

  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Subscribe to all incoming real-time events on the bus
    const unsub = subscribe('*', (payload) => {
      setLiveEvents(prev => [
        {
          id: Date.now() + Math.random(),
          timestamp: new Date().toLocaleTimeString(),
          event: payload.event || payload.type || 'SYSTEM_EVENT',
          data: payload.data || payload
        },
        ...prev.slice(0, 24)
      ]);
    });

    return () => {
      unsub();
    };
  }, []);

  const loadData = async () => {
    try {
      const [pts, ambs, stat] = await Promise.all([
        patientsAPI.getAll(),
        ambulancesAPI.getAll(),
        simulationAPI.getStatus()
      ]);
      setPatients(pts || []);
      if (pts && pts.length > 0 && !selectedPatientId) {
        setSelectedPatientId(pts[0].id);
      }
      setAmbulances(ambs || []);
      if (ambs && ambs.length > 0 && !selectedAmbulanceId) {
        setSelectedAmbulanceId(ambs[0].id);
      }
      setSimulationStatus(stat || {});
    } catch (e) {
      console.warn('Failed to load simulation controls data', e);
    }
  };

  const handleStartPatientSim = async () => {
    if (!selectedPatientId) return;
    try {
      const res = await simulationAPI.startPatientSim(selectedPatientId, selectedProfile);
      setActionMessage(`Patient #${selectedPatientId} simulation started with profile: ${selectedProfile}`);
      await loadData();
    } catch (e: any) {
      setActionMessage(`Error starting patient simulation: ${e.message || e}`);
    }
  };

  const handleStopPatientSim = async (pId?: number) => {
    const targetId = pId || selectedPatientId;
    if (!targetId) return;
    try {
      await simulationAPI.stopPatientSim(targetId);
      setActionMessage(`Patient #${targetId} simulation stopped.`);
      await loadData();
    } catch (e: any) {
      setActionMessage(`Error stopping patient simulation: ${e.message || e}`);
    }
  };

  const handleStartFullDemo = async () => {
    setDemoRunning(true);
    setDemoResult(null);
    setActionMessage("Executing Full 17-Step Emergency & Telemetry Demo...");
    try {
      const res = await simulationAPI.startEmergencyDemo();
      setDemoResult(res);
      setActionMessage("✓ Full Emergency Demo executed! Emergency registered, bed reserved, ambulance dispatched.");
      await loadData();
    } catch (e: any) {
      setActionMessage(`Demo execution error: ${e.message || e}`);
    } finally {
      setDemoRunning(false);
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Are you sure you want to reset simulation states, restore beds and ambulances?")) return;
    setActionMessage("Resetting system state...");
    try {
      const res = await simulationAPI.resetDemo();
      setActionMessage("✓ System demo state restored cleanly to baseline.");
      setDemoResult(null);
      await loadData();
    } catch (e: any) {
      setActionMessage(`Reset error: ${e.message || e}`);
    }
  };

  const activeSimCount = Object.keys(simulationStatus.active_patient_simulations || {}).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gray-100/90 border border-gray-200 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
              <Sliders className="h-6 w-6 text-teal-400" />
              Real-Time Simulation Control Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/30">
              DEMO ENVIRONMENT • SIMULATED DATA
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Hackathon demonstration orchestrator: drive vital deterioration profiles, ambulance telemetry, and full-chain automated scenarios over WebSockets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartFullDemo}
            disabled={demoRunning}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:from-teal-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:to-cyan-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-teal-900/30 transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {demoRunning ? "Running Demo..." : "Start Full Emergency Demo"}
          </button>

          <button
            onClick={handleResetDemo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 text-gray-700 border border-gray-300 text-xs font-bold uppercase tracking-wider transition active:scale-95"
          >
            <RotateCcw className="h-4 w-4 text-amber-400" />
            Reset Demo State
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center justify-between p-3.5 bg-gray-200/80 border border-gray-300 rounded-xl text-xs text-gray-700 animate-fadeIn">
          <div className="flex items-center gap-2 font-mono">
            <Radio className="h-4 w-4 text-teal-400 animate-pulse" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white text-xs">Dismiss</button>
        </div>
      )}

      {/* Grid: 3 Interactive Pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pillar 1: Patient Vitals Degradation Simulator */}
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="h-4 w-4 text-rose-400" />
                Patient Vitals Simulator
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                AI RISK PROTOTYPE
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Stream realistic physiological vital signs to assigned Doctor and Nurse panels without page reloads.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">Target Patient</label>
                <select
                  value={selectedPatientId || ''}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn}) — Bed: {p.bed_code || 'ICU'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">Physiological Scenario Profile</label>
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  <option value="DETERIORATING">🔴 DETERIORATING (SpO2 drops, HR & RR climb &rarr; Critical Alert)</option>
                  <option value="RECOVERING">🟢 RECOVERING (SpO2 rises, HR stabilizes)</option>
                  <option value="HIGH_RISK">🟡 HIGH_RISK (Erratic fluctuations, unstable)</option>
                  <option value="STABLE">🔵 STABLE (Normal physiological baseline)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                onClick={handleStartPatientSim}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition active:scale-95 shadow-md shadow-rose-950/40"
              >
                <Play className="h-3.5 w-3.5" />
                Start Simulation
              </button>

              <button
                onClick={() => handleStopPatientSim()}
                className="px-4 py-2.5 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 text-gray-600 text-xs font-bold uppercase tracking-wider transition active:scale-95"
              >
                <Square className="h-3.5 w-3.5 text-rose-400" />
                Stop
              </button>
            </div>

            {activeSimCount > 0 && (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="text-[11px] font-bold text-teal-400 mb-1 flex items-center gap-1.5">
                  <Radio className="h-3 w-3 animate-ping" />
                  Active Vitals Streams ({activeSimCount})
                </div>
                {Object.entries(simulationStatus.active_patient_simulations || {}).map(([pId, sim]: [string, any]) => (
                  <div key={pId} className="flex items-center justify-between text-xs text-gray-600 py-1">
                    <span>Patient #{pId}: <strong className="text-amber-400">{sim.profile}</strong></span>
                    <button
                      onClick={() => handleStopPatientSim(Number(pId))}
                      className="text-[10px] text-rose-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-rose-300 underline"
                    >
                      Halt
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pillar 2: Ambulance Fleet GPS Transit Stepper */}
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Truck className="h-4 w-4 text-cyan-400" />
                Ambulance Movement Simulator
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                SIMULATED GPS & ETA
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Simulate real-time GPS telemetry, stepping coordinates and decrementing transit ETA countdown towards hospital bays.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">Select Transit Unit</label>
                <select
                  value={selectedAmbulanceId || ''}
                  onChange={(e) => setSelectedAmbulanceId(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-teal-500"
                >
                  {ambulances.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.code} ({a.vehicle_number}) — Status: {a.status} (ETA: {a.eta_minutes || 0}m)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={async () => {
                if (!selectedAmbulanceId) return;
                try {
                  await ambulancesAPI.stepSimulation(selectedAmbulanceId);
                  setActionMessage(`Ambulance #${selectedAmbulanceId} position stepped closer (-2 min ETA).`);
                  await loadData();
                } catch (e: any) {
                  setActionMessage(`Step error: ${e.message || e}`);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-cyan-500 text-white text-xs font-bold uppercase tracking-wider transition active:scale-95 shadow-md shadow-cyan-950/40"
            >
              Step Movement (-2m ETA)
            </button>

            <button
              onClick={async () => {
                if (!selectedAmbulanceId) return;
                try {
                  await ambulancesAPI.arrive(selectedAmbulanceId);
                  setActionMessage(`Ambulance #${selectedAmbulanceId} marked as ARRIVED at hospital bay.`);
                  await loadData();
                } catch (e: any) {
                  setActionMessage(`Arrival error: ${e.message || e}`);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 text-emerald-300 border border-gray-300 text-xs font-bold uppercase tracking-wider transition active:scale-95"
            >
              Trigger Immediate Arrival (ETA 0m)
            </button>
          </div>
        </div>

        {/* Pillar 3: Full Scenario Runner & Status */}
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-teal-400" />
                Automated 17-Step Hackathon Demo
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                1-CLICK RUNNER
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              Executes the complete end-to-end lifecycle across all connected panels:
            </p>

            <div className="space-y-1.5 text-[11px] text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4">
              <div>1. Emergency Intake Registered</div>
              <div>2. 5-Pillar Hospital Routing Ranked</div>
              <div>3. ICU Bed Locked (AVAILABLE &rarr; RESERVED)</div>
              <div>4. Ambulance Dispatched with GPS & ETA</div>
              <div>5. Receiving Nurse Prepares Bed</div>
              <div>6. Inpatient Handover Confirmed (OCCUPIED)</div>
              <div>7. Telemetry Degradation Triggers AI Risk & Alert</div>
            </div>

            {demoResult && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                  {demoResult.message}
                </div>
                <div className="text-[11px] text-emerald-400/80">
                  Case: {demoResult.case_number} | Bed: {demoResult.assigned_bed} | Ambulance: {demoResult.assigned_ambulance}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleStartFullDemo}
            disabled={demoRunning}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:opacity-90 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-teal-950/40 transition active:scale-95 disabled:opacity-50"
          >
            {demoRunning ? "Executing..." : "Start Full Emergency Demo"}
          </button>
        </div>
      </div>

      {/* 28. Network Simulation Scenarios Center (Phase 8 Section 28) */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Metropolitan Network Simulation Scenarios
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Trigger operational stress-testing scenarios to evaluate systemic response, capacity re-routing, and automated alerting.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 self-start sm:self-auto">
            PROTOTYPE ORCHESTRATION
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'NORMAL_OPERATION',
              title: 'Normal Operation',
              badge: 'BASELINE',
              desc: 'Restores all hospitals to NORMAL, clears surge beds, and sets ambulances to available.',
              color: 'text-emerald-400 border-emerald-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-emerald-950/20'
            },
            {
              id: 'ICU_SURGE',
              title: 'ICU Saturation Surge',
              badge: 'CAPACITY',
              desc: 'Simulates acute ICU admissions. Spikes occupancy >85%, locking available ICU beds and firing alarms.',
              color: 'text-rose-400 border-rose-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-950/20'
            },
            {
              id: 'EMERGENCY_SURGE',
              title: 'Emergency Surge',
              badge: 'DISPATCH',
              desc: 'Spikes ER intake volume, dispatching ambulances and elevating hospital emergency load scores.',
              color: 'text-amber-400 border-amber-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-amber-950/20'
            },
            {
              id: 'VENTILATOR_SHORTAGE',
              title: 'Ventilator Shortage',
              badge: 'RESOURCES',
              desc: 'Drops ventilator reserves below city-wide safety thresholds, triggering mutual-aid equipment alerts.',
              color: 'text-indigo-400 border-indigo-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-indigo-950/20'
            },
            {
              id: 'AMBULANCE_SURGE',
              title: 'Ambulance Fleet Surge',
              badge: 'FLEET',
              desc: 'Puts available ambulances in transit, depleting street-level EMS readiness.',
              color: 'text-cyan-400 border-cyan-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-cyan-950/20'
            },
            {
              id: 'MASS_CASUALTY',
              title: 'Mass Casualty Disaster',
              badge: 'DISASTER',
              desc: 'Injects 12 concurrent multi-trauma casualties, activating city incident command and diversion routing.',
              color: 'text-rose-500 border-rose-500/40 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-rose-950/30'
            },
            {
              id: 'HOSPITAL_DIVERT',
              title: 'Hospital Divert Status',
              badge: 'ROUTING',
              desc: 'Places primary hospital on DIVERT. Emergency routing algorithm bypasses facility for incoming cases.',
              color: 'text-amber-400 border-amber-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-amber-950/20'
            },
            {
              id: 'HOSPITAL_CLOSURE',
              title: 'Hospital Closure',
              badge: 'SAFETY',
              desc: 'Sets hospital to CLOSED due to simulated power/infrastructure failure.',
              color: 'text-gray-500 border-slate-500/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-50/20'
            }
          ].map((scen) => (
            <div
              key={scen.id}
              className={`p-4 rounded-xl bg-gray-50 border transition-all flex flex-col justify-between ${scen.color}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-white">{scen.title}</h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-200 text-gray-600">
                    {scen.badge}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
                  {scen.desc}
                </p>
              </div>

              <button
                onClick={async () => {
                  try {
                    const res = await simulationAPI.triggerScenario(scen.id);
                    setActionMessage(res.message || `Scenario ${scen.title} triggered.`);
                    await loadData();
                  } catch (e: any) {
                    setActionMessage(`Scenario error: ${e.message || e}`);
                  }
                }}
                className="w-full py-2 rounded-lg bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300 text-white text-xs font-bold transition active:scale-95 border border-gray-300"
              >
                Execute Scenario
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 29 & 30. MASS CASUALTY COMMAND VIEW (Phase 8 Section 29 & 30) */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-rose-500" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Mass Casualty Command & Casualty Distribution View
            </h2>
          </div>
          <span className="text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
            INCIDENT COMMAND MODE
          </span>
        </div>

        {/* Casualty Triage KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Incoming Casualties</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">12</div>
            <div className="text-[9px] text-gray-400">Trauma Level 1 & 2</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Available ICU Beds</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">18</div>
            <div className="text-[9px] text-gray-400">Across 13 hospitals</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Available ER Beds</div>
            <div className="text-xl font-bold text-sky-400 mt-0.5">34</div>
            <div className="text-[9px] text-gray-400">Immediate bays</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Ambulances Dispatched</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">8</div>
            <div className="text-[9px] text-gray-400">On transit grid</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Capacity Pressure</div>
            <div className="text-xl font-bold text-rose-400 mt-0.5">88.4 / 100</div>
            <div className="text-[9px] text-gray-400">SURGE ELEVATED</div>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-center">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Incident Status</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">SURGE</div>
            <div className="text-[9px] text-gray-400">Mutual Aid Active</div>
          </div>
        </div>

        {/* 30. Network Hospital Distribution (Green / Orange / Red) */}
        <div>
          <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
            Hospital Casualty Reception Allocation (Capacity Triaged)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: 'CityCare Central', incoming: 4, status: 'AVAILABLE CAPACITY', color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' },
              { name: 'MetroCare Regional', incoming: 3, status: 'UNDER PRESSURE', color: 'border-amber-500/40 bg-amber-950/20 text-amber-400' },
              { name: 'NorthStar Health', incoming: 0, status: 'CRITICAL / SATURATED', color: 'border-rose-500/40 bg-rose-950/20 text-rose-400' },
              { name: 'Sunrise Medical Hub', incoming: 5, status: 'AVAILABLE CAPACITY', color: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-400' }
            ].map((h, i) => (
              <div key={i} className={`p-3.5 rounded-xl border flex flex-col justify-between ${h.color}`}>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-white text-xs">{h.name}</span>
                    <span className="text-xs font-mono font-black">{h.incoming} Incoming</span>
                  </div>
                  <div className="text-[10px] font-semibold">{h.status}</div>
                </div>
                <div className="text-[9px] text-gray-500 mt-3 pt-2 border-t border-gray-200/60">
                  Visualization only • Emergency routing handles dispatch
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time WebSocket Event Stream Monitor */}
      <div className="bg-gray-100 border border-gray-200 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Radio className="h-4 w-4 text-teal-400" />
              Live WebSocket Event Bus Stream
            </h2>
            <span className="text-[11px] text-gray-500">
              Connection: <strong className="text-emerald-400 font-mono">{connectionState}</strong>
            </span>
          </div>

          <button
            onClick={() => setLiveEvents([])}
            className="text-xs text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-white"
          >
            Clear Stream
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs">
          {liveEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-400 italic">
              Awaiting real-time WebSocket events on city network bus...
            </div>
          ) : (
            liveEvents.map((item) => (
              <div key={item.id} className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-[10px]">{item.timestamp}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {item.event}
                  </span>
                  <span className="text-gray-600 text-xs truncate max-w-xl">
                    {typeof item.data === 'object' ? JSON.stringify(item.data) : String(item.data)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
