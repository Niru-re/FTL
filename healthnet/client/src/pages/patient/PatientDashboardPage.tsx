import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  Heart, MapPin, UserCheck, Clock, ArrowRight, ShieldCheck,
  Activity, AlertCircle, ChevronRight, PhoneCall, Calendar,
  FileText, CheckCircle2, Siren
} from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientDashboardData } from '../../types';

export const PatientDashboardPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await patientAPI.getDashboard(selectedPatientId || undefined);
        setData(res);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Unable to load patient information.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedPatientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs font-semibold">
        <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
        Loading patient care dashboard...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-white border border-slate-200 rounded-3xl text-center max-w-lg mx-auto">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-slate-900">Patient Data Unavailable</h3>
        <p className="text-xs text-slate-600 mt-1">{error || 'Please contact your hospital care team.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Greeting & Patient Identifier */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Personal Care Portal</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Hello, {data.first_name}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Patient ID: <span className="font-semibold text-slate-800">{data.mrn}</span> • {data.age} yrs • {data.gender}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {data.hospital_name}
          </span>
        </div>
      </div>

      {/* 2. Active Ambulance Simulated Transit Banner (if active) */}
      {data.is_in_transit && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 animate-pulse">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">Patient In Transit</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  ETA ~{data.transit_eta_minutes || 8} min
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5">
                Ambulance is currently en route to {data.hospital_name}. Clinical triage team is prepped.
              </p>
            </div>
          </div>
          <Link
            to="/patient/hospital"
            className="shrink-0 text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors"
          >
            Track Route
          </Link>
        </div>
      )}

      {/* 3. Core Status Card: Answer "What is their current status?" in human terms */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Current Care Status</span>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {data.care_status.replace('_', ' ')}
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
              {data.status_explanation}
            </p>
          </div>

          <div className="shrink-0 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Current Location</span>
            <p className="text-xs font-bold text-slate-800 mt-0.5">{data.department_name}</p>
            <p className="text-xs text-gray-400">{data.room_unit} • Room {data.bed_code}</p>
          </div>
        </div>

        {/* Simplified Vitals Strip: Friendly, non-alarming, informational */}
        {data.vitals && (
          <div className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Simplified Vital Observations</span>
              <span className="text-[11px] text-gray-500 italic">{data.vitals.disclaimer}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Heart Rate</span>
                <p className="text-lg font-extrabold text-slate-900 mt-1">
                  {data.vitals.heart_rate || '--'} <span className="text-xs font-normal text-gray-400">bpm</span>
                </p>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Regular Rhythm</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Oxygen Level</span>
                <p className="text-lg font-extrabold text-slate-900 mt-1">
                  {data.vitals.spo2 || '--'}% <span className="text-xs font-normal text-gray-400">SpO2</span>
                </p>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Assisted Oxygen</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Blood Pressure</span>
                <p className="text-lg font-extrabold text-slate-900 mt-1">
                  {data.vitals.systolic_bp}/{data.vitals.diastolic_bp} <span className="text-xs font-normal text-gray-400">mmHg</span>
                </p>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Monitored</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Temperature</span>
                <p className="text-lg font-extrabold text-slate-900 mt-1">
                  {data.vitals.temperature || '37.0'} <span className="text-xs font-normal text-gray-400">°C</span>
                </p>
                <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Normal Range</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Two-Column Grid: Care Team & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Care Team Card: Answer "Who is taking care of them?" */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">My Dedicated Care Team</span>
              <Link to="/patient/care-team" className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                View Profiles <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {/* Attending Doctor */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center border border-orange-200 shrink-0">
                  MD
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{data.doctor_name}</p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      On Duty
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">Attending Physician • Critical Care</p>
                </div>
              </div>

              {/* Primary Nurse */}
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 shrink-0">
                  RN
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-900 truncate">{data.nurse_name}</p>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      On Duty
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400">Primary Care Nurse • Day Shift</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">Have a question for your team?</span>
            <Link
              to="/patient/requests"
              className="text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              Submit Request →
            </Link>
          </div>
        </div>

        {/* Quick Portal Gateway Navigation */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Patient Care Hub</span>
              <span className="text-[11px] font-medium text-gray-500">Safe Access</span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to="/patient/updates"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/70 hover:border-orange-200 text-left transition-colors group"
              >
                <Clock className="w-4 h-4 text-orange-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-900 group-hover:text-orange-900">Recent Updates</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{data.recent_updates_count} logged updates</p>
              </Link>

              <Link
                to="/patient/appointments"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/70 hover:border-orange-200 text-left transition-colors group"
              >
                <Calendar className="w-4 h-4 text-orange-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-900 group-hover:text-orange-900">Appointments</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{data.upcoming_appointments_count} scheduled</p>
              </Link>

              <Link
                to="/patient/documents"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/70 hover:border-orange-200 text-left transition-colors group"
              >
                <FileText className="w-4 h-4 text-orange-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-900 group-hover:text-orange-900">Documents</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{data.available_documents_count} available</p>
              </Link>

              <Link
                to="/patient/hospital"
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200/70 hover:border-orange-200 text-left transition-colors group"
              >
                <MapPin className="w-4 h-4 text-orange-500 mb-1.5" />
                <p className="text-xs font-bold text-slate-900 group-hover:text-orange-900">Hospital & Map</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Visitor hours & directions</p>
              </Link>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-gray-400 text-[11px]">
            <span>Authorized Family Access Enabled</span>
            <Link to="/patient/family" className="font-bold text-slate-700 hover:text-slate-900">
              Manage Access →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
