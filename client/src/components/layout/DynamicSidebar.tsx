import React from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  GraduationCap,
  FileSpreadsheet,
  UploadCloud,
  Bell,
  Sliders,
  CreditCard,
  ClipboardList,
  Megaphone,
  BarChart2,
  Sparkles,
  Bot,
  FileQuestion,
  Cpu,
  Webhook,
  HeartHandshake,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';

export type TabKey =
  | 'dashboard'
  | 'students'
  | 'staff'
  | 'attendance'
  | 'defaulters'
  | 'marks'
  | 'exam_management'
  | 'academic'
  | 'curriculum_designer'
  | 'timetable'
  | 'reports'
  | 'bulk_import'
  | 'assignments'
  | 'fees'
  | 'announcements'
  | 'analytics'
  | 'notifications'
  | 'institution_settings'
  | 'notification_settings'
  | 'interventions'
  | 'webhooks'
  | 'audit'
  | 'system_status'
  | 'parent_portal'
  | 'ai_assistant'
  | 'ai_knowledge'
  | 'ai_questions'
  | 'ai_communications'
  | 'ai_early_warning'
  | 'ai_usage'
  | 'ai_learning';

interface DynamicSidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const DynamicSidebar: React.FC<DynamicSidebarProps> = ({
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { activeCampus, user, getActiveTenantType } = useAuthStore();
  const { can, institutionRole } = usePermissionStore();
  const tenantType = getActiveTenantType();
  const isCollege = tenantType === 'COLLEGE';
  const effectiveRole = institutionRole || (user?.role as string);
  const isStudent = effectiveRole === 'STUDENT';
  const isParent = effectiveRole === 'PARENT';

  const allNavItems = [
    {
      key: 'dashboard' as TabKey,
      label: isStudent ? 'My Student Portal' : isParent ? 'Ward Overview' : 'Executive Telemetry',
      icon: <LayoutDashboard className="w-4 h-4" />,
      badge: undefined,
      visible: true,
    },
    {
      key: 'students' as TabKey,
      label: isCollege ? 'Student Directory' : 'Student Enrollment',
      sublabel: isCollege ? 'Anna Univ Reg Nos' : 'Standards & Rolls',
      icon: <Users className="w-4 h-4" />,
      visible: !isStudent && !isParent && (can('students', 'read', 'institution') || can('students', 'read', 'department') || can('students', 'read', 'class') || can('students', 'read', 'assigned') || can('students', 'write')),
    },
    {
      key: 'staff' as TabKey,
      label: isCollege ? 'Faculty Directory' : 'Teaching Staff',
      sublabel: isCollege ? 'Professors & Lecturers' : 'Teachers & Staff',
      icon: <GraduationCap className="w-4 h-4" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'attendance' as TabKey,
      label: isCollege ? 'Hour-wise Attendance' : 'Period-wise Attendance',
      sublabel: isCollege ? 'Hours 1 - 8' : 'Periods 1 - 8',
      icon: <CalendarCheck className="w-4 h-4" />,
      visible: !isStudent && !isParent && (can('attendance', 'write') || can('attendance', 'read', 'department') || can('attendance', 'read', 'institution')),
    },
    {
      key: 'defaulters' as TabKey,
      label: 'Defaulters Radar',
      sublabel: isCollege ? '< 75% Cutoff (SA)' : '< 75% Shortage',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      badge: 'Alerts',
      visible: !isStudent && !isParent && (can('attendance', 'read', 'institution') || can('attendance', 'read', 'department') || can('attendance', 'read', 'class')),
    },
    {
      key: 'marks' as TabKey,
      label: isCollege ? 'Continuous Assessment' : 'Examinations & Grades',
      sublabel: isCollege ? '40 CIA + 60 Ext (CGPA)' : 'CBSE Letter Grades',
      icon: <Award className="w-4 h-4" />,
      visible: !isStudent && !isParent && (can('marks', 'write') || can('marks', 'read', 'department') || can('marks', 'read', 'institution')),
    },
    {
      key: 'academic' as TabKey,
      label: isCollege ? 'Depts & Courses' : 'Standards & Sections',
      sublabel: isCollege ? 'CSE, ECE, MECH' : 'Curriculum Architecture',
      icon: isCollege ? <BookOpen className="w-4 h-4" /> : <Layers className="w-4 h-4" />,
      visible: !isStudent && !isParent && can('academic', 'read'),
    },
    {
      key: 'curriculum_designer' as TabKey,
      label: 'Curriculum Designer',
      sublabel: isCollege ? 'Regulations & Offerings' : 'Grades & Subjects',
      icon: <Layers className="w-4 h-4" />,
      visible: !isStudent && !isParent && (can('academic', 'write') || can('academic', 'read')),
    },
    {
      key: 'timetable' as TabKey,
      label: isStudent ? 'My Timetable' : 'Timetable Matrix',
      sublabel: 'Mon - Fri Slots',
      icon: <Calendar className="w-4 h-4" />,
      visible: !isParent,
    },
    {
      key: 'reports' as TabKey,
      label: isStudent ? 'My Transcripts' : 'Reports Hub',
      sublabel: isStudent ? 'Grades & PDF Export' : 'Official PDF & CSVs',
      icon: <FileSpreadsheet className="w-4 h-4" />,
      visible: true,
    },
    {
      key: 'exam_management' as TabKey,
      label: isCollege ? 'Exam Lifecycle' : 'Exam Management',
      sublabel: isCollege ? 'CIA · Hall Tickets · Reports' : 'Tests · Hall Tickets',
      icon: <GraduationCap className="w-4 h-4" />,
      visible: !isStudent && !isParent && (can('marks', 'write') || can('marks', 'read', 'institution') || can('marks', 'read', 'department')),
    },
    {
      key: 'assignments' as TabKey,
      label: isStudent ? 'My Assignments' : 'Assignments',
      sublabel: isStudent ? 'Submit & View Scores' : 'Create & Evaluate',
      icon: <ClipboardList className="w-4 h-4" />,
      visible: !isParent,
    },
    {
      key: 'fees' as TabKey,
      label: 'Fee Management',
      sublabel: isStudent ? 'My Fee Ledger' : 'Structures & Payments',
      icon: <CreditCard className="w-4 h-4" />,
      visible: !isParent,
    },
    {
      key: 'announcements' as TabKey,
      label: 'Announcements',
      sublabel: 'Notices & Broadcasts',
      icon: <Megaphone className="w-4 h-4" />,
      visible: true,
    },
    {
      key: 'analytics' as TabKey,
      label: 'Intelligence Hub',
      sublabel: 'At-Risk Radar · Overview',
      icon: <BarChart2 className="w-4 h-4" />,
      badge: 'AI',
      visible: !isStudent && !isParent && (can('marks', 'read', 'institution') || can('attendance', 'read', 'institution')),
    },
    {
      key: 'bulk_import' as TabKey,
      label: 'Bulk CSV Import',
      sublabel: 'Self-Service Migration',
      icon: <UploadCloud className="w-4 h-4" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'notifications' as TabKey,
      label: 'Notification Center',
      sublabel: 'Alerts & Broadcasts',
      icon: <Bell className="w-4 h-4" />,
      visible: true,
    },
    {
      key: 'institution_settings' as TabKey,
      label: 'Institution Rules',
      sublabel: 'Thresholds & Audit Trail',
      icon: <Sliders className="w-4 h-4" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'interventions' as TabKey,
      label: 'Intervention Center',
      sublabel: 'Remedial & Mentorship',
      icon: <HeartHandshake className="w-4 h-4 text-emerald-400" />,
      badge: 'Active',
      visible: !isStudent && !isParent,
    },
    {
      key: 'parent_portal' as TabKey,
      label: 'Parent Portal',
      sublabel: 'Ward Performance & Fees',
      icon: <Users className="w-4 h-4 text-sky-400" />,
      visible: isParent,
    },
    {
      key: 'webhooks' as TabKey,
      label: 'Webhook Outbox',
      sublabel: 'Enterprise Integrations',
      icon: <Webhook className="w-4 h-4 text-purple-400" />,
      visible: !isStudent && !isParent && (can('academic', 'write') || effectiveRole === 'INSTITUTION_ADMIN' || effectiveRole === 'PLATFORM_ADMIN'),
    },
    {
      key: 'audit' as TabKey,
      label: 'Audit & Compliance',
      sublabel: 'Security & Access Trail',
      icon: <ShieldAlert className="w-4 h-4 text-indigo-400" />,
      visible: !isStudent && !isParent && (effectiveRole === 'INSTITUTION_ADMIN' || effectiveRole === 'PLATFORM_ADMIN'),
    },
    {
      key: 'system_status' as TabKey,
      label: 'System Telemetry',
      sublabel: 'Infrastructure Health',
      icon: <Activity className="w-4 h-4 text-teal-400" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'ai_assistant' as TabKey,
      label: 'AI Copilot',
      sublabel: 'Role-Scoped Assistant',
      icon: <Bot className="w-4 h-4 text-indigo-400" />,
      badge: 'AI',
      visible: true,
    },
    {
      key: 'ai_learning' as TabKey,
      label: 'AI Study Planner',
      sublabel: 'Adaptive Revision Tasks',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      badge: 'AI',
      visible: isStudent,
    },
    {
      key: 'ai_early_warning' as TabKey,
      label: 'Early Warning Radar',
      sublabel: 'Predictive Multi-Signal',
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      badge: 'Risk',
      visible: !isStudent && !isParent,
    },
    {
      key: 'ai_knowledge' as TabKey,
      label: 'Campus Knowledge RAG',
      sublabel: 'Regulations & Bylaws',
      icon: <BookOpen className="w-4 h-4 text-blue-400" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'ai_questions' as TabKey,
      label: 'Question Generator',
      sublabel: "Bloom's Taxonomy Items",
      icon: <FileQuestion className="w-4 h-4 text-purple-400" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'ai_communications' as TabKey,
      label: 'Circular & Notice Drafter',
      sublabel: 'Tone-Adapted Broadcasts',
      icon: <Megaphone className="w-4 h-4 text-amber-400" />,
      visible: !isStudent && !isParent,
    },
    {
      key: 'ai_usage' as TabKey,
      label: 'AI Quota & Telemetry',
      sublabel: 'Tokens & Spend Metrics',
      icon: <Cpu className="w-4 h-4 text-emerald-400" />,
      visible: !isStudent && !isParent,
    },
  ];

  const navItems = allNavItems.filter((item) => item.visible);

  return (
    <aside
      className={`fixed lg:sticky top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 lg:w-72 bg-surface/95 dark:bg-obsidian-surface/95 border-r border-slate-200/80 dark:border-white/[0.08] backdrop-blur-2xl flex flex-col justify-between p-4 transition-transform duration-300 lg:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col gap-1 overflow-y-auto pr-1">
        {/* Active Campus Scope Pill Indicator */}
        <div className="mb-3 px-3 py-2.5 rounded-xl bg-slate-100/80 dark:bg-obsidian-card border border-slate-200/70 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isCollege ? 'bg-indigo-500 shadow-glow-indigo' : 'bg-purple-500 shadow-glow-rose'
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {isCollege ? 'Engineering College' : 'Matriculation School'}
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500">
            {isCollege ? 'R2021' : 'CBSE'}
          </span>
        </div>

        {/* Navigation Items List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectTab(item.key);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                  isActive
                    ? 'text-brand-600 dark:text-white font-semibold bg-brand-500/10 dark:bg-white/[0.06] shadow-inner-glow'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/[0.03]'
                }`}
              >
                {/* Active left indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-500 rounded-r-full"
                  />
                )}

                <div className="flex items-center gap-3">
                  <span
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand-500/15 text-brand-500 dark:text-brand-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <span className="text-xs tracking-tight block">{item.label}</span>
                    {item.sublabel && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                        {item.sublabel}
                      </span>
                    )}
                  </div>
                </div>

                {item.badge ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/25">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight
                    className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isActive ? 'opacity-100 text-brand-400' : 'text-slate-400'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status Banner */}
      <div className="pt-3 border-t border-slate-200/80 dark:border-white/[0.08]">
        <div className="px-3 py-2.5 rounded-xl bg-slate-100/60 dark:bg-obsidian-card/60 border border-slate-200/50 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[10px]">API: Port 5000</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-500 font-mono">100% ONLINE</span>
        </div>
      </div>
    </aside>
  );
};
