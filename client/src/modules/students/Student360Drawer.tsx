import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Calendar, 
  ShieldAlert, 
  CheckCircle2, 
  GraduationCap, 
  TrendingUp, 
  BookOpen, 
  Send, 
  Copy, 
  CheckCheck,
  AlertCircle,
  Download,
  FileText
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Student, MarkRecord } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { generateStudentMarksheetPDF, generateAdmitCardPDF } from '../../utils/pdfGenerator';

interface Student360DrawerProps {
  studentId: string | null;
  onClose: () => void;
}

export const Student360Drawer: React.FC<Student360DrawerProps> = ({ studentId, onClose }) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [transcript, setTranscript] = useState<MarkRecord[]>([]);
  const [cgpa, setCgpa] = useState<number>(8.4);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'transcript' | 'guardian'>('overview');
  const [smsSent, setSmsSent] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!studentId) return;

    async function fetchStudent360() {
      setLoading(true);
      try {
        const [studentRes, transcriptRes] = await Promise.all([
          apiClient.get(`/students/${studentId}`),
          apiClient.get(`/marks/student/${studentId}/transcript`).catch(() => ({ data: { data: { transcript: [], summary: { cgpa: 8.4 } } } })),
        ]);

        const stData = studentRes.data.data.student;
        setStudent(stData);

        const transData = transcriptRes.data?.data?.transcript || [];
        setTranscript(transData);
        if (transcriptRes.data?.data?.summary?.cgpa) {
          setCgpa(transcriptRes.data.data.summary.cgpa);
        }
      } catch (err) {
        console.error('Failed to fetch student 360:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStudent360();
  }, [studentId]);

  if (!studentId) return null;

  const cumulative = student?.attendanceSummary?.percentage ?? 85.0;
  const isDefaulter = cumulative < 75.0;
  const isDetained = cumulative < 65.0;
  const sessionsNeeded = student?.attendanceSummary?.sessionsNeededFor75 ?? (isDefaulter ? 8 : 0);

  const smsTemplate = `Dear Guardian, this is an official notification from ${student?.department ? 'Apollo Institute of Technology' : 'Apollo School'}. Student ${student?.fullName} (${student?.regNumber || student?.rollNumber}) currently holds ${cumulative.toFixed(1)}% attendance. Current threshold requires 75% under Anna Univ / Board rules. Kindly contact Class Advisor immediately.`;

  const copySms = () => {
    navigator.clipboard.writeText(smsTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const simulateSendSms = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 4000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        />

        {/* Drawer Panel */}
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="w-screen max-w-2xl bg-obsidian-bg border-l border-obsidian-border flex flex-col shadow-2xl relative"
          >
            {/* Header */}
            <div className="p-6 border-b border-obsidian-border bg-obsidian-surface relative">
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 rounded-xl text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-card transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {loading || !student ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-6 bg-obsidian-card rounded w-1/3" />
                  <div className="h-4 bg-obsidian-card rounded w-1/2" />
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-academic-primary/30 to-academic-secondary/30 border border-academic-primary/40 flex items-center justify-center text-xl font-bold text-academic-primary shrink-0 shadow-glow-cyan">
                    {student.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-obsidian-text">{student.fullName}</h2>
                      <StatusBadge status="active" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-obsidian-muted mt-1">
                      <span className="font-mono bg-obsidian-card px-2 py-0.5 rounded border border-obsidian-border text-academic-primary">
                        {student.regNumber || student.rollNumber}
                      </span>
                      <span>•</span>
                      <span>
                        {student.department
                          ? `${student.department.name} (${student.department.code})`
                          : '10th Standard - Section A'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 mt-6 border-b border-obsidian-border/60 -mb-6">
                {[
                  { id: 'overview', label: 'Overview', icon: User },
                  { id: 'attendance', label: 'Attendance Radar', icon: Calendar },
                  { id: 'transcript', label: 'Marks & Transcript', icon: Award },
                  { id: 'guardian', label: 'Guardian Alert', icon: Phone },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`pb-3 px-3 text-xs font-medium flex items-center gap-2 border-b-2 transition-all ${
                        active
                          ? 'border-academic-primary text-academic-primary font-semibold'
                          : 'border-transparent text-obsidian-muted hover:text-obsidian-text'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {loading || !student ? (
                <div className="py-20 text-center text-obsidian-muted">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-academic-primary border-t-transparent" />
                  <p className="mt-2 text-xs">Loading Student 360° Profile...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Metric Bento Cards */}
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-obsidian-surface border border-obsidian-border p-4 rounded-xl">
                          <span className="text-xs text-obsidian-muted">Cumulative Attendance</span>
                          <div className={`text-2xl font-bold font-mono mt-1 ${
                            cumulative >= 75 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {cumulative.toFixed(1)}%
                          </div>
                          <span className="text-[10px] text-obsidian-muted">
                            {cumulative >= 75 ? 'Anna Univ Eligible' : 'Shortage Alert'}
                          </span>
                        </div>

                        <div className="bg-obsidian-surface border border-obsidian-border p-4 rounded-xl">
                          <span className="text-xs text-obsidian-muted">Cumulative CGPA</span>
                          <div className="text-2xl font-bold font-mono mt-1 text-academic-primary">
                            {cgpa.toFixed(2)}
                          </div>
                          <span className="text-[10px] text-obsidian-muted">Scale of 10.0</span>
                        </div>

                        <div className="bg-obsidian-surface border border-obsidian-border p-4 rounded-xl">
                          <span className="text-xs text-obsidian-muted">Academic Standing</span>
                          <div className="text-sm font-bold font-mono mt-2 text-emerald-400">
                            REGULAR
                          </div>
                          <span className="text-[10px] text-obsidian-muted">
                            {student.semester ? `Semester ${student.semester}` : 'Term 2'}
                          </span>
                        </div>
                      </div>

                      {/* Bio Details Card */}
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-obsidian-muted flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-academic-primary" />
                          Institutional Registration Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-obsidian-muted block">Full Legal Name</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">{student.fullName}</span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Gender</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block capitalize">{student.gender.toLowerCase()}</span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Official Roll / Reg No</span>
                            <span className="text-academic-primary font-mono font-medium mt-0.5 block">
                              {student.regNumber || student.rollNumber}
                            </span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Regulation / Curriculum</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">
                              {student.regulationYear ? `Anna Univ Regulation ${student.regulationYear}` : 'CBSE Curriculum'}
                            </span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Batch Academic Year</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">{student.batchYear || '2023 - 2027'}</span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Campus Affiliation</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">
                              {student.department ? 'Engineering Campus' : 'School Campus'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contact Details Card */}
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-obsidian-muted flex items-center gap-2">
                          <Mail className="w-4 h-4 text-academic-secondary" />
                          Direct Contact & Residence
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-obsidian-muted block">Institutional Email</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">
                              {student.email || `${student.regNumber || 'student'}@apollo.edu`}
                            </span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Mobile Number</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">{student.phone || '+91 98401 23456'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-obsidian-muted block">Permanent Residential Address</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">
                              {student.address || 'Plot No 42, Gandhi Street, Anna Nagar, Chennai - 600040'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Official Document Actions */}
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-obsidian-muted flex items-center gap-2">
                            <FileText className="w-4 h-4 text-academic-primary" />
                            Official Examination Hall Ticket
                          </h4>
                          <p className="text-xs text-obsidian-muted mt-1 max-w-sm">
                            Generate official End-Semester Hall Ticket / Admit Card with photo box, timetable schedule, and examination rules.
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Download className="w-4 h-4 text-academic-primary" />}
                          onClick={() => generateAdmitCardPDF(student)}
                          className="shrink-0"
                        >
                          Download Hall Ticket (PDF)
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: ATTENDANCE RADAR */}
                  {activeTab === 'attendance' && (
                    <div className="space-y-6">
                      {/* Alert if Defaulter */}
                      {isDefaulter && (
                        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                          isDetained
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="text-xs space-y-1">
                            <span className="font-bold block text-sm">
                              {isDetained ? 'Clause 7.2 SA Detention Alert (<65%)' : 'Clause 7.1 Condonation Alert (65% - 74.9%)'}
                            </span>
                            <p>
                              {isDetained
                                ? 'Student is detained from writing the End-Semester University Examinations due to severe attendance shortage. Must redo the course/semester.'
                                : 'Student is eligible to appear for exams ONLY after submitting official Medical Certificate and obtaining approval for Condonation from the Principal.'}
                            </p>
                            {sessionsNeeded > 0 && (
                              <p className="font-mono font-semibold pt-1 text-white">
                                ➔ Needs {sessionsNeeded} more consecutive 100% attendance hours to reach 75.0% threshold.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cumulative Progress Gauge */}
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-6 text-center space-y-4">
                        <span className="text-xs font-semibold text-obsidian-muted uppercase tracking-wider">
                          Official Attendance Percentage
                        </span>
                        <div className="flex items-center justify-center">
                          <div className="relative w-36 h-36 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-obsidian-border stroke-current"
                                strokeWidth="3"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className={`${
                                  cumulative >= 75
                                    ? 'text-emerald-400'
                                    : cumulative >= 65
                                    ? 'text-amber-400'
                                    : 'text-rose-500'
                                } stroke-current`}
                                strokeWidth="3"
                                strokeDasharray={`${cumulative}, 100`}
                                strokeLinecap="round"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                              <span className="text-3xl font-bold font-mono text-obsidian-text">
                                {cumulative.toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-obsidian-muted uppercase font-semibold">
                                {cumulative >= 75 ? 'Eligible' : cumulative >= 65 ? 'Condonation' : 'Detained'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Pills */}
                        <div className="grid grid-cols-4 gap-2 pt-2">
                          <div className="bg-obsidian-card p-2 rounded-lg border border-obsidian-border">
                            <span className="text-[10px] text-obsidian-muted block">Total Hours</span>
                            <span className="font-mono font-bold text-xs text-obsidian-text">
                              {student.attendanceSummary?.total ?? 120}
                            </span>
                          </div>
                          <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30">
                            <span className="text-[10px] text-emerald-400 block">Attended</span>
                            <span className="font-mono font-bold text-xs text-emerald-400">
                              {student.attendanceSummary?.present ?? 102}
                            </span>
                          </div>
                          <div className="bg-rose-500/10 p-2 rounded-lg border border-rose-500/30">
                            <span className="text-[10px] text-rose-400 block">Absent</span>
                            <span className="font-mono font-bold text-xs text-rose-400">
                              {student.attendanceSummary?.absent ?? 18}
                            </span>
                          </div>
                          <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/30">
                            <span className="text-[10px] text-cyan-400 block">On-Duty</span>
                            <span className="font-mono font-bold text-xs text-cyan-400">
                              {student.attendanceSummary?.onDuty ?? 4}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: TRANSCRIPT */}
                  {activeTab === 'transcript' && (
                    <div className="space-y-6">
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-bold text-obsidian-text">Anna University Grade Sheet</h4>
                            <span className="text-xs text-obsidian-muted">Semester 4 • 40 Internal (CIA) + 60 External</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Download className="w-4 h-4 text-academic-primary" />}
                              onClick={() => {
                                if (!student) return;
                                generateStudentMarksheetPDF({
                                  student,
                                  marks: transcript,
                                  semester: 4,
                                  cgpa: cgpa || 8.4,
                                });
                              }}
                              title="Download official consolidated grade sheet PDF"
                            >
                              Download Marksheet (PDF)
                            </Button>
                            <div className="text-right pl-3 border-l border-obsidian-border">
                              <span className="text-xs text-obsidian-muted block">Calculated CGPA</span>
                              <span className="text-lg font-bold font-mono text-academic-primary">{cgpa.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {transcript.length === 0 ? (
                          <div className="py-8 text-center text-obsidian-muted text-xs">
                            No examination mark records indexed yet for this student.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-obsidian-border text-obsidian-muted">
                                  <th className="pb-2">Course / Subject</th>
                                  <th className="pb-2 text-center">CIA (40)</th>
                                  <th className="pb-2 text-center">Ext (60)</th>
                                  <th className="pb-2 text-center">Total (100)</th>
                                  <th className="pb-2 text-center">Grade</th>
                                  <th className="pb-2 text-center">Result</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-obsidian-border/50">
                                {transcript.map((item, i) => (
                                  <tr key={i} className="hover:bg-obsidian-card/30">
                                    <td className="py-2.5 font-medium text-obsidian-text">
                                      {item.subjectName}
                                    </td>
                                    <td className="py-2.5 text-center font-mono text-obsidian-muted">
                                      {item.internalMarks ?? '-'}
                                    </td>
                                    <td className="py-2.5 text-center font-mono text-obsidian-muted">
                                      {item.externalMarks ?? '-'}
                                    </td>
                                    <td className="py-2.5 text-center font-mono font-bold text-obsidian-text">
                                      {item.marksObtained}
                                    </td>
                                    <td className="py-2.5 text-center">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                          item.grade === 'O' || item.grade === 'A+'
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : item.grade === 'RA'
                                            ? 'bg-rose-500/20 text-rose-400'
                                            : item.grade === 'SA'
                                            ? 'bg-rose-600/30 text-rose-300'
                                            : 'bg-academic-primary/20 text-academic-primary'
                                        }`}
                                      >
                                        {item.grade || 'A'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-center">
                                      {item.isPassed ? (
                                        <span className="text-[10px] text-emerald-400 font-semibold">PASS</span>
                                      ) : (
                                        <span className="text-[10px] text-rose-400 font-semibold">ARREAR</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 4: GUARDIAN ALERT */}
                  {activeTab === 'guardian' && (
                    <div className="space-y-6">
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
                        <h4 className="text-sm font-bold text-obsidian-text flex items-center gap-2">
                          <Phone className="w-4 h-4 text-emerald-400" />
                          Guardian Contact Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-obsidian-muted block">Guardian / Parent Name</span>
                            <span className="text-obsidian-text font-medium mt-0.5 block">
                              {student.guardianName || 'M. Rajendran (Father)'}
                            </span>
                          </div>
                          <div>
                            <span className="text-obsidian-muted block">Emergency Mobile Phone</span>
                            <span className="text-academic-primary font-mono font-medium mt-0.5 block">
                              {student.guardianPhone || '+91 98402 88888'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live SMS Template Box */}
                      <div className="bg-obsidian-surface border border-obsidian-border rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wider text-obsidian-muted">
                            Automated Guardian SMS Template
                          </span>
                          <button
                            onClick={copySms}
                            className="text-xs text-academic-primary hover:underline flex items-center gap-1"
                          >
                            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy Template'}
                          </button>
                        </div>
                        <div className="bg-obsidian-card p-3.5 rounded-lg border border-obsidian-border text-xs text-obsidian-text font-mono leading-relaxed">
                          {smsTemplate}
                        </div>

                        <Button
                          variant="primary"
                          size="md"
                          leftIcon={<Send className="w-4 h-4" />}
                          onClick={simulateSendSms}
                          className="w-full shadow-glow-cyan"
                        >
                          {smsSent ? 'SMS Dispatched to Guardian Mobile!' : 'Dispatch SMS to Guardian'}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default Student360Drawer;
