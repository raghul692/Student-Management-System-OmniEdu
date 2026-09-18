import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ClipboardList,
  Plus,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Upload,
  ChevronDown,
  Loader2,
  X,
  BookOpen,
  Award,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';
import { Button } from '../../components/ui/Button';

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  maxMarks: number;
  course?: { courseCode: string; title: string };
  subjectName?: string;
  creator: { name: string };
  submissionCount?: number;
  mySubmission?: {
    id: string;
    status: 'SUBMITTED' | 'EVALUATED';
    marksAwarded?: number;
    feedback?: string;
    submittedAt: string;
  };
}

interface Toast {
  type: 'success' | 'error';
  text: string;
}

const STATUS_STYLES = {
  SUBMITTED: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  EVALUATED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
};

export const AssignmentsView: React.FC = () => {
  const { activeCampus } = useAuthStore();
  const { institutionRole } = usePermissionStore();
  const isTeacher = ['FACULTY', 'CLASS_TEACHER', 'HOD', 'INSTITUTION_ADMIN'].includes(institutionRole || '');
  const isStudent = institutionRole === 'STUDENT';

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [selected, setSelected] = useState<Assignment | null>(null);

  // Create assignment modal
  const [showCreate, setShowCreate] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    subjectName: '',
    dueDate: '',
    maxMarks: '100',
  });
  const [creating, setCreating] = useState(false);

  // Submit assignment
  const [submitting, setSubmitting] = useState(false);
  const [submissionText, setSubmissionText] = useState('');

  // Evaluate submission
  const [evaluating, setEvaluating] = useState(false);
  const [evalForm, setEvalForm] = useState({ submissionId: '', marksAwarded: '', feedback: '' });

  const showToast = (type: Toast['type'], text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/assignments');
      setAssignments(res.data.data.assignments || []);
    } catch {
      console.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [activeCampus?.id, loadAssignments]);

  const handleCreate = async () => {
    if (!newAssignment.title || !newAssignment.dueDate) {
      showToast('error', 'Title and due date are required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/assignments', {
        ...newAssignment,
        maxMarks: parseInt(newAssignment.maxMarks),
      });
      showToast('success', 'Assignment created successfully');
      setShowCreate(false);
      setNewAssignment({ title: '', description: '', subjectName: '', dueDate: '', maxMarks: '100' });
      loadAssignments();
    } catch {
      showToast('error', 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (assignmentId: string) => {
    if (!submissionText.trim()) {
      showToast('error', 'Submission content is required');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post(`/assignments/${assignmentId}/submit`, { content: submissionText });
      showToast('success', 'Assignment submitted!');
      setSubmissionText('');
      setSelected(null);
      loadAssignments();
    } catch {
      showToast('error', 'Failed to submit assignment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvaluate = async () => {
    if (!evalForm.marksAwarded) {
      showToast('error', 'Marks are required');
      return;
    }
    setEvaluating(true);
    try {
      await apiClient.patch(`/assignments/submissions/${evalForm.submissionId}/evaluate`, {
        marksAwarded: parseFloat(evalForm.marksAwarded),
        feedback: evalForm.feedback,
      });
      showToast('success', 'Submission evaluated');
      setEvalForm({ submissionId: '', marksAwarded: '', feedback: '' });
      setSelected(null);
      loadAssignments();
    } catch {
      showToast('error', 'Failed to evaluate submission');
    } finally {
      setEvaluating(false);
    }
  };

  const isDue = (dueDate: string) => new Date(dueDate) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
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
            <ClipboardList className="w-6 h-6 text-brand-400" />
            Assignments
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {isTeacher ? 'Manage homework and evaluate submissions' : 'View and submit your assignments'}
          </p>
        </div>
        {isTeacher && (
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            New Assignment
          </Button>
        )}
      </div>

      {/* Assignment Grid */}
      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
          <ClipboardList className="w-12 h-12 opacity-30" />
          <p className="text-sm">No assignments found for this institution</p>
          {isTeacher && (
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>Create First Assignment</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assignments.map((assignment, idx) => {
            const overdue = isDue(assignment.dueDate);
            const submitted = assignment.mySubmission;

            return (
              <motion.div
                key={assignment.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4 hover:border-white/[0.14] transition-all cursor-pointer group"
                onClick={() => setSelected(assignment)}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={`p-2 rounded-xl ${overdue && !submitted ? 'bg-rose-500/10' : 'bg-brand-500/10'}`}>
                    <BookOpen className={`w-4 h-4 ${overdue && !submitted ? 'text-rose-400' : 'text-brand-400'}`} />
                  </div>
                  {submitted ? (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[submitted.status]}`}>
                      {submitted.status}
                    </span>
                  ) : overdue ? (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-500/15 text-rose-400 border-rose-500/25">
                      OVERDUE
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/25">
                      OPEN
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-slate-200 text-sm line-clamp-2 group-hover:text-white transition-colors">
                  {assignment.title}
                </h3>
                {(assignment.course?.title || assignment.subjectName) && (
                  <p className="text-xs text-brand-400/80 mt-0.5">{assignment.course?.title || assignment.subjectName}</p>
                )}
                {assignment.description && (
                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{assignment.description}</p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(assignment.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Award className="w-3 h-3" />
                    {submitted?.marksAwarded !== undefined ? (
                      <span className="text-emerald-400 font-semibold">{submitted.marksAwarded}/{assignment.maxMarks}</span>
                    ) : (
                      <span>{assignment.maxMarks} marks</span>
                    )}
                  </div>
                </div>

                {isTeacher && assignment.submissionCount !== undefined && (
                  <div className="mt-2 text-xs text-slate-500">
                    {assignment.submissionCount} submission{assignment.submissionCount !== 1 ? 's' : ''}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Assignment Detail / Submit / Evaluate Panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="bg-obsidian-card border border-white/[0.1] rounded-2xl w-full max-w-lg p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">{selected.title}</h3>
                  {(selected.course?.title || selected.subjectName) && (
                    <p className="text-xs text-brand-400 mt-0.5">{selected.course?.title || selected.subjectName}</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selected.description && (
                <p className="text-sm text-slate-400 mb-4 bg-obsidian-surface rounded-xl px-3 py-2.5">{selected.description}</p>
              )}

              <div className="flex gap-4 text-xs text-slate-500 mb-4">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due: {new Date(selected.dueDate).toLocaleDateString('en-IN')}</span>
                <span className="flex items-center gap-1"><Award className="w-3 h-3" /> Max: {selected.maxMarks} marks</span>
              </div>

              {/* Student: Show submission status or submit form */}
              {isStudent && (
                <div>
                  {selected.mySubmission ? (
                    <div className="space-y-2">
                      <div className={`px-3 py-2 rounded-xl border text-sm ${STATUS_STYLES[selected.mySubmission.status]}`}>
                        Submitted on {new Date(selected.mySubmission.submittedAt).toLocaleDateString('en-IN')}
                      </div>
                      {selected.mySubmission.status === 'EVALUATED' && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                          <div className="text-sm font-semibold text-emerald-400">
                            Score: {selected.mySubmission.marksAwarded}/{selected.maxMarks}
                          </div>
                          {selected.mySubmission.feedback && (
                            <div className="text-xs text-slate-400 mt-1">{selected.mySubmission.feedback}</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="text-xs font-medium text-slate-400 block">Your Submission</label>
                      <textarea
                        rows={4}
                        className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
                        placeholder="Write your answer or paste your work here..."
                        value={submissionText}
                        onChange={(e) => setSubmissionText(e.target.value)}
                      />
                      <Button
                        variant="primary"
                        className="w-full"
                        isLoading={submitting}
                        leftIcon={<Upload className="w-4 h-4" />}
                        onClick={() => handleSubmit(selected.id)}
                        disabled={isDue(selected.dueDate)}
                      >
                        {isDue(selected.dueDate) ? 'Deadline Passed' : 'Submit Assignment'}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Teacher: Evaluate form */}
              {isTeacher && (
                <div className="space-y-3 border-t border-white/[0.07] pt-4">
                  <p className="text-xs font-medium text-slate-400">Evaluate a Submission</p>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Submission ID"
                    value={evalForm.submissionId}
                    onChange={(e) => setEvalForm({ ...evalForm, submissionId: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                      placeholder={`Marks (/${selected.maxMarks})`}
                      value={evalForm.marksAwarded}
                      onChange={(e) => setEvalForm({ ...evalForm, marksAwarded: e.target.value })}
                    />
                    <input
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                      placeholder="Feedback"
                      value={evalForm.feedback}
                      onChange={(e) => setEvalForm({ ...evalForm, feedback: e.target.value })}
                    />
                  </div>
                  <Button variant="primary" className="w-full" isLoading={evaluating} onClick={handleEvaluate}>
                    Submit Evaluation
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Assignment Modal */}
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
                <h3 className="text-lg font-semibold text-slate-100">New Assignment</h3>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Title *</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Assignment title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Subject</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Subject name"
                    value={newAssignment.subjectName}
                    onChange={(e) => setNewAssignment({ ...newAssignment, subjectName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
                    placeholder="Instructions or description..."
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Due Date *</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Max Marks</label>
                    <input
                      type="number"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newAssignment.maxMarks}
                      onChange={(e) => setNewAssignment({ ...newAssignment, maxMarks: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" isLoading={creating} onClick={handleCreate}>
                  Create Assignment
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssignmentsView;
