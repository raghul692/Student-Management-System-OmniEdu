import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  FileText,
  AlertCircle,
  Layers,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface WeakCourse {
  code: string;
  title: string;
  marks: number;
  grade?: string;
}

interface RecommendedTopic {
  course: string;
  topic: string;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface RevisionPlan {
  weeklyGoal: string;
  practiceTasks: string[];
  suggestedResources: Array<{ title: string; type: string }>;
}

export const PersonalizedLearningView: React.FC = () => {
  const { user } = useAuthStore();
  const [weakCourses, setWeakCourses] = useState<WeakCourse[]>([]);
  const [recommendedTopics, setRecommendedTopics] = useState<RecommendedTopic[]>([]);
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Study Plan Generator State
  const [targetExam, setTargetExam] = useState('Anna University Semester Finals (Nov/Dec 2026)');
  const [dailyHours, setDailyHours] = useState(3);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [studySchedule, setStudySchedule] = useState<any | null>(null);

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      // In student portal, fetch current student recommendations
      const studentId = user?.id || 'demo_student';
      const res = await apiClient.get(`/ai/learning/recommendations/${studentId}`);
      if (res.data?.success && res.data?.data) {
        setWeakCourses(res.data.data.weakCourses || []);
        setRecommendedTopics(res.data.data.recommendedTopics || []);
        setRevisionPlan(res.data.data.revisionPlan || null);
      }
    } catch {
      // Fallback demo data
      setWeakCourses([
        { code: 'CS8492', title: 'Database Management Systems', marks: 44, grade: 'RA' },
        { code: 'MA8402', title: 'Probability & Queueing Theory', marks: 52, grade: 'B' },
      ]);
      setRecommendedTopics([
        {
          course: 'CS8492 - Database Management Systems',
          topic: 'Unit 3: BCNF Decomposition, Lossless Joins & Dependency Preservation',
          urgency: 'HIGH',
        },
        {
          course: 'CS8492 - Database Management Systems',
          topic: 'Unit 4: Transaction Concurrency Control, Two-Phase Locking (2PL)',
          urgency: 'HIGH',
        },
        {
          course: 'MA8402 - Probability & Queueing Theory',
          topic: 'Unit 2: Discrete & Continuous Random Variables, Poisson Processes',
          urgency: 'MEDIUM',
        },
      ]);
      setRevisionPlan({
        weeklyGoal: 'Clear standing arrears and lift internal exam average above 75%',
        practiceTasks: [
          'Solve previous 3 years Anna University semester exam question papers for CS8492',
          'Attend Wednesday remedial tutorial on relational query optimization',
          'Complete 15 probability practice problems from Departmental Question Bank',
        ],
        suggestedResources: [
          { title: 'CS8492 DBMS Unit 3 Hand-Written Lecture Notes (Prof. R. Sundaram)', type: 'INSTITUTIONAL_REPOSITORY' },
          { title: 'MA8402 Solved University Question Papers (2018-2025)', type: 'EXAM_BANK' },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateStudyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingPlan(true);
    try {
      const res = await apiClient.post('/ai/learning/study-plan', {
        studentId: user?.id || 'demo_student',
        targetExam,
        dailyHours,
        weakAreas: weakCourses.map((c) => `${c.code} - ${c.title}`),
      });

      if (res.data?.success && res.data?.data) {
        setStudySchedule(res.data.data.schedule);
      }
    } catch {
      // Fallback 7-day schedule
      setStudySchedule({
        overview: `Intensive ${dailyHours}-hour daily revision schedule customized for ${targetExam}`,
        dailySchedule: [
          { day: 'Day 1 (Monday)', focus: 'CS8492 - Normalization & 3NF/BCNF', hours: dailyHours, activity: 'Study textbook theorems and solve 5 schema decomposition questions.' },
          { day: 'Day 2 (Tuesday)', focus: 'CS8492 - Concurrency & 2PL Protocols', hours: dailyHours, activity: 'Trace conflict serializability schedules and lock manager operations.' },
          { day: 'Day 3 (Wednesday)', focus: 'MA8402 - Probability Distributions', hours: dailyHours, activity: 'Derive moment generating functions and practice binomial/Poisson distributions.' },
          { day: 'Day 4 (Thursday)', focus: 'MA8402 - Queueing Models (M/M/1)', hours: dailyHours, activity: 'Solve steady-state probability equations and average queue length problems.' },
          { day: 'Day 5 (Friday)', focus: 'CS8492 - B+ Tree Indexing & Query Plans', hours: dailyHours, activity: 'Work through node splits and cost calculations for hash join vs nested loop.' },
          { day: 'Day 6 (Saturday)', focus: 'Past Year Question Paper Review', hours: dailyHours, activity: 'Timed 2-hour sectional mock test under exam conditions.' },
          { day: 'Day 7 (Sunday)', focus: 'Formula Revision & Faculty Consultation', hours: 2, activity: 'Review summary flashcards and list clarifying doubts for class advisor.' },
        ],
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100">Personalized Learning & AI Study Planner</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Syllabus Aligned
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Adaptive recommendations synthesized from your marks records, attendance, and departmental curriculum milestones.
        </p>
      </div>

      {/* Top Section: Diagnostics & Identified Focus Areas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Identified Academic Gaps (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Identified Academic Focus Areas</h2>
            <Target className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-2.5">
            {weakCourses.map((c, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{c.code} - {c.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                    {c.marks < 50 ? 'Arrear' : 'Needs Review'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Current Mark: <strong className="text-slate-200">{c.marks}/100</strong></span>
                  {c.grade && <span>• Grade: {c.grade}</span>}
                </div>
              </div>
            ))}
          </div>

          {revisionPlan && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Milestone Goal</span>
              <p className="text-xs text-indigo-300 font-medium leading-relaxed bg-indigo-950/30 p-3 rounded-xl border border-indigo-500/20">
                "{revisionPlan.weeklyGoal}"
              </p>
            </div>
          )}
        </div>

        {/* Right: Recommended Syllabus Review Modules (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Targeted Unit Mastery Tasks</h2>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-3">
            {recommendedTopics.map((t, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-400 font-mono text-[11px]">{t.course}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.urgency === 'HIGH'
                        ? 'bg-red-500/20 text-red-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {t.urgency} PRIORITY
                  </span>
                </div>
                <div className="text-xs text-slate-200 leading-relaxed font-serif">{t.topic}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7-Day AI Revision Planner */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-100">Interactive 7-Day AI Revision Scheduler</h2>
            <p className="text-xs text-slate-400 mt-0.5">Generate an hourly structured schedule tailored to your weak subjects.</p>
          </div>

          <form onSubmit={handleGenerateStudyPlan} className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Daily Study Hours:</span>
              <select
                value={dailyHours}
                onChange={(e) => setDailyHours(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              >
                <option value={2}>2 Hours/Day</option>
                <option value={3}>3 Hours/Day</option>
                <option value={4}>4 Hours/Day</option>
                <option value={5}>5 Hours/Day (Intensive)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isGeneratingPlan}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs transition shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isGeneratingPlan ? 'Generating Schedule...' : 'Build 7-Day Plan'}</span>
            </button>
          </form>
        </div>

        {studySchedule && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 font-medium">
              {studySchedule.overview}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {studySchedule.dailySchedule?.map((d: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-200">{d.day}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-indigo-400 font-mono">
                        {d.hours} hrs
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-indigo-300">{d.focus}</div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{d.activity}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800/80 flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Milestone tracking enabled</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Course Packs & Repository Resources */}
      {revisionPlan?.suggestedResources && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Curated Institutional Repository Materials</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {revisionPlan.suggestedResources.map((res, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 leading-snug">{res.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono">{res.type}</span>
                  </div>
                </div>

                <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1">
                  <span>Access</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default PersonalizedLearningView;
