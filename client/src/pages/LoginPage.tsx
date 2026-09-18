import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useSandboxStore } from '../store/useSandboxStore';
import {
  GraduationCap,
  Building2,
  School,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  Building,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, demoLogin, isLoading, error, clearError } = useAuthStore();
  const { enterSandbox } = useSandboxStore();

  const [email, setEmail] = useState('principal.eng@apollo.edu');
  const [password, setPassword] = useState('Apollo@2026');
  const [orgSlug, setOrgSlug] = useState('apollo-trust');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password, orgSlug);
      navigate('/app/dashboard');
    } catch {
      // Error handled in store
    }
  };

  const handleDemo = async (roleKey: string) => {
    clearError();
    try {
      await demoLogin(roleKey);
      navigate('/app/dashboard');
    } catch {
      // Error handled in store
    }
  };

  const handleLaunchSandbox = (campus: 'COLLEGE' | 'SCHOOL') => {
    enterSandbox(campus);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <SEOHead
        title="Sign In — OmniEdu Student Management System & ERP"
        description="Access your OmniEdu portal. Secure single sign-on for school and college administrators, faculty, students, and parents."
        canonicalUrl="https://omniedu-drab.vercel.app/login"
      />
      {/* Background Mesh Elements */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 items-center">
        {/* Left Column: Hero branding & Value proposition */}
        <div className="lg:col-span-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-0.5 shadow-2xl flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2 font-display">
                OmniEdu <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-sans font-semibold">2.0 SaaS</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium">Multi-Tenant Education ERP & Academic Intelligence</p>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              One Unified Core. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400">
                Any Educational Institution.
              </span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-lg">
              Enterprise multi-tenant ERP supporting Engineering Colleges (Anna Univ R2021/R2024 CGPA), K-12 Schools (CBSE/State Board), and Educational Trusts under isolated database contexts.
            </p>
          </div>

          {/* Value points */}
          <div className="space-y-2.5 pt-2">
            {[
              'True Multi-Tenant Isolation with AsyncLocalStorage request scoping',
              'Anna University 40 CIA + 60 Ext CGPA & CBSE Grade matrix',
              'Offline-first attendance engine with client SQLite/LocalStorage caching',
              'Fine-grained RBAC with role and resource permission guards',
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* 1-Click Guest Sandbox Hero Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-indigo-500/30 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  Zero-Login Ephemeral Sandbox
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                Client-Side Memory
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Test all ledgers, calculators, and automated PDF document generators in browser memory without database writes.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleLaunchSandbox('COLLEGE')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-xs font-bold text-indigo-200 transition-all group"
              >
                <Building2 className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>College Sandbox</span>
              </button>
              <button
                type="button"
                onClick={() => handleLaunchSandbox('SCHOOL')}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-xs font-bold text-purple-200 transition-all group"
              >
                <School className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>School Sandbox</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Login Card & Demo Quick Access */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Sign In to Campus</h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your credentials or choose an institutional demo persona below.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Organization Slug / Campus Domain
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="e.g. apollo-trust"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@apollo.edu"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-white placeholder-slate-500 transition-all outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs tracking-wide shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing In...' : 'Authenticate & Enter'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                1-Click Institutional Demo Logins
              </span>
            </div>

            {/* Quick Demo Persona Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'trust_admin', label: 'Trust Admin', sub: 'Group Super Admin', icon: <Shield className="w-3.5 h-3.5 text-amber-400" /> },
                { key: 'principal_eng', label: 'College Principal', sub: 'Dr. Sundaram', icon: <Building2 className="w-3.5 h-3.5 text-indigo-400" /> },
                { key: 'hod_cse', label: 'HOD CSE', sub: 'Dr. Lakshmi', icon: <GraduationCap className="w-3.5 h-3.5 text-cyan-400" /> },
                { key: 'faculty_dbms', label: 'Faculty', sub: 'Prof. Vignesh', icon: <GraduationCap className="w-3.5 h-3.5 text-blue-400" /> },
                { key: 'principal_sch', label: 'School Principal', sub: 'Mrs. Shanthi', icon: <School className="w-3.5 h-3.5 text-purple-400" /> },
                { key: 'teacher_math', label: 'Class Teacher', sub: 'Mr. Ramesh (10th)', icon: <School className="w-3.5 h-3.5 text-emerald-400" /> },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleDemo(p.key)}
                  className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left transition-all"
                >
                  <div className="flex items-center gap-1.5">
                    {p.icon}
                    <span className="text-xs font-bold text-slate-200 truncate">{p.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{p.sub}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              New Organization?{' '}
              <Link to="/onboard" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
                Register New Institution
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
