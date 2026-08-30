import React, { useState } from 'react';
import { Patient } from '../../types';
import { patientsAPI } from '../../services/api';
import { X, HeartPulse, Activity, Check } from 'lucide-react';

interface VitalsEntryModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const VitalsEntryModal: React.FC<VitalsEntryModalProps> = ({
  patient,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [heartRate, setHeartRate] = useState<number>(patient?.latest_vitals?.heart_rate || 78);
  const [systolicBp, setSystolicBp] = useState<number>(patient?.latest_vitals?.systolic_bp || 120);
  const [diastolicBp, setDiastolicBp] = useState<number>(patient?.latest_vitals?.diastolic_bp || 80);
  const [spo2, setSpo2] = useState<number>(patient?.latest_vitals?.spo2 || 98.0);
  const [respiratoryRate, setRespiratoryRate] = useState<number>(patient?.latest_vitals?.respiratory_rate || 16);
  const [temperature, setTemperature] = useState<number>(patient?.latest_vitals?.temperature || 37.0);
  const [painScore, setPainScore] = useState<number>(patient?.latest_vitals?.pain_score || 0);
  const [consciousness, setConsciousness] = useState<string>(patient?.latest_vitals?.consciousness || 'ALERT');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await patientsAPI.addVitals(patient.id, {
        heart_rate: Number(heartRate),
        systolic_bp: Number(systolicBp),
        diastolic_bp: Number(diastolicBp),
        spo2: Number(spo2),
        respiratory_rate: Number(respiratoryRate),
        temperature: Number(temperature),
        pain_score: Number(painScore),
        consciousness,
        recorded_by_nurse_name: 'Registered Staff Nurse'
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error('Error saving vitals', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 glass-panel">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400 border border-teal-500/30">
              <HeartPulse className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Record Patient Vitals</h3>
              <p className="text-xs text-slate-400">{patient.full_name} ({patient.mrn}) &bull; Bed {patient.bed_code || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Heart Rate (bpm)</label>
              <input
                type="number"
                required
                min={30}
                max={220}
                value={heartRate}
                onChange={(e) => setHeartRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Blood Pressure (mmHg)</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  required
                  placeholder="Sys"
                  value={systolicBp}
                  onChange={(e) => setSystolicBp(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
                />
                <span className="text-slate-500">/</span>
                <input
                  type="number"
                  required
                  placeholder="Dia"
                  value={diastolicBp}
                  onChange={(e) => setDiastolicBp(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">SpO2 Oxygen Saturation (%)</label>
              <input
                type="number"
                step="0.1"
                required
                min={50}
                max={100}
                value={spo2}
                onChange={(e) => setSpo2(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-teal-400 font-mono font-bold focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Respiratory Rate (/min)</label>
              <input
                type="number"
                required
                min={6}
                max={60}
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Body Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                required
                min={30}
                max={44}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Pain Score (0 - 10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={painScore}
                onChange={(e) => setPainScore(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white font-mono focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Consciousness Level (AVPU)</label>
            <select
              value={consciousness}
              onChange={(e) => setConsciousness(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-teal-500 focus:outline-none"
            >
              <option value="ALERT">Alert (Fully conscious and oriented)</option>
              <option value="VOICE">Voice (Responds to verbal stimuli)</option>
              <option value="PAIN">Pain (Responds to pain stimuli)</option>
              <option value="UNRESPONSIVE">Unresponsive</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-6 py-2 shadow-lg shadow-teal-600/20 transition disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? 'Recording Vitals...' : 'Save Vitals Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
