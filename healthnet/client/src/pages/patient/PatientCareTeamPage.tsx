import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { UserCheck, Stethoscope, Heart, Clock, Phone, MapPin, Building, MessageSquare, AlertCircle } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientCareTeam } from '../../types';

export const PatientCareTeamPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [careTeam, setCareTeam] = useState<PatientCareTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCareTeam = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await patientAPI.getCareTeam(selectedPatientId || undefined);
        setCareTeam(res);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Unable to load care team information.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCareTeam();
  }, [selectedPatientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs font-semibold">
        <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
        Loading care team...
      </div>
    );
  }

  if (error || !careTeam) {
    return (
      <div className="p-6 bg-white border border-slate-200 rounded-3xl text-center max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Care Team Not Available</h3>
        <p className="text-xs text-slate-600 mt-1">{error || 'Please check back shortly.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Clinical Care Team</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Who is taking care of me?
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Your assigned physicians and nurses are on duty to support your care and recovery.
          </p>
        </div>

        <Link
          to="/patient/requests"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Message Care Team
        </Link>
      </div>

      {/* Location Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center gap-4 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-orange-500" />
          <span>Hospital: <strong className="text-slate-800">{careTeam.hospital_name}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-orange-500" />
          <span>Department: <strong className="text-slate-800">{careTeam.department_name}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-orange-500" />
          <span>Room / Bed: <strong className="text-slate-800">{careTeam.bed_code || 'Bed 07'}</strong></span>
        </div>
      </div>

      {/* Care Team Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Attending Physician */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-700 font-black text-base flex items-center justify-center border border-orange-200">
                  MD
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">Lead Physician</span>
                  <h3 className="text-base font-bold text-slate-900">{careTeam.doctor?.name || 'Dr. Arjun Sharma'}</h3>
                  <p className="text-xs text-gray-400">{careTeam.doctor?.specialization || 'Critical Care Medicine'}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                On Duty
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-gray-500">Department:</span>
                <span className="font-semibold text-slate-800">{careTeam.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shift Schedule:</span>
                <span className="font-semibold text-slate-800">{careTeam.doctor?.shift || 'Morning Shift'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Clinical Focus:</span>
                <span className="font-semibold text-slate-800">Respiratory Management & ICU Care</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Dr. Sharma directs diagnostic evaluations, rounds twice daily, orders treatments, and oversees the overall clinical treatment plan.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Direct questions?</span>
            <Link to="/patient/requests" className="font-bold text-orange-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-700">
              Ask Doctor →
            </Link>
          </div>
        </div>

        {/* Primary Care Nurse */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-700 font-black text-base flex items-center justify-center border border-blue-200">
                  RN
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Primary Nurse</span>
                  <h3 className="text-base font-bold text-slate-900">{careTeam.nurse?.name || 'Nurse Elena Rostova'}</h3>
                  <p className="text-xs text-gray-400">{careTeam.nurse?.specialization || 'ICU Critical Care'}</p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                On Duty
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-gray-500">Department:</span>
                <span className="font-semibold text-slate-800">{careTeam.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Shift Schedule:</span>
                <span className="font-semibold text-slate-800">{careTeam.nurse?.shift || 'Morning Shift'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bedside Care:</span>
                <span className="font-semibold text-slate-800">Direct Vitals, Medication & Comfort</span>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Nurse Elena administers scheduled medications, continuously tracks telemetry vitals, assists with nutrition, and communicates bedside updates.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Need assistance?</span>
            <Link to="/patient/requests" className="font-bold text-orange-600 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-orange-700">
              Request Nurse Assistance →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
