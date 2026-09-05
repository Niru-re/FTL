import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Building, MapPin, Phone, Clock, Navigation, ShieldCheck, Heart } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { HospitalInfoData } from '../../types';

export const PatientHospitalPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [info, setInfo] = useState<HospitalInfoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHospitalInfo = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getHospitalInfo(selectedPatientId || undefined);
        setInfo(res);
      } catch (err) {
        console.warn('Failed to load hospital info', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHospitalInfo();
  }, [selectedPatientId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 text-xs font-semibold">
        <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
        Loading facility guidelines...
      </div>
    );
  }

  if (!info) {
    return null;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Campus Location</span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Hospital & Campus Guide
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Campus address, department directions, visitor guidelines, and liaison contacts.
        </p>
      </div>

      {/* Main Location Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{info.hospital_name}</h2>
              <p className="text-xs text-slate-500">{info.branch_name}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Campus Address:</span>
                <p className="text-slate-600 mt-0.5">{info.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Patient Liaison Contact:</span>
                <p className="text-slate-600 mt-0.5">{info.general_phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Visiting Hours:</span>
                <p className="text-slate-600 mt-0.5">{info.visiting_hours}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Heart className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">Patient Room Location:</span>
                <p className="text-slate-600 mt-0.5">{info.department_name} • {info.room_unit} • Bed {info.bed_code}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Campus Map Placeholder / Guidelines */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Visitor Guidelines</span>
            <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600">
              <p>• <strong>Quiet Hours:</strong> 2:00 PM – 4:00 PM in ICU and Critical Care pavilions.</p>
              <p>• <strong>Sanitization:</strong> Hand sanitizer stations are located outside every ward entrance.</p>
              <p>• <strong>Parking:</strong> Visitor parking is available in Parking Garage B (Level 2 Direct Access).</p>
              <p>• <strong>Masks:</strong> Recommended for visitors entering respiratory and transplant units.</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200 text-xs text-orange-950 flex items-center justify-between">
            <span className="font-medium">Need campus navigation assistance?</span>
            <a
              href={`https://maps.google.com/?q=${info.lat},${info.lng}`}
              target="_blank"
              rel="noreferrer"
              className="font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
            >
              Get Directions <Navigation className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
