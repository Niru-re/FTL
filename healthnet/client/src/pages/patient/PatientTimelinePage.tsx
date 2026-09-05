import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Activity, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientTimelineItem } from '../../types';

export const PatientTimelinePage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [timeline, setTimeline] = useState<PatientTimelineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setIsLoading(true);
        const res = await patientAPI.getTimeline(selectedPatientId || undefined);
        setTimeline(res);
      } catch (err) {
        console.warn('Failed to load timeline', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTimeline();
  }, [selectedPatientId]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Care Journey</span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Timeline & Milestones
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Chronological progression from admission through stabilization and recovery milestones.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading care timeline...
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="relative border-l-2 border-orange-200 ml-4 space-y-8 pb-4">
            {timeline.map((item, idx) => (
              <div key={item.id} className="relative pl-6 sm:pl-8 group">
                {/* Marker Dot */}
                <div className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                  idx === 0 ? 'bg-orange-500 ring-4 ring-orange-100' : 'bg-slate-300'
                }`} />

                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-orange-200 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                    <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md self-start sm:self-auto">
                      {item.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-2">
                    {new Date(item.timestamp).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
