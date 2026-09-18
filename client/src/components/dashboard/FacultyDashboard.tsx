import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  CalendarCheck,
  Award,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { TabKey } from '../layout/DynamicSidebar';

interface FacultyDashboardProps {
  onNavigate?: (tab: TabKey) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ onNavigate }) => {
  const { user, activeInstitution, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const assignedClasses = [
    {
      id: 'cls-1',
      code: isCollege ? 'CS8591' : 'SCI10',
      subject: isCollege ? 'Computer Networks' : 'Science & Technology',
      target: isCollege ? 'B.E. CSE - Year III (Sec A)' : 'Class 10th - Section A',
      studentsCount: 30,
      attendanceRate: 89.2,
      pendingAttendanceToday: false,
    },
    {
      id: 'cls-2',
      code: isCollege ? 'CS8592' : 'SCI09',
      subject: isCollege ? 'OOAD & Design Patterns' : 'Basic Science',
      target: isCollege ? 'B.E. CSE - Year III (Sec B)' : 'Class 9th - Section B',
      studentsCount: 28,
      attendanceRate: 85.7,
      pendingAttendanceToday: true,
    },
    {
      id: 'cls-3',
      code: isCollege ? 'CS8581' : 'LAB10',
      subject: isCollege ? 'Networks Laboratory' : 'Science Practical Lab',
      target: isCollege ? 'B.E. CSE - Batch 1' : 'Class 10th - Group 1',
      studentsCount: 15,
      attendanceRate: 94.0,
      pendingAttendanceToday: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Faculty Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-surface/90 via-surface-elevated/80 to-surface/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> {isCollege ? 'Faculty Portal' : 'Teacher Portal'}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Role: {user?.role || 'FACULTY'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user?.fullName || 'Educator'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeInstitution?.name || (isCollege ? 'Apollo Institute of Technology' : 'Apollo School')} •{' '}
            {isCollege ? 'Department of Computer Science & Engineering' : 'Secondary Education Wing'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate?.('attendance')}
            className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-brand-500/20"
          >
            <CalendarCheck className="w-4 h-4" />
            <span>Mark Attendance</span>
          </button>
          <button
            onClick={() => onNavigate?.('marks')}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/20"
          >
            <Award className="w-4 h-4" />
            <span>Enter CIA Marks</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>My Assigned Courses</span>
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{assignedClasses.length}</p>
          <p className="text-[11px] text-slate-400">3 Theory & 1 Practical Lab</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Students Taught</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">73</p>
          <p className="text-[11px] text-slate-400">Across 2 Sections</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Average Attendance</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">89.6%</p>
          <p className="text-[11px] text-emerald-400 font-semibold">&uarr; 3.2% above cutoff</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>CIA Entry Status</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">Cycle 1 Ready</p>
          <p className="text-[11px] text-slate-400">Due in 5 Days</p>
        </div>
      </div>

      {/* Assigned Subjects & Attendance Shortcuts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span>My Assigned Classes & Courses</span>
          </h2>
          <span className="text-xs text-slate-400">Active Academic Term</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assignedClasses.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {item.code}
                  </span>
                  {item.pendingAttendanceToday ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Attendance Pending
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Recorded
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-400 transition-colors">
                  {item.subject}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{item.target}</p>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/[0.04] text-xs">
                  <span className="text-slate-400">{item.studentsCount} Students</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                    {item.attendanceRate}% Attendance
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => onNavigate?.('attendance')}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-obsidian-surface hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-300 transition-colors text-center"
                >
                  Mark Hour
                </button>
                <button
                  onClick={() => onNavigate?.('marks')}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-obsidian-surface hover:bg-purple-600 hover:text-white text-slate-700 dark:text-slate-300 transition-colors text-center"
                >
                  Enter CIA
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Teaching Schedule */}
      <div className="p-6 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>Today's Assigned Lecture Hours</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Your teaching slots for {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('timetable')}
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            Open Full Timetable &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { hour: '09:35 - 10:25 (Hour 2)', code: 'CS8591', subject: 'Computer Networks', class: 'CSE III-A', room: 'LH-201' },
            { hour: '11:35 - 12:25 (Hour 4)', code: 'CS8592', subject: 'OOAD & Design', class: 'CSE III-B', room: 'LH-203' },
            { hour: '14:15 - 16:00 (Hour 6-7)', code: 'CS8581', subject: 'Networks Lab', class: 'Batch 1', room: 'Network Lab' },
          ].map((slot, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-slate-50/50 dark:bg-obsidian-surface/60 border border-slate-200 dark:border-white/[0.06] space-y-1.5"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span className="flex items-center gap-1 font-bold text-indigo-400">
                  <Clock className="w-3 h-3" /> {slot.hour}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10">{slot.room}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{slot.subject}</h4>
              <p className="text-[11px] text-slate-400">{slot.class} • {slot.code}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
