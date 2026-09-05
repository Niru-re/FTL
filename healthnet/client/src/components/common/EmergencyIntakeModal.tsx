import React, { useState } from 'react';
import { emergencyAPI } from '../../services/api';
import { HospitalRanking } from '../../types';
import { StatusBadge } from './StatusBadge';
import {
  X, Siren, Sparkles, Check, AlertCircle, Building2,
  Ambulance as AmbulanceIcon, BedDouble, Wind, Stethoscope,
  ArrowRight, ShieldCheck, Clock, MapPin, CheckCircle2, ChevronRight
} from 'lucide-react';

interface EmergencyIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EmergencyIntakeModal: React.FC<EmergencyIntakeModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isReserving, setIsReserving] = useState(false);

  // Step 1: Intake State
  const [patientName, setPatientName] = useState('Jonathan Mercer');
  const [patientAge, setPatientAge] = useState(58);
  const [patientGender, setPatientGender] = useState('Male');
  const [conditionSummary, setConditionSummary] = useState('Acute crushing chest pain, radiating to left shoulder, diaphoresis, severe shortness of breath. Suspected Acute STEMI.');
  const [priority, setPriority] = useState<'RED' | 'YELLOW' | 'GREEN'>('RED');

  // Vitals
  const [heartRate, setHeartRate] = useState(116);
  const [systolicBp, setSystolicBp] = useState(96);
  const [diastolicBp, setDiastolicBp] = useState(62);
  const [spo2, setSpo2] = useState(91.5);
  const [respiratoryRate, setRespiratoryRate] = useState(26);

  // Required Resources
  const [requiredIcu, setRequiredIcu] = useState(true);
  const [requiredVentilator, setRequiredVentilator] = useState(true);
  const [requiredOxygen, setRequiredOxygen] = useState(true);
  const [requiredSpecialist, setRequiredSpecialist] = useState('Cardiologist');
  const [requiredEr, setRequiredEr] = useState(true);

  // Coordinates (Central Metro)
  const [pickupLat, setPickupLat] = useState(40.7280);
  const [pickupLng, setPickupLng] = useState(-73.9920);

  // Step 2: Rankings
  const [rankings, setRankings] = useState<HospitalRanking[]>([]);
  const [selectedHospital, setSelectedHospital] = useState<HospitalRanking | null>(null);

  // Step 3: Success Result
  const [dispatchResult, setDispatchResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleFindBestHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const results = await emergencyAPI.findBestHospital({
        patient_name: patientName,
        patient_age: patientAge,
        patient_gender: patientGender,
        condition_summary: conditionSummary,
        priority,
        required_icu: requiredIcu,
        required_ventilator: requiredVentilator,
        required_oxygen: requiredOxygen,
        required_specialist: requiredSpecialist,
        required_er: requiredEr,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        heart_rate: heartRate,
        systolic_bp: systolicBp,
        diastolic_bp: diastolicBp,
        spo2,
        respiratory_rate: respiratoryRate
      });

      setRankings(results);
      if (results.length > 0) {
        setSelectedHospital(results[0]);
      }
      setStep(2);
    } catch (err) {
      console.error('Error finding hospitals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReserveAndDispatch = async () => {
    if (!selectedHospital) return;
    setIsReserving(true);
    try {
      const result = await emergencyAPI.reserveAndDispatch({
        intake: {
          patient_name: patientName,
          patient_age: patientAge,
          patient_gender: patientGender,
          condition_summary: conditionSummary,
          priority,
          required_icu: requiredIcu,
          required_ventilator: requiredVentilator,
          required_oxygen: requiredOxygen,
          required_specialist: requiredSpecialist,
          required_er: requiredEr,
          pickup_lat: pickupLat,
          pickup_lng: pickupLng,
          heart_rate: heartRate,
          systolic_bp: systolicBp,
          diastolic_bp: diastolicBp,
          spo2,
          respiratory_rate: respiratoryRate
        },
        selected_hospital_id: selectedHospital.hospital_id,
        selected_bed_id: selectedHospital.recommended_bed_id
      });

      setDispatchResult(result);
      setStep(3);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error reserving and dispatching:', err);
    } finally {
      setIsReserving(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setRankings([]);
    setSelectedHospital(null);
    setDispatchResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl overflow-hidden glass-panel">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-600/30">
              <Siren className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Emergency Intake & Intelligent Resource Routing
                <span className="rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 font-bold">
                  STEP {step} OF 3
                </span>
              </h3>
              <p className="text-xs text-gray-500">Multi-hospital capacity matching & automated ambulance dispatch</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-lg p-1.5 text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-200 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-gray-900 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content by Step */}
        <div className="p-6">
          {/* STEP 1: Emergency Intake Form */}
          {step === 1 && (
            <form onSubmit={handleFindBestHospital} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Patient Basics */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Patient Full Name</label>
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Age & Gender</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      required
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className="w-20 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
                    />
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Triage Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none font-bold"
                  >
                    <option value="RED" className="text-rose-400">🔴 RED (Immediate / Resuscitation)</option>
                    <option value="YELLOW" className="text-amber-400">🟡 YELLOW (Urgent / High Risk)</option>
                    <option value="GREEN" className="text-emerald-400">🟢 GREEN (Standard Emergency)</option>
                  </select>
                </div>
              </div>

              {/* Condition Summary */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Clinical Condition Summary</label>
                <textarea
                  rows={2}
                  required
                  value={conditionSummary}
                  onChange={(e) => setConditionSummary(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                  placeholder="Describe patient symptoms, onset, field ECG results..."
                />
              </div>

              {/* Patient Vitals */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/40 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Field Vitals Assessment
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Blood Pressure</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={systolicBp}
                        onChange={(e) => setSystolicBp(Number(e.target.value))}
                        className="w-14 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs text-gray-900 font-mono"
                      />
                      <span className="text-gray-400">/</span>
                      <input
                        type="number"
                        value={diastolicBp}
                        onChange={(e) => setDiastolicBp(Number(e.target.value))}
                        className="w-14 rounded-lg border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs text-gray-900 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">SpO2 (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={spo2}
                      onChange={(e) => setSpo2(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-teal-400 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Resp Rate (/min)</label>
                    <input
                      type="number"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-xs text-gray-900 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-500">Pickup Area</label>
                    <div className="flex items-center gap-1 text-xs text-gray-600 pt-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-400" />
                      <span>Midtown Grid</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Required Resources Multi-select */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-300 block flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Intelligent Resource Criteria Matcher
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-100/80 p-2.5 cursor-pointer bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300">
                    <input
                      type="checkbox"
                      checked={requiredIcu}
                      onChange={(e) => setRequiredIcu(e.target.checked)}
                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="text-xs font-semibold text-gray-900">ICU Bed Required</div>
                  </label>

                  <label className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-100/80 p-2.5 cursor-pointer bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300">
                    <input
                      type="checkbox"
                      checked={requiredVentilator}
                      onChange={(e) => setRequiredVentilator(e.target.checked)}
                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="text-xs font-semibold text-gray-900">Ventilator Required</div>
                  </label>

                  <label className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-100/80 p-2.5 cursor-pointer bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300">
                    <input
                      type="checkbox"
                      checked={requiredOxygen}
                      onChange={(e) => setRequiredOxygen(e.target.checked)}
                      className="rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                    />
                    <div className="text-xs font-semibold text-gray-900">High Flow Oxygen</div>
                  </label>

                  <div className="space-y-1">
                    <select
                      value={requiredSpecialist}
                      onChange={(e) => setRequiredSpecialist(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-100 p-2 text-xs text-gray-900 focus:border-teal-500 focus:outline-none"
                    >
                      <option value="Cardiologist">Cardiologist on duty</option>
                      <option value="Neurologist">Neurologist on duty</option>
                      <option value="Trauma Specialist">Trauma Surgeon on duty</option>
                      <option value="Critical Care Intensivist">Intensivist on duty</option>
                      <option value="General">Any Specialist</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetAndClose}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-2.5 text-xs font-semibold text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-500 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-teal-500/20 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:from-teal-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:to-cyan-400 transition transform active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Scanning Hospitals...' : 'Find Best Hospital'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Intelligent Hospital Rankings */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Ranked Connected Hospitals ({rankings.length})</h4>
                  <p className="text-xs text-gray-500">Scored based on Distance, ETA, ICU Beds, Ventilators, Specialist & Surge Status</p>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-teal-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:underline"
                >
                  &larr; Adjust Criteria
                </button>
              </div>

              <div className="max-h-[380px] overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {rankings.map((r, idx) => {
                  const isSelected = selectedHospital?.hospital_id === r.hospital_id;
                  const isTopRanked = idx === 0;

                  return (
                    <div
                      key={r.hospital_id}
                      onClick={() => setSelectedHospital(r)}
                      className={`relative rounded-xl border p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/10'
                          : 'border-gray-200 bg-gray-50/60 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-gray-300'
                      }`}
                    >
                      {isTopRanked && (
                        <div className="absolute -top-2.5 left-4 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-950 shadow-md">
                          ★ RECOMMENDED BEST MATCH
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Hospital Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-900">{r.hospital_name}</span>
                            <StatusBadge type="hospital" status={r.emergency_status} />
                          </div>
                          <p className="text-xs text-gray-500">{r.branch_name} &bull; {r.address}</p>
                        </div>

                        {/* Suitability Score & ETA */}
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-gray-500 block">Distance & ETA</span>
                            <span className="font-mono text-xs font-bold text-cyan-300">
                              {r.distance_km} km &bull; {r.eta_minutes} mins
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center rounded-xl bg-gray-100 border border-gray-300/60 px-3 py-1.5 min-w-[70px]">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Score</span>
                            <span className={`text-lg font-black ${
                              r.suitability_score >= 85 ? 'text-emerald-400' :
                              r.suitability_score >= 65 ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {r.suitability_score}<span className="text-xs font-normal text-gray-400">/100</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Criteria Checklist Breakdown */}
                      <div className="mt-3 pt-3 border-t border-gray-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className={`flex items-center gap-1.5 ${r.has_icu_bed ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.has_icu_bed ? '✓' : '✗'} ICU Bed ({r.available_icu_beds} Avail)
                        </div>
                        <div className={`flex items-center gap-1.5 ${r.has_ventilator ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.has_ventilator ? '✓' : '✗'} Ventilator ({r.criteria_breakdown.ventilators_available} Free)
                        </div>
                        <div className={`flex items-center gap-1.5 ${r.has_specialist ? 'text-emerald-400' : 'text-gray-400'}`}>
                          {r.has_specialist ? '✓' : '✗'} {r.specialist_name || requiredSpecialist}
                        </div>
                        <div className="text-gray-500 flex items-center gap-1 font-mono text-[11px]">
                          <BedDouble className="h-3.5 w-3.5 text-teal-400" />
                          Allocates: <span className="text-gray-900 font-bold">{r.recommended_bed_code || 'Auto'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Selected Destination: <span className="text-gray-900 font-bold">{selectedHospital?.hospital_name}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-100"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleReserveAndDispatch}
                    disabled={!selectedHospital || isReserving}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-rose-600/30 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:from-rose-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:to-amber-500 transition transform active:scale-95 disabled:opacity-50"
                  >
                    {isReserving ? 'Reserving Bed & Dispatching...' : 'Reserve Bed & Dispatch Ambulance'}
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Dispatch & Reservation Confirmation */}
          {step === 3 && dispatchResult && (
            <div className="py-6 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Check className="h-8 w-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900">Emergency Dispatched & Resource Reserved!</h3>
                <p className="text-xs text-gray-500 mt-1">{dispatchResult.message}</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Destination Hospital</span>
                  <p className="text-sm font-bold text-gray-900">{dispatchResult.emergency_case?.assigned_hospital_name || selectedHospital?.hospital_name}</p>
                  <p className="text-xs text-gray-500">{selectedHospital?.branch_name}</p>
                </div>

                <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-teal-400">Reserved Bed</span>
                  <p className="text-sm font-bold text-gray-900">{dispatchResult.reserved_bed?.code}</p>
                  <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                    STATUS: RESERVED
                  </span>
                </div>

                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-cyan-400">Assigned Ambulance</span>
                  <p className="text-sm font-bold text-gray-900">{dispatchResult.assigned_ambulance?.code || 'AMB-101'}</p>
                  <p className="text-xs text-cyan-300 font-mono font-bold">ETA: ~{dispatchResult.eta_minutes} Mins</p>
                </div>
              </div>

              <div className="pt-4 flex justify-center gap-4">
                <button
                  onClick={resetAndClose}
                  className="rounded-xl bg-teal-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-500 text-white font-bold text-xs uppercase tracking-wider px-8 py-3 shadow-lg shadow-teal-600/20 transition"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
