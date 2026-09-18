import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Award, 
  Save, 
  TrendingUp, 
  AlertCircle, 
  CheckCheck, 
  FileSpreadsheet, 
  Percent, 
  Sparkles, 
  RotateCcw,
  BookOpen,
  Calendar
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Student, Exam, Course } from '../../types';
import { Button } from '../../components/ui/Button';

interface MarkEntryState {
  studentId: string;
  internalMarks: number; // 0-40
  externalMarks: number; // 0-60
  subjectName: string;
  courseId?: string;
}

export const MarksLedger: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  // Metadata states
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Local Mark Sheet: studentId -> MarkEntryState
  const [markSheet, setMarkSheet] = useState<Record<string, MarkEntryState>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [examsRes, coursesRes, studentsRes] = await Promise.all([
          apiClient.get('/marks/exams'),
          isCollege ? apiClient.get('/academic/courses') : Promise.resolve({ data: { data: { courses: [] } } }),
          apiClient.get('/students?limit=100'),
        ]);

        const fetchedExams: Exam[] = examsRes.data.data.exams || [];
        const fetchedCourses: Course[] = coursesRes.data.data.courses || [];
        const fetchedStudents: Student[] = studentsRes.data.data.students || [];

        setExams(fetchedExams);
        setCourses(fetchedCourses);
        setStudents(fetchedStudents);

        if (fetchedExams.length > 0) setSelectedExamId(fetchedExams[0].id);
        if (fetchedCourses.length > 0) setSelectedCourseId(fetchedCourses[0].id);

        // Pre-populate markSheet with realistic default Anna Univ test scores
        const initialMarks: Record<string, MarkEntryState> = {};
        fetchedStudents.forEach((st, idx) => {
          // Add realistic variance for Anna Univ scores
          const isHighAchiever = idx % 5 === 0;
          const isArrear = idx === 22 || idx === 29; // Sample test cases
          const internal = isHighAchiever ? 38 : isArrear ? 18 : 32 + (idx % 6);
          const external = isHighAchiever ? 56 : isArrear ? 24 : 45 + (idx % 10);

          initialMarks[st.id] = {
            studentId: st.id,
            internalMarks: internal,
            externalMarks: external,
            subjectName: fetchedCourses[0]?.title || 'Database Management Systems',
            courseId: fetchedCourses[0]?.id,
          };
        });

        setMarkSheet(initialMarks);
      } catch (err) {
        console.error('Failed to load marks ledger:', err);
        setToastMessage({ type: 'error', text: 'Failed to initialize exam ledger' });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeCampus?.id, isCollege]);

  // Live Keystroke Mark Evaluator (Anna University R2021 Rules)
  const evaluateGrade = (total: number, isSA: boolean) => {
    if (isSA) return { grade: 'SA', points: 0.0, label: 'Shortage of Attendance (Detained)' };
    if (total >= 91) return { grade: 'O', points: 10.0, label: 'Outstanding' };
    if (total >= 81) return { grade: 'A+', points: 9.0, label: 'Excellent' };
    if (total >= 71) return { grade: 'A', points: 8.0, label: 'Very Good' };
    if (total >= 61) return { grade: 'B+', points: 7.0, label: 'Good' };
    if (total >= 50) return { grade: 'B', points: 6.0, label: 'Average' };
    return { grade: 'RA', points: 0.0, label: 'Re-Appear (Arrear)' };
  };

  const handleInternalChange = (studentId: string, val: number) => {
    const clamped = Math.max(0, Math.min(40, isNaN(val) ? 0 : val));
    setMarkSheet((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        internalMarks: clamped,
      },
    }));
  };

  const handleExternalChange = (studentId: string, val: number) => {
    const clamped = Math.max(0, Math.min(60, isNaN(val) ? 0 : val));
    setMarkSheet((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        externalMarks: clamped,
      },
    }));
  };

  // Submit batch marks
  const handleSubmitMarks = async () => {
    if (!selectedExamId) {
      setToastMessage({ type: 'error', text: 'Please select an examination' });
      return;
    }

    setSaving(true);
    setToastMessage(null);
    try {
      const selectedCourse = courses.find((c) => c.id === selectedCourseId);
      const entries = Object.values(markSheet).map((entry) => ({
        studentId: entry.studentId,
        courseId: selectedCourseId || undefined,
        subjectName: selectedCourse?.title || 'Academic Assessment',
        internalMarks: entry.internalMarks,
        externalMarks: entry.externalMarks,
        marksObtained: entry.internalMarks + entry.externalMarks,
        maxMarks: 100,
      }));

      await apiClient.post(`/marks/exam/${selectedExamId}/batch`, { entries });

      setToastMessage({
        type: 'success',
        text: `Successfully saved marks for ${entries.length} students!`,
      });
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to commit marks:', err);
      setToastMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to record batch marks',
      });
    } finally {
      setSaving(false);
    }
  };

  // Class analytics tally
  const totalsList = useMemo(() => {
    return Object.values(markSheet).map((m) => m.internalMarks + m.externalMarks);
  }, [markSheet]);

  const classAvg =
    totalsList.length > 0
      ? Math.round(totalsList.reduce((a, b) => a + b, 0) / totalsList.length)
      : 0;
  const passCount = totalsList.filter((t) => t >= 50).length;
  const passPct = totalsList.length > 0 ? Math.round((passCount / totalsList.length) * 100) : 0;
  const topScore = totalsList.length > 0 ? Math.max(...totalsList) : 0;
  const arrearCount = totalsList.filter((t) => t < 50).length;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
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
              <CheckCheck className="w-5 h-5" />
              <span className="text-sm font-medium">{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-xs opacity-70 hover:opacity-100"
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
                {isCollege ? 'Anna Univ Continuous Assessment' : 'School Term Evaluation'}
              </span>
              <span className="text-xs text-obsidian-muted">
                {isCollege ? '40 CIA + 60 External Mark Ledger' : 'Standard 100 Marks Ledger'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-obsidian-text">
              Marks & Examination Ledger
            </h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Live keystroke calculation of Anna University grades (O, A+, A, B+, B, RA, SA) and class pass percentages.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={saving}
              onClick={handleSubmitMarks}
              className="shadow-glow-cyan"
            >
              Commit Mark Sheet ({students.length})
            </Button>
          </div>
        </div>

        {/* Exam & Course Filter Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-6 border-t border-obsidian-border/60">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-obsidian-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-academic-primary" />
              Examination Series
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full bg-obsidian-card border border-obsidian-border rounded-xl px-3.5 py-2 text-sm text-obsidian-text focus:outline-none focus:border-academic-primary"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.title} • {ex.academicYear}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-obsidian-muted flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-academic-secondary" />
              Target Course / Subject
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full bg-obsidian-card border border-obsidian-border rounded-xl px-3.5 py-2 text-sm text-obsidian-text focus:outline-none focus:border-academic-primary"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} — {c.title} (Sem {c.semester}, {c.credits} Credits)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Class Telemetry Statistics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-obsidian-surface border border-obsidian-border p-3.5 rounded-xl">
          <span className="text-xs text-obsidian-muted block">Students Appeared</span>
          <span className="text-xl font-bold font-mono text-obsidian-text mt-0.5 block">{totalsList.length}</span>
        </div>

        <div className="bg-obsidian-surface border border-obsidian-border p-3.5 rounded-xl">
          <span className="text-xs text-obsidian-muted block">Class Average</span>
          <span className="text-xl font-bold font-mono text-academic-primary mt-0.5 block">{classAvg}/100</span>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl">
          <span className="text-xs text-emerald-400 font-medium block">Pass Percentage</span>
          <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">{passPct}%</span>
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 p-3.5 rounded-xl">
          <span className="text-xs text-cyan-400 font-medium block">Top Mark</span>
          <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5 block">{topScore}/100</span>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl">
          <span className="text-xs text-rose-400 font-medium block">Arrears (RA)</span>
          <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">{arrearCount}</span>
        </div>
      </div>

      {/* Spreadsheet-grade Mark Entry Grid */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-obsidian-border bg-obsidian-card/60 text-xs uppercase tracking-wider text-obsidian-muted">
                <th className="py-3.5 px-4 font-semibold">#</th>
                <th className="py-3.5 px-4 font-semibold">Student Identity</th>
                <th className="py-3.5 px-4 font-semibold">Anna Univ Reg No</th>
                <th className="py-3.5 px-4 font-semibold text-center">CIA / Internal (Max 40)</th>
                <th className="py-3.5 px-4 font-semibold text-center">External (Max 60)</th>
                <th className="py-3.5 px-4 font-semibold text-center">Total (100)</th>
                <th className="py-3.5 px-4 font-semibold text-center">Anna Univ Grade</th>
                <th className="py-3.5 px-4 font-semibold text-center">Result Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-border/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-obsidian-muted">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-academic-primary border-t-transparent" />
                    <p className="mt-2 text-xs">Loading mark sheet entries...</p>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-obsidian-muted text-xs">
                    No students registered under this campus.
                  </td>
                </tr>
              ) : (
                students.map((st, idx) => {
                  const entry = markSheet[st.id] || {
                    studentId: st.id,
                    internalMarks: 32,
                    externalMarks: 48,
                    subjectName: '',
                  };

                  const total = entry.internalMarks + entry.externalMarks;
                  const isSA = (st.attendanceSummary?.percentage ?? 85.0) < 65.0;
                  const { grade, points, label } = evaluateGrade(total, isSA);
                  const isPass = total >= 50 && !isSA;

                  return (
                    <motion.tr
                      key={st.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: idx * 0.015 }}
                      className="hover:bg-obsidian-card/50 transition-colors"
                    >
                      <td className="py-3 px-4 text-xs font-mono text-obsidian-muted">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-obsidian-text">{st.fullName}</div>
                        <div className="text-[11px] text-obsidian-muted">{st.department?.code || 'CSE'}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs font-semibold text-academic-primary">
                        {st.regNumber || st.rollNumber}
                      </td>

                      {/* CIA / Internal Marks Input */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={40}
                          value={entry.internalMarks}
                          onChange={(e) => handleInternalChange(st.id, parseInt(e.target.value, 10))}
                          className="w-20 text-center bg-obsidian-card border border-obsidian-border rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-obsidian-text focus:outline-none focus:border-academic-primary transition-colors"
                        />
                      </td>

                      {/* External Marks Input */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min={0}
                          max={60}
                          value={entry.externalMarks}
                          onChange={(e) => handleExternalChange(st.id, parseInt(e.target.value, 10))}
                          className="w-20 text-center bg-obsidian-card border border-obsidian-border rounded-lg px-2.5 py-1 text-sm font-mono font-bold text-obsidian-text focus:outline-none focus:border-academic-primary transition-colors"
                        />
                      </td>

                      {/* Live Total */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-base text-obsidian-text">
                        {total}
                      </td>

                      {/* Anna Univ Grade */}
                      <td className="py-3 px-4 text-center">
                        <span
                          title={label}
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                            grade === 'O' || grade === 'A+'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : grade === 'RA'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : grade === 'SA'
                              ? 'bg-rose-600/30 text-rose-300 border border-rose-600/40'
                              : 'bg-academic-primary/20 text-academic-primary border border-academic-primary/30'
                          }`}
                        >
                          {grade} ({points.toFixed(1)})
                        </span>
                      </td>

                      {/* Pass / Fail */}
                      <td className="py-3 px-4 text-center">
                        {isPass ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                            PASSED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-400">
                            {isSA ? 'SA HELD' : 'ARREAR'}
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MarksLedger;
