import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FileText, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientLabItem } from '../../types';

export const PatientLabsPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [labs, setLabs] = useState<PatientLabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getLabs(selectedPatientId || undefined);
        setLabs(res);
      } catch (err) {
        console.warn('Failed to load lab results', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLabs();
  }, [selectedPatientId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Diagnostic Testing</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Laboratory Results
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified clinical lab tests without speculative diagnoses or complex raw telemetry.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-[11px] font-semibold">
          <Info className="w-3.5 h-3.5" />
          Physician Reviewed
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading laboratory tests...
        </div>
      ) : labs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No laboratory results recorded</p>
        </div>
      ) : (
        <div className="space-y-3">
          {labs.map((lab) => (
            <div
              key={lab.id}
              className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{lab.test_name}</h3>
                  <p className="text-xs text-slate-500">Report Date: {lab.date}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    lab.status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {lab.status === 'AVAILABLE' ? 'Verified & Final' : 'Processing'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
