import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarCheck,
  AlertTriangle,
  Award,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { TabKey } from '../layout/DynamicSidebar';

interface HodDashboardProps {
  onNavigate?: (tab: TabKey) => void;
}

export const HodDashboard: React.FC<HodDashboardProps> = ({ onNavigate }) => {
  const { user, activeInstitution, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [deptStudentsCount, setDeptStudentsCount] = useState<number>(120);
  const [deptFacultyCount, setDeptFacultyCount] = useState<number>(8);
  const [deptAttendance, setDeptAttendance] = useState<number>(87.2);
  const [deptDefaulters, setDeptDefaulters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHodTelemetry() {
      try {
        setLoading(true);
        // Load department defaulters
        const defaultersRes = await apiClient.get('/attendance/defaulters').catch(() => null);
        if (defaultersRes?.data?.data?.defaulters) {
          setDeptDefaulters(defaultersRes.data.data.defaulters);
        }

        // Load department staff count
        const staffRes = await apiClient.get('/staff').catch(() => null);
        if (staffRes?.data?.data?.staff) {
          setDeptFacultyCount(staffRes.data.data.staff.length);
        }
      } catch (err) {
        console.error('Failed loading HOD telemetry', err);
      } finally {
        setLoading(false);
      }
    }

    loadHodTelemetry();
  }, [activeInstitution?.id]);

  return (
    <div className="space-y-6">
      {/* Department Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-surface/90 via-surface-elevated/80 to-surface/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <GraduationCap className="w-3 h-3" /> Head of Department
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Dept Scope: {isCollege ? 'Computer Science & Engineering (CSE)' : 'Senior Secondary'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Department Leadership Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeInstitution?.name || (isCollege ? 'Apollo Institute of Technology' : 'Apollo School')} •{' '}
            Academic Year 2024 - 2025
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate?.('students')}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-indigo-600/20"
          >
            <Users className="w-4 h-4" />
            <span>Dept Students</span>
          </button>
          <button
            onClick={() => onNavigate?.('staff' as TabKey)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Dept Faculty</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Department Enrolled</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{deptStudentsCount}</p>
          <p className="text-[11px] text-slate-400">Batches 2021 to 2024</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Faculty & Lecturers</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <GraduationCap className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{deptFacultyCount}</p>
          <p className="text-[11px] text-slate-400">1 HOD + {deptFacultyCount - 1} Faculty</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Dept Attendance Avg</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{deptAttendance}%</p>
          <p className="text-[11px] text-emerald-400 font-semibold">&ge; 75% University Threshold</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Dept Defaulters (&lt; 75%)</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-amber-500">{deptDefaulters.length}</p>
          <p className="text-[11px] text-slate-400">Requires Advisory Counseling</p>
        </div>
      </div>

      {/* Department Defaulters Radar Section */}
      <div className="p-6 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Department Attendance Defaulters Radar (&lt; 75.0% Cutoff)</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Students at risk of examination debarment in this department
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('defaulters')}
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            Open Full Radar &rarr;
          </button>
        </div>

        {deptDefaulters.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/[0.08] rounded-2xl">
            No attendance defaulters in this department. All students meet the 75% cutoff threshold!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-obsidian-surface/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/[0.08]">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Reg / Roll No</th>
                  <th className="py-3 px-4 text-center">Semester / Class</th>
                  <th className="py-3 px-4 text-center">Attendance %</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                {deptDefaulters.slice(0, 5).map((d: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{d.fullName}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{d.regNumber || d.rollNumber}</td>
                    <td className="py-3 px-4 text-center text-slate-400">{d.semester || '5'}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-amber-500">
                      {d.percentage ? d.percentage.toFixed(1) : (d.attendanceSummary?.percentage ?? 68.0).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate?.('defaulters')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                      >
                        Issue Warning Notice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
