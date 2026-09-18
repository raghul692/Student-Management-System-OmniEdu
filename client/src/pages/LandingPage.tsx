import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2,
  GraduationCap,
  School,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Users,
  UserCheck,
  CalendarCheck,
  Award,
  BookOpen,
  Calendar,
  FileText,
  TrendingUp,
  Lock,
  Server,
  Layers,
  ChevronRight,
  Sun,
  Moon,
  Laptop,
  Compass,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { SEOHead } from '../components/seo/SEOHead';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeRoleTab, setActiveRoleTab] = useState<'ORG' | 'INST' | 'HOD' | 'FACULTY' | 'STUDENT' | 'PARENT'>('ORG');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqItems = [
    {
      q: 'What is OmniEdu Student Management System & ERP?',
      a: 'OmniEdu is an enterprise cloud-native Student Management System (SMS) and Educational ERP platform. It unifies academic catalogs, multi-campus governance, automated hour-wise attendance tracking, Anna University & CBSE marks grading, and AI-driven early-warning risk radar under a single high-performance dashboard.',
    },
    {
      q: 'How does OmniEdu handle multi-tenant educational trusts?',
      a: 'OmniEdu uses AsyncLocalStorage context isolation to guarantee strict multi-tenant boundary security. A governing educational trust can oversee dozens of autonomous school and college campuses from an aggregated executive telemetry dashboard without any risk of cross-tenant data leakage.',
    },
    {
      q: 'Does OmniEdu support both K-12 Schools and Engineering Colleges?',
      a: 'Yes. OmniEdu natively supports dual-mode polymorphic academic workflows. School campuses can organize by Standard (Grade 1–12) and Sections with CBSE/ICSE terms, while Engineering and Arts Colleges can manage collegiate departments (CSE, ECE, MECH), semesters, credits, and Anna University R2021 regulations.',
    },
    {
      q: 'How does the Early Warning Attendance Radar work?',
      a: 'The attendance engine continuously evaluates student attendance against strict university regulatory cutoffs (e.g. 75% minimum requirement). It automatically triages students into Normal, Condonation-eligible (65–74.9%), or Detained (<65%) tiers and triggers proactive alerts to advisors, students, and parents.',
    },
    {
      q: 'What role-based access control (RBAC) levels are provided?',
      a: 'OmniEdu provides 8 pre-configured role levels: Platform Admin, Organization Trust Admin, Institution Admin (Principal/Dean), Head of Department (HOD), Faculty/Teacher, Class Advisor, Student, and Parent/Guardian—each with granular permission scoping.',
    },
    {
      q: 'Can we test OmniEdu without creating an account?',
      a: 'Yes! OmniEdu includes a zero-login Interactive Demo Sandbox accessible at /sandbox. It runs on a sandbox-aware in-memory store so you can evaluate all role dashboards, test attendance marking, and explore student 360 profiles risk-free.',
    },
  ];

  const rolesData = {
    ORG: {
      title: 'Organization / Trust Admin',
      badge: 'Multi-Campus Telemetry',
      desc: 'Centralized oversight for educational trusts and governing bodies. Provision autonomous campuses, monitor aggregate enrollment, track cross-campus financial & academic health, and switch contexts in one click.',
      capabilities: [
        'Multi-institution provisioning without arbitrary campus limits',
        'Cross-campus staff and user role governance',
        'Trust-wide aggregate student telemetry and uptime analytics',
        'Strict tenant boundary enforcement across all institutions',
      ],
      tag: 'Strategic Governance',
    },
    INST: {
      title: 'Institution Admin (Principal / Dean)',
      badge: 'Campus Operations',
      desc: 'Complete operational control over a specific School or College campus. Manage departments or grade standards, faculty rosters, exam schedules, and real-time attendance compliance.',
      capabilities: [
        'Academic catalog configuration (Anna Univ R2021 or CBSE Standards)',
        'Defaulters radar monitoring with automated cutoff enforcement',
        'Institution exam scheduling and grade publication',
        'Staff and faculty workload assignment management',
      ],
      tag: 'Campus Leadership',
    },
    HOD: {
      title: 'Head of Department (HOD)',
      badge: 'Departmental Leadership',
      desc: 'Scoped academic authority over collegiate departments (CSE, ECE, MECH). Oversee department students, assign faculty to courses, monitor continuous assessment, and review departmental defaulters.',
      capabilities: [
        'Automatic data scoping strictly limited to department students',
        'Faculty subject allocation and teaching schedule oversight',
        'Internal assessment test (IAT) marks review and approval',
        'Departmental performance and attendance deficit tracking',
      ],
      tag: 'Collegiate Scoped',
    },
    FACULTY: {
      title: 'Teacher / College Faculty',
      badge: 'Educator Workspace',
      desc: 'Frictionless classroom tools for hour-wise or period-wise attendance, continuous assessment entry, student progress monitoring, and dynamic timetable viewing.',
      capabilities: [
        'One-click batch attendance entry with Present, Absent, and On-Duty codes',
        'Direct marks capture with real-time Anna Univ grade points calculation',
        'Scoped only to assigned subjects, classes, or student rosters',
        'Instant student attendance deficit warnings',
      ],
      tag: 'Classroom Delivery',
    },
    STUDENT: {
      title: 'Student Portal',
      badge: 'Personal Academic Hub',
      desc: 'Self-service portal giving learners secure access to their own attendance percentage, continuous assessment scores, semester grade sheets, and daily class timetables.',
      capabilities: [
        'Personal attendance radar with 75% cutoff threshold tracking',
        'Internal assessment and external exam transcript access',
        'Real-time timetable slots and room assignments',
        'Zero access to institutional directories or other students records',
      ],
      tag: 'Learner Empowerment',
    },
    PARENT: {
      title: 'Parent Portal',
      badge: 'Guardian Oversight',
      desc: 'Transparent window into ward academic progress, attendance alerts, and official exam results designed to foster parent-institution collaboration.',
      capabilities: [
        'Real-time attendance shortage notifications',
        'Quarterly, half-yearly, and annual report card access',
        'Institution announcement and calendar viewing',
        'Secure child-scoped access control',
      ],
      tag: 'Family Engagement',
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <SEOHead
        title="OmniEdu — AI-Powered Multi-Tenant Student Management System & ERP"
        description="OmniEdu is an enterprise educational ERP and student management system for schools and engineering colleges. Real-time attendance, Anna University grading, and multi-tenant security."
        canonicalUrl="https://omniedu-drab.vercel.app/"
      />
      {/* ── Background Aura ────────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[140px]" />
      </div>

      {/* ── Global Header Navigation ──────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                OmniEdu
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  SaaS
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Multi-Tenant Education ERP</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
            <a href="#solutions" className="hover:text-indigo-400 transition-colors">
              Solutions
            </a>
            <a href="#features" className="hover:text-indigo-400 transition-colors">
              Core Modules
            </a>
            <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">
              How It Works
            </a>
            <a href="#roles" className="hover:text-indigo-400 transition-colors">
              Roles & Scoping
            </a>
            <a href="#architecture" className="hover:text-indigo-400 transition-colors">
              Architecture
            </a>
            <a href="#faq" className="hover:text-indigo-400 transition-colors">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <Link
              to="/sandbox"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-all"
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Explore Demo</span>
            </Link>

            <Link
              to="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700/80 transition-all"
            >
              Sign In
            </Link>

            <Link
              to="/onboard"
              className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-8 max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>True Multi-Tenant Architecture</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-black text-white tracking-tight leading-[1.1] max-w-4xl mx-auto"
        >
          OmniEdu
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200 mt-2">
            Education ERP / SaaS
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Manage Schools, Colleges, and Educational Trusts from one configurable platform.
          Zero code divergence, strict database-level tenant isolation, and polymorphic academic workflows.
        </motion.p>

        {/* Hero CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3.5"
        >
          <Link
            to="/onboard"
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Create Your Organization</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/sandbox"
            className="px-6 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm flex items-center gap-2 border border-slate-700/80 hover:border-amber-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Compass className="w-4 h-4 text-amber-400" />
            <span>1-Click Guest Sandbox</span>
          </Link>

          <Link
            to="/login"
            className="px-5 py-3.5 rounded-2xl bg-slate-900/50 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-all"
          >
            Sign In to Existing Campus
          </Link>
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 pt-10 border-t border-slate-900 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs font-semibold text-slate-400"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Anna Univ R2021 + CBSE Aligned</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Hour & Period Attendance Engines</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>IDOR-Hardened Multi-Tenancy</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Automated Defaulters Radar (&lt;75%)</span>
          </div>
        </motion.div>
      </section>

      {/* ── Solution Overview ─────────────────────────────────────────── */}
      <section id="solutions" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Tailored Educational Solutions
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Built for Every Tier of Education
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            One single codebase that intelligently morphs its data structures, terminology, and workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Engineering College */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-5 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Higher Education
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5 group-hover:text-indigo-300 transition-colors">
                  Engineering College
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Designed for universities and autonomous colleges requiring semester-based academic tracking, department structures (CSE, ECE, MECH), and rigorous credit evaluation.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>Hour-wise attendance (Periods 1 to 8 per day)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>40 Internal + 60 External Anna Univ marks</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>10-point SGPA/CGPA grade calculation engine</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  <span>HOD department-level scoping & student rosters</span>
                </li>
              </ul>
            </div>
            <Link
              to="/onboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 pt-2"
            >
              <span>Deploy College ERP</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* K-12 School */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/40 transition-all space-y-5 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <School className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Primary & Secondary
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5 group-hover:text-purple-300 transition-colors">
                  K-12 School
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Streamlined for CBSE, ICSE, and State Board matriculation schools with Standard-Section hierarchy, class teacher assignments, and periodic exam terms.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Standards 1 to 12 with Sections A, B, C</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Period-based attendance and roll number indexing</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>Quarterly, Half-yearly, and Annual exam cycles</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span>CBSE A1 to E letter grades & percentage cards</span>
                </li>
              </ul>
            </div>
            <Link
              to="/onboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 pt-2"
            >
              <span>Deploy School ERP</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* School + College Educational Trust */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-slate-900/60 to-purple-950/40 border border-indigo-500/30 hover:border-indigo-400/50 transition-all space-y-5 flex flex-col justify-between group shadow-xl">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Federated Group
                </span>
                <h3 className="text-xl font-bold text-white mt-0.5 group-hover:text-amber-300 transition-colors">
                  School + College / Trust
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Empowers educational trusts and foundations managing multiple autonomous schools and colleges under one centralized organization console.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Global Trust Console with aggregate metrics</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>1-click switching between campus environments</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Provision 3rd, 4th, or Nth campuses dynamically</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>Independent academic calendars per institution</span>
                </li>
              </ul>
            </div>
            <Link
              to="/onboard"
              className="inline-flex items-center gap-2 text-xs font-bold text-amber-400 hover:text-amber-300 pt-2"
            >
              <span>Deploy Trust Platform</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Core Features Bento Grid ─────────────────────────────────── */}
      <section id="features" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Engineered for Modern Institutions
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Enterprise Feature Matrix
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Every operational requirement solved with precision, clean aesthetics, and rock-solid authorization.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <Users className="w-5 h-5 text-indigo-400" />,
              title: 'Student Management',
              desc: 'Unified student directory with dual polymorphic support for college university register numbers and school standard-section roll numbers.',
            },
            {
              icon: <UserCheck className="w-5 h-5 text-purple-400" />,
              title: 'Staff / Faculty Directory',
              desc: 'Scoped educator rosters distinguishing college professors & HODs from school teachers, with role-based class & subject assignments.',
            },
            {
              icon: <CalendarCheck className="w-5 h-5 text-emerald-400" />,
              title: 'Attendance Engine',
              desc: 'Configurable hour-wise (College) and period-wise (School) batch attendance capture with Present, Absent, and On-Duty accounting.',
            },
            {
              icon: <TrendingUp className="w-5 h-5 text-amber-400" />,
              title: 'Defaulters Radar (< 75%)',
              desc: 'Automated deficit surveillance identifying students below university regulatory thresholds with predictive attendance shortfall warnings.',
            },
            {
              icon: <Award className="w-5 h-5 text-cyan-400" />,
              title: 'Exams & Mark Ledgers',
              desc: 'Comprehensive continuous assessment test entry, external board exam records, passing criteria validation, and arrear/RA tracking.',
            },
            {
              icon: <BookOpen className="w-5 h-5 text-rose-400" />,
              title: 'Results & CGPA Engine',
              desc: 'Automated calculation of grade points, credits earned, SGPA, and cumulative CGPA compliant with Anna University Regulation 2021.',
            },
            {
              icon: <Calendar className="w-5 h-5 text-blue-400" />,
              title: 'Timetable Matrix',
              desc: 'Weekly period-by-period class schedules with department, semester, faculty, room number, and lab session conflict detection.',
            },
            {
              icon: <FileText className="w-5 h-5 text-teal-400" />,
              title: 'Reports Hub & Exports',
              desc: 'Comprehensive reporting suite with live tabular previews and one-click exports to CSV and official institutional PDF documents.',
            },
            {
              icon: <ShieldCheck className="w-5 h-5 text-indigo-400" />,
              title: 'Multi-Tenant Security',
              desc: 'Hardened AsyncLocalStorage execution context eliminating IDOR attacks and isolating tenant boundaries at the database query level.',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800/80 hover:border-slate-700 transition-all space-y-3 group"
            >
              <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 w-fit group-hover:scale-105 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                {feature.title}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Frictionless Deployment
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            How OmniEdu Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Go from initial onboarding to active campus telemetry in 5 clean steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {[
            {
              step: '01',
              title: 'Create Organization',
              desc: 'Define your governing Educational Trust or School Society with an enterprise slug.',
            },
            {
              step: '02',
              title: 'Choose Institution',
              desc: 'Provision an Engineering College, Matriculation School, or both under one umbrella.',
            },
            {
              step: '03',
              title: 'Academic Structure',
              desc: 'Auto-initialize college departments (CSE, ECE) or school classes (Standards 1-12).',
            },
            {
              step: '04',
              title: 'Add Users & Roles',
              desc: 'Assign Principals, HODs, Teachers, and Students with scoped, least-privilege roles.',
            },
            {
              step: '05',
              title: 'Live Telemetry',
              desc: 'Begin recording daily attendance, entering marks, and generating official reports.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-3 relative flex flex-col justify-between"
            >
              <div>
                <span className="text-2xl font-black text-indigo-500/40 font-mono block">
                  {item.step}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
              <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full"
                  style={{ width: `${(idx + 1) * 20}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Role Overview & Scoping ───────────────────────────────────── */}
      <section id="roles" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Role-Based Access Control
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Tailored Scopes for Every Persona
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Every persona receives a dedicated experience with data access strictly locked to their authorized perimeter.
          </p>
        </div>

        {/* Role Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {(
            [
              { key: 'ORG', label: 'Organization Admin' },
              { key: 'INST', label: 'Institution Admin' },
              { key: 'HOD', label: 'HOD' },
              { key: 'FACULTY', label: 'Teacher / Faculty' },
              { key: 'STUDENT', label: 'Student' },
              { key: 'PARENT', label: 'Parent' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveRoleTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeRoleTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active Role Content Card */}
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider">
                  {rolesData[activeRoleTab].badge}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {rolesData[activeRoleTab].tag}
                </span>
              </div>
              <h3 className="text-2xl font-black text-white">{rolesData[activeRoleTab].title}</h3>
            </div>
            <Link
              to="/sandbox"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <span>Test This Persona</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <p className="text-sm text-slate-300 mt-6 leading-relaxed">
            {rolesData[activeRoleTab].desc}
          </p>

          <div className="mt-6 pt-6 border-t border-slate-800/80">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Guaranteed Security & Scope Boundaries
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rolesData[activeRoleTab].capabilities.map((cap, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Multi-Tenant Security & SaaS Architecture ─────────────────── */}
      <section id="architecture" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto border-t border-slate-900">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
            Zero Cross-Tenant Leaks
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mt-1">
            Multi-Tenant Scoping Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Every request executes within a cryptographically isolated tenant context verified against database memberships.
          </p>
        </div>

        {/* Visual Flow Representation */}
        <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/30 flex-1 w-full">
              <Building2 className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Organization</p>
              <p className="text-[10px] text-slate-400">Trust / Society</p>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0 shrink-0" />

            <div className="p-4 rounded-2xl bg-slate-950 border border-purple-500/30 flex-1 w-full">
              <School className="w-6 h-6 text-purple-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Institution</p>
              <p className="text-[10px] text-slate-400">College or School</p>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0 shrink-0" />

            <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 flex-1 w-full">
              <Users className="w-6 h-6 text-cyan-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Users</p>
              <p className="text-[10px] text-slate-400">Identity & JWT</p>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0 shrink-0" />

            <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 flex-1 w-full">
              <ShieldCheck className="w-6 h-6 text-amber-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Roles</p>
              <p className="text-[10px] text-slate-400">Admin, HOD, Teacher</p>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0 shrink-0" />

            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 flex-1 w-full">
              <Lock className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white">Scoped Data</p>
              <p className="text-[10px] text-slate-400">Dept / Class / Self</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400 leading-relaxed text-center max-w-2xl mx-auto">
            <span className="font-semibold text-slate-200">IDOR Defense Guarantee: </span>
            The server strictly validates incoming tenant headers (<code className="font-mono text-indigo-400">x-institution-id</code>) against the caller’s database memberships. Attempts to spoof or query cross-tenant resources immediately abort with HTTP 403 Forbidden.
          </div>
        </div>
      </section>

      {/* ── FAQ Section (SEO & Rich Snippets) ─────────────────────────── */}
      <section id="faq" className="py-20 px-4 sm:px-8 max-w-5xl mx-auto">
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Everything You Need to Know About OmniEdu
          </h2>
          <p className="text-sm text-slate-400 max-w-2xl mx-auto">
            Find answers to common questions regarding multi-campus tenancy, academic regulations (Anna Univ & CBSE), automated attendance cutoffs, and security scoping.
          </p>
        </div>

        <div className="space-y-4">
          {faqItems.map((item, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden transition-all duration-200 hover:border-indigo-500/40"
            >
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-white hover:text-indigo-300 transition-colors"
                aria-expanded={openFaq === idx}
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-5 h-5 text-indigo-400 flex-shrink-0 transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-6 pb-5 pt-1 text-sm text-slate-300 leading-relaxed border-t border-slate-800/50">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final Call to Action ───────────────────────────────────────── */}
      <section className="py-20 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-950/60 to-slate-900 border border-indigo-500/30 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Ready to Transform Your Educational Institution?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Deploy OmniEdu today. Experience full multi-tenant configuration, polymorphic academic structure, and real-time operations in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                to="/onboard"
                className="px-6 py-3.5 rounded-2xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-sm shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Create Your Organization
              </Link>
              <Link
                to="/sandbox"
                className="px-6 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Explore Demo</span>
              </Link>
              <Link
                to="/login"
                className="px-5 py-3.5 rounded-2xl bg-indigo-950/40 hover:bg-indigo-950/80 text-indigo-200 hover:text-white font-semibold text-sm border border-indigo-500/30 transition-all"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950/90 py-12 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-base font-black text-white">OmniEdu</span>
            </div>
            <p className="text-slate-400 max-w-sm text-xs leading-relaxed">
              Unified Multi-Tenant Education ERP & SaaS Platform for Schools, Engineering Colleges, and Federated Trusts.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Architecture: AsyncLocalStorage Scoping • Anna Univ R2021 + CBSE
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">Product</h4>
            <ul className="space-y-2">
              <li><a href="#features" className="hover:text-slate-200 transition-colors">Core Modules</a></li>
              <li><a href="#how-it-works" className="hover:text-slate-200 transition-colors">How It Works</a></li>
              <li><a href="#faq" className="hover:text-slate-200 transition-colors">FAQ</a></li>
              <li><Link to="/sandbox" className="hover:text-slate-200 transition-colors">1-Click Sandbox</Link></li>
              <li><Link to="/onboard" className="hover:text-slate-200 transition-colors">Onboarding Wizard</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">Solutions</h4>
            <ul className="space-y-2">
              <li><a href="#solutions" className="hover:text-slate-200 transition-colors">Engineering College</a></li>
              <li><a href="#solutions" className="hover:text-slate-200 transition-colors">K-12 School</a></li>
              <li><a href="#solutions" className="hover:text-slate-200 transition-colors">Educational Trust</a></li>
              <li><a href="#roles" className="hover:text-slate-200 transition-colors">Role Scoping</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">Security & Auth</h4>
            <ul className="space-y-2">
              <li><a href="#architecture" className="hover:text-slate-200 transition-colors">SaaS Architecture</a></li>
              <li><a href="#architecture" className="hover:text-slate-200 transition-colors">IDOR Defense</a></li>
              <li><Link to="/login" className="hover:text-slate-200 transition-colors">Sign In Portal</Link></li>
              <li><Link to="/onboard" className="hover:text-slate-200 transition-colors">Register Trust</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>© 2026 OmniEdu Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500 font-mono">100% ONLINE</span>
            <span>•</span>
            <span>REST API v2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
