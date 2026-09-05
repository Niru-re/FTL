import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { MessageSquare, Send, CheckCircle2, Clock, AlertCircle, User, ArrowRight } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { PatientRequestItem } from '../../types';

export const PatientRequestsPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [requests, setRequests] = useState<PatientRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [requestType, setRequestType] = useState('UPDATE');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await patientAPI.getRequests(selectedPatientId || undefined);
      setRequests(res);
    } catch (err) {
      console.warn('Failed to load requests', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedPatientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      setIsSubmitting(true);
      setSuccessMsg(null);
      await patientAPI.createRequest({
        request_type: requestType,
        message: message.trim(),
        priority
      }, selectedPatientId || undefined);

      setMessage('');
      setSuccessMsg('Your request has been submitted to your care team.');
      fetchRequests();
    } catch (err) {
      console.error('Failed to submit request', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Communication Desk</span>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Requests & Inquiries
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask for a status update, request bedside nurse assistance, or submit non-emergency questions to your care team.
        </p>
      </div>

      {/* Request Submission Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Submit New Request</h3>

        {successMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Inquiry Type
              </label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              >
                <option value="UPDATE">Family Update Request</option>
                <option value="ASSISTANCE">Bedside Nurse Assistance</option>
                <option value="CALLBACK">Physician Callback Inquiry</option>
                <option value="QUESTION">Medication or Care Plan Question</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              >
                <option value="NORMAL">Standard Routine Inquiry</option>
                <option value="URGENT">Time-Sensitive (Needs Today)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Your Message
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Family would like an update on dad's breathing rate and if he was able to sit up today..."
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 leading-relaxed"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Sending...' : 'Send to Care Team'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Requests Stream */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Recent Requests & Care Team Responses ({requests.length})
        </h3>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-slate-400">Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-slate-500">
            <MessageSquare className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800">No requests submitted yet</p>
          </div>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                    {req.request_type.replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-slate-800">By {req.created_by_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      req.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'ACKNOWLEDGED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {req.status}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              {/* Inquiry Text */}
              <p className="text-xs text-slate-700 leading-relaxed">
                "{req.message}"
              </p>

              {/* Staff Response Thread (if present) */}
              {req.response_message && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950 space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-900 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Response from {req.responded_by_name || 'Care Team'}
                    </span>
                    <span className="font-normal text-emerald-700 text-[10px]">
                      {req.responded_at ? new Date(req.responded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="leading-relaxed text-emerald-900">{req.response_message}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
