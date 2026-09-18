import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Search, GraduationCap, Building2, School, LogOut, ChevronDown, UserCheck, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/useAuthStore';
import { CampusSummary } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { InstitutionSwitcher } from '../auth/InstitutionSwitcher';

interface GlobalHeaderProps {
  onOpenMobileMenu?: () => void;
  onOpenDemoModal?: () => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ onOpenMobileMenu, onOpenDemoModal }) => {
  const { theme, toggleTheme } = useTheme();
  const { user, activeCampus, switchCampus, logout, isAuthenticated } = useAuthStore();
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();

  const campuses = user?.tenant?.campuses || [];

  return (
    <header className="sticky top-0 z-40 w-full h-16 border-b border-slate-200/80 dark:border-white/[0.08] bg-surface/85 dark:bg-obsidian-surface/85 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Brand Identity & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 via-indigo-600 to-cyan-500 p-0.5 shadow-glow-indigo flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight font-display text-slate-900 dark:text-white">
                OmniEdu
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20 uppercase tracking-widest hidden sm:inline">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[140px] sm:max-w-none">
              {user?.tenant?.name || 'Apollo Educational Group'}
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Institution Switcher */}
      <div className="hidden md:flex items-center">
        <InstitutionSwitcher />
      </div>

      {/* Right Controls: Search, Theme Toggle, Persona Switcher, Profile */}
      <div className="flex items-center gap-2.5">
        {/* Offline Engine / Network Telemetry Pill */}
        <div className="flex items-center">
          {isOnline ? (
            pendingCount === 0 ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                title="Connected to OmniEdu Cloud API"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="w-3 h-3" />
                <span className="hidden xl:inline">Online</span>
              </div>
            ) : (
              <button
                onClick={() => syncNow()}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all shadow-sm cursor-pointer"
                title="Click to flush cached offline attendance records to cloud database"
              >
                <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : `${pendingCount} Queued`}</span>
              </button>
            )
          ) : (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 animate-pulse"
              title="Running in Offline-First Mode: All operations queued in browser LocalStorage"
            >
              <WifiOff className="w-3 h-3" />
              <span>Offline ({pendingCount})</span>
            </div>
          )}
        </div>

        {/* Quick Demo Switcher Button */}
        <button
          onClick={onOpenDemoModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/25 transition-all"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Switch Persona</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors border border-transparent hover:border-slate-200 dark:hover:border-white/10"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 transition-transform rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700 transition-transform rotate-0 hover:-rotate-12" />
          )}
        </button>

        {/* Authenticated User Menu */}
        {isAuthenticated && user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {user.fullName.charAt(0)}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[130px]">
                {user.fullName}
              </p>
              <StatusBadge status={user.role || user.systemRole || 'MEMBER'} size="sm" className="mt-0.5" />
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
