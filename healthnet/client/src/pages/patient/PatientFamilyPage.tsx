import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Users, UserPlus, Shield, Trash2, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { patientAPI } from '../../services/api';
import { FamilyMemberItem } from '../../types';

export const PatientFamilyPage: React.FC = () => {
  const { selectedPatientId } = useOutletContext<{ selectedPatientId: number | null }>();
  const [members, setMembers] = useState<FamilyMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [accessLevel, setAccessLevel] = useState('CARE');
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const res = await patientAPI.getFamilyMembers(selectedPatientId || undefined);
      setMembers(res);
    } catch (err) {
      console.warn('Failed to load family members', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [selectedPatientId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    try {
      setActionError(null);
      await patientAPI.inviteFamilyMember({
        full_name: fullName,
        relationship,
        email,
        phone,
        access_level: accessLevel
      }, selectedPatientId || undefined);

      setIsModalOpen(false);
      setFullName('');
      setEmail('');
      setPhone('');
      fetchMembers();
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || 'Failed to add family member.');
    }
  };

  const handleRevoke = async (authId: number) => {
    if (!window.confirm('Are you sure you want to revoke this family member? They will immediately lose portal access.')) {
      return;
    }
    try {
      await patientAPI.revokeFamilyMember(authId);
      fetchMembers();
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'Failed to revoke access.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Access Control</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Authorized Family & Caregivers
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Grant permission levels to designated family members. Revocations take effect immediately.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Add Family Member
        </button>
      </div>

      {/* Permission Levels Matrix Explainer */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="font-bold text-slate-900 mb-1">Level 1: BASIC</div>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            Care status, current hospital location, care team profiles, and general updates.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
          <div className="font-bold text-orange-950 mb-1">Level 2: CARE (Recommended)</div>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Basic + appointment scheduling, care milestone timeline, and medication schedules.
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="font-bold text-slate-900 mb-1">Level 3: FULL</div>
          <p className="text-gray-400 text-[11px] leading-relaxed">
            Care + authorized release documents, lab summaries, and managing family invitations.
          </p>
        </div>
      </div>

      {/* Authorized Family Stream */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 text-xs font-semibold">
          <div className="animate-spin w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full mr-2" />
          Loading authorized family members...
        </div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center text-gray-400">
          <Users className="w-8 h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No family members registered</p>
          <p className="text-xs text-gray-500 mt-1">You can add family members anytime using their email address.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center border border-orange-200 shrink-0">
                  {m.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{m.full_name}</h3>
                    <span className="text-xs text-gray-400 font-medium">({m.relationship})</span>
                  </div>
                  <p className="text-xs text-gray-400">{m.email} • {m.phone}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    m.status === 'ACCEPTED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {m.status === 'ACCEPTED' ? `${m.access_level} ACCESS` : 'REVOKED'}
                </span>

                {m.status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleRevoke(m.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Revoke Access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Family Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-gray-100/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">Authorize Family Member</h3>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {actionError}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Mehta"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Relationship
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Daughter">Daughter</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Caregiver">Authorized Caregiver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Access Level
                  </label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="BASIC">Basic (Status)</option>
                    <option value="CARE">Care (Timeline & Meds)</option>
                    <option value="FULL">Full (Documents & Records)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sarah.mehta@example.com"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1-555-0144"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Authorization
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
