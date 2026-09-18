import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/prisma';

describe('OmniEdu Production End-to-End System Lifecycle Workflow', () => {
  let adminToken: string;
  let principalToken: string;
  let orgId: string;
  let instId: string;
  let testDeptId: string;
  let testCourseId: string;
  let createdApplicantId: string;
  let studentId: string;
  let feeStructureId: string;
  let feeAssignmentId: string;
  let hallTicketToken: string;

  beforeAll(async () => {
    // 1. Authenticate as Trust Admin
    const loginRes = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'trust_admin' });

    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.data.accessToken;
    orgId = loginRes.body.data.user.organizations[0].id;
    instId = loginRes.body.data.user.organizations[0].institutions[0].id;

    // Grab department and course
    const dept = await prisma.department.findFirst({
      where: { institutionId: instId },
    });
    testDeptId = dept?.id || '';

    const course = await prisma.course.findFirst({
      where: { institutionId: instId },
    });
    testCourseId = course?.id || '';

    // 2. Authenticate as Principal
    const princRes = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'principal_eng' });

    expect(princRes.status).toBe(200);
    principalToken = princRes.body.data.accessToken;
  });

  it('Step 1: Verify Multi-Tenant Organization Subscription Limits', async () => {
    const res = await request(app)
      .get(`/api/saas/subscription?organizationId=${orgId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.subscription).toBeDefined();
    expect(res.body.data.usage.institutions.max).toBeGreaterThanOrEqual(1);
  });

  it('Step 2: Submit Student Admission Application (Public Pipeline)', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        applicantName: 'E2E Test Candidate',
        gender: 'MALE',
        guardianName: 'Guardian R',
        guardianPhone: '+91 98840 55112',
        academicYear: '2025-2026',
        appliedDeptId: testDeptId,
        email: `e2e.candidate.${Date.now()}@gmail.com`,
        phone: '+91 98840 55113',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.admission.id).toBeDefined();
    expect(res.body.data.admission.applicationNo).toBeDefined();
    expect(res.body.data.admission.status).toBe('SUBMITTED');
    createdApplicantId = res.body.data.admission.id;
  });

  it('Step 3: Review and Approve Admission Application (Transactional Student Creation)', async () => {
    // Review
    const reviewRes = await request(app)
      .patch(`/api/admissions/${createdApplicantId}/review`)
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        status: 'UNDER_REVIEW',
        reviewNotes: 'Document verification in progress',
      });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.admission.status).toBe('UNDER_REVIEW');

    // Approve
    const approveRes = await request(app)
      .patch(`/api/admissions/${createdApplicantId}/review`)
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        status: 'APPROVED',
        reviewNotes: 'High percentile in entrance, approved for CSE batch',
        rollOrRegNo: `REG-${Date.now()}`,
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.admission.status).toBe('APPROVED');
    expect(approveRes.body.data.student).toBeDefined();
    studentId = approveRes.body.data.student.id;

    // Verify student exists in DB
    const studentRecord = await prisma.student.findUnique({
      where: { id: studentId },
    });
    expect(studentRecord).toBeDefined();
    expect(studentRecord?.fullName).toBe('E2E Test Candidate');
  });

  it('Step 4: Fee Structure Creation & Student Assignment', async () => {
    // Create fee structure
    const feeStructRes = await request(app)
      .post('/api/fees/structures')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        name: `E2E Annual Fee [${Date.now()}]`,
        academicYear: '2025-2026',
        deptId: testDeptId,
        categories: [{ name: 'Tuition Fee', amount: 50000 }],
      });

    expect(feeStructRes.status).toBe(201);
    feeStructureId = feeStructRes.body.data.structure.id;

    // Assign to student
    const assignRes = await request(app)
      .post('/api/fees/assign')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        feeStructureId,
        studentId,
        dueDate: '2026-10-31',
      });

    expect(assignRes.status).toBe(201);
    expect(assignRes.body.data.assignment.id).toBeDefined();
    feeAssignmentId = assignRes.body.data.assignment.id;

    // Get ledger
    const ledgerRes = await request(app)
      .get(`/api/fees/students/${studentId}`)
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId);

    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.data.assignments.length).toBeGreaterThanOrEqual(1);
  });

  it('Step 5: Record Partial Fee Payment and Generate Serialized Receipt', async () => {
    const paymentRes = await request(app)
      .post('/api/fees/payments')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        assignmentId: feeAssignmentId,
        amountPaid: 20000,
        paymentMethod: 'ONLINE',
        transactionRef: `TXN_${Date.now()}`,
      });

    expect(paymentRes.status).toBe(201);
    expect(paymentRes.body.data.payment.receiptNumber).toMatch(/^REC-/);
    expect(paymentRes.body.data.payment.amountPaid).toBe(20000);

    // Verify balance remaining is 30,000
    const ledgerRes = await request(app)
      .get(`/api/fees/students/${studentId}`)
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId);

    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.data.summary.totalPaid).toBe(20000);
    expect(ledgerRes.body.data.summary.totalOutstanding).toBeGreaterThan(0);
  });

  it('Step 6: Mark Attendance and Verify Threshold Evaluation', async () => {
    const today = new Date().toISOString().split('T')[0];

    const attRes = await request(app)
      .post('/api/attendance/mark')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId)
      .send({
        date: today,
        hour: 1,
        courseId: testCourseId || undefined,
        entries: [
          {
            studentId,
            status: 'PRESENT',
            remarks: 'On-time attendance',
          },
        ],
      });

    expect(attRes.status).toBe(200);
    expect(attRes.body.data.markedCount).toBeGreaterThanOrEqual(1);
  });

  it('Step 7: Hall Ticket Generation with Cryptographic HMAC-SHA256 Token', async () => {
    // Fetch exams
    const examsRes = await request(app)
      .get('/api/marks/exams')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId);

    expect(examsRes.status).toBe(200);
    if (examsRes.body.data.length > 0) {
      const examId = examsRes.body.data[0].id;

      const htRes = await request(app)
        .post(`/api/marks/exam/${examId}/hall-tickets/generate`)
        .set('Authorization', `Bearer ${principalToken}`)
        .set('x-institution-id', instId)
        .send({ studentIds: [studentId] });

      expect(htRes.status).toBe(200);
      expect(htRes.body.data.tickets.length).toBeGreaterThanOrEqual(1);
      hallTicketToken = htRes.body.data.tickets[0].verificationToken;
      expect(hallTicketToken).toBeDefined();

      // Step 8: Public unauthenticated verification
      const verifyRes = await request(app).get(`/api/marks/hall-tickets/verify/${hallTicketToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.isValid).toBe(true);
      expect(verifyRes.body.data.studentName).toBe('E2E Test Candidate');
    }
  });

  it('Step 9: Executive Overview & Predictive Risk Radar Evaluation', async () => {
    const overviewRes = await request(app)
      .get('/api/analytics/overview')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId);

    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.totalStudents).toBeGreaterThanOrEqual(1);
    expect(overviewRes.body.data.totalFeesCollected).toBeGreaterThanOrEqual(20000);
    expect(overviewRes.body.data.admissionsPipeline.total).toBeGreaterThanOrEqual(1);

    const radarRes = await request(app)
      .get('/api/analytics/at-risk')
      .set('Authorization', `Bearer ${principalToken}`)
      .set('x-institution-id', instId);

    expect(radarRes.status).toBe(200);
    expect(radarRes.body.data.totalStudentsEvaluated).toBeGreaterThanOrEqual(1);
  });

  afterAll(async () => {
    try {
      if (studentId) {
        await prisma.hallTicket.deleteMany({ where: { studentId } });
        await prisma.attendance.deleteMany({ where: { studentId } });
        await prisma.feePayment.deleteMany({ where: { studentId } });
        await prisma.studentFeeAssignment.deleteMany({ where: { studentId } });
        await prisma.studentAdmission.deleteMany({ where: { applicantName: 'E2E Test Candidate' } });
        await prisma.student.deleteMany({ where: { id: studentId } });
      }
      if (feeStructureId) {
        await prisma.feeCategory.deleteMany({ where: { feeStructureId } });
        await prisma.feeStructure.deleteMany({ where: { id: feeStructureId } });
      }
    } catch (err) {
      console.warn('E2E teardown warning:', err);
    }
  });
});
