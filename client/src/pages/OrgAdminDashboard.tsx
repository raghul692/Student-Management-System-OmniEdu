import React from 'react';
import { useAuthStore } from '../store/useAuthStore';
import {
  Building2,
  School,
  GraduationCap,
  Users,
  TrendingUp,
  ShieldCheck,
  Plus,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OrgAdminDashboard: React.FC = () => {
  const { activeOrganization, selectInstitution } = useAuthStore();

  const institutions = activeOrganization?.institutions || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/50 border border-indigo-500/20 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Organization Console
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Slug: {activeOrganization?.slug || 'default'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight font-display">
            {activeOrganization?.name || 'Apollo Educational Group'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise trust oversight, campus provisioning, and cross-institutional telemetry.
          </p>
        </div>

        <Link
          to="/onboard"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Campus</span>
        </Link>
      </div>

      {/* Aggregate KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Campuses',
            value: institutions.length.toString(),
            sub: 'Colleges & Schools',
            icon: <Building2 className="w-5 h-5 text-indigo-400" />,
            color: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20',
          },
          {
            label: 'Total Enrolled Students',
            value: '2,480',
            sub: 'Across all active campuses',
            icon: <Users className="w-5 h-5 text-emerald-400" />,
            color: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
          },
          {
            label: 'Faculty & Educators',
            value: '142',
            sub: 'Active teaching staff',
            icon: <GraduationCap className="w-5 h-5 text-cyan-400" />,
            color: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
          },
          {
            label: 'System Uptime & Sync',
            value: '99.98%',
            sub: 'Real-time telemetry active',
            icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
            color: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
          },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className={`p-5 rounded-2xl bg-gradient-to-b ${kpi.color} border backdrop-blur-xl space-y-3`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">{kpi.label}</span>
              <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-700/40">
                {kpi.icon}
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-white tracking-tight">{kpi.value}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Managed Campuses Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Managed Institutions ({institutions.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Click to switch active campus context</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {institutions.map((inst) => {
            const isCollege = inst.type === 'COLLEGE';
            return (
              <div
                key={inst.id}
                className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-4 flex flex-col justify-between group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-slate-300">
                      {isCollege ? (
                        <GraduationCap className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <School className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isCollege
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}
                    >
                      {inst.type}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {inst.code}</p>
                  </div>

                  <p className="text-xs text-slate-400">
                    {isCollege
                      ? 'Anna University Affiliated • 40 Internal + 60 External CGPA'
                      : 'CBSE / State Board Matriculation • Standards 1-12'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Active Tenant Scope</span>
                  <button
                    onClick={() => selectInstitution(inst.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-all"
                  >
                    <span>Switch to this Campus</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
