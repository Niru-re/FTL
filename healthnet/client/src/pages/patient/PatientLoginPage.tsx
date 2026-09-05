import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShieldCheck, Users, Lock, ArrowRight, Activity, AlertCircle } from 'lucide-react';
import { LanguageSelector } from '../../components/common/LanguageSelector';
import { useAuth } from '../../hooks/useAuth';



export const PatientLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { demoLogin, login, isLoading } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDemoPatient = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await demoLogin('PATIENT');
      navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Patient demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFamily = async () => {
    try {
      setError(null);
      setIsSubmitting(true);
      await demoLogin('FAMILY_MEMBER');
      navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Family demo login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your Patient ID or Email and password.');
      return;
    }
    try {
      setError(null);
      setIsSubmitting(true);
      await login(identifier, password);
      navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Invalid credentials. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      <div className="absolute top-6 right-6">
        <LanguageSelector />
      </div>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">

        {/* Brand Mark */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-md font-black text-2xl tracking-tighter mb-4">
          HN
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          HealthNet Patient & Family Portal
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-sm mx-auto">
          Private, secure, and compassionate care updates for patients and authorized family members.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-slate-200 rounded-3xl space-y-6">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Demo Access Buttons */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Instant Demo Access</p>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={handleDemoPatient}
                disabled={isSubmitting || isLoading}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-orange-200 bg-orange-50/60 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-100/80 text-orange-950 font-medium transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                    <Heart className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Demo Patient Login</div>
                    <div className="text-[11px] text-slate-600">Raj Mehta (PT-1042)</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-orange-500 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={handleDemoFamily}
                disabled={isSubmitting || isLoading}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 bg-slate-50 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-slate-100 text-slate-900 font-medium transition-all group shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-8 h-8 rounded-xl bg-gray-200 text-white flex items-center justify-center font-bold text-xs">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Demo Family Login</div>
                    <div className="text-[11px] text-slate-600">Sarah Mehta (Daughter • Care Level)</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="shrink mx-4 text-[10px] font-bold uppercase tracking-wider text-gray-500">Or Login With Account</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Standard Login Form */}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Patient ID or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. PT-1042 or family@healthnet.demo"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-orange-500 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? 'Verifying...' : 'Sign In'}
            </button>
          </form>

          {/* Privacy & Safe Access Notice */}
          <div className="pt-2 text-center">
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Protected by HealthNet Care Privacy & Server-Enforced RBAC
            </p>
            <div className="mt-3">
              <Link to="/login" className="text-xs font-semibold text-gray-400 bg-gray-200:bg-gray-300:bg-gray-200:bg-gray-300:hover:bg-gray-300:bg-gray-200:bg-gray-300:bg-gray-200:text-slate-800 transition-colors">
                ← Return to Clinical Staff Login (Admin / Doctor / Nurse)
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
