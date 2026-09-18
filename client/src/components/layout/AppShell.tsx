import React, { useState } from 'react';
import { GlobalHeader } from './GlobalHeader';
import { DynamicSidebar, TabKey } from './DynamicSidebar';
import { ModalDrawer } from '../ui/ModalDrawer';
import { GuestBanner } from './GuestBanner';
import { useAuthStore } from '../../store/useAuthStore';
import { useSandboxStore } from '../../store/useSandboxStore';
import { Shield, Building2, School, GraduationCap, UserCheck, BookOpen, Crown, Sparkles } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';

interface AppShellProps {
  children: React.ReactNode;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, activeTab, onSelectTab }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const { demoLogin, isLoading, user } = useAuthStore();

  const personas = [
    {
      roleKey: 'trust_admin',
      name: 'Dr. K. Rajagopal',
      role: 'Trust Chairman / Super Admin',
      campus: 'Apollo Educational Group (All Campuses)',
      icon: <Crown className="w-5 h-5 text-amber-500" />,
      badge: 'GROUP_TRUST',
    },
    {
      roleKey: 'principal_eng',
      name: 'Dr. S. Sundaram',
      role: 'College Principal',
      campus: 'Apollo Institute of Technology (College)',
      icon: <Building2 className="w-5 h-5 text-indigo-500" />,
      badge: 'COLLEGE',
    },
    {
      roleKey: 'hod_cse',
      name: 'Dr. M. Lakshmi',
      role: 'HOD - Computer Science & Engg',
      campus: 'Apollo Institute of Technology (College)',
      icon: <Shield className="w-5 h-5 text-cyan-500" />,
      badge: 'HOD',
    },
    {
      roleKey: 'faculty_dbms',
      name: 'Prof. R. Vignesh',
      role: 'Assistant Professor (DBMS)',
      campus: 'Apollo Institute of Technology (College)',
      icon: <BookOpen className="w-5 h-5 text-blue-500" />,
      badge: 'FACULTY',
    },
    {
      roleKey: 'principal_sch',
      name: 'Mrs. P. Shanthi',
      role: 'Headmistress / Principal',
      campus: 'Apollo Matriculation School (K-12)',
      icon: <School className="w-5 h-5 text-purple-500" />,
      badge: 'SCHOOL',
    },
    {
      roleKey: 'teacher_math',
      name: 'Mr. A. Ramesh',
      role: 'Class Teacher (10th-A Maths)',
      campus: 'Apollo Matriculation School (K-12)',
      icon: <GraduationCap className="w-5 h-5 text-emerald-500" />,
      badge: 'CLASS_TEACHER',
    },
    {
      roleKey: 'guest',
      name: 'Guest Explorer',
      role: 'Zero-Login Demo Visitor',
      campus: 'Sandboxed Read-Only Explorer',
      icon: <UserCheck className="w-5 h-5 text-slate-400" />,
      badge: 'GUEST',
    },
  ];

  const handleSelectPersona = async (roleKey: string) => {
    try {
      await demoLogin(roleKey);
      setIsDemoModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200 bg-mesh-light dark:bg-mesh-dark">
      {/* Sticky Sandbox Banner (Rendered when sandbox is active) */}
      <GuestBanner />

      {/* Top Header */}
      <GlobalHeader
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenDemoModal={() => setIsDemoModalOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">
        {/* Dynamic Multi-Tenant Sidebar */}
        <DynamicSidebar
          activeTab={activeTab}
          onSelectTab={onSelectTab}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Mobile Backdrop */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
          />
        )}

        {/* Main Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>

      {/* 1-Click Interactive Persona Switcher Modal */}
      <ModalDrawer
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        title="Instant Persona & Role Switcher"
        subtitle="1-Click login into any institutional role across College, School, or Trust levels"
        maxWidth="xl"
      >
        {/* 1-Click Zero-Login Ephemeral Sandboxes */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-900/25 via-slate-900 to-purple-900/25 border border-indigo-500/30 space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Zero-Login Ephemeral Guest Sandboxes
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Experience complete mark ledgers, attendance marking, and official report card generators in client memory with zero database writes.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                useSandboxStore.getState().enterSandbox('COLLEGE');
                setIsDemoModalOpen(false);
              }}
              className="p-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 group-hover:text-white">
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span>Launch College Sandbox</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Anna Univ R2021 Sem 4 • 40 CIA + 60 Ext</span>
            </button>
            <button
              onClick={() => {
                useSandboxStore.getState().enterSandbox('SCHOOL');
                setIsDemoModalOpen(false);
              }}
              className="p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-left transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300 group-hover:text-white">
                <School className="w-4 h-4 text-purple-400" />
                <span>Launch School Sandbox</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">10th Standard CBSE/State • Daily Periods</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 py-1 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
          <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
          <span>Or Sign In as Institutional Persona</span>
          <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
        </div>

        <div className="space-y-2.5 mt-2">
          {personas.map((p) => {
            const isCurrent = user?.fullName === p.name;

            return (
              <button
                key={p.roleKey}
                onClick={() => handleSelectPersona(p.roleKey)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all ${
                  isCurrent
                    ? 'bg-brand-500/10 border-brand-500/50 shadow-glow-indigo/10'
                    : 'bg-surface-elevated/40 hover:bg-surface-elevated/90 border-slate-200/80 dark:border-white/[0.06] hover:border-brand-500/30'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/60 dark:border-white/[0.08]">
                    {p.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {p.name}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{p.role}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[280px] sm:max-w-md">
                      {p.campus}
                    </p>
                  </div>
                </div>

                <StatusBadge status={p.badge} size="sm" />
              </button>
            );
          })}
        </div>
      </ModalDrawer>
    </div>
  );
};
