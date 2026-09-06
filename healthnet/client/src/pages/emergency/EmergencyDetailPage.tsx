import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { emergencyAPI, ambulancesAPI } from '../../services/api';
import { EmergencyCaseDetail } from '../../types';
import { EmergencyMap } from '../../components/emergency/EmergencyMap';
import { formatTime, formatDate } from '../../utils/formatters';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  Siren, ShieldAlert, Sparkles, Building2, BedDouble, ChevronRight,
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, MapPin, HeartPulse,
  Wind, Stethoscope, Activity, Radio, RefreshCw, Check, ArrowRight,
  FastForward, Navigation, CheckSquare, Bell, FileText
} from 'lucide-react';

export const EmergencyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const caseId = Number(id) || 1;
  const navigate = useNavigate();
  const { subscribe } = useWebSocket();

  const [emergencyCase, setEmergencyCase] = useState<EmergencyCaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchEmergencyData = async () => {
    try {
      const data = await emergencyAPI.getById(caseId);
      setEmergencyCase(data);
    } catch (e) {
      console.error('Error fetching emergency detail:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();
    const unsubAmb = subscribe('AMBULANCE_STATUS_UPDATED', () => fetchEmergencyData());
    const unsubArr = subscribe('AMBULANCE_ARRIVED', () => fetchEmergencyData());
    const unsubBed = subscribe('BED_STATUS_CHANGED', () => fetchEmergencyData());
    return () => {
      unsubAmb();
      unsubArr();
      unsubBed();
    };
  }, [caseId]);

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // 1. ADVANCE SIMULATED MOVEMENT
  const handleStepSimulation = async () => {
    if (!emergencyCase?.assigned_ambulance_id) return;
    setActionLoading(true);
    try {
      await ambulancesAPI.stepSimulation(emergencyCase.assigned_ambulance_id);
      showToast('Simulated ambulance moved closer to receiving hospital (-2m ETA).');
      fetchEmergencyData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. TRIGGER ARRIVAL
  const handleTriggerArrival = async () => {
    if (!emergencyCase?.assigned_ambulance_id) return;
    setActionLoading(true);
    try {
      await ambulancesAPI.triggerArrival(emergencyCase.assigned_ambulance_id);
      showToast('Ambulance reached hospital emergency bay (Status: ARRIVED).');
      fetchEmergencyData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. CONFIRM PATIENT RECEIVED & ADMIT
  const handleConfirmPatientReceived = async () => {
    setActionLoading(true);
    try {
      await emergencyAPI.confirmPatientReceived(caseId);
      showToast(`Patient admitted! Bed ${emergencyCase?.assigned_bed_code || 'ICU'} is now OCCUPIED.`);
      fetchEmergencyData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. RETURN AMBULANCE TO AVAILABLE
  const handleReturnAmbulance = async () => {
    if (!emergencyCase?.assigned_ambulance_id) return;
    setActionLoading(true);
    try {
      await ambulancesAPI.returnAmbulance(emergencyCase.assigned_ambulance_id);
      showToast('Ambulance returned to fleet (Status: AVAILABLE).');
      fetchEmergencyData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading || !emergencyCase) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 text-rose-400 animate-spin" />
          <p className="text-xs text-gray-500">Loading Emergency Mission Control...</p>
        </div>
      </div>
    );
  }

  const amb = emergencyCase.assigned_ambulance;
  const bestMatch = emergencyCase.matches.find(m => m.hospital_id === emergencyCase.assigned_hospital_id) || emergencyCase.matches[0];

  // Progression Stages
  const stages = [
    { key: 'SEARCHING', label: 'Emergency Created' },
    { key: 'HOSPITAL_SELECTED', label: 'Hospital Matched' },
    { key: 'BED_RESERVED', label: 'Bed Locked' },
    { key: 'EN_ROUTE', label: 'Ambulance En Route' },
    { key: 'ARRIVED', label: 'Hospital Arrival' },
    { key: 'PATIENT_RECEIVED', label: 'Patient Admitted' }
  ];

  const getStageIndex = (st: string) => {
    if (st === 'SEARCHING') return 0;
    if (st === 'HOSPITAL_SELECTED') return 1;
    if (st === 'BED_RESERVED') return 2;
    if (st === 'AMBULANCE_ASSIGNED' || st === 'EN_ROUTE') return 3;
    if (st === 'ARRIVED') return 4;
    if (st === 'PATIENT_RECEIVED' || st === 'COMPLETED') return 5;
    return 0;
  };

  const currentStageIdx = getStageIndex(emergencyCase.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast */}
      {successMsg && (
        <div className="fixed top-20 right-8 z-50 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-xs font-bold text-emerald-200 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/emergency')}
            className="p-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-600 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-rose-400 bg-rose-950/80 border border-rose-500/30 px-2.5 py-0.5 rounded">
                {emergencyCase.case_number}
              </span>
              <h1 className="text-xl font-black text-gray-900">{emergencyCase.patient_name}</h1>
              <span className="text-xs text-gray-500">
                {emergencyCase.patient_age}y &bull; {emergencyCase.patient_gender} &bull; {emergencyCase.emergency_type}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Pickup: <span className="text-gray-600 font-medium">{emergencyCase.pickup_address}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
            emergencyCase.status === 'PATIENT_RECEIVED' || emergencyCase.status === 'COMPLETED'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : emergencyCase.status === 'ARRIVED'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
          }`}>
            ● {emergencyCase.status}
          </span>
          <button
            onClick={() => { setIsLoading(true); fetchEmergencyData(); }}
            className="flex items-center gap-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Progress Timeline Step Bar */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-4 shadow-xl backdrop-blur-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {stages.map((stg, i) => {
            const isCompleted = currentStageIdx > i;
            const isCurrent = currentStageIdx === i;

            return (
              <div
                key={stg.key}
                className={`p-2.5 rounded-xl border text-center transition space-y-1 ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : isCurrent
                    ? 'bg-rose-950/40 border-rose-500 text-rose-200 ring-2 ring-rose-500/20'
                    : 'bg-gray-50/40 border-gray-200 text-gray-400'
                }`}
              >
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono font-bold uppercase">
                  {isCompleted ? <Check className="h-3 w-3 text-emerald-400" /> : <span>{i + 1}.</span>}
                  <span>{stg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Mission Tracking & Live Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Simulated GPS Map, Ambulance Telemetry & Vitals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Map Component */}
          <EmergencyMap
            pickupLat={emergencyCase.pickup_lat}
            pickupLng={emergencyCase.pickup_lng}
            pickupAddress={emergencyCase.pickup_address}
            selectedHospital={bestMatch}
            assignedAmbulance={amb}
            height={340}
            showRoute={true}
          />

          {/* Assigned Ambulance Telemetry Panel */}
          {amb && (
            <div className="rounded-2xl border border-sky-500/30 bg-gray-100/80 p-5 space-y-4 shadow-xl backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
                    <Siren className="h-6 w-6 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Assigned Transit Unit</span>
                    <h3 className="text-base font-black text-white">{amb.code} &bull; {amb.vehicle_number}</h3>
                    <span className="text-xs text-gray-500">Paramedic: <strong className="text-gray-700">{amb.paramedic_name}</strong> &bull; Driver: {amb.driver_name}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-3xl font-black text-sky-400 font-mono block">
                    {amb.eta_minutes} <small className="text-xs text-gray-500">MIN</small>
                  </span>
                  <span className="text-[10px] font-bold text-sky-300 bg-sky-950 px-2 py-0.5 rounded uppercase border border-sky-500/30">
                    {amb.status}
                  </span>
                </div>
              </div>

              {/* Simulation Controls Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-gray-600">
                    Speed: <strong className="font-mono text-white">{amb.speed_kmh} km/h</strong> &bull; Destination: <strong className="text-white">{emergencyCase.assigned_hospital_name}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {amb.status !== 'ARRIVED' && emergencyCase.status !== 'PATIENT_RECEIVED' && (
                    <>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleStepSimulation}
                        className="flex items-center gap-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 px-3 py-1.5 text-xs font-bold text-sky-300 transition"
                      >
                        <FastForward className="h-3.5 w-3.5" />
                        <span>Step Movement (-2m)</span>
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={handleTriggerArrival}
                        className="flex items-center gap-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-300 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Trigger Arrival</span>
                      </button>
                    </>
                  )}

                  {emergencyCase.status === 'PATIENT_RECEIVED' && amb.status !== 'AVAILABLE' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleReturnAmbulance}
                      className="flex items-center gap-1.5 rounded-xl bg-gray-200 hover:bg-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 transition border border-gray-300"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Return to Fleet</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Patient Baseline Vitals & Condition */}
          <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-5 space-y-3 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <HeartPulse className="h-4 w-4 text-rose-400" />
                <span>Emergency Intake Clinical Vitals</span>
              </span>
              <span className="text-[10px] font-mono text-gray-500">Baseline Triage Telemetry</span>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50/60 p-3 rounded-xl border border-gray-200">
              <strong className="text-white">Condition: </strong>{emergencyCase.condition_summary}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Heart Rate</span>
                <span className="font-mono text-sm font-black text-rose-400">{emergencyCase.vitals_heart_rate} bpm</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Blood Pressure</span>
                <span className="font-mono text-sm font-black text-white">{emergencyCase.vitals_systolic_bp}/{emergencyCase.vitals_diastolic_bp}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">SpO2 Oxygen</span>
                <span className="font-mono text-sm font-black text-sky-400">{emergencyCase.vitals_spo2}%</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Respiration</span>
                <span className="font-mono text-sm font-black text-white">{emergencyCase.vitals_respiratory_rate}/min</span>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <span className="text-[9px] text-gray-400 uppercase font-bold block">Temperature</span>
                <span className="font-mono text-sm font-black text-white">{emergencyCase.vitals_temperature}&deg;C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Receiving Hospital, Bed Locking & Clinical Handoff */}
        <div className="space-y-6">
          {/* Target Facility & Bed Card */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <span>Receiving Facility</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded">
                Score {emergencyCase.suitability_score}%
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-white">{emergencyCase.assigned_hospital_name || 'Hospital Selected'}</h3>
              <p className="text-xs text-gray-500">{bestMatch?.address || 'Downtown Campus'}</p>
            </div>

            {/* Reserved Bed Status */}
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-teal-500/30 space-y-1">
              <span className="text-[10px] font-bold text-teal-400 uppercase block">Locked Inpatient Bed</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-base font-black text-white">{emergencyCase.assigned_bed_code || 'Bed Assigned'}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                  emergencyCase.status === 'PATIENT_RECEIVED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                }`}>
                  {emergencyCase.status === 'PATIENT_RECEIVED' ? 'OCCUPIED' : 'RESERVED'}
                </span>
              </div>
            </div>

            {/* Handoff Confirmation Button */}
            {emergencyCase.status !== 'PATIENT_RECEIVED' && emergencyCase.status !== 'COMPLETED' ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmPatientReceived}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-black text-white transition shadow-lg shadow-emerald-600/30"
              >
                <CheckSquare className="h-4 w-4" />
                <span>CONFIRM PATIENT RECEIVED & ADMIT</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-center space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 mx-auto" />
                <span className="text-xs font-bold text-emerald-200 block">Patient Successfully Received & Admitted</span>
                <p className="text-[10px] text-gray-500">Bed transitioned to OCCUPIED. Hospital capacity updated.</p>
              </div>
            )}
          </div>

          {/* Audit Timeline */}
          <div className="rounded-2xl border border-gray-200 bg-gray-100/60 p-5 space-y-3 shadow-xl backdrop-blur-sm">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-sky-400" />
              <span>Mission Event Log</span>
            </span>

            <div className="relative pl-4 border-l border-gray-200 space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {emergencyCase.timeline_events.map((evt) => (
                <div key={evt.id} className="relative group text-xs space-y-0.5">
                  <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-sky-400 border-2 border-slate-900" />
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white leading-tight">{evt.title}</span>
                    <span className="text-[9px] font-mono text-gray-400">{formatTime(evt.timestamp)}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{evt.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
