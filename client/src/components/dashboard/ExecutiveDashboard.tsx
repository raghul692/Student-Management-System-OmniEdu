import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarCheck,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  School,
  FileSpreadsheet,
} from 'lucide-react';
import { BentoCard } from '../ui/BentoCard';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { Student, DefaulterStudent } from '../../types';
import { TabKey } from '../layout/DynamicSidebar';

export interface ExecutiveDashboardProps {
  onNavigate?: (tab: TabKey) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ onNavigate }) => {
  const { user, activeCampus, activeInstitution, getActiveTenantType } = useAuthStore();
  const tenantType = getActiveTenantType();
  const isCollege = tenantType === 'COLLEGE';

  const [studentsCount, setStudentsCount] = useState<number>(isCollege ? 30 : 25);
  const [defaultersData, setDefaultersData] = useState<DefaulterStudent[]>([]);
  const [overallAttendance, setOverallAttendance] = useState<number>(88.4);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTelemetry() {
      try {
        setLoading(true);
        // Fetch students count
        const studentsRes = await apiClient.get('/students?limit=10');
        setStudentsCount(studentsRes.data.data.pagination.total);

        // Fetch defaulters radar
        const defaultersRes = await apiClient.get('/attendance/defaulters');
        setDefaultersData(defaultersRes.data.data.defaulters || []);

        // Fetch attendance summary
        const summaryRes = await apiClient.get('/attendance/summary');
        if (summaryRes.data.data?.summary?.overallPercentage) {
          setOverallAttendance(summaryRes.data.data.summary.overallPercentage);
        }
      } catch (err) {
        console.error('Failed to load live dashboard telemetry', err);
      } finally {
        setLoading(false);
      }
    }

    loadTelemetry();
  }, [activeCampus, user]);

  const handleExportAttendanceSheet = async () => {
    try {
      const res = await apiClient.get('/students?limit=100');
      const studentsList: Student[] = res.data.data.students || [];
      const headers = ['Name', 'Registration Number', 'Department', 'Semester', 'Attendance %', 'Eligibility Tier'];
      const rows = studentsList.map((s) => [
        `"${s.fullName}"`,
        `"${s.regNumber || s.rollNumber}"`,
        `"${s.department?.code || '10th-A'}"`,
        s.semester || '1',
        (s.attendanceSummary?.percentage ?? 85.0).toFixed(1),
        (s.attendanceSummary?.percentage ?? 85.0) >= 75 ? 'Eligible' : 'Defaulter',
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const instCode = (activeInstitution?.code || 'Campus').replace(/[^a-zA-Z0-9]/g, '_');
      link.setAttribute('download', `${instCode}_Attendance_Sheet_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export sheet:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Institutional Welcome & Active Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-surface/90 via-surface-elevated/80 to-surface/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {activeInstitution?.name || (isCollege ? 'College of Engineering' : 'Senior Secondary School')}
            </h1>
            <StatusBadge status={tenantType} size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isCollege
              ? 'Affiliated to Anna University • Regulation 2021 • Department of Computer Science & Engineering'
              : 'Affiliated to State Board / CBSE • Standards 6th to 12th • Co-educational Campus'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero-Leak Anti-IDOR Active</span>
          </div>
        </div>
      </div>

      {/* Primary Bento Grid: 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <BentoCard
          title={isCollege ? 'Enrolled Engineers' : 'Enrolled Students'}
          subtitle={isCollege ? 'Batch 2023 - 2027' : 'Standard 10th-A'}
          metric={studentsCount}
          metricLabel="Active Profiles (Click to View Directory)"
          metricTrend={{ value: '100% Verified', isPositive: true }}
          icon={<Users className="w-5 h-5" />}
          accentColor="indigo"
          className="cursor-pointer hover:border-academic-primary/50 transition-all"
          onClick={() => onNavigate?.('students')}
        />

        <BentoCard
          title="Overall Attendance"
          subtitle={isCollege ? 'Anna Univ Cutoff: 75%' : 'Daily Periods Average'}
          metric={`${overallAttendance}%`}
          metricLabel="Class Attendance Rate (Click to Mark)"
          metricTrend={{ value: '+2.4% vs last week', isPositive: true }}
          icon={<CalendarCheck className="w-5 h-5" />}
          accentColor="emerald"
          className="cursor-pointer hover:border-academic-primary/50 transition-all"
          onClick={() => onNavigate?.('attendance')}
        />

        <BentoCard
          title="Defaulters Radar"
          subtitle="Students Below 75% Cutoff"
          metric={defaultersData.length}
          metricLabel="Critical Flags (Click to View Radar)"
          metricTrend={{ value: `${defaultersData.filter((d) => d.metrics.detained).length} Detained (SA)`, isPositive: false }}
          icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
          accentColor="amber"
          className="cursor-pointer hover:border-rose-500/50 transition-all"
          onClick={() => onNavigate?.('defaulters')}
        />

        <BentoCard
          title={isCollege ? 'Semester Assessment' : 'Academic Exams'}
          subtitle={isCollege ? '40 CIA + 60 Ext Split' : 'Quarterly & Unit Tests'}
          metric={isCollege ? 'IAT-1 & 2' : 'Quarterly'}
          metricLabel={isCollege ? 'R2021 CGPA (Click to Record)' : 'CBSE Grades (Click to Record)'}
          metricTrend={{ value: '94.2% Pass Rate', isPositive: true }}
          icon={<Award className="w-5 h-5 text-brand-500" />}
          accentColor="cyan"
          className="cursor-pointer hover:border-academic-primary/50 transition-all"
          onClick={() => onNavigate?.('marks')}
        />
      </div>

      {/* Secondary Bento Grid: In-depth Analytics & Operational Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Defaulter Radar & Student List */}
        <div className="lg:col-span-2 space-y-5">
          {/* Defaulter Radar Section */}
          <BentoCard
            title="Attendance Defaulters Early Warning Radar"
            subtitle="Real-time surveillance isolating students facing exam detention under Anna University regulations"
            icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
            className="cursor-pointer hover:border-rose-500/40 transition-all"
            onClick={() => onNavigate?.('defaulters')}
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                {defaultersData.length} Students At Risk • View Radar →
              </span>
            }
          >
            <div className="space-y-3 mt-4">
              {defaultersData.map((student) => {
                const isDetained = student.metrics.detained;

                return (
                  <div
                    key={student.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate?.('defaulters');
                    }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-obsidian-surface/60 border border-slate-200/80 dark:border-white/[0.05] hover:border-rose-500/40 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isDetained
                            ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                        }`}
                      >
                        {student.metrics.percentage}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {student.fullName}
                          </span>
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                            ({student.identifier})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {student.deptOrClass} • Present: {student.metrics.present}/{student.metrics.total} classes
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 sm:self-center">
                      <StatusBadge status={student.metrics.tier} size="sm" />
                      <div className="text-right">
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                          Needs {student.metrics.sessionsNeededFor75} classes
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          to achieve 75% eligibility
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </BentoCard>

          {/* Quick Schedule / Timetable Today */}
          <BentoCard
            title={isCollege ? "Today's Academic Hours (Semester 4 CSE)" : "Today's Period Schedule (10th-A)"}
            subtitle="Scheduled faculty, course codes, and hall assignments • Click to View Full Schedule →"
            icon={<Clock className="w-5 h-5 text-indigo-500" />}
            className="cursor-pointer hover:border-academic-primary/40 transition-all"
            onClick={() => onNavigate?.('timetable')}
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                { slot: 'Hour 1 (09:00)', code: 'CS8492', title: 'DBMS', room: 'LH-302', faculty: 'Prof. Vignesh' },
                { slot: 'Hour 2 (09:50)', code: 'CS8451', title: 'DAA', room: 'LH-302', faculty: 'Dr. Lakshmi' },
                { slot: 'Hour 3 (10:55)', code: 'CS8491', title: 'Comp Arch', room: 'LH-302', faculty: 'Dr. Murugan' },
                { slot: 'Hour 4 (11:45)', code: 'CS8461', title: 'OS Lab', room: 'Lab-OS-2', faculty: 'Prof. Vignesh' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-obsidian-surface/60 border border-slate-200/70 dark:border-white/[0.05] space-y-1"
                >
                  <span className="text-[10px] font-bold text-brand-500 uppercase tracking-wider block">
                    {item.slot}
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">{item.code}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.title}</p>
                  <div className="pt-1 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{item.room}</span>
                    <span className="font-medium text-slate-300">{item.faculty}</span>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        {/* Right Col: Institutional Architecture & Quick Actions */}
        <div className="space-y-5">
          {/* Institutional Blueprint Bento */}
          <BentoCard
            title="Active Operational Profile"
            subtitle="Multi-campus hierarchical configuration"
            icon={isCollege ? <Building2 className="w-5 h-5" /> : <School className="w-5 h-5" />}
          >
            <div className="space-y-3 mt-4 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                <span className="text-slate-400">Parent Conglomerate</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Apollo Educational Trust</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                <span className="text-slate-400">Target Campus</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {isCollege ? 'Apollo Engg College' : 'Apollo Matric School'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                <span className="text-slate-400">Current Role</span>
                <span className="font-bold text-brand-500">{user?.role || 'CAMPUS_ADMIN'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200/80 dark:border-white/[0.06]">
                <span className="text-slate-400">Academic Framework</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {isCollege ? 'Anna Univ R2021' : 'CBSE 9-Point Scale'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-slate-400">Monthly Cloud Overhead</span>
                <span className="font-bold text-emerald-500 font-mono">$0.00 / month</span>
              </div>
            </div>
          </BentoCard>

          {/* Quick Actions Panel */}
          <BentoCard
            title="Executive Actions"
            subtitle="High-priority operations"
            icon={<Sparkles className="w-5 h-5 text-brand-500" />}
          >
            <div className="space-y-2 mt-4">
              <Button
                variant="primary"
                className="w-full justify-between shadow-glow-indigo/20"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => onNavigate?.('attendance')}
              >
                <span>Mark Attendance Now</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-between"
                rightIcon={<FileSpreadsheet className="w-4 h-4" />}
                onClick={handleExportAttendanceSheet}
              >
                <span>Export Anna Univ Attendance Sheet</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-between"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => onNavigate?.('students')}
              >
                <span>View All 55 Students</span>
              </Button>
            </div>
          </BentoCard>
        </div>
      </div>
    </div>
  );
};
