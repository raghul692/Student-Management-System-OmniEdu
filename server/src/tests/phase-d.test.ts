import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../config/prisma';
import {
  InstitutionType,
  InstitutionRole,
  StudentStatus,
  AdmissionStatus,
  StaffStatus,
  ExamStatus,
  ExamType,
  AttendanceStatus,
  AnnouncementScope,
} from '@prisma/client';

describe('OmniEdu Phase D — Production Operations, Advanced RBAC, Lifecycle & Financial Verification', () => {
  let collegeInstId: string;
  let schoolInstId: string;
  let collegeAdminToken: string;
  let hodToken: string;
  let facultyToken: string;
  let studentToken: string;
  let studentUserId: string;
  let guestToken: string;
  let testStudentId: string;
  let testFacultyMembershipId: string;
  let testDeptId: string;
  let testCourseId: string;
  let testCustomRoleId: string;
  let testAdmissionId: string;
  let testExamId: string;
  let testAssignmentId: string;
  let testFeeStructureId: string;
  let testFeeAssignmentId: string;
  let testCorrectionId: string;
  let testRegistrationId: string;
  let testAnnouncementId: string;

  beforeAll(async () => {
    // 1. Fetch existing institutions
    const org = await prisma.organization.findFirst({
      where: { slug: 'apollo-trust' },
      include: {
        institutions: {
          include: { departments: true, courses: true, memberships: { include: { user: true } } },
        },
      },
    });
    if (!org) throw new Error('Database not seeded.');

    const college =
      org.institutions.find((i) => i.code === 'AIT-001') ||
      org.institutions.find((i) => i.type === InstitutionType.COLLEGE && i.courses.length > 0);
    const school =
      org.institutions.find((i) => i.code === 'AMHSS-001') ||
      org.institutions.find((i) => i.type === InstitutionType.SCHOOL);
    if (!college || !school) throw new Error('College (AIT-001) and School (AMHSS-001) must exist.');

    collegeInstId = college.id;
    schoolInstId = school.id;

    const dept = college.departments.find((d) => d.code === 'CSE') || college.departments[0];
    testDeptId = dept.id;

    const course =
      college.courses[0] || (await prisma.course.findFirst({ where: { institutionId: collegeInstId } }));
    if (!course) throw new Error('Course must exist.');
    testCourseId = course.id;

    // Grab a college student
    const student = await prisma.student.findFirst({ where: { institutionId: collegeInstId } });
    if (!student) throw new Error('Seeded student must exist.');
    testStudentId = student.id;

    // Grab faculty membership ID
    const facultyMem = college.memberships.find((m) => m.role === InstitutionRole.FACULTY);
    if (facultyMem) {
      testFacultyMembershipId = facultyMem.id;
    }

    // 2. Demo logins
    const principalRes = await request(app).post('/api/auth/demo-login').send({ role: 'principal_eng' });
    collegeAdminToken = principalRes.body.data.accessToken;

    const hodRes = await request(app).post('/api/auth/demo-login').send({ role: 'hod_cse' });
    hodToken = hodRes.body.data.accessToken;

    const facultyRes = await request(app).post('/api/auth/demo-login').send({ role: 'faculty_dbms' });
    facultyToken = facultyRes.body.data.accessToken;

    const guestRes = await request(app).post('/api/auth/demo-login').send({ role: 'guest' });
    guestToken = guestRes.body.data.accessToken;

    // Create a student user and link to testStudentId
    const passwordHash = await bcrypt.hash('Student@PhaseD1', 10);
    const studentEmail = `student.phased.${Date.now()}@ait.apollo.edu`;
    const sUser = await prisma.user.create({
      data: {
        email: studentEmail,
        fullName: student.fullName,
        passwordHash,
      },
    });
    studentUserId = sUser.id;

    await prisma.institutionMembership.create({
      data: {
        userId: studentUserId,
        institutionId: collegeInstId,
        role: InstitutionRole.STUDENT,
      },
    });

    await prisma.student.update({
      where: { id: testStudentId },
      data: { userId: studentUserId },
    });

    const studentLoginRes = await request(app).post('/api/auth/login').send({
      email: studentEmail,
      password: 'Student@PhaseD1',
    });
    studentToken = studentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Cleanup records created during tests
    try {
      if (studentUserId) {
        await prisma.student.update({ where: { id: testStudentId }, data: { userId: null } });
        await prisma.institutionMembership.deleteMany({ where: { userId: studentUserId } });
        await prisma.user.deleteMany({ where: { id: studentUserId } });
      }
      if (testAnnouncementId) {
        await prisma.announcement.deleteMany({ where: { id: testAnnouncementId } });
      }
      if (testRegistrationId) {
        await prisma.courseRegistration.deleteMany({ where: { id: testRegistrationId } });
      }
      if (testFeeAssignmentId) {
        await prisma.feePayment.deleteMany({ where: { assignmentId: testFeeAssignmentId } });
        await prisma.studentFeeAssignment.deleteMany({ where: { id: testFeeAssignmentId } });
      }
      if (testFeeStructureId) {
        await prisma.feeCategory.deleteMany({ where: { feeStructureId: testFeeStructureId } });
        await prisma.feeStructure.deleteMany({ where: { id: testFeeStructureId } });
      }
      if (testAssignmentId) {
        await prisma.assignmentSubmission.deleteMany({ where: { assignmentId: testAssignmentId } });
        await prisma.assignment.deleteMany({ where: { id: testAssignmentId } });
      }
      if (testExamId) {
        await prisma.hallTicket.deleteMany({ where: { examId: testExamId } });
        await prisma.examSchedule.deleteMany({ where: { examId: testExamId } });
        await prisma.exam.deleteMany({ where: { id: testExamId } });
      }
      if (testCorrectionId) {
        await prisma.attendanceCorrectionRequest.deleteMany({ where: { id: testCorrectionId } });
      }
      if (testAdmissionId) {
        await prisma.studentAdmission.deleteMany({ where: { id: testAdmissionId } });
      }
      if (testCustomRoleId) {
        await prisma.customRolePermission.deleteMany({ where: { customRoleId: testCustomRoleId } });
        await prisma.customRole.deleteMany({ where: { id: testCustomRoleId } });
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  // ── 1. Custom Roles & Dynamic Permission Matrix ────────────────────────────
  describe('1. Dynamic Custom Roles & Permission Matrix', () => {
    it('should list all registered system permissions', async () => {
      const res = await request(app)
        .get('/api/roles/permissions')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBeGreaterThan(0);
    });

    it('should create a custom institution role with granular permissions', async () => {
      const perms = await prisma.permission.findMany({ take: 3 });
      const permIds = perms.map((p) => p.id);

      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          name: 'Academic Coordinator',
          code: `ACAD_COORD_${Date.now()}`,
          description: 'Oversees curricula, timetable, and faculty workloads',
          permissionIds: permIds,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role.name).toBe('Academic Coordinator');
      testCustomRoleId = res.body.data.role.id;
    });

    it('should retrieve custom role details by ID', async () => {
      const res = await request(app)
        .get(`/api/roles/${testCustomRoleId}`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.data.role.id).toBe(testCustomRoleId);
      expect(res.body.data.role.permissions.length).toBeGreaterThanOrEqual(1);
    });

    it('should duplicate a custom role with a new identifier', async () => {
      const dupCode = `ASST_COORD_${Date.now()}`;
      const res = await request(app)
        .post(`/api/roles/${testCustomRoleId}/duplicate`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          newName: 'Assistant Coordinator',
          newCode: dupCode,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role.code).toBe(dupCode);

      // Clean up duplicated role
      await prisma.customRolePermission.deleteMany({ where: { customRoleId: res.body.data.role.id } });
      await prisma.customRole.delete({ where: { id: res.body.data.role.id } });
    });

    it('should toggle active status of a custom role', async () => {
      const res = await request(app)
        .patch(`/api/roles/${testCustomRoleId}/toggle`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.data.role.isActive).toBe(false);
    });
  });

  // ── 2. Student Admissions & Lifecycle Pipeline ──────────────────────────────
  describe('2. Student Admissions & Lifecycle Pipeline', () => {
    it('should submit a student admission application', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          applicantName: 'Sanjay Krishnan',
          gender: 'MALE',
          guardianName: 'Krishnan R',
          guardianPhone: '+91 98840 55112',
          academicYear: '2025-2026',
          appliedDeptId: testDeptId,
          email: `sanjay.${Date.now()}@example.com`,
          phone: '+91 98840 55113',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.admission.applicantName).toBe('Sanjay Krishnan');
      expect(res.body.data.admission.status).toBe(AdmissionStatus.SUBMITTED);
      expect(res.body.data.admission.applicationNo).toContain('APP-');
      testAdmissionId = res.body.data.admission.id;
    });

    it('should list submitted admissions with filter support', async () => {
      const res = await request(app)
        .get('/api/admissions')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.admissions)).toBe(true);
      const found = res.body.data.admissions.find((a: any) => a.id === testAdmissionId);
      expect(found).toBeDefined();
    });

    it('should review and approve admission, automatically provisioning student record', async () => {
      const res = await request(app)
        .patch(`/api/admissions/${testAdmissionId}/review`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          status: 'APPROVED',
          reviewNotes: 'High percentile in entrance, approved for CSE batch',
          rollOrRegNo: `REG-${Date.now()}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.admission.status).toBe('APPROVED');
      expect(res.body.data.student).toBeDefined();
      expect(res.body.data.student.fullName).toBe('Sanjay Krishnan');

      // Cleanup auto-created student
      if (res.body.data.student?.id) {
        await prisma.studentPromotionHistory.deleteMany({ where: { studentId: res.body.data.student.id } });
        await prisma.student.delete({ where: { id: res.body.data.student.id } });
      }
    });

    it('should attach and retrieve verified documents for a student', async () => {
      const docRes = await request(app)
        .post(`/api/students/${testStudentId}/documents`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          title: 'HSC Marksheet & TC',
          documentType: 'ACADEMIC_CERTIFICATE',
          fileUrl: 'https://docs.omniedu.io/uploads/tc_verified_2025.pdf',
        });

      expect(docRes.status).toBe(201);
      expect(docRes.body.data.document.title).toBe('HSC Marksheet & TC');

      const listRes = await request(app)
        .get(`/api/students/${testStudentId}/documents`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.documents.length).toBeGreaterThanOrEqual(1);

      // Clean up doc
      await prisma.studentDocument.deleteMany({ where: { studentId: testStudentId } });
    });

    it('should transition student lifecycle status with audit reason', async () => {
      const res = await request(app)
        .patch(`/api/students/${testStudentId}/status`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          status: 'ACTIVE',
          reason: 'Verification completed for academic year 2025-2026',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.student.status).toBe('ACTIVE');
    });
  });

  // ── 3. Staff Workload & Leave Management ────────────────────────────────────
  describe('3. Staff Workload & Leave Management', () => {
    it('should calculate faculty workload percentages and hours against capacity', async () => {
      const res = await request(app)
        .get('/api/staff/workload')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.workload)).toBe(true);
      if (res.body.data.workload.length > 0) {
        const item = res.body.data.workload[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('weeklyPeriods');
        expect(item).toHaveProperty('workloadPercentage');
      }
    });

    it('should record staff leave and list active leaves', async () => {
      if (!testFacultyMembershipId) return;

      const leaveRes = await request(app)
        .post(`/api/staff/${testFacultyMembershipId}/leaves`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          leaveType: 'CASUAL',
          startDate: '2026-09-15',
          endDate: '2026-09-16',
          reason: 'Attending IEEE international conference on distributed AI',
        });

      expect(leaveRes.status).toBe(201);
      expect(leaveRes.body.data.leave.leaveType).toBe('CASUAL');
      expect(leaveRes.body.data.leave.status).toBe('PENDING');
      expect(leaveRes.body.data.leave.approvedBy).toBeNull();

      const leaveId = leaveRes.body.data.leave.id;

      // Unauthorized review by student must fail (403)
      const unauthRes = await request(app)
        .patch(`/api/staff/leaves/${leaveId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId)
        .send({ status: 'APPROVED' });
      expect(unauthRes.status).toBe(403);

      // Authorized review by admin succeeds (200)
      const reviewRes = await request(app)
        .patch(`/api/staff/leaves/${leaveId}/status`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({ status: 'APPROVED', reviewNotes: 'Approved for conference presentation' });
      expect(reviewRes.status).toBe(200);
      expect(reviewRes.body.data.leave.status).toBe('APPROVED');

      const listRes = await request(app)
        .get(`/api/staff/${testFacultyMembershipId}/leaves`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.leaves.length).toBeGreaterThanOrEqual(1);

      // Clean up leaves
      await prisma.staffLeaveRecord.deleteMany({ where: { membershipId: testFacultyMembershipId } });
    });
  });

  // ── 4. Attendance Corrections & Operations ──────────────────────────────────
  describe('4. Attendance Corrections & Operations', () => {
    it('should submit a formal attendance correction request', async () => {
      const res = await request(app)
        .post('/api/attendance/corrections')
        .set('Authorization', `Bearer ${facultyToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          studentId: testStudentId,
          requestedDate: '2026-09-08',
          currentStatus: AttendanceStatus.ABSENT,
          proposedStatus: AttendanceStatus.ON_DUTY,
          reason: 'Student was representing institution at zonal hackathon finals',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.proposedStatus).toBe('ON_DUTY');
      testCorrectionId = res.body.data.id;
    });

    it('should reject duplicate pending attendance correction request (409 Conflict)', async () => {
      const res = await request(app)
        .post('/api/attendance/corrections')
        .set('Authorization', `Bearer ${facultyToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          studentId: testStudentId,
          requestedDate: '2026-09-08',
          currentStatus: AttendanceStatus.ABSENT,
          proposedStatus: AttendanceStatus.ON_DUTY,
          reason: 'Duplicate request test',
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/pending attendance correction request already exists/i);
    });

    it('should list pending attendance correction requests for HOD/Admin review', async () => {
      const res = await request(app)
        .get('/api/attendance/corrections')
        .set('Authorization', `Bearer ${hodToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((r: any) => r.id === testCorrectionId);
      expect(found).toBeDefined();
    });

    it('should review and approve attendance correction with audit', async () => {
      const res = await request(app)
        .patch(`/api/attendance/corrections/${testCorrectionId}/review`)
        .set('Authorization', `Bearer ${hodToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          action: 'APPROVED',
          reviewNotes: 'Certificate of participation verified by faculty advisor',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  // ── 5. Exam Management & Hall Tickets ───────────────────────────────────────
  describe('5. Exam Management & Hall Tickets', () => {
    it('should create an exam in DRAFT status', async () => {
      const res = await request(app)
        .post('/api/marks/exams')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          title: `Internal Assessment Test 2 - 2026 [${Date.now()}]`,
          type: ExamType.IAT_2,
          academicYear: '2025-2026',
          semester: 4,
          deptId: testDeptId,
          startDate: '2026-10-01',
          endDate: '2026-10-07',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.exam.status).toBe(ExamStatus.DRAFT);
      testExamId = res.body.data.exam.id;
    });

    it('should update exam lifecycle status to SCHEDULED', async () => {
      const res = await request(app)
        .patch(`/api/marks/exam/${testExamId}/status`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({ status: ExamStatus.SCHEDULED });

      expect(res.status).toBe(200);
      expect(res.body.data.exam.status).toBe(ExamStatus.SCHEDULED);
    });

    it('should create exam schedules with room and invigilator allocation', async () => {
      const res = await request(app)
        .post(`/api/marks/exam/${testExamId}/schedules`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          courseId: testCourseId,
          subjectName: 'Distributed Systems & Cloud Computing',
          examDate: '2026-10-02',
          startTime: '09:30 AM',
          endTime: '12:30 PM',
          roomNumber: 'Hall-401',
          invigilatorName: 'Dr. S. Karthikeyan',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.schedule.roomNumber).toBe('Hall-401');
    });

    it('should generate hall tickets for eligible students meeting attendance threshold', async () => {
      const res = await request(app)
        .post(`/api/marks/exam/${testExamId}/hall-tickets/generate`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('eligibleCount');
      expect(res.body.data).toHaveProperty('totalProcessed');
    });

    it('should list generated hall tickets with QR verification tokens', async () => {
      const res = await request(app)
        .get(`/api/marks/exam/${testExamId}/hall-tickets`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.tickets)).toBe(true);
      if (res.body.data.tickets.length > 0) {
        expect(res.body.data.tickets[0]).toHaveProperty('qrCodeData');
      }
    });

    it('should reject invalid exam status transitions (400 Bad Request)', async () => {
      const res = await request(app)
        .patch(`/api/marks/exam/${testExamId}/status`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({ status: 'PUBLISHED' });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid exam status transition/i);
    });

    it('should verify public hall ticket with valid cryptographic token', async () => {
      const ticketsRes = await request(app)
        .get(`/api/marks/exam/${testExamId}/hall-tickets`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      const ticket = ticketsRes.body.data.tickets[0];
      expect(ticket).toBeDefined();
      const parsed = JSON.parse(ticket.qrCodeData);
      const token = parsed.verificationToken;

      const verifyRes = await request(app)
        .get(`/api/exams/hall-tickets/verify/${token}`);

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.status).toBe('success');
      expect(verifyRes.body.data.verified).toBe(true);
      expect(verifyRes.body.data.student.fullName).toBeDefined();
      expect(verifyRes.body.data.ticketNumber).toBe(ticket.ticketNumber);
      expect(verifyRes.body.data.exam.title).toBeDefined();
    });

    it('should reject public hall ticket verification with tampered token (400 Bad Request)', async () => {
      const ticketsRes = await request(app)
        .get(`/api/marks/exam/${testExamId}/hall-tickets`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      const ticket = ticketsRes.body.data.tickets[0];
      const parsed = JSON.parse(ticket.qrCodeData);
      const [payload] = parsed.verificationToken.split('.');
      const tamperedToken = `${payload}.0000000000000000000000000000000000000000000000000000000000000000`;

      const verifyRes = await request(app)
        .get(`/api/exams/hall-tickets/verify/${tamperedToken}`);

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.message).toMatch(/Invalid or tampered hall ticket/i);
    });
  });

  // ── 6. Assignments & Homework Lifecycle ─────────────────────────────────────
  describe('6. Assignments & Homework Lifecycle', () => {
    it('should create an assignment with due date and subject details', async () => {
      const res = await request(app)
        .post('/api/assignments')
        .set('Authorization', `Bearer ${facultyToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          title: 'Distributed Consensus & Raft Implementation',
          description: 'Implement a 3-node Raft leader election cluster in Node.js or Go.',
          subjectName: 'Distributed Systems',
          dueDate: '2026-09-30',
          courseId: testCourseId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.assignment.title).toBe('Distributed Consensus & Raft Implementation');
      testAssignmentId = res.body.data.assignment.id;
    });

    it('should list assignments with filtering capabilities', async () => {
      const res = await request(app)
        .get('/api/assignments')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.assignments)).toBe(true);
      const found = res.body.data.assignments.find((a: any) => a.id === testAssignmentId);
      expect(found).toBeDefined();
    });

    it('should submit assignment solution', async () => {
      const res = await request(app)
        .post(`/api/assignments/${testAssignmentId}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          submissionText: 'Implemented full Raft log replication with heartbeats and leader election.',
          fileUrl: 'https://github.com/omniedu/raft-consensus-lab.git',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data.submission).toBeDefined();

      // Grade submission
      const subId = res.body.data.submission.id;
      const evalRes = await request(app)
        .patch(`/api/assignments/submissions/${subId}/evaluate`)
        .set('Authorization', `Bearer ${facultyToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          grade: 'A+',
          feedback: 'Excellent election safety and log compaction tests.',
        });

      expect(evalRes.status).toBe(200);
      expect(evalRes.body.data.submission.grade).toBe('A+');
    });

    it('should reject assignment submission past due date (400 Bad Request)', async () => {
      const faculty = await prisma.user.findFirst({ where: { email: 'faculty.dbms@apollo.edu' } });
      const pastAssignment = await prisma.assignment.create({
        data: {
          institutionId: collegeInstId,
          title: 'Past Due Assignment',
          subjectName: 'Distributed Systems',
          dueDate: new Date(Date.now() - 3600000), // 1 hour ago
          teacherUserId: faculty!.id,
        },
      });

      const res = await request(app)
        .post(`/api/assignments/${pastAssignment.id}/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          submissionText: 'Late submission attempt',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/deadline has passed/i);

      await prisma.assignment.delete({ where: { id: pastAssignment.id } });
    });
  });

  // ── 7. Course Registration (College Track) ──────────────────────────────────
  describe('7. Course Registration (College Track)', () => {
    it('should list available courses open for student registration', async () => {
      const res = await request(app)
        .get(`/api/course-registration/courses?studentId=${testStudentId}`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.courses)).toBe(true);
    });

    it('should submit course registration for an academic term', async () => {
      const res = await request(app)
        .post('/api/course-registration')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          studentId: testStudentId,
          courseIds: [testCourseId],
          academicYear: '2025-2026',
          semester: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.registrations.length).toBeGreaterThanOrEqual(1);
      testRegistrationId = res.body.data.registrations[0].id;
    });

    it('should review and approve course registration', async () => {
      const res = await request(app)
        .patch(`/api/course-registration/${testRegistrationId}/review`)
        .set('Authorization', `Bearer ${hodToken}`)
        .set('x-institution-id', collegeInstId)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(200);
      expect(res.body.data.registration.status).toBe('APPROVED');
    });
  });

  // ── 8. Fees & Finance Operations ────────────────────────────────────────────
  describe('8. Fees & Financial Operations', () => {
    it('should create fee structure with itemized categories', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          name: `B.E CSE Term Fee 2025-2026 [${Date.now()}]`,
          academicYear: '2025-2026',
          deptId: testDeptId,
          categories: [
            { name: 'Tuition Fee', amount: 45000 },
            { name: 'Laboratory & Computing Resources', amount: 15000 },
            { name: 'Library & Online Journals', amount: 5000 },
          ],
        });

      expect(res.status).toBe(201);
      testFeeStructureId = res.body.data.structure.id;
      expect(res.body.data.structure.categories.length).toBe(3);
    });

    it('should assign fee structure to a student ledger with scholarship deductions', async () => {
      const res = await request(app)
        .post('/api/fees/assign')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          studentId: testStudentId,
          feeStructureId: testFeeStructureId,
          scholarshipAmount: 10000,
          discountAmount: 2000,
          dueDate: '2026-10-31',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.assignment.netPayable).toBe(53000); // 65000 - 10000 - 2000
      expect(res.body.data.assignment.totalAmount).toBe(65000);
      testFeeAssignmentId = res.body.data.assignment.id;
    });

    it('should record fee payment and issue official serialized receipt', async () => {
      const res = await request(app)
        .post('/api/fees/payments')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          assignmentId: testFeeAssignmentId,
          amountPaid: 30000,
          paymentMethod: 'ONLINE_NET_BANKING',
          transactionRef: `TXN-OMNI-${Date.now()}`,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.payment.receiptNumber).toContain('REC-');
      expect(res.body.data.payment.amountPaid).toBe(30000);
    });

    it('should retrieve student fee ledger with payment history and outstanding balance', async () => {
      const res = await request(app)
        .get(`/api/fees/students/${testStudentId}`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toHaveProperty('totalAssigned');
      expect(res.body.data.summary).toHaveProperty('totalPaid');
      expect(res.body.data.summary).toHaveProperty('totalOutstanding');
      expect(res.body.data.summary.totalPaid).toBeGreaterThanOrEqual(30000);
    });

    it('should generate executive fee summary with collection and dues telemetry', async () => {
      const res = await request(app)
        .get('/api/fees/summary')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('totalAssigned');
      expect(res.body.data).toHaveProperty('totalCollected');
      expect(res.body.data).toHaveProperty('totalOutstanding');
    });
  });

  // ── 9. Announcements & Scoped Circulars ─────────────────────────────────────
  describe('9. Announcements & Scoped Circulars', () => {
    it('should publish an institution-wide circular with high priority', async () => {
      const res = await request(app)
        .post('/api/announcements')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          title: 'Symposium 2026: Quantum Computing & AI Innovations',
          content: 'All departments are invited to submit papers before October 15th.',
          scope: AnnouncementScope.INSTITUTION,
          isPinned: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.announcement.title).toContain('Symposium 2026');
      testAnnouncementId = res.body.data.announcement.id;
    });

    it('should list announcements within the active institution scope', async () => {
      const res = await request(app)
        .get('/api/announcements')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.announcements)).toBe(true);
      const found = res.body.data.announcements.find((a: any) => a.id === testAnnouncementId);
      expect(found).toBeDefined();
    });
  });

  // ── 10. Analytics & At-Risk Students Radar ──────────────────────────────────
  describe('10. Analytics & Early Warning Radar', () => {
    it('should return executive overview telemetry', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toBeDefined();
    });

    it('should compute composite at-risk student metrics using dynamic thresholds', async () => {
      const res = await request(app)
        .get('/api/analytics/at-risk')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.students)).toBe(true);
      expect(res.body.data).toHaveProperty('atRiskCount');
    });
  });

  // ── 11. Security, IDOR & Multi-Tenant Isolation ─────────────────────────────
  describe('11. Security Hardening, IDOR Defense & Multi-Tenancy Isolation', () => {
    it('should block non-staff roles from accessing administrative staff directory (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${guestToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
    });

    it('should block unauthenticated requests to protected financial operations (401 Unauthorized)', async () => {
      const res = await request(app)
        .post('/api/fees/structures')
        .send({ name: 'Unauthorized Fee Structure', academicYear: '2025-2026', categories: [] });

      expect(res.status).toBe(401);
    });

    it('should reject requests with cross-tenant institution manipulation (403 Forbidden)', async () => {
      // User with college-only admin token trying to operate on school without membership
      const fakeInstId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', fakeInstId);

      expect(res.status).toBe(403);
    });

    it('should block Student A from accessing Student B documents (403 IDOR Defense)', async () => {
      const studentB = await prisma.student.findFirst({
        where: { institutionId: collegeInstId, id: { not: testStudentId } },
      });
      if (!studentB) return;

      const res = await request(app)
        .get(`/api/students/${studentB.id}/documents`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/own documents/i);

      const ownRes = await request(app)
        .get(`/api/students/${testStudentId}/documents`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(ownRes.status).toBe(200);
    });

    it('should block unlinked Parent from accessing student fee ledger (403 IDOR Defense)', async () => {
      const parentUser = await prisma.user.create({
        data: {
          email: `parent.unlinked.${Date.now()}@example.com`,
          fullName: 'Unlinked Parent',
          passwordHash: await bcrypt.hash('Parent@123', 10),
        },
      });
      await prisma.institutionMembership.create({
        data: {
          userId: parentUser.id,
          institutionId: collegeInstId,
          role: InstitutionRole.PARENT,
        },
      });

      const parentLogin = await request(app).post('/api/auth/login').send({
        email: parentUser.email,
        password: 'Parent@123',
      });
      const unlinkedParentToken = parentLogin.body.data.accessToken;

      const res = await request(app)
        .get(`/api/fees/students/${testStudentId}`)
        .set('Authorization', `Bearer ${unlinkedParentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/linked children|linked ward/i);

      // Link parent to student and verify access succeeds
      const link = await prisma.parentStudentLink.create({
        data: {
          institutionId: collegeInstId,
          parentUserId: parentUser.id,
          studentId: testStudentId,
          relationship: 'FATHER',
        },
      });

      const linkedRes = await request(app)
        .get(`/api/fees/students/${testStudentId}`)
        .set('Authorization', `Bearer ${unlinkedParentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(linkedRes.status).toBe(200);

      // Cleanup
      await prisma.parentStudentLink.deleteMany({ where: { id: link.id } });
      await prisma.institutionMembership.deleteMany({ where: { userId: parentUser.id } });
      await prisma.user.deleteMany({ where: { id: parentUser.id } });
    });

    it('should block user from accessing foreign organization details (403 Cross-Org Defense)', async () => {
      const foreignOrg = await prisma.organization.create({
        data: {
          name: `Foreign Org ${Date.now()}`,
          slug: `foreign-${Date.now()}`,
        },
      });

      const res = await request(app)
        .get(`/api/organizations/${foreignOrg.id}`)
        .set('Authorization', `Bearer ${hodToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/do not belong to this organization|do not have access to this organization/i);

      await prisma.organization.delete({ where: { id: foreignOrg.id } });
    });

    it('should allow custom role EXAM_COORDINATOR with permissions to access marks operations', async () => {
      const customRole = await prisma.customRole.findFirst({
        where: { code: 'EXAM_COORDINATOR', institutionId: collegeInstId },
      });
      if (!customRole) return;

      const coordUser = await prisma.user.create({
        data: {
          email: `coordinator.${Date.now()}@ait.apollo.edu`,
          fullName: 'Exam Coordinator User',
          passwordHash: await bcrypt.hash('Coord@123', 10),
        },
      });

      await prisma.institutionMembership.create({
        data: {
          userId: coordUser.id,
          institutionId: collegeInstId,
          role: InstitutionRole.GUEST,
          customRoleId: customRole.id,
        },
      });

      const coordLogin = await request(app).post('/api/auth/login').send({
        email: coordUser.email,
        password: 'Coord@123',
      });
      const coordToken = coordLogin.body.data.accessToken;

      const res = await request(app)
        .get('/api/marks/exams')
        .set('Authorization', `Bearer ${coordToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);

      await prisma.institutionMembership.deleteMany({ where: { userId: coordUser.id } });
      await prisma.user.deleteMany({ where: { id: coordUser.id } });
    });
  });
});
