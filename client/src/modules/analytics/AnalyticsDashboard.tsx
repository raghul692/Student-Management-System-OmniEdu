import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2,
  AlertTriangle,
  Users,
  BookOpen,
  CreditCard,
  Activity,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  TrendingUp,
  Calendar,
  Layers,
  GraduationCap,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface AtRiskStudent {
  studentId: string;
  rollNo: string;
  name: string;
  riskScore: number;
  attendancePercent: number;
  avgMarksPercent: number;
  feeOutstanding: number;
  flags: string[];
}

interface OverviewMetrics {
  totalStudents: number;
  totalStaff: number;
  attendanceRate: number;
  avgCgpa: number;
  feeCollectionRate: number;
  atRiskCount: number;
}

interface AttendanceTrendDay {
  date: string;
  total: number;
  present: number;
  percentage: number;
}

interface FeeTrendMonth {
  month: string;
  collected: number;
}

interface DepartmentStat {
  departmentId: string;
  name: string;
  code: string;
  studentCount: number;
  avgAttendance: number;
  passRate: number;
}

interface CohortStat {
  batchYear: string;
  totalStudents: number;
  activeStudents: number;
  retentionRate: number;
  passRate: number;
}

type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

const riskColor = (score: number): RiskLevel => {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
};

const RISK_STYLES: Record<RiskLevel, string> = {
  HIGH: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  LOW: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
};

