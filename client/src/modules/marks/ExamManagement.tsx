import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  FileText,
  Ticket,
  ChevronRight,
  Clock,
  Play,
  BarChart2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';
import { Button } from '../../components/ui/Button';

interface Exam {
  id: string;
  name: string;
  examType: string;
  status: 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  startDate?: string;
  endDate?: string;
  semester?: number;
  academicYear?: string;
  schedulesCount?: number;
  hallTicketsCount?: number;
}

interface ExamSchedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  roomNo?: string;
  course?: { courseCode: string; title: string };
  subjectName?: string;
  batchGroup?: string;
}

interface HallTicket {
  id: string;
  ticketNumber: string;
  student: { rollNo: string; name: string };
  isEligible: boolean;
  ineligibilityReason?: string;
}

interface Toast {
  type: 'success' | 'error';
  text: string;
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  ONGOING: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  COMPLETED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  CANCELLED: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  SCHEDULED: ['ONGOING', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const ExamManagement: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const { institutionRole } = usePermissionStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';
  const isAdmin = ['INSTITUTION_ADMIN', 'HOD'].includes(institutionRole || '');
  const isStaff = ['FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR', 'INSTITUTION_ADMIN', 'HOD'].includes(institutionRole || '');

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [activeTab, setActiveTab] = useState<'schedules' | 'halltickets'>('schedules');
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [hallTickets, setHallTickets] = useState<HallTicket[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Create exam modal
  const [showCreate, setShowCreate] = useState(false);
  const [newExam, setNewExam] = useState({
    name: '',
    examType: isCollege ? 'CIA1' : 'UNIT_TEST',
    semester: '1',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    startDate: '',
    endDate: '',
  });
  const [creating, setCreating] = useState(false);

  // Create schedule modal
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    startTime: '09:00',
    endTime: '12:00',
    subjectName: '',
    roomNo: '',
    batchGroup: '',
  });
  const [schedulingExam, setSchedulingExam] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const showToast = (type: Toast['type'], text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/marks/exams');
      setExams(res.data.data.exams || []);
    } catch {
      console.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExams();
  }, [activeCampus?.id, loadExams]);

  const loadExamDetails = async (exam: Exam, tab: 'schedules' | 'halltickets') => {
    setSelectedExam(exam);
    setActiveTab(tab);
    setSubLoading(true);
    try {
      if (tab === 'schedules') {
        const res = await apiClient.get(`/marks/exam/${exam.id}/schedules`);
        setSchedules(res.data.data.schedules || []);
      } else {
        const res = await apiClient.get(`/marks/exam/${exam.id}/hall-tickets`);
        setHallTickets(res.data.data.hallTickets || []);
      }
    } catch {
      console.error('Failed to load exam details');
    } finally {
      setSubLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newExam.name) {
      showToast('error', 'Exam name is required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/marks/exams', {
        ...newExam,
        semester: parseInt(newExam.semester),
      });
      showToast('success', 'Exam created successfully');
      setShowCreate(false);
      loadExams();
    } catch {
      showToast('error', 'Failed to create exam');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateStatus = async (exam: Exam, newStatus: string) => {
    setUpdatingStatus(true);
    try {
      await apiClient.patch(`/marks/exam/${exam.id}/status`, { status: newStatus });
      showToast('success', `Exam status updated to ${newStatus}`);
      loadExams();
      if (selectedExam?.id === exam.id) {
        setSelectedExam({ ...selectedExam, status: newStatus as Exam['status'] });
      }
    } catch {
      showToast('error', 'Failed to update exam status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedExam || !scheduleForm.date || !scheduleForm.subjectName) {
      showToast('error', 'Date and subject are required');
      return;
    }
    setSchedulingExam(true);
    try {
      await apiClient.post(`/marks/exam/${selectedExam.id}/schedules`, scheduleForm);
      showToast('success', 'Schedule added');
      setShowSchedule(false);
      loadExamDetails(selectedExam, 'schedules');
    } catch {
      showToast('error', 'Failed to add schedule');
    } finally {
      setSchedulingExam(false);
    }
  };

  const handleGenerateHallTickets = async () => {
    if (!selectedExam) return;
    try {
      await apiClient.post(`/marks/exam/${selectedExam.id}/hall-tickets/generate`);
      showToast('success', 'Hall tickets generated successfully');
      loadExamDetails(selectedExam, 'halltickets');
    } catch {
      showToast('error', 'Failed to generate hall tickets');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return <Clock className="w-3.5 h-3.5" />;
      case 'ONGOING': return <Play className="w-3.5 h-3.5" />;
      case 'COMPLETED': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'CANCELLED': return <X className="w-3.5 h-3.5" />;
      default: return <Calendar className="w-3.5 h-3.5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-900/80 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand-400" />
            Exam Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isCollege ? 'CIA / University Exam Lifecycle' : 'Unit Tests, Quarterly & Annual Exams'}
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            New Exam
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Exam List */}
        <div className="lg:col-span-2">
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-slate-200">All Exams</h2>
            </div>
            {exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-600 gap-2">
                <GraduationCap className="w-10 h-10 opacity-30" />
                <p className="text-sm">No exams yet</p>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>Create Exam</Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className={`px-4 py-3 hover:bg-white/[0.03] transition-all cursor-pointer ${selectedExam?.id === exam.id ? 'bg-brand-500/5 border-l-2 border-l-brand-500' : ''}`}
                    onClick={() => loadExamDetails(exam, 'schedules')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{exam.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{exam.examType} · {exam.academicYear || 'N/A'}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[exam.status]}`}>
                          {statusIcon(exam.status)}
                          {exam.status}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    </div>

                    {/* Admin: Status transitions */}
                    {isAdmin && STATUS_TRANSITIONS[exam.status]?.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                        {STATUS_TRANSITIONS[exam.status].map((nextStatus) => (
                          <button
                            key={nextStatus}
                            disabled={updatingStatus}
                            onClick={() => handleUpdateStatus(exam, nextStatus)}
                            className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                              nextStatus === 'CANCELLED'
                                ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                                : 'border-brand-500/30 text-brand-400 hover:bg-brand-500/10'
                            }`}
                          >
                            → {nextStatus}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Exam Details Panel */}
        <div className="lg:col-span-3">
          {!selectedExam ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-2 bg-obsidian-card border border-white/[0.07] rounded-2xl">
              <GraduationCap className="w-10 h-10 opacity-30" />
              <p className="text-sm">Select an exam to view details</p>
            </div>
          ) : (
            <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl overflow-hidden">
              {/* Panel Header */}
              <div className="px-4 py-3 border-b border-white/[0.07]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-200">{selectedExam.name}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{selectedExam.examType}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[selectedExam.status]}`}>
                    {selectedExam.status}
                  </span>
                </div>
                {/* Tab Bar */}
                <div className="flex gap-1 mt-3">
                  {(['schedules', 'halltickets'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => loadExamDetails(selectedExam, tab)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        activeTab === tab
                          ? 'bg-brand-500/15 text-brand-400 border border-brand-500/25'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]'
                      }`}
                    >
                      {tab === 'schedules' ? <Calendar className="w-3 h-3" /> : <Ticket className="w-3 h-3" />}
                      {tab === 'schedules' ? 'Schedules' : 'Hall Tickets'}
                    </button>
                  ))}
                  {isAdmin && activeTab === 'schedules' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto text-xs h-7"
                      leftIcon={<Plus className="w-3 h-3" />}
                      onClick={() => setShowSchedule(true)}
                    >
                      Add
                    </Button>
                  )}
                  {isAdmin && activeTab === 'halltickets' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-auto text-xs h-7"
                      leftIcon={<Ticket className="w-3 h-3" />}
                      onClick={handleGenerateHallTickets}
                    >
                      Generate
                    </Button>
                  )}
                </div>
              </div>

              {/* Panel Content */}
              <div className="min-h-[260px]">
                {subLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                  </div>
                ) : activeTab === 'schedules' ? (
                  schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-1">
                      <Calendar className="w-8 h-8 opacity-30" />
                      <p className="text-xs">No schedules yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {schedules.map((sch) => (
                        <div key={sch.id} className="px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium text-slate-200">
                                {sch.course?.title || sch.subjectName}
                                {sch.course && <span className="text-xs text-slate-500 ml-1">({sch.course.courseCode})</span>}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {new Date(sch.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                                &nbsp;· {sch.startTime} – {sch.endTime}
                                {sch.roomNo && ` · Room ${sch.roomNo}`}
                              </div>
                            </div>
                            {sch.batchGroup && (
                              <span className="text-xs bg-brand-500/10 text-brand-400 px-2 py-0.5 rounded-full">{sch.batchGroup}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  hallTickets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-1">
                      <Ticket className="w-8 h-8 opacity-30" />
                      <p className="text-xs">No hall tickets generated</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {hallTickets.slice(0, 15).map((ht) => (
                        <div key={ht.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm text-slate-200">{ht.student.name}</div>
                            <div className="text-xs text-slate-500">{ht.student.rollNo} · {ht.ticketNumber}</div>
                          </div>
                          <div>
                            {ht.isEligible ? (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-400 border-emerald-500/25">ELIGIBLE</span>
                            ) : (
                              <div className="text-right">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-400 border-rose-500/25">DETAINED</span>
                                {ht.ineligibilityReason && (
                                  <div className="text-[10px] text-rose-400/70 mt-0.5">{ht.ineligibilityReason}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {hallTickets.length > 15 && (
                        <div className="px-4 py-2 text-xs text-slate-500 text-center">
                          + {hallTickets.length - 15} more students
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Exam Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-obsidian-card border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-100">Create Exam</h3>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Exam Name *</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="e.g. CIA 1 – Semester III"
                    value={newExam.name}
                    onChange={(e) => setNewExam({ ...newExam, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Exam Type</label>
                    <select
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newExam.examType}
                      onChange={(e) => setNewExam({ ...newExam, examType: e.target.value })}
                    >
                      {isCollege ? (
                        <>
                          <option value="CIA1">CIA 1</option>
                          <option value="CIA2">CIA 2</option>
                          <option value="CIA3">CIA 3</option>
                          <option value="MODEL">Model Exam</option>
                          <option value="UNIVERSITY">University Exam</option>
                        </>
                      ) : (
                        <>
                          <option value="UNIT_TEST">Unit Test</option>
                          <option value="QUARTERLY">Quarterly Exam</option>
                          <option value="HALF_YEARLY">Half Yearly</option>
                          <option value="ANNUAL">Annual Exam</option>
                          <option value="PREPARATORY">Preparatory</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Semester / Term</label>
                    <input
                      type="number"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newExam.semester}
                      onChange={(e) => setNewExam({ ...newExam, semester: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Academic Year</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="2024-2025"
                    value={newExam.academicYear}
                    onChange={(e) => setNewExam({ ...newExam, academicYear: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Start Date</label>
                    <input
                      type="date"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newExam.startDate}
                      onChange={(e) => setNewExam({ ...newExam, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">End Date</label>
                    <input
                      type="date"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newExam.endDate}
                      onChange={(e) => setNewExam({ ...newExam, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" isLoading={creating} onClick={handleCreate}>
                  Create Exam
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Schedule Modal */}
      <AnimatePresence>
        {showSchedule && selectedExam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSchedule(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-obsidian-card border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-100">Add Schedule</h3>
                <button onClick={() => setShowSchedule(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Subject / Course *</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Subject name"
                    value={scheduleForm.subjectName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, subjectName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Date *</label>
                  <input
                    type="date"
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Start Time</label>
                    <input
                      type="time"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={scheduleForm.startTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">End Time</label>
                    <input
                      type="time"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={scheduleForm.endTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Room No.</label>
                    <input
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                      placeholder="e.g. A101"
                      value={scheduleForm.roomNo}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, roomNo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Batch Group</label>
                    <input
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                      placeholder="e.g. CSE-A"
                      value={scheduleForm.batchGroup}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, batchGroup: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowSchedule(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" isLoading={schedulingExam} onClick={handleCreateSchedule}>
                  Add Schedule
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamManagement;
