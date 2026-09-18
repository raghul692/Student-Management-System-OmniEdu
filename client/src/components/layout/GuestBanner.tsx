import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Building2, School, RotateCcw, LogOut, Info } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';
import { Button } from '../ui/Button';

export const GuestBanner: React.FC = () => {
  const { 
    isSandbox, 
    sandboxCampus, 
    switchSandboxCampus, 
    resetSandboxData, 
    exitSandbox 
  } = useSandboxStore();

  if (!isSandbox) return null;

  const isCollege = sandboxCampus === 'COLLEGE';

  return (
    <motion.div
      initial={{ y: -48, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -48, opacity: 0 }}
      transition={{ type: 'spring', damping: 24, stiffness: 260 }}
      className="sticky top-0 z-50 w-full bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white border-b border-indigo-500/30 shadow-lg px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      {/* Left: Sandbox Indicator & Safe Mode Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-1 rounded-lg">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="font-bold tracking-wide uppercase text-[10px] text-indigo-300">
            Interactive Guest Sandbox
          </span>
        </div>
        <p className="hidden md:flex items-center gap-1.5 text-slate-300">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Zero-Database Writes: All attendance marks and grade edits are isolated in client memory.</span>
        </p>
      </div>

      {/* Middle & Right: Campus Quick Switcher & Controls */}
      <div className="flex items-center gap-2">
        {/* Campus Toggle Pill */}
        <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/10">
          <button
            onClick={() => switchSandboxCampus('COLLEGE')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              isCollege
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>College (Anna Univ)</span>
          </button>
          <button
            onClick={() => switchSandboxCampus('SCHOOL')}
            className={`px-3 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
              !isCollege
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <School className="w-3 h-3" />
            <span>K-12 School</span>
          </button>
        </div>

        {/* Reset State Button */}
        <button
          onClick={resetSandboxData}
          title="Revert all in-memory changes back to original baseline demo data"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors border border-white/15"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Reset State</span>
        </button>

        {/* Exit Sandbox Button */}
        <button
          onClick={exitSandbox}
          title="Exit sandbox mode and return to sign in"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          <span>Exit Sandbox</span>
        </button>
      </div>
    </motion.div>
  );
};
