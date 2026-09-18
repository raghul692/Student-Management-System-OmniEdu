import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AppShell } from './components/layout/AppShell';
import { TabKey } from './components/layout/DynamicSidebar';
import { AuthGuard } from './guards/AuthGuard';

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">Loading View...</span>
    </div>
  </div>
);

// Lazy-loaded Views for Bundle Optimization (< 250 kB Initial Chunk)
const RoleDashboard = React.lazy(() => import('./pages/RoleDashboard').then(m => ({ default: m.RoleDashboard })));
const StudentDirectory = React.lazy(() => import('./modules/students/StudentDirectory').then(m => ({ default: m.StudentDirectory })));
const StaffDirectory = React.lazy(() => import('./modules/staff/StaffDirectory').then(m => ({ default: m.StaffDirectory })));
const DefaultersRadarView = React.lazy(() => import('./modules/defaulters/DefaultersRadarView').then(m => ({ default: m.DefaultersRadarView })));
const AttendanceLedger = React.lazy(() => import('./modules/attendance/AttendanceLedger').then(m => ({ default: m.AttendanceLedger })));
const MarksLedger = React.lazy(() => import('./modules/marks/MarksLedger').then(m => ({ default: m.MarksLedger })));
const ExamManagement = React.lazy(() => import('./modules/marks/ExamManagement').then(m => ({ default: m.ExamManagement })));
const AcademicCatalogView = React.lazy(() => import('./modules/academic/AcademicCatalogView').then(m => ({ default: m.AcademicCatalogView })));
const TimetableView = React.lazy(() => import('./modules/academic/TimetableView').then(m => ({ default: m.TimetableView })));
const ReportsHub = React.lazy(() => import('./modules/reports/ReportsHub').then(m => ({ default: m.ReportsHub })));
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const OnboardingWizard = React.lazy(() => import('./pages/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })));
const GuestSandboxPage = React.lazy(() => import('./pages/GuestSandboxPage').then(m => ({ default: m.GuestSandboxPage })));
const OrgAdminDashboard = React.lazy(() => import('./pages/OrgAdminDashboard').then(m => ({ default: m.OrgAdminDashboard })));
const InstitutionManagement = React.lazy(() => import('./pages/admin/InstitutionManagement').then(m => ({ default: m.InstitutionManagement })));
const OrgUsersManagement = React.lazy(() => import('./pages/admin/OrgUsersManagement').then(m => ({ default: m.OrgUsersManagement })));
const OrgSettingsPage = React.lazy(() => import('./pages/admin/OrgSettingsPage').then(m => ({ default: m.OrgSettingsPage })));
const CurriculumDesigner = React.lazy(() => import('./modules/academic/CurriculumDesigner').then(m => ({ default: m.CurriculumDesigner })));
const ImportWizard = React.lazy(() => import('./modules/imports/ImportWizard').then(m => ({ default: m.ImportWizard })));
const NotificationCenter = React.lazy(() => import('./modules/notifications/NotificationCenter').then(m => ({ default: m.NotificationCenter })));
const InstitutionSettingsPage = React.lazy(() => import('./pages/settings/InstitutionSettingsPage').then(m => ({ default: m.InstitutionSettingsPage })));
const NotificationSettingsPage = React.lazy(() => import('./pages/settings/NotificationSettingsPage').then(m => ({ default: m.NotificationSettingsPage })));
const FeesLedger = React.lazy(() => import('./modules/fees/FeesLedger').then(m => ({ default: m.FeesLedger })));
const AssignmentsView = React.lazy(() => import('./modules/assignments/AssignmentsView').then(m => ({ default: m.AssignmentsView })));
const AnnouncementsBoard = React.lazy(() => import('./modules/announcements/AnnouncementsBoard').then(m => ({ default: m.AnnouncementsBoard })));
const AnalyticsDashboard = React.lazy(() => import('./modules/analytics/AnalyticsDashboard').then(m => ({ default: m.AnalyticsDashboard })));

// Phase F: Advanced AI & Intelligent Automation Views
const AiAssistantView = React.lazy(() => import('./modules/ai/AiAssistantView').then(m => ({ default: m.AiAssistantView })));
const AiKnowledgeBaseView = React.lazy(() => import('./modules/ai/AiKnowledgeBaseView').then(m => ({ default: m.AiKnowledgeBaseView })));
const QuestionGeneratorView = React.lazy(() => import('./modules/ai/QuestionGeneratorView').then(m => ({ default: m.QuestionGeneratorView })));
const AiCommunicationsView = React.lazy(() => import('./modules/ai/AiCommunicationsView').then(m => ({ default: m.AiCommunicationsView })));
const EarlyWarningRadarView = React.lazy(() => import('./modules/ai/EarlyWarningRadarView').then(m => ({ default: m.EarlyWarningRadarView })));
const AiUsageAnalyticsView = React.lazy(() => import('./modules/ai/AiUsageAnalyticsView').then(m => ({ default: m.AiUsageAnalyticsView })));
const PersonalizedLearningView = React.lazy(() => import('./modules/ai/PersonalizedLearningView').then(m => ({ default: m.PersonalizedLearningView })));

// Phase H: Enterprise Intelligence & Extended Portals
const InterventionCenter = React.lazy(() => import('./modules/interventions/InterventionCenter').then(m => ({ default: m.InterventionCenter })));
const Student360View = React.lazy(() => import('./modules/students/Student360View').then(m => ({ default: m.Student360View })));
const ParentDashboard = React.lazy(() => import('./modules/parents/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const WebhookManager = React.lazy(() => import('./modules/webhooks/WebhookManager').then(m => ({ default: m.WebhookManager })));
const AuditLogViewer = React.lazy(() => import('./modules/audit/AuditLogViewer').then(m => ({ default: m.AuditLogViewer })));
const SystemStatusPage = React.lazy(() => import('./modules/system/SystemStatusPage').then(m => ({ default: m.SystemStatusPage })));

function AppWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map URL pathname to activeTab
  const rawPath = location.pathname.replace('/app', '').replace(/^\//, '');
  const pathPart = rawPath.split('/')[0];
  const subPath = rawPath.split('/')[1];

  let activeTab: TabKey = 'dashboard';
  if (pathPart === 'students') activeTab = 'students';
  else if (pathPart === 'staff') activeTab = 'staff';
  else if (pathPart === 'attendance') activeTab = 'attendance';
  else if (pathPart === 'defaulters') activeTab = 'defaulters';
  else if (pathPart === 'marks') activeTab = 'marks';
  else if (pathPart === 'academic' && subPath === 'designer') activeTab = 'curriculum_designer';
  else if (pathPart === 'academic') activeTab = 'academic';
  else if (pathPart === 'academic-designer' || pathPart === 'curriculum_designer') activeTab = 'curriculum_designer';
  else if (pathPart === 'timetable') activeTab = 'timetable';
  else if (pathPart === 'reports') activeTab = 'reports';
  else if (pathPart === 'import' || pathPart === 'bulk_import') activeTab = 'bulk_import';
  else if (pathPart === 'assignments') activeTab = 'assignments';
  else if (pathPart === 'fees') activeTab = 'fees';
  else if (pathPart === 'announcements') activeTab = 'announcements';
  else if (pathPart === 'analytics' && subPath === 'early-warning') activeTab = 'ai_early_warning';
  else if (pathPart === 'analytics' && subPath === 'ai-usage') activeTab = 'ai_usage';
  else if (pathPart === 'analytics') activeTab = 'analytics';
  else if (pathPart === 'notifications') activeTab = 'notifications';
  else if (pathPart === 'institution_settings' || (pathPart === 'settings' && subPath === 'institution')) activeTab = 'institution_settings';
  else if (pathPart === 'notification_settings' || (pathPart === 'settings' && subPath === 'notifications')) activeTab = 'notification_settings';
  else if (pathPart === 'ai-assistant' || pathPart === 'ai_assistant') activeTab = 'ai_assistant';
  else if (pathPart === 'ai' && subPath === 'knowledge') activeTab = 'ai_knowledge';
  else if (pathPart === 'ai' && subPath === 'question-generator') activeTab = 'ai_questions';
  else if (pathPart === 'ai' && subPath === 'communications') activeTab = 'ai_communications';
  else if (pathPart === 'student-portal' && subPath === 'learning') activeTab = 'ai_learning';
  else if (pathPart === 'interventions') activeTab = 'interventions';
  else if (pathPart === 'parent-portal' || pathPart === 'parent') activeTab = 'parent_portal';
  else if (pathPart === 'webhooks') activeTab = 'webhooks';
  else if (pathPart === 'audit' || pathPart === 'audit-logs') activeTab = 'audit';
  else if (pathPart === 'system-status' || (pathPart === 'system' && subPath === 'status')) activeTab = 'system_status';

  const handleSelectTab = (tab: TabKey) => {
    if (tab === 'curriculum_designer') {
      navigate('/app/academic-designer');
    } else if (tab === 'bulk_import') {
      navigate('/app/import');
    } else if (tab === 'institution_settings') {
      navigate('/app/settings/institution');
    } else if (tab === 'notification_settings') {
      navigate('/app/settings/notifications');
    } else if (tab === 'ai_assistant') {
      navigate('/app/ai-assistant');
    } else if (tab === 'ai_knowledge') {
      navigate('/app/ai/knowledge');
    } else if (tab === 'ai_questions') {
      navigate('/app/ai/question-generator');
    } else if (tab === 'ai_communications') {
      navigate('/app/ai/communications');
    } else if (tab === 'ai_early_warning') {
      navigate('/app/analytics/early-warning');
    } else if (tab === 'ai_usage') {
      navigate('/app/analytics/ai-usage');
    } else if (tab === 'ai_learning') {
      navigate('/app/student-portal/learning');
    } else if (tab === 'interventions') {
      navigate('/app/interventions');
    } else if (tab === 'parent_portal') {
      navigate('/app/parent-portal');
    } else if (tab === 'webhooks') {
      navigate('/app/webhooks');
    } else if (tab === 'audit') {
      navigate('/app/audit');
    } else if (tab === 'system_status') {
      navigate('/app/system/status');
    } else {
      navigate(`/app/${tab}`);
    }
  };

  return (
    <AppShell activeTab={activeTab} onSelectTab={handleSelectTab}>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/dashboard" element={<RoleDashboard onNavigate={handleSelectTab} />} />
          <Route path="/students" element={<StudentDirectory />} />
          <Route path="/staff" element={<StaffDirectory />} />
          <Route path="/attendance" element={<AttendanceLedger />} />
          <Route path="/defaulters" element={<DefaultersRadarView />} />
          <Route path="/marks" element={<MarksLedger />} />
          <Route path="/exam_management" element={<ExamManagement />} />
          <Route path="/exams" element={<ExamManagement />} />
          <Route path="/academic" element={<AcademicCatalogView />} />
          <Route path="/academic/designer" element={<CurriculumDesigner />} />
          <Route path="/academic-designer" element={<CurriculumDesigner />} />
          <Route path="/curriculum_designer" element={<CurriculumDesigner />} />
          <Route path="/timetable" element={<TimetableView />} />
          <Route path="/reports" element={<ReportsHub />} />
          <Route path="/import" element={<ImportWizard />} />
          <Route path="/bulk_import" element={<ImportWizard />} />
          <Route path="/assignments" element={<AssignmentsView />} />
          <Route path="/fees" element={<FeesLedger />} />
          <Route path="/announcements" element={<AnnouncementsBoard />} />
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/analytics/early-warning" element={<EarlyWarningRadarView />} />
          <Route path="/analytics/ai-usage" element={<AiUsageAnalyticsView />} />
          <Route path="/ai-assistant" element={<AiAssistantView />} />
          <Route path="/ai/knowledge" element={<AiKnowledgeBaseView />} />
          <Route path="/ai/question-generator" element={<QuestionGeneratorView />} />
          <Route path="/ai/communications" element={<AiCommunicationsView />} />
          <Route path="/student-portal/learning" element={<PersonalizedLearningView />} />
          <Route path="/notifications" element={<NotificationCenter />} />
          <Route path="/settings/institution" element={<InstitutionSettingsPage />} />
          <Route path="/institution_settings" element={<InstitutionSettingsPage />} />
          <Route path="/settings/notifications" element={<NotificationSettingsPage />} />
          <Route path="/notification_settings" element={<NotificationSettingsPage />} />
          <Route path="/org-console" element={<OrgAdminDashboard />} />
          <Route path="/admin/institutions" element={<InstitutionManagement />} />
          <Route path="/admin/users" element={<OrgUsersManagement />} />
          <Route path="/admin/settings" element={<OrgSettingsPage />} />

          {/* Phase H: Enterprise Intelligence & Extended Portals */}
          <Route path="/interventions" element={<InterventionCenter />} />
          <Route path="/students/:id/360" element={<Student360View />} />
          <Route path="/parent-portal" element={<ParentDashboard />} />
          <Route path="/parent" element={<ParentDashboard />} />
          <Route path="/webhooks" element={<WebhookManager />} />
          <Route path="/audit" element={<AuditLogViewer />} />
          <Route path="/audit-logs" element={<AuditLogViewer />} />
          <Route path="/system/status" element={<SystemStatusPage />} />
          <Route path="/system-status" element={<SystemStatusPage />} />

          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Public Authentication & Onboarding Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboard" element={<OnboardingWizard />} />
            <Route path="/sandbox" element={<GuestSandboxPage />} />

            {/* Top-Level Admin Navigation Aliases */}
            <Route
              path="/admin/institutions"
              element={
                <AuthGuard>
                  <Navigate to="/app/admin/institutions" replace />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/users"
              element={
                <AuthGuard>
                  <Navigate to="/app/admin/users" replace />
                </AuthGuard>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <AuthGuard>
                  <Navigate to="/app/admin/settings" replace />
                </AuthGuard>
              }
            />

            {/* Protected Application Workspace */}
            <Route
              path="/app/*"
              element={
                <AuthGuard>
                  <AppWorkspace />
                </AuthGuard>
              }
            />

            {/* Fallback to Login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