export const AnalyticsDashboard: React.FC = () => {
  const { activeCampus } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'fees' | 'departments'>('overview');
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [atRisk, setAtRisk] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  // Phase H Trend states
  const [attendanceTrends, setAttendanceTrends] = useState<{ days: AttendanceTrendDay[]; overallPercentage: number } | null>(null);
  const [feeTrends, setFeeTrends] = useState<{
    totalAssigned: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
    trends: FeeTrendMonth[];
  } | null>(null);
  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [cohortStats, setCohortStats] = useState<CohortStat[]>([]);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, atRiskRes] = await Promise.all([
        apiClient.get('/analytics/overview'),
        apiClient.get('/analytics/at-risk'),
      ]);
      setOverview(overviewRes.data?.data?.overview || null);
      setAtRisk(atRiskRes.data?.data?.atRiskStudents || []);
    } catch {
      console.error('Failed to load analytics overview');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrends = useCallback(async () => {
    setTrendsLoading(true);
    try {
      const [attRes, feeRes, deptRes, cohortRes] = await Promise.allSettled([
        apiClient.get('/analytics/attendance/trends?days=14'),
        apiClient.get('/analytics/fees/trends'),
        apiClient.get('/analytics/academic/department'),
        apiClient.get('/analytics/academic/cohort'),
      ]);

      if (attRes.status === 'fulfilled' && attRes.value.data?.data) {
        setAttendanceTrends(attRes.value.data.data);
      }
      if (feeRes.status === 'fulfilled' && feeRes.value.data?.data) {
        setFeeTrends(feeRes.value.data.data);
      }
      if (deptRes.status === 'fulfilled' && deptRes.value.data?.data?.departments) {
        setDeptStats(deptRes.value.data.data.departments);
      }
      if (cohortRes.status === 'fulfilled' && cohortRes.value.data?.data?.cohorts) {
        setCohortStats(cohortRes.value.data.data.cohorts);
      }
    } catch (err) {
      console.error('Failed to load trend analytics:', err);
    } finally {
      setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    loadTrends();
  }, [activeCampus?.id, loadOverview, loadTrends]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-brand-400" />
            Intelligence & Trends Analytics
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Executive telemetry, historical attendance trends, cohort retention, and fee velocity.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-obsidian-card p-1 rounded-xl border border-white/[0.07]">
          {[
            { key: 'overview', label: 'Overview & Radar', icon: Activity },
            { key: 'attendance', label: 'Attendance Trends', icon: Calendar },
            { key: 'fees', label: 'Fee Velocity', icon: CreditCard },
            { key: 'departments', label: 'Dept & Cohorts', icon: Layers },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Overview & Radar */}
      {activeTab === 'overview' && (
        <>
          {/* Overview Metrics */}
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                {
                  label: 'Total Students',
                  value: overview.totalStudents.toLocaleString(),
                  icon: <Users className="w-4 h-4" />,
                  color: 'text-brand-400',
                  bg: 'bg-brand-500/10',
                },
                {
                  label: 'Total Staff',
                  value: overview.totalStaff.toLocaleString(),
                  icon: <BookOpen className="w-4 h-4" />,
                  color: 'text-indigo-400',
                  bg: 'bg-indigo-500/10',
                },
                {
                  label: 'Attendance Rate',
                  value: `${overview.attendanceRate.toFixed(1)}%`,
                  icon: <Activity className="w-4 h-4" />,
                  color: overview.attendanceRate >= 75 ? 'text-emerald-400' : 'text-amber-400',
                  bg: overview.attendanceRate >= 75 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
                },
                {
                  label: 'Average CGPA',
                  value: overview.avgCgpa.toFixed(2),
                  icon: <Target className="w-4 h-4" />,
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10',
                },
                {
                  label: 'Fee Collection',
                  value: `${overview.feeCollectionRate.toFixed(1)}%`,
                  icon: <CreditCard className="w-4 h-4" />,
                  color: overview.feeCollectionRate >= 80 ? 'text-emerald-400' : 'text-rose-400',
                  bg: overview.feeCollectionRate >= 80 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
                },
                {
                  label: 'At-Risk Students',
                  value: overview.atRiskCount.toString(),
                  icon: <AlertTriangle className="w-4 h-4" />,
                  color: overview.atRiskCount === 0 ? 'text-emerald-400' : 'text-rose-400',
                  bg: overview.atRiskCount === 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
                },
              ].map((card, idx) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4"
                >
                  <div className={`inline-flex p-2 rounded-xl ${card.bg} mb-3`}>
                    <span className={card.color}>{card.icon}</span>
                  </div>
                  <div className="text-xl font-bold text-slate-100">{card.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{card.label}</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* At-Risk Radar */}
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-500/10 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-200">At-Risk Student Radar</h2>
                  <p className="text-xs text-slate-500">AI-powered composite risk scoring (Attendance + Marks + Fees)</p>
                </div>
              </div>
              {atRisk.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{atRisk.length} flagged</span>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                </div>
              )}
            </div>

            {atRisk.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
                <Zap className="w-10 h-10 opacity-30" />
                <p className="text-sm">No at-risk students detected</p>
                <p className="text-xs text-slate-600">All students are within acceptable thresholds</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {atRisk.map((student, idx) => {
                  const level = riskColor(student.riskScore);
                  const isExpanded = expandedStudent === student.studentId;

                  return (
                    <motion.div
                      key={student.studentId}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedStudent(isExpanded ? null : student.studentId)}
                    >
                      <div className="px-5 py-3.5 flex items-center gap-4">
                        {/* Risk Score Indicator */}
                        <div className="shrink-0 relative w-10 h-10">
                          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <circle
                              cx="18"
                              cy="18"
                              r="15"
                              fill="none"
                              stroke={level === 'HIGH' ? '#f43f5e' : level === 'MEDIUM' ? '#f59e0b' : '#10b981'}
                              strokeWidth="3"
                              strokeDasharray={`${(student.riskScore / 100) * 94.2} 94.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-300">
                            {student.riskScore}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-slate-200">{student.name}</span>
                            <span className="text-xs text-slate-500">{student.rollNo}</span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${RISK_STYLES[level]}`}>
                              {level} RISK
                            </span>
                          </div>
                          {/* Mini metric bars */}
                          <div className="flex gap-3 mt-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <Activity className="w-3 h-3 text-slate-600" />
                              <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${student.attendancePercent >= 75 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${Math.min(100, student.attendancePercent)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">{student.attendancePercent.toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <BookOpen className="w-3 h-3 text-slate-600" />
                              <div className="w-16 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${student.avgMarksPercent >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`}
                                  style={{ width: `${Math.min(100, student.avgMarksPercent)}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-slate-500">{student.avgMarksPercent.toFixed(0)}%</span>
                            </div>
                            {student.feeOutstanding > 0 && (
                              <span className="text-[10px] text-rose-400 flex items-center gap-0.5">
                                <CreditCard className="w-3 h-3" />
                                ₹{student.feeOutstanding.toLocaleString()} due
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>

                      {/* Expanded Flags */}
                      <AnimatePresence>
                        {isExpanded && student.flags.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 flex flex-wrap gap-2">
                              {student.flags.map((flag) => (
                                <span
                                  key={flag}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                >
                                  ⚠ {flag}
                                </span>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 2: Attendance Trends */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  14-Day Attendance Trajectory
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Daily presence rate across all active classes and departments.
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">14-Day Average</span>
                <div className="text-xl font-bold text-emerald-400">
                  {attendanceTrends?.overallPercentage ? `${attendanceTrends.overallPercentage.toFixed(1)}%` : '—'}
                </div>
              </div>
            </div>

            {attendanceTrends?.days && attendanceTrends.days.length > 0 ? (
              <div className="space-y-3">
                <div className="grid grid-cols-7 sm:grid-cols-14 gap-2 items-end h-40 pt-4">
                  {attendanceTrends.days.map((day) => {
                    const heightPercent = Math.max(10, day.percentage);
                    const isGood = day.percentage >= 75;
                    return (
                      <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="relative w-full flex flex-col items-center">
                          <span className="text-[9px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-5">
                            {day.percentage.toFixed(0)}%
                          </span>
                          <div
                            className={`w-full rounded-t-lg transition-all duration-300 ${
                              isGood ? 'bg-emerald-500/40 group-hover:bg-emerald-500/60' : 'bg-rose-500/40 group-hover:bg-rose-500/60'
                            }`}
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 font-mono rotate-45 origin-left mt-2">
                          {day.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No historical attendance records found for this period.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Fee Trends */}
      {activeTab === 'fees' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Invoiced</span>
              <div className="text-xl font-bold text-slate-100 mt-1">
                ₹{(feeTrends?.totalAssigned || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4">
              <span className="text-xs text-slate-400">Total Collected</span>
              <div className="text-xl font-bold text-emerald-400 mt-1">
                ₹{(feeTrends?.totalCollected || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4">
              <span className="text-xs text-slate-400">Outstanding Overdue</span>
              <div className="text-xl font-bold text-rose-400 mt-1">
                ₹{(feeTrends?.outstanding || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4">
              <span className="text-xs text-slate-400">Collection Velocity</span>
              <div className="text-xl font-bold text-indigo-400 mt-1">
                {feeTrends?.collectionRate || 0}%
              </div>
            </div>
          </div>

          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-400" />
              Monthly Inflow Realization
            </h3>
            {feeTrends?.trends && feeTrends.trends.length > 0 ? (
              <div className="space-y-3">
                {feeTrends.trends.map((t) => (
                  <div key={t.month} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="font-mono">{t.month}</span>
                      <span className="font-bold text-emerald-400">₹{t.collected.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${Math.min(100, (t.collected / (feeTrends.totalCollected || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No monthly payment realization logs available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Departments & Cohorts */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          {/* Department Breakdown */}
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Departmental Performance Matrix
            </h3>
            {deptStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-slate-400">
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Enrolled</th>
                      <th className="py-2.5 px-3">Avg Attendance</th>
                      <th className="py-2.5 px-3">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {deptStats.map((d) => (
                      <tr key={d.departmentId} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-3 font-semibold text-slate-200">{d.name}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{d.code}</td>
                        <td className="py-3 px-3 text-slate-300">{d.studentCount}</td>
                        <td className="py-3 px-3">
                          <span className={d.avgAttendance >= 75 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                            {d.avgAttendance}%
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={d.passRate >= 60 ? 'text-indigo-400 font-bold' : 'text-rose-400 font-bold'}>
                            {d.passRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No departmental metrics recorded.</p>
            )}
          </div>

          {/* Cohort Retention */}
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-6">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sky-400" />
              Cohort Retention & Completion
            </h3>
            {cohortStats.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cohortStats.map((c) => (
                  <div key={c.batchYear} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-200">Batch {c.batchYear}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400">
                        {c.activeStudents}/{c.totalStudents} Active
                      </span>
                    </div>
                    <div className="flex justify-between text-xs pt-2">
                      <span className="text-slate-400">Retention</span>
                      <span className="font-bold text-emerald-400">{c.retentionRate}%</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Pass Rate</span>
                      <span className="font-bold text-indigo-400">{c.passRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">No cohort progression data recorded.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AnalyticsDashboard;
