import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award,
  CalendarCheck,
  Clock,
  Download,
  AlertCircle,
  BookOpen,
  CheckCircle2,
  FileSpreadsheet,
  GraduationCap,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { TabKey } from '../layout/DynamicSidebar';

interface StudentDashboardProps {
  onNavigate?: (tab: TabKey) => void;
}

interface PersonalSubject {
  id: string;
  code: string;
  name: string;
  credits: number;
  facultyName: string;
  attendancePct: number;
  ciaMarks: number;
  totalCIA: number;
  status: 'ELIGIBLE' | 'SHORTAGE';
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, activeInstitution, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [loading, setLoading] = useState(true);
  const [attendancePercentage, setAttendancePercentage] = useState<number>(86.5);
  const [totalClasses, setTotalClasses] = useState<number>(140);
  const [attendedClasses, setAttendedClasses] = useState<number>(121);
  const [gpa, setGpa] = useState<string>('8.45');
  const [feeStatus, setFeeStatus] = useState<{ status: string; balance: number }>({
    status: 'PAID',
    balance: 0,
  });

  const [subjects, setSubjects] = useState<PersonalSubject[]>([
    {
      id: 'sub-1',
      code: isCollege ? 'CS8591' : 'ENG101',
      name: isCollege ? 'Computer Networks' : 'English Literature',
      credits: isCollege ? 4 : 3,
      facultyName: isCollege ? 'Dr. Arul Kumar' : 'Mrs. Shanthi',
      attendancePct: 91.2,
      ciaMarks: 36,
      totalCIA: 40,
      status: 'ELIGIBLE',
    },
    {
      id: 'sub-2',
      code: isCollege ? 'CS8592' : 'MAT102',
      name: isCollege ? 'Object Oriented Analysis & Design' : 'Mathematics',
      credits: isCollege ? 3 : 4,
      facultyName: isCollege ? 'Prof. Priya D' : 'Mr. Ramesh',
      attendancePct: 88.0,
      ciaMarks: 34,
      totalCIA: 40,
      status: 'ELIGIBLE',
    },
    {
      id: 'sub-3',
      code: isCollege ? 'EC8691' : 'SCI103',
      name: isCollege ? 'Microprocessors & Microcontrollers' : 'General Science',
      credits: isCollege ? 4 : 4,
      facultyName: isCollege ? 'Dr. Vikram S' : 'Mrs. Malathi',
      attendancePct: 73.5,
      ciaMarks: 29,
      totalCIA: 40,
      status: 'SHORTAGE',
    },
    {
      id: 'sub-4',
      code: isCollege ? 'CS8501' : 'SOC104',
      name: isCollege ? 'Theory of Computation' : 'Social Science',
      credits: isCollege ? 4 : 3,
      facultyName: isCollege ? 'Prof. K. Venkatesh' : 'Mr. Joseph',
      attendancePct: 92.5,
      ciaMarks: 38,
      totalCIA: 40,
      status: 'ELIGIBLE',
    },
  ]);

