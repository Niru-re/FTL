import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Clock, CheckCircle2, User, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientUpdateItem } from '../../types';

export const PatientUpdatesPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [updates, setUpdates] = useState<PatientUpdateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');

  const fetchUpdates = async () => {
    try {
      setIsLoading(true);
      const res = await patientAPI.getUpdates(selectedPatientId || undefined);
      setUpdates(res);
    } catch (err) {
      console.warn('Failed to load updates', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [selectedPatientId]);

  const filteredUpdates = updates.filter((u) => {
    if (filterType === 'ALL') return true;
    return u.update_type === filterType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Care Updates</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            What has happened recently?
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Calm, easy-to-understand observations logged directly by your attending doctors and nurses.
          </p>
        </div>

        <button
          onClick={fetchUpdates}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { key: 'ALL', label: 'All Updates' },
          { key: 'OBSERVATION', label: 'Nursing Observations' },
          { key: 'DOCTOR_REVIEW', label: 'Doctor Reviews' },
          { key: 'CARE_PLAN', label: 'Care Plans' },
          { key: 'MEDICATION', label: 'Medications' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterType === tab.key
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Updates Stream */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading care updates...
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-gray-400">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No recent updates in this category</p>
          <p className="text-xs text-gray-500 mt-1">Your care team logs updates during daily morning and evening rounds.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((update) => (
            <div
              key={update.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-orange-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                    {update.update_type.replace('_', ' ')}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">{update.title}</h3>
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  {new Date(update.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                  {new Date(update.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed mt-3">
                {update.description}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-gray-500" />
                  Logged by <strong className="text-slate-800 font-semibold">{update.staff_name}</strong>
                </span>
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Verified Entry
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
