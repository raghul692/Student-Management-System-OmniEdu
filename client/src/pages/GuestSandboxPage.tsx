import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSandboxStore } from '../store/useSandboxStore';
import {
  Sparkles,
  Building2,
  School,
  ArrowRight,
  ShieldCheck,
  Zap,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';

export const GuestSandboxPage: React.FC = () => {
  const navigate = useNavigate();
  const { enterSandbox, resetSandboxData } = useSandboxStore();

  const handleStart = (campus: 'COLLEGE' | 'SCHOOL') => {
    resetSandboxData();
    enterSandbox(campus);
    navigate('/app/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <SEOHead
        title="Interactive Demo Sandbox — OmniEdu Student Management System"
        description="Try the OmniEdu Education ERP live demo in your browser without signing up. Test multi-tenant role dashboards, attendance radar, and university grading."
        canonicalUrl="https://omniedu.is-a.dev/sandbox"
      />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full z-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Risk Ephemeral Exploration Environment</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white font-display">
            Interactive Guest Sandbox
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto">
            Experience the complete OmniEdu Education ERP entirely in your browser's memory. Perform live attendance tracking, calculate Anna Univ CGPA or CBSE grades, and generate student report cards with absolute isolation.
          </p>
        </div>

        {/* Guarantees row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
              title: 'Zero Database Writes',
              desc: 'All actions happen in client state. PostgreSQL is never touched.',
            },
            {
              icon: <Zap className="w-4 h-4 text-amber-400" />,
              title: 'Sub-Millisecond Response',
              desc: 'Custom local Axios adapter provides instant responses for all routes.',
            },
            {
              icon: <RotateCcw className="w-4 h-4 text-cyan-400" />,
              title: '1-Click Instant Reset',
              desc: 'Reset all fixtures back to pristine state whenever you want.',
            },
          ].map((card, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                {card.icon}
                <span>{card.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* 2 Selectable Sandbox Tracks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Track 1: College */}
          <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 hover:border-indigo-500/60 transition-all shadow-xl space-y-5 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  ANNA UNIV R2021
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                Engineering College Track
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Explore the Department of Computer Science & Engineering. Track 8-hour daily slots, identify students below the 75% attendance threshold, and test the 40 Internal + 60 External CGPA engine.
              </p>

              <div className="space-y-2 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Anna Univ Register Numbers (71762104001...)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Defaulter Cutoff Radar with Condonation analytics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pre-loaded DBMS & Data Structures courses</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStart('COLLEGE')}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
            >
              <span>Launch College Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Track 2: School */}
          <div className="p-6 rounded-3xl bg-slate-900/80 backdrop-blur-xl border border-purple-500/30 hover:border-purple-500/60 transition-all shadow-xl space-y-5 flex flex-col justify-between group">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400">
                  <School className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  CBSE / MATRIC
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                K-12 School Track
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Explore the 10th Standard Section A environment. Mark period-wise attendance, record unit test marks, evaluate letter grade boundaries (A1 to E), and test document exports.
              </p>

              <div className="space-y-2 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Standard & Section rolls (10th-A, 12th-B)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Periods 1 to 8 attendance matrix</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Unit Test & Quarterly letter grade calculation</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleStart('SCHOOL')}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/30"
            >
              <span>Launch School Sandbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
