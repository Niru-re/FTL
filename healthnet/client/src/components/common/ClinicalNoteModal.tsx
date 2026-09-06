import React, { useState } from 'react';
import { Patient } from '../../types';
import { patientsAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { X, FileText, Check } from 'lucide-react';

interface ClinicalNoteModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ClinicalNoteModal: React.FC<ClinicalNoteModalProps> = ({
  patient,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [noteType, setNoteType] = useState('SOAP');
  const [content, setContent] = useState('');
  const [plan, setPlan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await patientsAPI.addClinicalNote(patient.id, {
        note_type: noteType,
        content,
        plan
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      console.error('Error adding clinical note', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-50/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-200 bg-gray-100 shadow-2xl p-6 glass-panel">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Add Clinical Documentation</h3>
              <p className="text-xs text-gray-500">{patient.full_name} ({patient.mrn}) &bull; {patient.diagnosis}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Note Classification</label>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-sky-500 focus:outline-none"
            >
              <option value="SOAP">SOAP Progress Note (Subjective, Objective, Assessment, Plan)</option>
              <option value="ADMISSION">Admission History & Physical</option>
              <option value="PROGRESS">Daily ICU Attending Progress Note</option>
              <option value="DISCHARGE">Discharge Summary & Instructions</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Clinical Assessment / Findings</label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="e.g. S: Patient reports reduced chest tightness post-PCI. O: Vitals stable, HR 78 bpm regular. A: STEMI day 2 - hemodynamically stable on protocol."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-600">Orders & Care Plan</label>
            <textarea
              rows={2}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              placeholder="e.g. Continue DAPT (Aspirin + Clopidogrel), titrate beta-blocker, step down to ward tomorrow if troponin plateaus."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-6 py-2 shadow-lg shadow-sky-600/20 transition disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? 'Saving Note...' : 'Save Clinical Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
