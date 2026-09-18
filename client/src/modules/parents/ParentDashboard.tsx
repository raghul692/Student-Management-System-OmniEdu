import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, Award, CreditCard, FileText, Bell,
  ChevronDown, CheckCircle2, XCircle, Clock, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Card, CardHeader, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { LoadingSpinner } from '../../components/design-system/LoadingSpinner';

interface LinkedChild {
  linkId: string;
  relationship: string;
  student: {
    id: string;
    fullName: string;
    regNumber?: string;
    rollNumber?: string;
    department?: { name: string };
    schoolClass?: { standard: number; section: string };
    semester?: number;
  };
}

export const ParentDashboard: React.FC = () => {
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'attendance' | 'marks' | 'fees' | 'assignments' | 'notices'>('summary');

  // Child data states
  const [summaryData, setSummaryData] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [marksData, setMarksData] = useState<any[]>([]);
  const [feesData, setFeesData] = useState<any>(null);
  const [assignmentsData, setAssignmentsData] = useState<any[]>([]);
  const [noticesData, setNoticesData] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    const fetchChildren = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/parents/children');
        const list = res.data.data?.children || [];
        setChildren(list);
        if (list.length > 0) {
          setSelectedStudentId(list[0].student.id);
        }
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    };
    fetchChildren();
  }, []);

  useEffect(() => {
    if (!selectedStudentId) return;

    const fetchChildDetails = async () => {
      setTabLoading(true);
      try {
        const [summaryRes, attRes, marksRes, feesRes, assignRes, noticesRes] = await Promise.all([
          apiClient.get(`/parents/student/${selectedStudentId}`).catch(() => ({ data: { data: null } })),
          apiClient.get(`/parents/student/${selectedStudentId}/attendance`).catch(() => ({ data: { data: null } })),
          apiClient.get(`/parents/student/${selectedStudentId}/marks`).catch(() => ({ data: { data: { marks: [] } } })),
          apiClient.get(`/parents/student/${selectedStudentId}/fees`).catch(() => ({ data: { data: null } })),
          apiClient.get(`/parents/student/${selectedStudentId}/assignments`).catch(() => ({ data: { data: { submissions: [] } } })),
          apiClient.get(`/parents/student/${selectedStudentId}/notices`).catch(() => ({ data: { data: { notices: [] } } })),
        ]);

        setSummaryData(summaryRes.data.data);
        setAttendanceData(attRes.data.data);
        setMarksData(marksRes.data.data?.marks || []);
        setFeesData(feesRes.data.data);
        setAssignmentsData(assignRes.data.data?.submissions || []);
        setNoticesData(noticesRes.data.data?.notices || []);
      } catch {
        // Handled
      } finally {
        setTabLoading(false);
      }
    };

    fetchChildDetails();
  }, [selectedStudentId]);

  if (loading) {
    return (
      <div className="p-12 flex justify-center">
        <LoadingSpinner size="lg" label="Loading Parent Portal..." />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-10 max-w-md mx-auto text-center space-y-4">
        <div className="p-4 rounded-full bg-amber-500/10 text-amber-400 w-16 h-16 mx-auto flex items-center justify-center">
          <Users className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">No Linked Students</h2>
        <p className="text-xs text-slate-400">
          Your parent account is currently not linked to any student record in this institution. Please contact the administrative office.
        </p>
      </div>
    );
  }

  const currentChild = children.find((c) => c.student.id === selectedStudentId)?.student;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header & Child Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Parent Portal</h1>
            <Badge variant="success" size="sm">Verified Access</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time attendance, academic performance, assignments, and fee status.
          </p>
        </div>

        {/* Child Selector (if multiple children) */}
        {children.length > 1 && (
          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 pr-10 text-sm font-medium text-slate-200 focus:outline-none focus:border-brand-500 cursor-pointer"
            >
              {children.map((c) => (
                <option key={c.student.id} value={c.student.id}>
                  {c.student.fullName} ({c.student.rollNumber || c.student.regNumber || 'Student'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Child Summary Hero */}
      {currentChild && (
        <Card padding="md" className="bg-gradient-to-r from-slate-900 to-slate-850">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {currentChild.fullName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100">{currentChild.fullName}</h2>
                <p className="text-xs text-slate-400">
                  {currentChild.department?.name || (currentChild.schoolClass ? `Class ${currentChild.schoolClass.standard}-${currentChild.schoolClass.section}` : '')}
                  {currentChild.semester ? ` • Semester ${currentChild.semester}` : ''}
                </p>
              </div>
            </div>

            {/* Quick KPI stats */}
            <div className="grid grid-cols-3 gap-3 text-center shrink-0">
              <div className="px-4 py-2 bg-slate-950/40 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Attendance</div>
                <div className={`text-base font-bold mt-0.5 ${
                  (attendanceData?.percent || 100) < 75 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {attendanceData?.percent !== null ? `${attendanceData?.percent || 0}%` : 'N/A'}
                </div>
              </div>
              <div className="px-4 py-2 bg-slate-950/40 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Exams Graded</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{marksData.length}</div>
              </div>
              <div className="px-4 py-2 bg-slate-950/40 rounded-xl border border-slate-800">
                <div className="text-[11px] text-slate-400">Fee Due</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  ₹{(feesData?.outstanding || 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto text-xs font-medium">
        {[
          { key: 'summary', label: 'Summary', icon: <Award className="w-4 h-4" /> },
          { key: 'attendance', label: 'Attendance History', icon: <Calendar className="w-4 h-4" /> },
          { key: 'marks', label: 'Examination Marks', icon: <Award className="w-4 h-4" /> },
          { key: 'fees', label: 'Fee Payments', icon: <CreditCard className="w-4 h-4" /> },
          { key: 'assignments', label: 'Assignments', icon: <FileText className="w-4 h-4" /> },
          { key: 'notices', label: 'Notices & Circulars', icon: <Bell className="w-4 h-4" /> },
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
      {tabLoading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" label="Loading student records..." />
        </div>
      ) : (
        <div className="space-y-4">
          {activeTab === 'summary' && summaryData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card padding="md">
                <CardHeader title="Attendance Standing" subtitle="Mandated minimum 75% threshold" />
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Current Attendance Rate</span>
                    <span className="font-bold text-slate-200">{summaryData.attendance?.percentage || 0}%</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Sessions Attended</span>
                    <span className="font-bold text-emerald-400">{summaryData.attendance?.present || 0}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Sessions Absent</span>
                    <span className="font-bold text-rose-400">{summaryData.attendance?.absent || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card padding="md">
                <CardHeader title="Account Dues & Settlement" subtitle="Current term invoice balance" />
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Total Net Payable</span>
                    <span className="font-bold text-slate-200">₹{(feesData?.totalPayable || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">Paid Receipts</span>
                    <span className="font-bold text-emerald-400">₹{(feesData?.totalPaid || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-400">Pending Dues</span>
                    <span className="font-bold text-amber-400">₹{(feesData?.outstanding || 0).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'attendance' && attendanceData && (
            <Card padding="md">
              <CardHeader
                title="Detailed Attendance Log"
                subtitle={`Total: ${attendanceData.total} | Present: ${attendanceData.present} | Absent: ${attendanceData.absent}`}
              />
              <CardContent>
                <div className="divide-y divide-slate-800/60">
                  {attendanceData.records?.map((rec: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 text-xs">
                      <div className="flex items-center gap-3">
                        {rec.status === 'PRESENT' || rec.status === 'ON_DUTY' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-400" />
                        )}
                        <div>
                          <div className="text-slate-200 font-medium">{rec.subjectName || 'Regular Session'}</div>
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

          {activeTab === 'marks' && (
            <Card padding="md">
              <CardHeader title="Subject Marks & Examination Grades" subtitle="All recorded evaluations" />
              <CardContent>
                {marksData.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No examination marks published yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/60 text-slate-400 uppercase">
                        <tr>
                          <th className="px-3 py-2">Subject</th>
                          <th className="px-3 py-2">Exam</th>
                          <th className="px-3 py-2 text-right">Marks</th>
                          <th className="px-3 py-2 text-center">Grade</th>
                          <th className="px-3 py-2 text-right">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {marksData.map((m: any, idx: number) => (
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
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'fees' && feesData && (
            <Card padding="md">
              <CardHeader title="Fee Structures & Breakdown" subtitle="Term assignments and fee ledger" />
              <CardContent className="space-y-4">
                <div className="divide-y divide-slate-800">
                  {feesData.assignments?.map((fa: any, idx: number) => (
                    <div key={idx} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-200">{fa.feeStructure?.name || 'Academic Fee'}</div>
                        <div className="text-[11px] text-slate-500">Academic Year: {fa.feeStructure?.academicYear || 'Current'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-200">₹{fa.netPayable.toLocaleString()}</div>
                        <span className="text-[11px] text-slate-400">Due {fa.dueDate ? new Date(fa.dueDate).toLocaleDateString() : 'Immediate'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'assignments' && (
            <Card padding="md">
              <CardHeader title="Student Assignment Submissions" subtitle="Homework, lab reports, and projects" />
              <CardContent>
                {assignmentsData.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No assignments recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {assignmentsData.map((sub: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-slate-200">{sub.assignment?.title}</div>
                          <div className="text-[11px] text-slate-500">Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</div>
                        </div>
                        <Badge variant="info" size="sm">{sub.grade || 'Submitted'}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'notices' && (
            <Card padding="md">
              <CardHeader title="Institution Notices & Announcements" subtitle="Official circulars" />
              <CardContent>
                {noticesData.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6 text-center">No notices published.</p>
                ) : (
                  <div className="space-y-3">
                    {noticesData.map((n: any) => (
                      <div key={n.id} className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">{n.title}</span>
                          <span className="text-[11px] text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-400">{n.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
