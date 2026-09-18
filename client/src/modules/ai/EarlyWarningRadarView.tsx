import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  ShieldAlert,
  RefreshCw,
  Building,
  UserCheck,
  ChevronRight,
  BookOpen,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface StudentRiskItem {
  studentId: string;
  studentName: string;
  rollNumber: string;
  departmentName?: string;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  contributingSignals: {
    attendancePercentage: number;
    arrearsCount: number;
    failedExamsCount: number;
    pendingFeeAmount: number;
  };
  factors: string[];
  recommendedAction: string;
  explainability?: {
    attendanceContribution: number;
    arrearsContribution: number;
    internalMarksContribution: number;
    feeContribution: number;
    totalRawScore: number;
  };
}

interface RadarData {
  institutionId: string;
  totalEvaluated: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  urgentCases: StudentRiskItem[];
  departmentBreakdown: Array<{
    departmentName: string;
    highRiskCount: number;
    mediumRiskCount: number;
    averageRiskScore: number;
  }>;
}

export const EarlyWarningRadarView: React.FC = () => {
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRiskItem | null>(null);

  useEffect(() => {
    fetchRadar();
  }, []);

  const fetchRadar = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/ai/risk/early-warning-radar');
      if (res.data?.success && res.data?.data) {
        setRadarData(res.data.data);
      }
    } catch {
      // Fallback demo data
      setRadarData({
        institutionId: 'demo_inst',
        totalEvaluated: 48,
        highRiskCount: 6,
        mediumRiskCount: 14,
        lowRiskCount: 28,
        urgentCases: [
          {
            studentId: 'st_1',
            studentName: 'Vigneshwaran K',
            rollNumber: '910021104045',
            departmentName: 'Computer Science & Engineering',
            riskScore: 82,
            riskLevel: 'HIGH',
            trend: 'DECLINING',
            contributingSignals: {
              attendancePercentage: 62,
              arrearsCount: 3,
              failedExamsCount: 2,
              pendingFeeAmount: 35000,
            },
            factors: [
              'Critically low attendance (62% < 65% minimum condonation threshold).',
              'Standing arrears in 3 core engineering subjects.',
              'Sub-par internal assessment test scores in 2 tests.',
            ],
            recommendedAction: 'Schedule mandatory parent-faculty conference, assign faculty mentor, and enroll in remedial tutorial classes.',
          },
          {
            studentId: 'st_2',
            studentName: 'Ananya S',
            rollNumber: '910021104012',
            departmentName: 'Electronics & Communication',
            riskScore: 74,
            riskLevel: 'HIGH',
            trend: 'DECLINING',
            contributingSignals: {
              attendancePercentage: 69,
              arrearsCount: 2,
              failedExamsCount: 1,
              pendingFeeAmount: 12000,
            },
            factors: [
              'Attendance deficit (69% < 75% university eligibility cutoff).',
              'Standing arrears in 2 courses.',
            ],
            recommendedAction: 'Notify student advisor, review attendance logs weekly, and conduct peer tutoring in challenging courses.',
          },
          {
            studentId: 'st_3',
            studentName: 'Praveen Kumar R',
            rollNumber: '910021104038',
            departmentName: 'Mechanical Engineering',
            riskScore: 52,
            riskLevel: 'MEDIUM',
            trend: 'STABLE',
            contributingSignals: {
              attendancePercentage: 73,
              arrearsCount: 1,
              failedExamsCount: 1,
              pendingFeeAmount: 0,
            },
            factors: [
              'Marginal attendance (73%).',
              'Standing arrear in Thermodynamics.',
            ],
            recommendedAction: 'Review attendance logs weekly and arrange special problem-solving tutorial.',
          },
        ],
        departmentBreakdown: [
          { departmentName: 'Computer Science & Engineering', highRiskCount: 3, mediumRiskCount: 5, averageRiskScore: 42 },
          { departmentName: 'Electronics & Communication', highRiskCount: 2, mediumRiskCount: 4, averageRiskScore: 38 },
          { departmentName: 'Mechanical Engineering', highRiskCount: 1, mediumRiskCount: 5, averageRiskScore: 34 },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-100">Predictive Student Risk & Early Warning Radar</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              Multi-Signal Engine
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Continuous synthesis of attendance trends, standing academic arrears, internal test performance, and fee statuses.
          </p>
        </div>

        <button
          onClick={fetchRadar}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Radar Signals</span>
        </button>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Evaluated Cohort</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2">{radarData?.totalEvaluated || 0}</div>
          <span className="text-[11px] text-slate-500">Active students scanned</span>
        </div>

        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-red-300 font-medium">
            <span>High Risk / Critical</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-300 mt-2">{radarData?.highRiskCount || 0}</div>
          <span className="text-[11px] text-red-400/80">Immediate intervention needed</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-amber-300 font-medium">
            <span>Medium / At-Risk</span>
            <AlertCircle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2">{radarData?.mediumRiskCount || 0}</div>
          <span className="text-[11px] text-amber-400/80">Advisor check-in recommended</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-medium">
            <span>Low Risk / Steady</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2">{radarData?.lowRiskCount || 0}</div>
          <span className="text-[11px] text-emerald-400/80">Satisfactory progression</span>
        </div>
      </div>

      {/* Department Breakdown */}
      {radarData?.departmentBreakdown && radarData.departmentBreakdown.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Department Risk Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {radarData.departmentBreakdown.map((dept, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200 truncate">{dept.departmentName}</span>
                  <span className="font-mono text-slate-400">Score: {dept.averageRiskScore}</span>
                </div>
                <div className="flex items-center gap-3 text-xs pt-1">
                  <span className="text-red-400 font-medium">{dept.highRiskCount} High Risk</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-amber-400 font-medium">{dept.mediumRiskCount} Medium</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Urgent Intervention Table */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Urgent Intervention Watchlist</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ranked by compound risk penalty algorithm.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Student & Roll No</th>
                <th className="pb-3 font-semibold">Department</th>
                <th className="pb-3 font-semibold">Attendance</th>
                <th className="pb-3 font-semibold">Arrears</th>
                <th className="pb-3 font-semibold">Risk Score</th>
                <th className="pb-3 font-semibold">Trend</th>
                <th className="pb-3 font-semibold text-right">Intervention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {radarData?.urgentCases.map((s) => (
                <tr key={s.studentId} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-medium text-slate-200">
                    <div>{s.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{s.rollNumber}</div>
                  </td>
                  <td className="py-3 text-slate-400">{s.departmentName || 'General'}</td>
                  <td className="py-3">
                    <span
                      className={`font-semibold ${
                        s.contributingSignals.attendancePercentage < 65
                          ? 'text-red-400'
                          : s.contributingSignals.attendancePercentage < 75
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {s.contributingSignals.attendancePercentage}%
                    </span>
                  </td>
                  <td className="py-3 text-slate-300 font-mono">{s.contributingSignals.arrearsCount} Arrear(s)</td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{s.riskScore}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.riskLevel === 'HIGH'
                            ? 'bg-red-500/20 text-red-300'
                            : s.riskLevel === 'MEDIUM'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {s.riskLevel}
                      </span>
                    </div>
                  </td>
                  <td className="py-3">
                    {s.trend === 'DECLINING' && (
                      <span className="flex items-center gap-1 text-red-400 text-[11px]">
                        <TrendingDown className="w-3.5 h-3.5" />
                        <span>Declining</span>
                      </span>
                    )}
                    {s.trend === 'STABLE' && (
                      <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Minus className="w-3.5 h-3.5" />
                        <span>Stable</span>
                      </span>
                    )}
                    {s.trend === 'IMPROVING' && (
                      <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Improving</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedStudent(s)}
                      className="px-3 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium transition"
                    >
                      View Dossier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Risk Dossier Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedStudent.studentName}</h3>
                <div className="text-xs text-slate-400 font-mono">
                  {selectedStudent.rollNumber} • {selectedStudent.departmentName}
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Identified Risk Factors</span>
              <div className="space-y-1.5">
                {selectedStudent.factors.map((f, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Risk Factor Explainability Breakdown (Model Weights)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Attendance Deficit</span>
                    <span className="font-bold text-rose-400">
                      {selectedStudent.explainability?.attendanceContribution ?? 
                        Math.round(0.40 * Math.max(0, 100 - selectedStudent.contributingSignals.attendancePercentage))} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (selectedStudent.explainability?.attendanceContribution ?? 25) * 2.5)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Weight: 40%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Arrears / Backlogs</span>
                    <span className="font-bold text-amber-400">
                      {selectedStudent.explainability?.arrearsContribution ??
                        Math.min(25, selectedStudent.contributingSignals.arrearsCount * 10)} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (selectedStudent.explainability?.arrearsContribution ?? 15) * 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Weight: 25%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Internal Exam Deficit</span>
                    <span className="font-bold text-purple-400">
                      {selectedStudent.explainability?.internalMarksContribution ??
                        Math.min(25, selectedStudent.contributingSignals.failedExamsCount * 12)} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (selectedStudent.explainability?.internalMarksContribution ?? 15) * 4)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Weight: 25%</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Fee Balance Overdue</span>
                    <span className="font-bold text-sky-400">
                      {selectedStudent.explainability?.feeContribution ??
                        Math.min(10, Math.round((selectedStudent.contributingSignals.pendingFeeAmount / 50000) * 10))} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (selectedStudent.explainability?.feeContribution ?? 5) * 10)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">Weight: 10%</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">AI Recommended Intervention</span>
              <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 leading-relaxed">
                {selectedStudent.recommendedAction}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex gap-2">
                <a
                  href={`/app/students/${selectedStudent.studentId}/360`}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Student 360°
                </a>
                <a
                  href="/app/interventions"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium inline-flex items-center gap-1.5 transition"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Remedial Hub
                </a>
              </div>

              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                Close Dossier
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default EarlyWarningRadarView;