  useEffect(() => {
    async function loadStudentTelemetry() {
      try {
        setLoading(true);
        // Student-scoped live attendance query
        const summaryRes = await apiClient.get('/attendance/summary').catch(() => null);
        if (summaryRes?.data?.data?.summary?.overallPercentage) {
          const pct = summaryRes.data.data.summary.overallPercentage;
          setAttendancePercentage(pct);
        }
      } catch (err) {
        console.error('Failed loading student telemetry', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudentTelemetry();
  }, [user?.id]);

  const isBelowCutoff = attendancePercentage < 75;

  return (
    <div className="space-y-6">
      {/* Student Welcome Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-surface/90 via-surface-elevated/80 to-surface/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Student Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {(user as any)?.regNumber || (user as any)?.rollNumber || 'STU-2023-042'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome, {user?.fullName || 'Student'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeInstitution?.name || (isCollege ? 'Apollo Institute of Technology' : 'Apollo School')} •{' '}
            {isCollege ? 'B.E. Computer Science • Semester 5' : 'Standard 10th-A'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            onClick={() => onNavigate?.('reports' as TabKey)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25"
          >
            <Download className="w-4 h-4" />
            <span>Download My Transcript</span>
          </button>
        </div>
      </div>

      {/* Defaulter Warning Banner if Attendance < 75% */}
      {isBelowCutoff && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Attendance Shortage Alert (SA Cutoff &lt; 75%)</p>
            <p>
              Your cumulative attendance is currently <span className="font-bold underline">{attendancePercentage.toFixed(1)}%</span>.
              According to university/board regulations, you must maintain at least 75.0% to remain eligible for end-semester examinations.
              Please consult your Faculty Advisor immediately.
            </p>
          </div>
        </div>
      )}

      {/* Personal KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Meter Card */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Personal Attendance
            </span>
            <span
              className={`p-2 rounded-xl ${
                isBelowCutoff
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {attendancePercentage.toFixed(1)}%
              </span>
              <span
                className={`text-[11px] font-bold uppercase ${
                  isBelowCutoff ? 'text-amber-500' : 'text-emerald-500'
                }`}
              >
                {isBelowCutoff ? 'Defaulter Risk' : 'Eligible'}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/[0.06] mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBelowCutoff ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(attendancePercentage, 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              Attended: {attendedClasses} / {totalClasses} hours
            </p>
          </div>
        </div>

        {/* GPA / Academic Standing */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isCollege ? 'Current CGPA' : 'Cumulative Score'}
            </span>
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {isCollege ? gpa : '88.4%'}
              </span>
              <span className="text-[11px] font-bold text-indigo-400">First Class Distinction</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {isCollege ? 'Regulation 2021 Grading Scale' : 'Class Ranking: Top 5%'}
            </p>
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isCollege ? 'Registered Courses' : 'Enrolled Subjects'}
            </span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {subjects.length}
              </span>
              <span className="text-[11px] font-bold text-slate-400">Active Curriculum</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 font-mono">
              {isCollege ? '15 Earned Credits This Sem' : 'All Core Subjects Registered'}
            </p>
          </div>
        </div>

        {/* Tuition / Fee Status */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tuition Fee Clearance
            </span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {feeStatus.status}
              </span>
              <span className="text-[11px] font-bold text-emerald-500">No Dues</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Exam Hall Ticket: <span className="text-emerald-400 font-bold">Generated & Ready</span>
            </p>
          </div>
        </div>
      </div>

      {/* Enrolled Courses & Continuous Assessment Table */}
      <div className="p-6 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>{isCollege ? 'Course Assessments & Attendance' : 'Subject Progress & CIA Marks'}</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live continuous internal assessment (CIA) marks and subject-wise attendance breakdown
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">{subjects.length} Subjects</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/[0.08]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-obsidian-surface/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-white/[0.08]">
              <tr>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Instructor</th>
                <th className="py-3 px-4 text-center">Credits</th>
                <th className="py-3 px-4 text-center">Attendance</th>
                <th className="py-3 px-4 text-center">CIA Score</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
              {subjects.map((sub) => {
                const isShortage = sub.attendancePct < 75;
                return (
                  <tr key={sub.id} className="hover:bg-slate-500/5 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{sub.name}</div>
                      <div className="text-[11px] font-mono text-slate-400">{sub.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                      {sub.facultyName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-semibold">
                      {sub.credits}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-bold font-mono">
                        <span className={isShortage ? 'text-amber-500' : 'text-emerald-500'}>
                          {sub.attendancePct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="font-bold font-mono text-slate-900 dark:text-white">
                        {sub.ciaMarks}
                      </span>
                      <span className="text-slate-400 font-mono"> / {sub.totalCIA}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isShortage
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {isShortage ? 'Attendance Shortage' : 'Eligible'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Today's Schedule Matrix Preview */}
      <div className="p-6 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>Today's Lecture Schedule</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Timetable slots scheduled for your division today
            </p>
          </div>
          <button
            onClick={() => onNavigate?.('timetable')}
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
          >
            View Full Matrix &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { hour: '08:45 - 09:35', code: 'CS8591', title: 'Computer Networks', room: 'LH-201', state: 'COMPLETED' },
            { hour: '09:35 - 10:25', code: 'CS8592', title: 'OOAD Lab Theory', room: 'LH-201', state: 'COMPLETED' },
            { hour: '10:45 - 11:35', code: 'EC8691', title: 'Microprocessors', room: 'EC-Lab 2', state: 'CURRENT' },
            { hour: '11:35 - 12:25', code: 'CS8501', title: 'Theory of Computation', room: 'LH-201', state: 'UPCOMING' },
          ].map((slot, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                slot.state === 'CURRENT'
                  ? 'bg-indigo-500/10 border-indigo-500/40 shadow-sm'
                  : 'bg-slate-50/50 dark:bg-obsidian-surface/60 border-slate-200 dark:border-white/[0.06]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {slot.hour}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-bold">
                  {slot.room}
                </span>
              </div>
              <h3 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                {slot.title}
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-1">{slot.code}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
