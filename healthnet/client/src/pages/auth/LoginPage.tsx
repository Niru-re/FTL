import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import {
  Activity, ShieldCheck, Stethoscope, UserCheck, ShieldAlert,
  ArrowRight, Key, Mail, Lock, Sparkles, Building2, CheckCircle2
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, demoLogin, isLoading } = useAuth();

  const [email, setEmail] = useState('admin@healthnet.demo');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      const savedUser = JSON.parse(localStorage.getItem('healthnet_user') || '{}');
      if (savedUser.role === 'ADMIN') navigate('/admin');
      else if (savedUser.role === 'DOCTOR') navigate('/doctor');
      else if (savedUser.role === 'NURSE') navigate('/nurse');
      else navigate('/admin');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid email or password. Please use nurse@healthnet.demo, doctor@healthnet.demo, or admin@healthnet.demo');
    }
  };

  const handleDemo = async (role: UserRole) => {
    setError(null);
    const demoCredentials: Record<UserRole, { email: string; pass: string }> = {
      NURSE: { email: 'nurse@healthnet.demo', pass: 'nurse123' },
      DOCTOR: { email: 'doctor@healthnet.demo', pass: 'doctor123' },
      ADMIN: { email: 'admin@healthnet.demo', pass: 'admin123' }
    };
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].pass);

    try {
      await demoLogin(role);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'DOCTOR') navigate('/doctor');
      else if (role === 'NURSE') navigate('/nurse');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between relative overflow-hidden selection:bg-teal-500 selection:text-white">
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(13,148,136,0.25),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      {/* Top Header */}
      <header className="p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-white shadow-lg shadow-teal-500/30">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white">HEALTHNET</span>
            <span className="ml-2 rounded bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 text-[10px] font-bold text-teal-400">
              PROTOTYPE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>City Resource Orchestrator Active</span>
        </div>
      </header>

      {/* Center Container */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Product Overview */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>City-Wide Intelligent Hospital & Emergency Network</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Connected Care.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-300 to-sky-400">
                Smarter Emergency Response.
              </span>
            </h1>

            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              HealthNet synchronizes hospital capacities, ICU beds, life-support equipment, and ambulance fleets across 12 metropolitan medical centers with intelligent resource routing.
            </p>

            {/* Feature Badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-teal-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Real-Time Bed State</h4>
                  <p className="text-[11px] text-slate-400">300+ tracked ICU & Ward beds</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Intelligent Routing</h4>
                  <p className="text-[11px] text-slate-400">Automated triage & ETA scoring</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Prototype AI Risk</h4>
                  <p className="text-[11px] text-slate-400">NEWS2 & vitals degradation</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-slate-200">WebSocket Live Sync</h4>
                  <p className="text-[11px] text-slate-400">Instant telemetry without refresh</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Login Card & 1-Click Demo Accounts */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Sign In to HealthNet</h2>
                <p className="text-xs text-slate-400 mt-1">Choose a 1-click Demo Role or sign in with custom credentials.</p>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1-Click DEMO LOGIN BUTTONS */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Select 1-Click Demo Role
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDemo('ADMIN')}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 hover:border-purple-500/60 transition group text-center"
                  >
                    <ShieldCheck className="h-5 w-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Continue as Admin</span>
                    <span className="text-[10px] text-purple-300 font-mono mt-0.5">admin@healthnet.demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemo('DOCTOR')}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-500/60 transition group text-center"
                  >
                    <Stethoscope className="h-5 w-5 text-sky-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Continue as Doctor</span>
                    <span className="text-[10px] text-sky-300 font-mono mt-0.5">doctor@healthnet.demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemo('NURSE')}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 hover:border-teal-500/60 transition group text-center"
                  >
                    <UserCheck className="h-5 w-5 text-teal-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Continue as Nurse</span>
                    <span className="text-[10px] text-teal-300 font-mono mt-0.5">nurse@healthnet.demo</span>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full"></div>
                <span className="bg-slate-900 px-3 text-[11px] uppercase font-bold text-slate-500 absolute">
                  OR SIGN IN MANUALLY
                </span>
              </div>

              {/* Standard Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Email Address</label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@healthnet.demo"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Password</label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-500 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-teal-600/20 transition transform active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Credentials Reference Box */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-400 space-y-1.5">
                <span className="font-bold text-slate-300 block">Click any role to autofill & sign in:</span>
                <button
                  type="button"
                  onClick={() => handleDemo('NURSE')}
                  className="w-full text-left p-1.5 rounded hover:bg-slate-900 flex items-center justify-between transition"
                >
                  <span>&bull; Nurse: <code className="text-teal-400 font-mono">nurse@healthnet.demo</code></span>
                  <code className="text-slate-300 font-mono bg-slate-800 px-1 rounded">nurse123</code>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemo('DOCTOR')}
                  className="w-full text-left p-1.5 rounded hover:bg-slate-900 flex items-center justify-between transition"
                >
                  <span>&bull; Doctor: <code className="text-sky-400 font-mono">doctor@healthnet.demo</code></span>
                  <code className="text-slate-300 font-mono bg-slate-800 px-1 rounded">doctor123</code>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemo('ADMIN')}
                  className="w-full text-left p-1.5 rounded hover:bg-slate-900 flex items-center justify-between transition"
                >
                  <span>&bull; Admin: <code className="text-purple-400 font-mono">admin@healthnet.demo</code></span>
                  <code className="text-slate-300 font-mono bg-slate-800 px-1 rounded">admin123</code>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 border-t border-slate-800/80 text-center text-xs text-slate-500 z-10">
        HEALTHNET &bull; City-Wide Intelligent Hospital & Emergency Resource Network Prototype &bull; Hackathon Edition 2026
      </footer>
    </div>
  );
};
