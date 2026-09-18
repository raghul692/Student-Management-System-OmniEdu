import React from 'react';
import { Shield, Building2, Lock, Database, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const OrgSettingsPage: React.FC = () => {
  const { activeOrganization } = useAuthStore();

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Trust Administration
          </span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">
          Organization Settings & Profile
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          General parameters, subscription tier, and multi-tenant security configuration.
        </p>
      </div>

      {/* Organization Card */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 text-xs">
        <h3 className="text-base font-bold text-white">Trust Information</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase block">Legal Name</span>
            <span className="text-white font-semibold text-sm">{activeOrganization?.name}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase block">Organization Slug</span>
            <span className="text-indigo-400 font-mono font-semibold text-sm">{activeOrganization?.slug}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase block">Organization Type</span>
            <span className="text-white font-semibold text-sm">{activeOrganization?.type || 'EDUCATIONAL_TRUST'}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-slate-500 text-[10px] font-bold uppercase block">Active Plan Tier</span>
            <span className="text-emerald-400 font-bold text-sm uppercase">ENTERPRISE SAAS</span>
          </div>
        </div>
      </div>

      {/* Security Hardening Status */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 text-xs">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span>Security & Isolation Policies</span>
        </h3>

        <div className="space-y-2.5">
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold block">IDOR Defense & Header Verification</span>
              <span className="text-slate-400 text-[11px]">Strict x-institution-id membership enforcement</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              ENFORCED
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold block">AsyncLocalStorage Tenant Context</span>
              <span className="text-slate-400 text-[11px]">Database-level zero cross-tenant leak protection</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              ACTIVE
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-white font-semibold block">Polymorphic Academic Isolation</span>
              <span className="text-slate-400 text-[11px]">Independent schema handling for Colleges vs Schools</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
              OPTIMIZED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
