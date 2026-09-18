import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, ArrowLeft, Calendar, Award, CreditCard, FileText,
  ShieldAlert, Sparkles, Phone, Mail, GraduationCap, CheckCircle2,
  XCircle, Clock
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Card, CardHeader, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { LoadingSpinner } from '../../components/design-system/LoadingSpinner';

export const Student360View: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'academics' | 'fees' | 'assignments' | 'interventions'>('overview');

  useEffect(() => {
    if (!id) return;
    const fetch360 = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/students/${id}/360`);
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load Student 360 profile.');
      } finally {
        setLoading(false);
      }
    };
    fetch360();
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="lg" label="Aggregating 360° student telemetry..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="p-4 rounded-full bg-rose-500/10 text-rose-400 w-16 h-16 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Access Denied or Not Found</h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
      </div>
    );
  }

  const { profile, attendance, academic, fees, assignments, ai, interventions } = data;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Bar with Back Nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">360° Intelligence</Badge>
          <Badge variant={profile.isActive ? 'success' : 'danger'} size="sm">
            {profile.isActive ? 'ACTIVE' : 'INACTIVE'}
          </Badge>
        </div>
      </div>

      {/* Hero Profile Card */}
      <Card padding="lg" className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand-500/20">
              {profile.fullName?.slice(0, 2).toUpperCase() || 'ST'}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-slate-100">{profile.fullName}</h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                {profile.regNumber && <span>Reg: <strong className="text-slate-200">{profile.regNumber}</strong></span>}
                {profile.rollNumber && <span>Roll: <strong className="text-slate-200">{profile.rollNumber}</strong></span>}
                {profile.department && <span>Dept: <strong className="text-slate-200">{profile.department}</strong></span>}
                {profile.schoolClass && <span>Class: <strong className="text-slate-200">{profile.schoolClass}</strong></span>}
                {profile.semester && <span>Sem: <strong className="text-slate-200">{profile.semester}</strong></span>}
              </div>
              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-500">
                {profile.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</span>}
                {profile.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</span>}
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6 shrink-0 text-center">
            <div>
              <div className="text-[11px] text-slate-400">Attendance</div>
              <div className={`text-lg font-bold mt-0.5 ${
                (attendance.percent || 100) < 75 ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {attendance.percent !== null ? `${attendance.percent}%` : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Backlogs</div>
              <div className={`text-lg font-bold mt-0.5 ${academic.failedSubjects > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
                {academic.failedSubjects}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Fee Due</div>
              <div className="text-lg font-bold text-slate-200 mt-0.5">
                ₹{fees.outstanding.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-medium">
        {[
          { key: 'overview', label: 'Overview & AI Risk', icon: <Sparkles className="w-4 h-4" /> },
          { key: 'attendance', label: 'Attendance', icon: <Calendar className="w-4 h-4" /> },
          { key: 'academics', label: 'Academics & Exams', icon: <Award className="w-4 h-4" /> },
          { key: 'fees', label: 'Fees & Finance', icon: <CreditCard className="w-4 h-4" /> },
          { key: 'assignments', label: 'Assignments', icon: <FileText className="w-4 h-4" /> },
          ...(interventions?.length ? [{ key: 'interventions', label: `Interventions (${interventions.length})`, icon: <ShieldAlert className="w-4 h-4" /> }] : []),
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all ${
              activeTab === t.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Predictive Risk Card */}
            <Card padding="md" glow={ai.latestRisk?.riskLevel === 'HIGH' || ai.latestRisk?.riskLevel === 'CRITICAL'}>
              <CardHeader
                title="Predictive AI Risk Snapshot"
                subtitle="Calculated across attendance, examination backlog, and financial telemetry"
                action={<Sparkles className="w-4 h-4 text-indigo-400" />}
              />
              <CardContent className="space-y-4">
                {ai.latestRisk ? (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <div>
                        <div className="text-xs text-slate-400">Risk Score</div>
                        <div className="text-2xl font-bold text-slate-100">{ai.latestRisk.riskScore} / 100</div>
                      </div>
                      <Badge variant={ai.latestRisk.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}>
                        {ai.latestRisk.riskLevel}
                      </Badge>
                    </div>

                    {ai.latestRisk.recommendedAction && (
                      <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-800/30 text-xs text-indigo-300">
                        <strong className="block text-indigo-200 mb-1">Recommended Action:</strong>
                        {ai.latestRisk.recommendedAction}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500 py-6 text-center">
                    No risk evaluation has been triggered yet for this student.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Attendance & Academics Mini Breakdown */}
            <Card padding="md">
              <CardHeader title="Academic Foundation Summary" subtitle="Performance indicators" />
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Logged Sessions</span>
                  <span className="text-slate-200 font-semibold">{attendance.totalRecords}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Passed Subjects Ratio</span>
                  <span className="text-slate-200 font-semibold">
                    {academic.recentMarks.length - academic.failedSubjects} / {academic.recentMarks.length}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-800/60">
                  <span className="text-slate-400">Total Net Fee Payable</span>
                  <span className="text-slate-200 font-semibold">₹{fees.totalPayable.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Total Fee Settled</span>
                  <span className="text-emerald-400 font-semibold">₹{fees.totalPaid.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'attendance' && (
          <Card padding="md">
            <CardHeader
              title="Recent Attendance Sessions"
              subtitle={`Last 14 tracked hours/periods (Overall: ${attendance.percent || 0}%)`}
            />
            <CardContent>
              <div className="divide-y divide-slate-800/60">
                {attendance.recent.map((rec: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                    <div className="flex items-center gap-3">
                      {rec.status === 'PRESENT' || rec.status === 'ON_DUTY' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                      <div>
                        <div className="text-slate-200 font-medium">{rec.subjectName || 'General Session'}</div>
                        <div className="text-[11px] text-slate-500">{new Date(rec.date).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <Badge variant={rec.status === 'PRESENT' ? 'success' : 'danger'} size="sm">
                      {rec.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'academics' && (
          <Card padding="md">
            <CardHeader title="Examination & Assessment Records" subtitle="Recent grades and CIA results" />
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/50 text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2">Subject</th>
                      <th className="px-3 py-2">Exam</th>
                      <th className="px-3 py-2 text-right">Score</th>
                      <th className="px-3 py-2 text-center">Grade</th>
                      <th className="px-3 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {academic.recentMarks.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2.5 font-medium text-slate-200">{m.subjectName}</td>
                        <td className="px-3 py-2.5 text-slate-400">{m.exam?.title || 'Exam'}</td>
                        <td className="px-3 py-2.5 text-right font-semibold">{m.marksObtained} / {m.maxMarks}</td>
                        <td className="px-3 py-2.5 text-center">{m.grade || '-'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <Badge variant={m.isPassed ? 'success' : 'danger'} size="sm">
                            {m.isPassed ? 'PASSED' : 'ARREAR'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'fees' && (
          <Card padding="md">
            <CardHeader title="Fee Assignments & Payments Ledger" subtitle="Account summary" />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="text-[11px] text-slate-400">Payable</div>
                  <div className="text-base font-bold text-slate-100 mt-0.5">₹{fees.totalPayable.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-emerald-950/20 rounded-xl border border-emerald-800/30">
                  <div className="text-[11px] text-emerald-400">Settled</div>
                  <div className="text-base font-bold text-emerald-300 mt-0.5">₹{fees.totalPaid.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-amber-950/20 rounded-xl border border-amber-800/30">
                  <div className="text-[11px] text-amber-400">Outstanding</div>
                  <div className="text-base font-bold text-amber-300 mt-0.5">₹{fees.outstanding.toLocaleString()}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'assignments' && (
          <Card padding="md">
            <CardHeader title="Recent Assignment Submissions" subtitle="Deliverables and evaluations" />
            <CardContent>
              {assignments.recent.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No assignments submitted yet.</p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {assignments.recent.map((sub: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <div className="text-slate-200 font-medium">{sub.assignment?.title || 'Assignment'}</div>
                        <div className="text-[11px] text-slate-500">Submitted {new Date(sub.submittedAt).toLocaleDateString()}</div>
                      </div>
                      <Badge variant="info" size="sm">{sub.grade || 'Submitted'}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'interventions' && (
          <Card padding="md">
            <CardHeader title="Staff Mentoring & Interventions History" subtitle="Active and resolved support plans" />
            <CardContent>
              <div className="space-y-3">
                {interventions.map((inv: any) => (
                  <div key={inv.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-200">{inv.title}</div>
                      <div className="text-[11px] text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</div>
                    </div>
                    <Badge variant={inv.status === 'RESOLVED' ? 'success' : 'warning'} size="sm">
                      {inv.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
