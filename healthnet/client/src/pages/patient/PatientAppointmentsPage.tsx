import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { AppointmentItem } from '../../types';

export const PatientAppointmentsPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAppts = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getAppointments(selectedPatientId || undefined);
        setAppointments(res);
      } catch (err) {
        console.warn('Failed to load appointments', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAppts();
  }, [selectedPatientId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Consultation Schedule</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Follow-Up Appointments
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Scheduled specialist consultations, post-discharge reviews, and outpatient appointments.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-gray-400">
          <Calendar className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No appointments scheduled</p>
          <p className="text-xs text-gray-500 mt-1">Your doctor will schedule follow-up reviews prior to hospital discharge.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appt) => (
            <div
              key={appt.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex flex-col items-center justify-center shrink-0 border border-orange-200">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      {appt.status}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{appt.title}</h3>
                  </div>
                  <p className="text-xs font-medium text-slate-600 mt-1">
                    {appt.date_formatted} at <strong className="text-slate-900">{appt.time_slot}</strong>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    {appt.location} • {appt.hospital_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 italic">
                    Reason: {appt.reason}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <Link
                  to="/patient/requests"
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-slate-200 transition-colors"
                >
                  Reschedule / Inquire
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
