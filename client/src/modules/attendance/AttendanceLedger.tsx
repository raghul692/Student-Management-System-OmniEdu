import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Save, 
  Users, 
  Sparkles, 
  ChevronRight, 
  RotateCcw, 
  SlidersHorizontal,
  FileSpreadsheet,
  CheckCheck,
  Download
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Student, Course, SchoolClass, AttendanceStatus } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { generateMonthlyAttendanceRegisterPDF } from '../../utils/pdfGenerator';
import { enqueueOfflineAttendance } from '../../utils/offlineQueue';

interface AttendanceEntryState {
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
}

export const AttendanceLedger: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  // Selection states
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedHour, setSelectedHour] = useState<number>(1);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Data states
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Local Attendance Roster Map: studentId -> AttendanceEntryState
  const [roster, setRoster] = useState<Record<string, AttendanceEntryState>>({});

  // Fetch courses/classes and students on mount or campus switch
  useEffect(() => {
    async function loadMetadata() {
      setLoading(true);
      try {
        if (isCollege) {
          const courseRes = await apiClient.get('/academic/courses');
          const fetchedCourses: Course[] = courseRes.data.data.courses || [];
          setCourses(fetchedCourses);
          if (fetchedCourses.length > 0) {
            setSelectedCourseId(fetchedCourses[0].id);
          }
        } else {
          const classRes = await apiClient.get('/academic/classes');
          const fetchedClasses: SchoolClass[] = classRes.data.data.classes || [];
          setClasses(fetchedClasses);
          if (fetchedClasses.length > 0) {
            setSelectedClassId(fetchedClasses[0].id);
          }
        }

        // Fetch students for active campus
        const studentsRes = await apiClient.get('/students?limit=100');
        const fetchedStudents: Student[] = studentsRes.data.data.students || [];
        setStudents(fetchedStudents);

        // Initialize all students as PRESENT by default (standard industry ERP pattern)
        const initialRoster: Record<string, AttendanceEntryState> = {};
        fetchedStudents.forEach((st) => {
          initialRoster[st.id] = {
            studentId: st.id,
            status: 'PRESENT',
            remarks: '',
          };
        });
        setRoster(initialRoster);
      } catch (err: any) {
        console.error('Failed to load attendance metadata:', err);
        setToastMessage({ type: 'error', text: 'Failed to load student roster for attendance' });
      } finally {
        setLoading(false);
      }
    }

    loadMetadata();
  }, [activeCampus?.id, isCollege]);

  // Bulk actions
  const handleMarkAll = (status: AttendanceStatus) => {
    setRoster((prev) => {
      const updated = { ...prev };
      students.forEach((st) => {
        updated[st.id] = { ...updated[st.id], status };
      });
      return updated;
    });
  };

  const handleInvertAttendance = () => {
    setRoster((prev) => {
      const updated = { ...prev };
      students.forEach((st) => {
        const current = updated[st.id]?.status;
        updated[st.id] = {
          ...updated[st.id],
          status: current === 'PRESENT' ? 'ABSENT' : 'PRESENT',
        };
      });
      return updated;
    });
  };

  // Toggle single student status
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  // Handle submit batch
  const handleSubmitAttendance = async () => {
    setSubmitting(true);
    setToastMessage(null);
    try {
      const entries = Object.values(roster);
      if (entries.length === 0) {
        setToastMessage({ type: 'error', text: 'No students found in roster' });
        setSubmitting(false);
        return;
      }

      const payload: any = {
        date: selectedDate,
        entries: entries.map((e) => ({
          studentId: e.studentId,
          status: e.status,
          remarks: e.remarks || undefined,
        })),
      };

      if (isCollege) {
        payload.hour = selectedHour;
        if (selectedCourseId) payload.courseId = selectedCourseId;
      } else {
        payload.period = selectedPeriod;
        if (selectedClassId) payload.classId = selectedClassId;
      }

      // Check if browser is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueOfflineAttendance({
          tenantId: activeCampus?.id || 'offline_tenant',
          date: selectedDate,
          hour: isCollege ? selectedHour : undefined,
          period: !isCollege ? selectedPeriod : undefined,
          courseId: isCollege ? selectedCourseId : undefined,
          classId: !isCollege ? selectedClassId : undefined,
          records: payload.entries,
          summary: {
            total: totalStudents,
            present: presentCount,
            absent: absentCount,
            od: onDutyCount,
            late: lateCount,
          },
        });

        setToastMessage({
          type: 'success',
          text: `Offline Mode: ${entries.length} records safely cached in local storage. Automatic sync will flush when internet is restored.`,
        });
        setSubmitting(false);
        setTimeout(() => setToastMessage(null), 5000);
        return;
      }

      try {
        const res = await apiClient.post('/attendance/mark', payload);
        const savedCount = res.data?.data?.markedCount || res.data?.data?.createdCount || entries.length;

        setToastMessage({
          type: 'success',
          text: `Successfully committed attendance for ${savedCount} students!`,
        });

        // Auto clear toast after 4s
        setTimeout(() => setToastMessage(null), 4000);
      } catch (networkOrApiErr: any) {
        // If network failure / connection drop occurred during post, cache offline
        if (!networkOrApiErr.response) {
          enqueueOfflineAttendance({
            tenantId: activeCampus?.id || 'offline_tenant',
            date: selectedDate,
            hour: isCollege ? selectedHour : undefined,
            period: !isCollege ? selectedPeriod : undefined,
            courseId: isCollege ? selectedCourseId : undefined,
            classId: !isCollege ? selectedClassId : undefined,
            records: payload.entries,
            summary: {
              total: totalStudents,
              present: presentCount,
              absent: absentCount,
              od: onDutyCount,
              late: lateCount,
            },
          });

          setToastMessage({
            type: 'success',
            text: `Network unreachable: ${entries.length} records safely queued offline. Auto-sync will flush when server is reachable.`,
          });
          setTimeout(() => setToastMessage(null), 5000);
        } else {
          throw networkOrApiErr;
        }
      }
    } catch (err: any) {
      console.error('Failed to commit attendance:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to submit batch attendance';
      setToastMessage({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  // Real-time statistics tally
  const totalStudents = students.length;
  const presentCount = Object.values(roster).filter((r) => r.status === 'PRESENT').length;
  const absentCount = Object.values(roster).filter((r) => r.status === 'ABSENT').length;
  const onDutyCount = Object.values(roster).filter((r) => r.status === 'ON_DUTY').length;
  const lateCount = Object.values(roster).filter((r) => r.status === 'LATE').length;
  const currentPercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className={`p-4 rounded-xl flex items-center justify-between border shadow-lg ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-center gap-3">
              {toastMessage.type === 'success' ? (
                <CheckCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              )}
              <span className="text-sm font-medium">{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 transition-opacity"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Meta Bar */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-academic-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-academic-primary/20 text-academic-primary border border-academic-primary/30">
                {isCollege ? 'Anna University R2021 Regulation' : 'K-12 School Daily Period'}
              </span>
              <span className="text-xs text-obsidian-muted">
                {isCollege ? 'Continuous Assessment Hour Ledger' : 'Standard Attendance Register'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-obsidian-text">
              Interactive Attendance Ledger
            </h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Mark session attendance with instant telemetry, OD allowances, and Anna University 75% cutoff monitoring.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Download className="w-4 h-4 text-academic-primary" />}
              onClick={() => generateMonthlyAttendanceRegisterPDF(students, isCollege ? 'October 2026' : 'Academic Term 2026')}
              title="Generate and download official landscape 31-day attendance register matrix PDF"
            >
              Export Register PDF
            </Button>
            <Button
              variant="secondary"
              size="md"
              leftIcon={<RotateCcw className="w-4 h-4" />}
              onClick={() => handleMarkAll('PRESENT')}
            >
              Reset to 100%
            </Button>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={submitting}
              onClick={handleSubmitAttendance}
              className="shadow-glow-cyan"
            >
              Save Attendance ({presentCount}/{totalStudents})
            </Button>
          </div>
        </div>

        {/* Configuration Filters (Date, Hour/Period, Course/Class) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-obsidian-border/60">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-obsidian-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-academic-primary" />
              Session Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-obsidian-card border border-obsidian-border rounded-xl px-3.5 py-2 text-sm text-obsidian-text focus:outline-none focus:border-academic-primary transition-colors"
            />
          </div>

          {/* Hour or Period Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-obsidian-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              {isCollege ? 'Academic Hour (1-8)' : 'Class Period (1-8)'}
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map((slot) => {
                const active = isCollege ? selectedHour === slot : selectedPeriod === slot;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => (isCollege ? setSelectedHour(slot) : setSelectedPeriod(slot))}
                    className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                      active
                        ? 'bg-academic-primary text-black font-semibold border-academic-primary shadow-glow-cyan'
                        : 'bg-obsidian-card text-obsidian-muted border-obsidian-border hover:border-academic-primary/50'
                    }`}
                  >
                    {isCollege ? `Hour ${slot}` : `Pd ${slot}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Course (College) or Class (School) Selector */}
          {isCollege ? (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-obsidian-muted flex items-center gap-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-academic-secondary" />
                Course / Subject Code
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-obsidian-card border border-obsidian-border rounded-xl px-3.5 py-2 text-sm text-obsidian-text focus:outline-none focus:border-academic-primary transition-colors"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.courseCode} — {c.title} (Sem {c.semester}, {c.credits} Credits)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-obsidian-muted flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-academic-secondary" />
                Standard & Section
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-obsidian-card border border-obsidian-border rounded-xl px-3.5 py-2 text-sm text-obsidian-text focus:outline-none focus:border-academic-primary transition-colors"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Standard {cls.standard}th - Section {cls.section}
                  </option>
                ))}
                {classes.length === 0 && (
                  <option value="">No Classes Configured</option>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Tally & Bulk Controls Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Statistics Metric Strip */}
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-obsidian-surface border border-obsidian-border p-3.5 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-obsidian-muted">Total Enrolled</span>
            <span className="text-xl font-bold text-obsidian-text font-mono mt-0.5">{totalStudents}</span>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Present
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{presentCount}</span>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Absent
            </span>
            <span className="text-xl font-bold text-rose-400 font-mono mt-0.5">{absentCount}</span>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 p-3.5 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-cyan-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> On-Duty (OD)
            </span>
            <span className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{onDutyCount}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-obsidian-surface border border-obsidian-border p-3.5 rounded-xl flex flex-col justify-center">
            <span className="text-xs text-obsidian-muted">Session Turnout</span>
            <span className={`text-xl font-bold font-mono mt-0.5 ${
              currentPercentage >= 75 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {currentPercentage}%
            </span>
          </div>
        </div>

        {/* Rapid Bulk Action Buttons */}
        <div className="lg:col-span-4 flex items-center justify-end gap-2 bg-obsidian-surface border border-obsidian-border p-2 rounded-xl">
          <button
            onClick={() => handleMarkAll('PRESENT')}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            All Present
          </button>
          <button
            onClick={() => handleMarkAll('ABSENT')}
            className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-3.5 h-3.5" />
            All Absent
          </button>
          <button
            onClick={handleInvertAttendance}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-obsidian-card text-obsidian-muted hover:text-obsidian-text border border-obsidian-border transition-all"
            title="Invert current selection"
          >
            Invert
          </button>
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-obsidian-border bg-obsidian-card/60 text-xs uppercase tracking-wider text-obsidian-muted">
                <th className="py-3.5 px-4 font-semibold">#</th>
                <th className="py-3.5 px-4 font-semibold">Student Identity</th>
                <th className="py-3.5 px-4 font-semibold">{isCollege ? 'Department / Sem' : 'Standard / Section'}</th>
                <th className="py-3.5 px-4 font-semibold">Cumulative Radar</th>
                <th className="py-3.5 px-4 font-semibold text-center">Session Attendance Status</th>
                <th className="py-3.5 px-4 font-semibold">Remarks (Optional)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-border/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-obsidian-muted">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-academic-primary border-t-transparent" />
                    <p className="mt-2 text-xs">Loading institutional roster...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-obsidian-muted">
                    No students registered under this campus yet.
                  </td>
                </tr>
              ) : (
                students.map((student, idx) => {
                  const entry = roster[student.id] || {
                    studentId: student.id,
                    status: 'PRESENT',
                    remarks: '',
                  };

                  const cumulative = student.attendanceSummary?.percentage ?? 85.0;
                  const isDefaulter = cumulative < 75.0;

                  return (
                    <motion.tr
                      key={student.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: idx * 0.015 }}
                      className={`hover:bg-obsidian-card/50 transition-colors ${
                        entry.status === 'ABSENT' ? 'bg-rose-500/[0.03]' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3.5 px-4 text-xs font-mono text-obsidian-muted">
                        {idx + 1}
                      </td>

                      {/* Name & Identifier */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-academic-primary/20 to-academic-secondary/20 border border-academic-primary/30 flex items-center justify-center font-bold text-xs text-academic-primary shrink-0">
                            {student.fullName
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-obsidian-text">
                              {student.fullName}
                            </div>
                            <div className="font-mono text-xs text-obsidian-muted">
                              {student.regNumber || student.rollNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department / Standard */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-obsidian-text font-medium">
                          {isCollege
                            ? `${student.department?.code || 'CSE'} — Sem ${student.semester || 4}`
                            : student.schoolClass
                            ? `Standard ${student.schoolClass.standard}th - Section ${student.schoolClass.section}`
                            : 'General Class'}
                        </div>
                        <div className="text-[11px] text-obsidian-muted">
                          {isCollege ? 'Regulation 2021' : 'CBSE Board'}
                        </div>
                      </td>

                      {/* Cumulative Radar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-obsidian-border rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                cumulative >= 75
                                  ? 'bg-emerald-400'
                                  : cumulative >= 65
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, cumulative)}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono text-xs font-semibold ${
                              cumulative >= 75
                                ? 'text-emerald-400'
                                : cumulative >= 65
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {cumulative.toFixed(1)}%
                          </span>
                        </div>
                        {isDefaulter && (
                          <span className="text-[10px] text-rose-400 block mt-0.5 font-medium">
                            {cumulative < 65 ? 'Detention Alert (SA)' : 'Condonation Alert'}
                          </span>
                        )}
                      </td>

                      {/* Interactive Status Pills (Present, Absent, OD, Late) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Present Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'PRESENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                              entry.status === 'PRESENT'
                                ? 'bg-emerald-500 text-black border-emerald-400 shadow-glow-emerald'
                                : 'bg-obsidian-card text-obsidian-muted border-obsidian-border hover:border-emerald-500/40 hover:text-emerald-400'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Present
                          </button>

                          {/* Absent Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'ABSENT')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                              entry.status === 'ABSENT'
                                ? 'bg-rose-500 text-white border-rose-400 shadow-glow-rose'
                                : 'bg-obsidian-card text-obsidian-muted border-obsidian-border hover:border-rose-500/40 hover:text-rose-400'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Absent
                          </button>

                          {/* On-Duty (OD) Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'ON_DUTY')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                              entry.status === 'ON_DUTY'
                                ? 'bg-cyan-500 text-black border-cyan-400 shadow-glow-cyan'
                                : 'bg-obsidian-card text-obsidian-muted border-obsidian-border hover:border-cyan-500/40 hover:text-cyan-400'
                            }`}
                            title="Official On-Duty (Symposium, Sports, NCC)"
                          >
                            OD
                          </button>

                          {/* Late Pill */}
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.id, 'LATE')}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1 ${
                              entry.status === 'LATE'
                                ? 'bg-amber-400 text-black border-amber-300'
                                : 'bg-obsidian-card text-obsidian-muted border-obsidian-border hover:border-amber-400/40 hover:text-amber-400'
                            }`}
                            title="Arrived late to lecture"
                          >
                            Late
                          </button>
                        </div>
                      </td>

                      {/* Remarks */}
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          placeholder="e.g. Leave letter submitted"
                          value={entry.remarks}
                          onChange={(e) =>
                            setRoster((prev) => ({
                              ...prev,
                              [student.id]: {
                                ...prev[student.id],
                                remarks: e.target.value,
                              },
                            }))
                          }
                          className="w-full bg-obsidian-card/80 border border-obsidian-border/80 rounded-lg px-2.5 py-1 text-xs text-obsidian-text placeholder:text-obsidian-muted/50 focus:outline-none focus:border-academic-primary transition-colors"
                        />
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info strip */}
        <div className="p-4 border-t border-obsidian-border bg-obsidian-card/40 flex flex-col sm:flex-row items-center justify-between text-xs text-obsidian-muted gap-2">
          <div>
            Showing <span className="font-semibold text-obsidian-text">{students.length}</span> students for{' '}
            <span className="font-medium text-academic-primary">
              {isCollege ? `Hour ${selectedHour}` : `Period ${selectedPeriod}`}
            </span>{' '}
            on <span className="font-mono text-obsidian-text">{selectedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Multi-tenant auto-sync active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLedger;
