import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';
import {
  ShieldCheck, Stethoscope, UserCheck, ShieldAlert,
  ArrowRight, Mail, Lock, CheckCircle2, Building2, Heart
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
      NURSE:  { email: 'nurse@healthnet.demo',  pass: 'nurse123'  },
      DOCTOR: { email: 'doctor@healthnet.demo', pass: 'doctor123' },
      ADMIN:  { email: 'admin@healthnet.demo',  pass: 'admin123'  },
    };
    setEmail(demoCredentials[role].email);
    setPassword(demoCredentials[role].pass);
    try {
      await demoLogin(role);
      if (role === 'ADMIN') navigate('/admin');
      else if (role === 'DOCTOR') navigate('/doctor');
      else navigate('/nurse');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/carebridge-logo.png"
            alt="CareBridge Logo"
            className="h-16 w-auto object-contain"
            style={{ minWidth: '48px', maxWidth: '180px' }}
          />
          <div>
            <span className="text-xl font-bold tracking-tight text-gray-900">CareBridge</span>
            <p className="text-[11px] text-gray-400 font-medium leading-none mt-0.5">Hospital Management System</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>City Resource Orchestrator Active</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* Left: Product overview */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600">
              <Heart className="h-3.5 w-3.5" />
              <span>City-Wide Intelligent Hospital &amp; Emergency Network</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Connected Care.<br />
              <span className="text-orange-500">
                Smarter Emergency Response.
              </span>
            </h1>

            <p className="text-sm text-gray-500 leading-relaxed max-w-lg">
              CareBridge synchronizes hospital capacities, ICU beds, life-support equipment, and ambulance fleets across metropolitan medical centers with intelligent resource routing.
            </p>

            {/* Feature badges */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: CheckCircle2, color: 'text-orange-500', title: 'Real-Time Bed State',   sub: '300+ tracked ICU & Ward beds' },
                { icon: CheckCircle2, color: 'text-orange-500', title: 'Intelligent Routing',   sub: 'Automated triage & ETA scoring' },
                { icon: CheckCircle2, color: 'text-orange-500', title: 'AI Risk Detection',     sub: 'NEWS2 & vitals degradation' },
                { icon: CheckCircle2, color: 'text-orange-500', title: 'WebSocket Live Sync',   sub: 'Instant telemetry without refresh' },
              ].map(({ icon: Icon, color, title, sub }) => (
                <div key={title} className="rounded-xl border border-gray-200 bg-white p-3 flex items-start gap-2.5 shadow-sm">
                  <Icon className={`h-4 w-4 ${color} mt-0.5 flex-shrink-0`} />
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">{title}</h4>
                    <p className="text-[11px] text-gray-500">{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Building2 className="h-4 w-4 text-gray-400" />
                <span>12 Hospital Nodes</span>
              </div>
              <div className="h-3 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>100% Network Uptime</span>
              </div>
              <div className="h-3 w-px bg-gray-200" />
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <ShieldCheck className="h-4 w-4 text-gray-400" />
                <span>Role-Based Access</span>
              </div>
            </div>
          </div>

          {/* Right: Login card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-card-md p-6 sm:p-8 space-y-6">

              <div>
                <h2 className="text-xl font-bold text-gray-900">Sign in to CareBridge</h2>
                <p className="text-xs text-gray-500 mt-1">Choose a 1-click Demo Role or sign in with your credentials.</p>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-600 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-500 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 1-click demo buttons */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                  Select 1-Click Demo Role
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleDemo('ADMIN')}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-purple-200 bg-purple-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-purple-100 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-purple-300 transition group text-center disabled:opacity-50"
                  >
                    <ShieldCheck className="h-5 w-5 text-purple-500 mb-1 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-800">Admin</span>
                    <span className="text-[10px] text-purple-500 font-mono mt-0.5">admin@healthnet.demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemo('DOCTOR')}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-blue-200 bg-blue-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-blue-100 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-blue-300 transition group text-center disabled:opacity-50"
                  >
                    <Stethoscope className="h-5 w-5 text-blue-500 mb-1 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-800">Doctor</span>
                    <span className="text-[10px] text-blue-500 font-mono mt-0.5">doctor@healthnet.demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDemo('NURSE')}
                    disabled={isLoading}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-teal-200 bg-teal-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-teal-100 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:border-teal-300 transition group text-center disabled:opacity-50"
                  >
                    <UserCheck className="h-5 w-5 text-teal-500 mb-1 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-gray-800">Nurse</span>
                    <span className="text-[10px] text-teal-500 font-mono mt-0.5">nurse@healthnet.demo</span>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-gray-200 w-full" />
                <span className="bg-white px-3 text-[11px] uppercase font-bold text-gray-400 absolute">
                  or sign in manually
                </span>
              </div>

              {/* Manual login form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Email Address</label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. admin@healthnet.demo"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Password</label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 focus:outline-none transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-600 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              {/* Quick-fill credential reference */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-[11px] text-gray-500 space-y-1.5">
                <span className="font-bold text-gray-700 block">Click any role to autofill &amp; sign in:</span>
                {([
                  { role: 'NURSE'  as UserRole, email: 'nurse@healthnet.demo',  pass: 'nurse123',  color: 'text-teal-600'   },
                  { role: 'DOCTOR' as UserRole, email: 'doctor@healthnet.demo', pass: 'doctor123', color: 'text-blue-600'   },
                  { role: 'ADMIN'  as UserRole, email: 'admin@healthnet.demo',  pass: 'admin123',  color: 'text-purple-600' },
                ]).map(({ role, email: e, pass, color }) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleDemo(role)}
                    className="w-full text-left p-1.5 rounded bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-white flex items-center justify-between transition"
                  >
                    <span>&bull; {role.charAt(0) + role.slice(1).toLowerCase()}: <code className={`${color} font-mono`}>{e}</code></span>
                    <code className="text-gray-600 font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">{pass}</code>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        CareBridge &bull; Hospital Management System &bull; City-Wide Intelligent Emergency Resource Network &bull; 2026
      </footer>
    </div>
  );
};
