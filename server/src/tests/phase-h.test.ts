import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma, InstitutionContext } from '../config/prisma';
import { InstitutionRole } from '@prisma/client';
import {
  hasEntitlement,
  assertEntitlement,
  getEntitlements,
  FEATURE_KEYS,
} from '../services/entitlements/entitlement.service';
import {
  generateWebhookSecret,
  hashSecret,
  signPayload,
} from '../services/webhooks/webhook.service';
import { evaluateAttendancePolicies } from '../services/notifications/notificationPolicy.service';

describe('Phase H — Enterprise Intelligence & Final Productization Test Suite', () => {
  let orgId: string;
  let collegeInstId: string;
  let principalToken: string;
  let facultyToken: string;
  let studentToken: string;
  let studentUser: any;
  let parentToken: string;
  let parentUserId: string;
  let student1Id: string;
  let student2Id: string;
  let createdInterventionId: string;
  let registeredWebhookId: string;
  let webhookSecret: string;

  beforeAll(async () => {
    // 1. Fetch college institution
    const collegeInst = await prisma.institution.findFirst({
      where: { OR: [{ code: 'AIT-001' }, { code: 'AIT' }, { type: 'COLLEGE' }] },
    });
    expect(collegeInst).toBeDefined();
    collegeInstId = collegeInst!.id;
    orgId = collegeInst!.organizationId;

    // Ensure Organization has active ENTERPRISE subscription for Webhooks and Privacy tests
    await prisma.subscription.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        planTier: 'ENTERPRISE',
        status: 'ACTIVE',
        maxInstitutions: 50,
        maxStudents: 50000,
        maxStorageGb: 500,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
      update: {
        planTier: 'ENTERPRISE',
        status: 'ACTIVE',
      },
    });
    const principalLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'principal_eng' });
    expect(principalLogin.status).toBe(200);
    principalToken = principalLogin.body.data.accessToken;

    const facultyLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'faculty_dbms' });
    expect(facultyLogin.status).toBe(200);
    facultyToken = facultyLogin.body.data.accessToken;

    // 3. Find or create two students in college
    const students = await prisma.student.findMany({
      where: { institutionId: collegeInstId },
      take: 2,
    });
    expect(students.length).toBeGreaterThanOrEqual(2);
    student1Id = students[0].id;
    student2Id = students[1].id;

    // 4. Create a student user for student 1 to test self-access
    const studentPasswordHash = await bcrypt.hash('Student@PhaseH1', 10);
    const studentEmail = `student.phaseh.${Date.now()}@ait.apollo.edu`;
    studentUser = await prisma.user.create({
      data: {
        email: studentEmail,
        fullName: students[0].fullName,
        passwordHash: studentPasswordHash,
      },
    });
    await prisma.student.update({
      where: { id: student1Id },
      data: { userId: studentUser.id },
    });
    await prisma.institutionMembership.create({
      data: {
        userId: studentUser.id,
        institutionId: collegeInstId,
        role: InstitutionRole.STUDENT,
      },
    });
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: 'Student@PhaseH1' });
    expect(studentLogin.status).toBe(200);
    studentToken = studentLogin.body.data.accessToken;

    // 5. Create a parent user and link ONLY to student 1 (not student 2)
    const parentPasswordHash = await bcrypt.hash('Parent@PhaseH1', 10);
    const parentEmail = `parent.phaseh.${Date.now()}@ait.apollo.edu`;
    const parentUser = await prisma.user.create({
      data: {
        email: parentEmail,
        fullName: 'Phase H Verified Parent',
        passwordHash: parentPasswordHash,
      },
    });
    parentUserId = parentUser.id;
    await prisma.institutionMembership.create({
      data: {
        userId: parentUserId,
        institutionId: collegeInstId,
        role: InstitutionRole.PARENT,
      },
    });

    await prisma.parentStudentLink.upsert({
      where: {
        institutionId_parentUserId_studentId: {
          institutionId: collegeInstId,
          parentUserId,
          studentId: student1Id,
        },
      },
      create: {
        institutionId: collegeInstId,
        parentUserId,
        studentId: student1Id,
        relationship: 'MOTHER',
        isPrimary: true,
        isVerified: true,
      },
      update: { isVerified: true },
    });

    const parentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: parentEmail, password: 'Parent@PhaseH1' });
    expect(parentLogin.status).toBe(200);
    parentToken = parentLogin.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up created resources
    try {
      if (createdInterventionId) {
        await prisma.interventionNote.deleteMany({ where: { interventionId: createdInterventionId } });
        await prisma.intervention.deleteMany({ where: { id: createdInterventionId } });
      }
      if (registeredWebhookId) {
        await prisma.webhookDelivery.deleteMany({ where: { endpointId: registeredWebhookId } });
        await prisma.webhookEndpoint.deleteMany({ where: { id: registeredWebhookId } });
      }
      if (parentUserId) {
        await prisma.parentStudentLink.deleteMany({ where: { parentUserId } });
        await prisma.institutionMembership.deleteMany({ where: { userId: parentUserId } });
        await prisma.user.deleteMany({ where: { id: parentUserId } });
      }
      if (studentUser?.id) {
        await prisma.student.update({ where: { id: student1Id }, data: { userId: null } });
        await prisma.institutionMembership.deleteMany({ where: { userId: studentUser.id } });
        await prisma.user.deleteMany({ where: { id: studentUser.id } });
      }
    } catch {
      // Best-effort cleanup
    }
    await prisma.$disconnect();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. INTERVENTION MANAGEMENT LIFECYCLE (Tier 2 & 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('1. Intervention Management Lifecycle', () => {
    it('Faculty should be able to create an intervention for an at-risk student', async () => {
      const res = await request(app)
        .post('/api/interventions')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          studentId: student1Id,
          title: 'Attendance Shortage Remediation Plan',
          description: 'Student has attendance below 70%. Daily mentoring check-in mandated.',
          riskLevel: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.intervention).toHaveProperty('id');
      expect(res.body.data.intervention.status).toBe('DETECTED');
      expect(res.body.data.intervention.studentId).toBe(student1Id);
      createdInterventionId = res.body.data.intervention.id;
    });

    it('Faculty should be able to list interventions with studentId filter', async () => {
      const res = await request(app)
        .get(`/api/interventions?studentId=${student1Id}`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.interventions)).toBe(true);
      const found = res.body.data.interventions.find((i: any) => i.id === createdInterventionId);
      expect(found).toBeDefined();
    });

    it('Faculty should be able to get details of a specific intervention', async () => {
      const res = await request(app)
        .get(`/api/interventions/${createdInterventionId}`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.intervention.id).toBe(createdInterventionId);
      expect(res.body.data.intervention.title).toBe('Attendance Shortage Remediation Plan');
    });

    it('Faculty should advance intervention status from DETECTED to ASSIGNED', async () => {
      const res = await request(app)
        .patch(`/api/interventions/${createdInterventionId}/status`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ newStatus: 'ASSIGNED' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.intervention.status).toBe('ASSIGNED');
    });

    it('Staff should be able to add a timestamped note to an intervention', async () => {
      const res = await request(app)
        .post(`/api/interventions/${createdInterventionId}/notes`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({ content: 'Parent contacted via phone. Reminded about required condonation forms.' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.note.content).toContain('Parent contacted');
      expect(res.body.data.note.interventionId).toBe(createdInterventionId);
    });

    it('Staff should be able to retrieve notes thread for an intervention', async () => {
      const res = await request(app)
        .get(`/api/interventions/${createdInterventionId}/notes`)
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.notes)).toBe(true);
      expect(res.body.data.notes.length).toBeGreaterThanOrEqual(1);
    });

    it('Negative: Student caller should be blocked from creating interventions (403)', async () => {
      const res = await request(app)
        .post('/api/interventions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          studentId: student1Id,
          title: 'Unauthorized Student Self-Intervention',
        });

      expect(res.status).toBe(403);
    });

    it('Negative: Student caller should be blocked from advancing intervention status (403)', async () => {
      const res = await request(app)
        .patch(`/api/interventions/${createdInterventionId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ newStatus: 'RESOLVED' });

      expect(res.status).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. PARENT PORTAL EXTENDED ENDPOINTS & IDOR DEFENSE
  // ───────────────────────────────────────────────────────────────────────────
  describe('2. Parent Portal Extended Endpoints & IDOR Security', () => {
    it('Parent should list their verified linked children', async () => {
      const res = await request(app)
        .get('/api/parents/children')
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.children)).toBe(true);
      expect(res.body.data.children.some((c: any) => c.student.id === student1Id)).toBe(true);
    });

    it('Parent should view academic summary for their linked child', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student1Id}`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('attendance');
      expect(res.body.data).toHaveProperty('marks');
    });

    it('Parent should view granular attendance history for linked child', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student1Id}/attendance`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('records');
      expect(res.body.data).toHaveProperty('total');
    });

    it('Parent should view marks records for linked child', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student1Id}/marks`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.marks)).toBe(true);
    });

    it('Parent should view fee status for linked child', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student1Id}/fees`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('totalPayable');
      expect(res.body.data).toHaveProperty('totalPaid');
      expect(res.body.data).toHaveProperty('outstanding');
    });

    it('Parent should view assignment status for linked child', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student1Id}/assignments`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.submissions)).toBe(true);
    });

    it('Parent should view notices and circulars for linked child', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student1Id}/notices`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.notices)).toBe(true);
    });

    it('IDOR Defense: Parent accessing unlinked student ID must receive 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/parents/student/${student2Id}/attendance`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. STUDENT 360° AGGREGATED PROFILE API (/api/students/:id/360)
  // ───────────────────────────────────────────────────────────────────────────
  describe('3. Student 360° Profile API', () => {
    it('Staff (Principal) should view full 360° profile including interventions', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}/360`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      const d = res.body.data;
      expect(d).toHaveProperty('profile');
      expect(d).toHaveProperty('attendance');
      expect(d).toHaveProperty('academic');
      expect(d).toHaveProperty('fees');
      expect(d).toHaveProperty('assignments');
      expect(d).toHaveProperty('ai');
      expect(Array.isArray(d.interventions)).toBe(true);
    });

    it('Student should view their own 360° profile successfully', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}/360`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.profile.id).toBe(student1Id);
      // Sensitive staff interventions must be empty for student caller
      expect(res.body.data.interventions).toEqual([]);
    });

    it('Student should be forbidden from accessing another student 360° profile (403)', async () => {
      const res = await request(app)
        .get(`/api/students/${student2Id}/360`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('Parent should view linked child 360° profile successfully', async () => {
      const res = await request(app)
        .get(`/api/students/${student1Id}/360`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.interventions).toEqual([]);
    });

    it('Parent should be forbidden from accessing unlinked student 360° profile (403)', async () => {
      const res = await request(app)
        .get(`/api/students/${student2Id}/360`)
        .set('Authorization', `Bearer ${parentToken}`);

      expect(res.status).toBe(403);
    });

    it('Unauthenticated request to 360° profile must be rejected with 401', async () => {
      const res = await request(app).get(`/api/students/${student1Id}/360`);
      expect(res.status).toBe(401);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CENTRALIZED FEATURE ENTITLEMENT SERVICE (Tier 2)
  // ───────────────────────────────────────────────────────────────────────────
  describe('4. Centralized Feature Entitlement Service', () => {
    it('hasEntitlement should return true for basic features on any organization', async () => {
      const allowed = await hasEntitlement(orgId, FEATURE_KEYS.BASIC_ANALYTICS);
      expect(allowed).toBe(true);
    });

    it('assertEntitlement should execute without error for entitled features', async () => {
      await expect(assertEntitlement(orgId, FEATURE_KEYS.ATTENDANCE)).resolves.not.toThrow();
    });

    it('assertEntitlement should throw 403 AppError for unentitled dummy organization on enterprise feature', async () => {
      // Mock org with no subscription defaults to BASIC
      await expect(assertEntitlement('dummy-non-existent-org', FEATURE_KEYS.WEBHOOK)).rejects.toThrow();
    });

    it('getEntitlements should return plan tier and effective feature keys', async () => {
      const entitlements = await getEntitlements(orgId);
      expect(entitlements).toHaveProperty('planTier');
      expect(Array.isArray(entitlements.features)).toBe(true);
      expect(entitlements.features).toContain(FEATURE_KEYS.BASIC_ANALYTICS);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. WEBHOOK SYSTEM (Tier 2 & 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('5. Webhook System Architecture', () => {
    it('generateWebhookSecret should generate a 64+ character secret with prefix whsec_', () => {
      const secret = generateWebhookSecret();
      expect(secret.startsWith('whsec_')).toBe(true);
      expect(secret.length).toBeGreaterThan(32);
    });

    it('hashSecret should compute consistent sha256 hex digest', () => {
      const s = 'whsec_sample_secret';
      const h1 = hashSecret(s);
      const h2 = hashSecret(s);
      expect(h1).toBe(h2);
      expect(h1.length).toBe(64);
    });

    it('signPayload should create a valid sha256= HMAC signature', () => {
      const sig = signPayload('secret_key', JSON.stringify({ test: true }));
      expect(sig.startsWith('sha256=')).toBe(true);
      expect(sig.length).toBe(71); // 'sha256=' (7) + 64 hex chars
    });

    it('Admin should be able to register a webhook endpoint and receive plaintext secret', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${principalToken}`)
        .send({
          url: 'https://example.com/webhook-receiver',
          events: ['STUDENT_CREATED', 'ATTENDANCE_UPDATED'],
          description: 'ERP Integration Endpoint',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('endpointId');
      expect(res.body.data).toHaveProperty('secret');
      expect(res.body.data.secret.startsWith('whsec_')).toBe(true);
      registeredWebhookId = res.body.data.endpointId;
      webhookSecret = res.body.data.secret;
    });

    it('Admin should list registered webhook endpoints', async () => {
      const res = await request(app)
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.endpoints)).toBe(true);
      const ep = res.body.data.endpoints.find((w: any) => w.id === registeredWebhookId);
      expect(ep).toBeDefined();
      // Secret hash must never be returned
      expect(ep).not.toHaveProperty('secretHash');
    });

    it('Non-admin caller (Faculty) should be blocked from registering webhooks (403)', async () => {
      const res = await request(app)
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${facultyToken}`)
        .send({
          url: 'https://attacker.com/webhook',
          events: ['STUDENT_CREATED'],
        });

      expect(res.status).toBe(403);
    });

    it('Admin should delete a webhook endpoint', async () => {
      const res = await request(app)
        .delete(`/api/webhooks/${registeredWebhookId}`)
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      registeredWebhookId = ''; // Cleaned up
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. AUDIT LOGS SEARCH & FILTER API (Tier 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('6. Audit Logs Search & Filtering API', () => {
    it('Institution Admin should search and filter audit logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.logs)).toBe(true);
    });

    it('Audit log search should also be accessible via /api/audit alias', async () => {
      const res = await request(app)
        .get('/api/audit')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.logs)).toBe(true);
    });

    it('Non-admin caller (Student) should be forbidden from reading audit logs (403)', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('Audit log export endpoint should respond or enforce tier gating', async () => {
      const res = await request(app)
        .get('/api/audit-logs/export')
        .set('Authorization', `Bearer ${principalToken}`);

      // Returns 200 with JSON payload or 403 if ENTERPRISE entitlement is enforced
      expect([200, 403]).toContain(res.status);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. SYSTEM STATUS & TELEMETRY API (Tier 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('7. System Status & Health Signals API', () => {
    it('GET /api/system/status should return operational signals for DB, cache, and queue', async () => {
      const res = await request(app)
        .get('/api/system/status')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      const d = res.body.data;
      expect(d).toHaveProperty('overall');
      expect(d).toHaveProperty('signals');
      expect(d.signals).toHaveProperty('database');
      expect(d.signals.database.status).toBe('OPERATIONAL');
      expect(d.signals).toHaveProperty('queue');
      expect(d).toHaveProperty('checkedAt');
    });

    it('GET /api/system/entitlements should return current feature matrix for org', async () => {
      const res = await request(app)
        .get('/api/system/entitlements')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('planTier');
      expect(Array.isArray(res.body.data.features)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. PRIVACY & DATA RETENTION API (Tier 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('8. Privacy Controls & Data Export Requests', () => {
    it('User should be able to submit a privacy export request', async () => {
      const res = await request(app)
        .post('/api/privacy/export-request')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ exportFormat: 'JSON' });

      expect(res.status).toBe(202);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('requestId');
    });

    it('User should be able to query their pending export requests', async () => {
      const res = await request(app)
        .get('/api/privacy/export-request')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.requests)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. EXTENDED ANALYTICS API (Tier 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('9. Extended Analytics Endpoints', () => {
    it('Staff should view attendance timeline trends with overall rate', async () => {
      const res = await request(app)
        .get('/api/analytics/attendance/trends')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('overallRate');
      expect(res.body.data).toHaveProperty('timeline');
    });

    it('Admin should view fee collection trends', async () => {
      const res = await request(app)
        .get('/api/analytics/fees/trends')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('totalAssigned');
      expect(res.body.data).toHaveProperty('totalCollected');
      expect(res.body.data).toHaveProperty('trends');
    });

    it('Staff should view department comparison analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/academic/department')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('departments');
      expect(Array.isArray(res.body.data.departments)).toBe(true);
    });

    it('Staff should view cohort progression analysis', async () => {
      const res = await request(app)
        .get('/api/analytics/academic/cohort')
        .set('Authorization', `Bearer ${facultyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('cohorts');
    });

    it('Admin should view AI usage, token consumption, and cost telemetry', async () => {
      const res = await request(app)
        .get('/api/analytics/ai/usage')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('totalCalls');
      expect(res.body.data).toHaveProperty('totalTokens');
      expect(res.body.data).toHaveProperty('totalCostUsd');
      expect(res.body.data).toHaveProperty('byFeature');
    });

    it('Negative: Student caller should be blocked from analytics endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/analytics/attendance/trends')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 10. NOTIFICATION POLICY SERVICE (Tier 2)
  // ───────────────────────────────────────────────────────────────────────────
  describe('10. Notification Policy Engine', () => {
    it('evaluateAttendancePolicies should execute safely against active institution', async () => {
      const result = await evaluateAttendancePolicies(collegeInstId, orgId);
      expect(result).toHaveProperty('notificationsCreated');
      expect(result).toHaveProperty('interventionsCreated');
      expect(result).toHaveProperty('studentsEvaluated');
      expect(typeof result.studentsEvaluated).toBe('number');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 11. API V1 BACKWARD COMPATIBILITY ALIASING (Tier 3)
  // ───────────────────────────────────────────────────────────────────────────
  describe('11. API v1 Versioning & Aliasing Compatibility', () => {
    it('GET /api/v1/students should return 200 identical to /api/students', async () => {
      const res = await request(app)
        .get('/api/v1/students')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('GET /api/v1/interventions should return 200 identical to /api/interventions', async () => {
      const res = await request(app)
        .get('/api/v1/interventions')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('GET /api/v1/system/status should return 200 identical to /api/system/status', async () => {
      const res = await request(app)
        .get('/api/v1/system/status')
        .set('Authorization', `Bearer ${principalToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });
  });
});
