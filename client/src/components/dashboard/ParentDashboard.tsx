import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  CalendarCheck,
  Award,
  Download,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Phone,
  Mail,
  Clock,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/apiClient';
import { TabKey } from '../layout/DynamicSidebar';

interface ParentDashboardProps {
  onNavigate?: (tab: TabKey) => void;
}

interface LinkedChild {
  linkId: string;
  relationship: string;
  isPrimary: boolean;
  student: {
    id: string;
    fullName: string;
    regNumber?: string;
    rollNumber?: string;
    email?: string;
    phone?: string;
    batchYear?: string;
    department?: { id: string; name: string; code: string };
    schoolClass?: { id: string; standard: number; section: string };
    semester?: number;
  };
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onNavigate }) => {
  const { user, activeInstitution, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, [activeInstitution?.id]);

  useEffect(() => {
    if (selectedChildId) {
      loadChildSummary(selectedChildId);
    }
  }, [selectedChildId]);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/parents/children');
      const list: LinkedChild[] = res.data.data.children || [];
      setChildren(list);
      if (list.length > 0) {
        setSelectedChildId(list[0].student.id);
      }
    } catch (err) {
      console.error('Failed to load linked children:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChildSummary = async (studentId: string) => {
    try {
      const res = await apiClient.get(`/parents/student/${studentId}`);
      setSummary(res.data.data);
    } catch (err) {
      console.error('Failed to load child summary:', err);
    }
  };

  const activeChild = children.find((c) => c.student.id === selectedChildId);
  const attendancePercentage = summary?.attendance?.percentage ?? 85.0;
  const isBelowCutoff = attendancePercentage < 75.0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Child Switcher */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-surface/90 via-surface-elevated/80 to-surface/90 border border-slate-200/80 dark:border-white/[0.08] shadow-sm dark:shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> Parent & Guardian Portal
            </span>
            {activeChild && (
              <span className="text-xs text-slate-400 font-mono">
                ID: {activeChild.student.regNumber || activeChild.student.rollNumber || activeChild.student.id.slice(0, 8)}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Academic Status for {activeChild ? activeChild.student.fullName : 'Linked Ward'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeInstitution?.name} •{' '}
            {activeChild?.student.department?.name ||
              (activeChild?.student.schoolClass
                ? `Standard ${activeChild.student.schoolClass.standard}-${activeChild.student.schoolClass.section}`
                : 'Enrolled Student')}
          </p>
        </div>

        {/* Multi-Child Selector & Actions */}
        <div className="flex items-center gap-3">
          {children.length > 1 && (
            <div className="relative">
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="appearance-none bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 pr-8 rounded-xl border border-slate-700 shadow-sm cursor-pointer"
              >
                {children.map((c) => (
                  <option key={c.student.id} value={c.student.id}>
                    {c.student.fullName} ({c.relationship})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>
          )}

          <button
            onClick={() => onNavigate?.('reports' as TabKey)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download Report Card</span>
          </button>
        </div>
      </div>

      {/* Warning if ward is below cutoff */}
      {isBelowCutoff && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">Attendance Shortage Notice</p>
            <p>
              Your ward's attendance is currently at{' '}
              <span className="font-bold">{attendancePercentage}%</span>, which is below the mandatory 75% threshold.
              Please connect with the academic coordinator immediately to prevent examination ineligibility.
            </p>
          </div>
        </div>
      )}

      {/* Ward Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Ward Attendance</span>
            <span className={`p-2 rounded-xl ${isBelowCutoff ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {attendancePercentage}%
              </span>
              <span className={`text-[11px] font-bold ${isBelowCutoff ? 'text-amber-500' : 'text-emerald-500'}`}>
                {isBelowCutoff ? 'Below Cutoff' : 'Good Standing'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {summary?.attendance?.present ?? 0} of {summary?.attendance?.total ?? 0} Sessions Attended
            </p>
          </div>
        </div>

        {/* Academic Performance */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Exams Evaluated</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {summary?.marks?.length ?? 0} Subjects
            </span>
            <p className="text-[11px] text-slate-400 mt-2">
              Continuous Internal Assessments Recorded
            </p>
          </div>
        </div>

        {/* Academic Structure */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Curriculum Scope</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-base font-bold text-slate-900 dark:text-white block truncate">
              {activeChild?.student.department?.code || (activeChild?.student.schoolClass ? `Std ${activeChild.student.schoolClass.standard}` : 'Full Time')}
            </span>
            <p className="text-[11px] text-slate-400 mt-2">
              Batch: {activeChild?.student.batchYear || '2025-2026'}
            </p>
          </div>
        </div>

        {/* Status Verification */}
        <div className="p-5 rounded-2xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Parent Link Status</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div>
            <span className="text-base font-bold text-emerald-400 block">
              Verified Guardian
            </span>
            <p className="text-[11px] text-slate-400 mt-2">
              Relationship: {activeChild?.relationship || 'PARENT'}
            </p>
          </div>
        </div>
      </div>

      {/* Marks & Timetable Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Subject Marks */}
        <div className="p-6 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            Subject Assessment Records
          </h3>
          <div className="overflow-hidden border border-slate-800 rounded-xl bg-slate-900/40">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/60 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Exam</th>
                  <th className="px-4 py-2.5">Score</th>
                  <th className="px-4 py-2.5">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {summary?.marks?.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-medium text-white">
                      {m.course?.courseCode || m.subjectName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">{m.exam?.title || 'IAT'}</td>
                    <td className="px-4 py-2.5 font-mono font-bold">
                      {m.marksObtained} / {m.maxMarks}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded font-bold ${m.isPassed ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                        {m.grade || (m.isPassed ? 'PASS' : 'RA')}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!summary?.marks || summary.marks.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                      No assessment marks published yet for this semester.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timetable Schedule */}
        <div className="p-6 rounded-3xl bg-surface/80 dark:bg-obsidian-card border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" />
            Weekly Class Timetable Schedule
          </h3>
          <div className="space-y-2">
            {summary?.timetable?.slice(0, 5).map((entry: any) => (
              <div
                key={entry.id}
                className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-white block">
                    {entry.course?.title || entry.subjectName}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Day {entry.dayOfWeek} • Slot {entry.slotNumber} ({entry.startTime} - {entry.endTime})
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded bg-slate-800 font-mono text-[11px] text-slate-300">
                  {entry.roomNumber || 'Room 101'}
                </span>
              </div>
            ))}
            {(!summary?.timetable || summary.timetable.length === 0) && (
              <p className="p-6 text-center text-slate-500 text-xs italic">
                Timetable schedule for this term is being finalized.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ParentDashboard;
