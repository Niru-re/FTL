import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, User, Phone, Globe, Calendar, Building, Heart } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientProfileData } from '../../types';

export const PatientProfilePage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [profile, setProfile] = useState<PatientProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getProfile(selectedPatientId || undefined);
        setProfile(res);
      } catch (err) {
        console.warn('Failed to load profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, [selectedPatientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs font-semibold">
        <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
        Loading patient demographics...
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Demographics</span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Patient Profile & Verification
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Patient registry details, designated emergency contacts, and admission record.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-700 font-black text-lg flex items-center justify-center border border-orange-200">
              {profile.full_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{profile.full_name}</h2>
              <p className="text-xs text-gray-400">MRN: {profile.mrn}</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Age:</span>
              <span className="font-semibold text-slate-800">{profile.age} years</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Gender:</span>
              <span className="font-semibold text-slate-800">{profile.gender}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Blood Group:</span>
              <span className="font-semibold text-slate-800">{profile.blood_group}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Preferred Language:</span>
              <span className="font-semibold text-slate-800">{profile.preferred_language}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Admission Date:</span>
              <span className="font-semibold text-slate-800">
                {new Date(profile.admission_date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Contact Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center border border-slate-200">
              <Phone className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Primary Emergency Contact</h2>
              <p className="text-xs text-gray-400">Designated Caregiver</p>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Contact Name:</span>
              <span className="font-semibold text-slate-800">{profile.emergency_contact_name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Relationship:</span>
              <span className="font-semibold text-slate-800">{profile.emergency_contact_relationship}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-gray-500">Phone Number:</span>
              <span className="font-semibold text-slate-800">{profile.emergency_contact_phone}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Authorized Facility:</span>
              <span className="font-semibold text-slate-800">{profile.hospital_name}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-gray-400 leading-relaxed">
            Emergency contacts are notified by clinical staff in case of status transitions, procedural updates, or scheduled discharge planning.
          </div>
        </div>
      </div>
    </div>
  );
};
