import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Pill, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientMedicationItem } from '../../types';

export const PatientMedicationsPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [meds, setMeds] = useState<PatientMedicationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeds = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getMedications(selectedPatientId || undefined);
        setMeds(res);
      } catch (err) {
        console.warn('Failed to load medications', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeds();
  }, [selectedPatientId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Prescription Schedule</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Current Medications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active medication regimen administered by your primary nursing team.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-bold">
          <Info className="w-3.5 h-3.5" />
          DEMO MEDICATION INFORMATION
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-500 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading medications...
        </div>
      ) : meds.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-slate-500">
          <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No active medications scheduled</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meds.map((med) => (
            <div
              key={med.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{med.drug_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{med.schedule}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      med.status === 'ADMINISTERED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {med.status}
                  </span>
                </div>

                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5" /> Next Dose / Timing:
                  </span>
                  <span className="font-semibold text-slate-800">{med.last_given_time}</span>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Administered via IV / Oral by Staff Nurse</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Care Team Approved
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
