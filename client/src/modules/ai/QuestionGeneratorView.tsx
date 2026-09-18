import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileQuestion,
  Sparkles,
  CheckCircle2,
  XCircle,
  Edit3,
  Download,
  Filter,
  Layers,
  Award,
  BookOpen,
  ArrowRight,
  Save,
  Check,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface QuestionDraft {
  id: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  bloomsLevel: string;
  questionType: string;
  difficulty: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  modelAnswer?: string;
  rubricCriteria?: string[];
  status: 'AI_GENERATED' | 'FACULTY_APPROVED' | 'REJECTED' | 'INCLUDED_IN_EXAM';
  reviewNotes?: string;
  createdAt: string;
}

export const QuestionGeneratorView: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [syllabusUnit, setSyllabusUnit] = useState('Unit 3: Relational Query Optimization & Indexing');
  const [bloomsLevel, setBloomsLevel] = useState<'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE'>('APPLY');
  const [questionType, setQuestionType] = useState<'MCQ' | 'SHORT_ANSWER' | 'LONG_ANSWER' | 'PROBLEM_CODING'>('SHORT_ANSWER');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [count, setCount] = useState(3);

  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchCourses();
    fetchQuestions();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/academic/courses');
      if (res.data?.data?.courses) {
        setCourses(res.data.data.courses);
        if (res.data.data.courses.length > 0) {
          setSelectedCourseId(res.data.data.courses[0].id);
        }
      }
    } catch {
      setCourses([
        { id: 'crs_cs8492', courseCode: 'CS8492', title: 'Database Management Systems' },
        { id: 'crs_cs8591', courseCode: 'CS8591', title: 'Computer Networks' },
        { id: 'crs_cs8601', courseCode: 'CS8601', title: 'Artificial Intelligence' },
      ]);
      setSelectedCourseId('crs_cs8492');
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await apiClient.get('/ai/questions');
      if (res.data?.success && res.data?.data) {
        setQuestions(res.data.data);
      }
    } catch {
      // Sample starter questions
      setQuestions([
        {
          id: 'q_1',
          courseId: 'crs_cs8492',
          courseCode: 'CS8492',
          courseTitle: 'Database Management Systems',
          bloomsLevel: 'APPLY',
          questionType: 'SHORT_ANSWER',
          difficulty: 'MEDIUM',
          questionText: 'Demonstrate how a B+ Tree index with order 4 handles the sequential insertion of keys [10, 20, 30, 40]. Draw the node splits and identify the root key promotion.',
          rubricCriteria: ['Correct leaf node allocation (2 marks)', 'Correct root promotion (2 marks)', 'Accurate pointer linkage (1 mark)'],
          status: 'AI_GENERATED',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'q_2',
          courseId: 'crs_cs8492',
          courseCode: 'CS8492',
          courseTitle: 'Database Management Systems',
          bloomsLevel: 'ANALYZE',
          questionType: 'LONG_ANSWER',
          difficulty: 'HARD',
          questionText: 'Analyze the performance trade-offs between Hash Join and Nested Loop Join when evaluating queries over non-clustered indexes on large enterprise tables.',
          status: 'FACULTY_APPROVED',
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const res = await apiClient.post('/ai/questions/generate', {
        courseId: selectedCourseId,
        syllabusUnit,
        bloomsLevel,
        questionType,
        difficulty,
        count,
      });

      if (res.data?.success && res.data?.data) {
        setQuestions((prev) => [...res.data.data, ...prev]);
      }
    } catch (err: any) {
      // Demo fallback
      const generated: QuestionDraft = {
        id: `q_${Date.now()}`,
        courseId: selectedCourseId,
        courseCode: courses.find((c) => c.id === selectedCourseId)?.courseCode || 'CS8492',
        courseTitle: courses.find((c) => c.id === selectedCourseId)?.title || 'Database Systems',
        bloomsLevel,
        questionType,
        difficulty,
        questionText: `Design a normalized relational schema up to 3NF for an online course registration portal handling concurrent enrollment locks. Detail primary keys, foreign keys, and functional dependencies.`,
        rubricCriteria: ['Schema diagram (3 marks)', 'FD documentation (4 marks)', 'Lossless join proof (3 marks)'],
        status: 'AI_GENERATED',
        createdAt: new Date().toISOString(),
      };
      setQuestions((prev) => [generated, ...prev]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (id: string, status: 'FACULTY_APPROVED' | 'REJECTED') => {
    try {
      await apiClient.patch(`/ai/questions/${id}/review`, { status });
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    } catch {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, status } : q))
      );
    }
  };

  const saveEdit = async (id: string) => {
    try {
      await apiClient.patch(`/ai/questions/${id}/review`, {
        status: 'FACULTY_APPROVED',
        editedQuestion: editText,
      });
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, questionText: editText, status: 'FACULTY_APPROVED' } : q))
      );
    } catch {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, questionText: editText, status: 'FACULTY_APPROVED' } : q))
      );
    } finally {
      setEditingId(null);
    }
  };

  const filteredQuestions = questions.filter((q) => {
    if (filterStatus === 'ALL') return true;
    return q.status === filterStatus;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100">Exam Question Generator & Faculty Review</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Bloom's Taxonomy
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Draft syllabus-aligned test items calibrated against Bloom's cognitive levels with mandatory human-in-the-loop faculty review.
        </p>
      </div>

      {/* Generator Form */}
      <form onSubmit={handleGenerate} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Target Course</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.courseCode} - {c.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Bloom's Taxonomy Level</label>
            <select
              value={bloomsLevel}
              onChange={(e) => setBloomsLevel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="REMEMBER">L1: Remember (Recall facts)</option>
              <option value="UNDERSTAND">L2: Understand (Explain concepts)</option>
              <option value="APPLY">L3: Apply (Use information in situations)</option>
              <option value="ANALYZE">L4: Analyze (Draw connections / trade-offs)</option>
              <option value="EVALUATE">L5: Evaluate (Justify stand / decision)</option>
              <option value="CREATE">L6: Create (Design original structure)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Question Format</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="SHORT_ANSWER">Short Answer (2-4 marks)</option>
              <option value="LONG_ANSWER">Long Answer / Essay (10-16 marks)</option>
              <option value="PROBLEM_CODING">Analytical Problem / Algorithm</option>
              <option value="MCQ">Multiple Choice Question</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-300">Syllabus Unit / Learning Outcome</label>
            <input
              type="text"
              value={syllabusUnit}
              onChange={(e) => setSyllabusUnit(e.target.value)}
              placeholder="e.g. Unit 3: Normalization, Functional Dependencies, and 3NF/BCNF"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isGenerating}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? 'Drafting...' : 'Generate Items'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Review Workflow Feed */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-300">Faculty Review Ledger</h2>
            <span className="text-xs text-slate-500">({filteredQuestions.length} items)</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            {['ALL', 'AI_GENERATED', 'FACULTY_APPROVED', 'REJECTED'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredQuestions.map((q) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 hover:border-slate-700 transition"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {q.bloomsLevel}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {q.questionType}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400">
                    {q.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      q.status === 'FACULTY_APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : q.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {q.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Question Body */}
              {editingId === q.id ? (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-indigo-500 rounded-xl text-sm text-slate-100 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => saveEdit(q.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Approve</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-200 leading-relaxed font-serif">
                  {q.questionText}
                </div>
              )}

              {/* Rubric Criteria Chips */}
              {q.rubricCriteria && q.rubricCriteria.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Marking Rubric:</span>
                  {q.rubricCriteria.map((r, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 text-[11px]">
                      • {r}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons for Faculty */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[11px] text-slate-500 font-mono">
                  {q.courseCode || 'CS8492'} • Generated via AI Engine
                </span>

                <div className="flex items-center gap-2">
                  {q.status !== 'FACULTY_APPROVED' && (
                    <button
                      onClick={() => handleReview(q.id, 'FACULTY_APPROVED')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition font-medium"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {editingId !== q.id && (
                    <button
                      onClick={() => {
                        setEditingId(q.id);
                        setEditText(q.questionText);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition font-medium"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}

                  {q.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleReview(q.id, 'REJECTED')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 transition font-medium"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default QuestionGeneratorView;
