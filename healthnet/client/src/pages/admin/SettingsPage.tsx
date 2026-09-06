import React, { useState } from 'react';
import { systemAPI } from '../../services/api';
import { Settings, RotateCcw, ShieldCheck, Database, Radio, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleReset = async () => {
    if (!window.confirm("Are you sure you want to reset all network dummy data back to default demo state?")) {
      return;
    }
    setIsResetting(true);
    try {
      await systemAPI.resetDemo();
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-teal-400" />
          <span>System & Simulation Settings</span>
        </h1>
        <p className="text-xs text-gray-500">
          Configure hackathon simulator parameters, telemetry intervals, and reset demo datasets.
        </p>
      </div>

      {resetSuccess && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <span>Demo database reset successfully! All 12 hospitals, 300+ beds, staff, and ambulances restored.</span>
        </div>
      )}

      {/* Simulator Control Card */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-6 glass-panel space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
          <Radio className="h-5 w-5 text-teal-400" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Background Telemetry Engine</h3>
            <p className="text-xs text-gray-500">Controls real-time vitals fluctuation, ambulance GPS transit, and ETA countdowns.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-gray-600">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/60 border border-gray-200">
            <div>
              <span className="font-semibold text-gray-800 block">Simulation Rate</span>
              <span className="text-gray-400 text-[11px]">Interval: 3000ms</span>
            </div>
            <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 font-bold">
              ACTIVE
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50/60 border border-gray-200">
            <div>
              <span className="font-semibold text-gray-800 block">WebSocket Event Bus</span>
              <span className="text-gray-400 text-[11px]">Endpoint: ws://127.0.0.1:8000/ws</span>
            </div>
            <span className="rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 font-bold">
              BROADCASTING
            </span>
          </div>
        </div>
      </div>

      {/* Database Reset Action */}
      <div className="rounded-2xl border border-gray-200 bg-gray-100/80 p-6 glass-panel space-y-4">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-3">
          <Database className="h-5 w-5 text-purple-400" />
          <div>
            <h3 className="text-sm font-bold text-gray-900">Database State Restoration</h3>
            <p className="text-xs text-gray-500">Re-seed all 12 hospitals, 300+ beds, staff profiles, and emergency cases to default demonstration state.</p>
          </div>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Use this button at any time during presentations or testing to restore pristine dummy data across all 3 roles.
        </p>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
        >
          <RotateCcw className={`h-4 w-4 ${isResetting ? 'animate-spin' : ''}`} />
          <span>{isResetting ? 'Resetting Data...' : 'Reset Demo Network Data'}</span>
        </button>
      </div>
    </div>
  );
};
