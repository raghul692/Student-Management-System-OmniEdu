import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { prisma } from './config/prisma';
import { metricsRegistry } from './config/metrics';
import { apiLimiter, authLimiter, aiLimiter, uploadLimiter, analyticsLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { requestTracing } from './middleware/requestTracing';
import { healthRouter } from './routes/health.routes';

import authRoutes from './modules/auth/auth.routes';
import academicRoutes from './modules/academic/academic.routes';
import studentRoutes from './modules/students/student.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import marksRoutes from './modules/marks/marks.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import onboardingRoutes from './modules/onboarding/onboarding.routes';
import staffRoutes from './modules/staff/staff.routes';
import importRoutes from './modules/imports/import.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import parentRoutes from './modules/parents/parent.routes';
import settingsRoutes from './modules/settings/settings.routes';
import roleRoutes from './modules/roles/role.routes';
import admissionRoutes from './modules/admissions/admission.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import assignmentRoutes from './modules/assignments/assignment.routes';
import registrationRoutes from './modules/course-registration/registration.routes';
import feeRoutes from './modules/fees/fee.routes';
import announcementRoutes from './modules/announcements/announcement.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import storageRoutes from './modules/storage/storage.routes';
import saasRoutes from './modules/saas/saas.routes';
import aiRoutes from './modules/ai/ai.routes';
// Phase H routes
import interventionRoutes from './modules/interventions/intervention.routes';
import webhookRoutes from './modules/webhooks/webhook.routes';
import auditRoutes from './modules/audit/audit.routes';
import systemRoutes from './modules/system/system.routes';
import privacyRoutes from './modules/privacy/privacy.routes';

dotenv.config();

export const app = express();

// Trust reverse proxy (Nginx, ALB, Cloudflare)
app.set('trust proxy', 1);

// Request Tracing (X-Request-Id, X-Trace-Id & Structured Contextual Logging)
app.use(requestTracing);

// Security & Parsing Middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by Nginx in prod; allows Vite client in dev/preview
    crossOriginEmbedderPolicy: false,
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev fallback
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));

// ── Root Health Probes & Metrics ─────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/api/health', healthRouter);

// Prometheus Metrics Endpoints (both root /metrics and /api/metrics supported)
const metricsHandler = (_req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsRegistry.toPrometheus());
};
app.get('/metrics', metricsHandler);
app.get('/api/metrics', metricsHandler);

// ── General API Rate Limiting ────────────────────────────────────────────────
app.use('/api', apiLimiter);

// Root API Directory
app.get('/api', (_req, res) => {
  res.status(200).json({
    name: 'OmniEdu Unified Multi-Tenant Educational ERP API',
    version: '2.0.0',
    phase: 'H — Enterprise Intelligence & Final Productization',
    architecture: 'Multi-Tenant (Organization → Institution)',
    endpoints: {
      health: '/health',
      healthLive: '/health/live',
      healthReady: '/health/ready',
      metrics: '/metrics',
      auth: '/api/auth',
      onboarding: '/api/onboard',
      organizations: '/api/organizations',
      academic: '/api/academic',
      students: '/api/students',
      staff: '/api/staff',
      attendance: '/api/attendance',
      marks: '/api/marks',
      imports: '/api/imports',
      notifications: '/api/notifications',
      parents: '/api/parents',
      settings: '/api/settings',
      roles: '/api/roles',
      admissions: '/api/admissions',
      timetable: '/api/timetable',
      assignments: '/api/assignments',
      courseRegistration: '/api/course-registration',
      fees: '/api/fees',
      announcements: '/api/announcements',
      analytics: '/api/analytics',
      ai: '/api/ai',
      // Phase H
      interventions: '/api/interventions',
      webhooks: '/api/webhooks',
      auditLogs: '/api/audit-logs',
      system: '/api/system',
      privacy: '/api/privacy',
    },
  });
});

// ── Routes with Differentiated Rate Limiters ─────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/onboard', onboardingRoutes);             // Public — no auth
app.use('/api/onboarding', onboardingRoutes);          // Alias
app.use('/api/organizations', organizationRoutes);     // Requires auth
app.use('/api/academic', academicRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/exams', marksRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/parents', parentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/course-registration', registrationRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/analytics', analyticsLimiter, analyticsRoutes);
app.use('/api/storage', uploadLimiter, storageRoutes);
app.use('/api/saas', saasRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
// Phase H routes
app.use('/api/interventions', interventionRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/privacy', privacyRoutes);

// Phase H: /api/v1 aliases for backward-compatible API versioning
const v1Router = express.Router();
v1Router.use('/auth', authLimiter, authRoutes);
v1Router.use('/onboard', onboardingRoutes);
v1Router.use('/onboarding', onboardingRoutes);
v1Router.use('/organizations', organizationRoutes);
v1Router.use('/academic', academicRoutes);
v1Router.use('/students', studentRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/attendance', attendanceRoutes);
v1Router.use('/marks', marksRoutes);
v1Router.use('/exams', marksRoutes);
v1Router.use('/imports', importRoutes);
v1Router.use('/notifications', notificationRoutes);
v1Router.use('/parents', parentRoutes);
v1Router.use('/settings', settingsRoutes);
v1Router.use('/roles', roleRoutes);
v1Router.use('/admissions', admissionRoutes);
v1Router.use('/timetable', timetableRoutes);
v1Router.use('/assignments', assignmentRoutes);
v1Router.use('/course-registration', registrationRoutes);
v1Router.use('/fees', feeRoutes);
v1Router.use('/announcements', announcementRoutes);
v1Router.use('/analytics', analyticsLimiter, analyticsRoutes);
v1Router.use('/storage', uploadLimiter, storageRoutes);
v1Router.use('/saas', saasRoutes);
v1Router.use('/ai', aiLimiter, aiRoutes);
v1Router.use('/interventions', interventionRoutes);
v1Router.use('/webhooks', webhookRoutes);
v1Router.use('/audit', auditRoutes);
v1Router.use('/audit-logs', auditRoutes);
v1Router.use('/system', systemRoutes);
v1Router.use('/privacy', privacyRoutes);

app.use('/api/v1', v1Router);

// Centralized Error Handling
app.use(errorHandler);

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({
    status: 'fail',
    code: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    requestId: req.id || req.headers['x-request-id'] || 'req-untracked',
  });
});
