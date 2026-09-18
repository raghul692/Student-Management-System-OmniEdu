import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { InstitutionType, InstitutionRole, NotificationCategory } from '@prisma/client';

describe('OmniEdu Phase C — Advanced Modules, Academic Configuration & Automation Verification', () => {
  let collegeInstId: string;
  let schoolInstId: string;
  let collegeAdminToken: string;
  let collegeAdminUserId: string;
  let parentToken: string;
  let parentUserId: string;
  let student1Id: string;
  let student2Id: string;
  let cseDeptId: string;
  let cseDeptCode: string;
  let testCourseId: string;
  let academicYearId: string;
  let testOfferingId: string;
  let testRegulationId: string;
  let importJobId: string;
  let alertStudentId: string;

  beforeAll(async () => {
    // 1. Fetch existing college and school
    const org = await prisma.organization.findFirst({
      where: { slug: 'apollo-trust' },
      include: { institutions: { include: { departments: true, courses: true } } },
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
    cseDeptId = dept.id;
    cseDeptCode = dept.code;

    // Login as college principal
    const principalRes = await request(app).post('/api/auth/demo-login').send({ role: 'principal_eng' });
    collegeAdminToken = principalRes.body.data.accessToken;
    collegeAdminUserId = principalRes.body.data.user.id;

    // Find or create course
    let course = await prisma.course.findFirst({ where: { institutionId: collegeInstId } });
    if (!course) {
      course = await prisma.course.create({
        data: {
          institutionId: collegeInstId,
          courseCode: `CS_${Date.now()}`,
          title: 'Advanced Cloud Architectures',
          semester: 7,
          credits: 4,
          deptId: cseDeptId,
        },
      });
    }
    testCourseId = course.id;

    // Reuse existing seeded students so student count remains pristine
    const existingStudents = await prisma.student.findMany({
      where: { institutionId: collegeInstId },
      take: 2,
    });
    student1Id = existingStudents[0].id;
    student2Id = existingStudents[1].id;

    // Create a parent user with institution membership
    const passwordHash = await bcrypt.hash('Parent@PhaseC1', 10);
    const parentEmail = `parent.phasec.${Date.now()}@ait.apollo.edu`;
    const parentUser = await prisma.user.create({
      data: {
        email: parentEmail,
        fullName: 'Phase C Parent User',
        passwordHash,
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

    // Login as parent
    const parentLoginRes = await request(app).post('/api/auth/login').send({
      email: parentEmail,
      password: 'Parent@PhaseC1',
    });
    parentToken = parentLoginRes.body.data.accessToken;
  });

  afterAll(async () => {
    // Clean up all artifacts created during Phase C tests to maintain pristine DB state
    try {
      if (importJobId) {
        await prisma.student.deleteMany({
          where: { institutionId: collegeInstId, fullName: { in: ['Priya Sharma', 'Karthik Raja'] } },
        });
        await prisma.importJob.deleteMany({ where: { id: importJobId } });
      }
      if (alertStudentId) {
        await prisma.attendance.deleteMany({ where: { studentId: alertStudentId } });
        await prisma.student.deleteMany({ where: { id: alertStudentId } });
      }
      if (testOfferingId) {
        await prisma.studentEnrollment.deleteMany({ where: { courseOfferingId: testOfferingId } });
        await prisma.courseOffering.deleteMany({ where: { id: testOfferingId } });
      }
      if (testRegulationId) {
        await prisma.regulation.deleteMany({ where: { id: testRegulationId } });
      }
      if (academicYearId) {
        await prisma.academicYear.deleteMany({ where: { id: academicYearId } });
      }
      if (parentUserId) {
        await prisma.parentStudentLink.deleteMany({ where: { parentUserId } });
        await prisma.institutionMembership.deleteMany({ where: { userId: parentUserId } });
        await prisma.user.deleteMany({ where: { id: parentUserId } });
      }
      await prisma.notification.deleteMany({ where: { institutionId: collegeInstId } });
    } catch (err) {
      console.error('Error during afterAll cleanup:', err);
    }
  });

  // ── TEST 1: Academic Years & Regulations ───────────────────────────────────
  it('1. should create an academic year and set it as current', async () => {
    const res = await request(app)
      .post('/api/academic/years')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        label: `2026-2027-${Date.now()}`,
        startDate: '2026-06-01',
        endDate: '2027-05-31',
        isCurrent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.academicYear.isCurrent).toBe(true);
    academicYearId = res.body.data.academicYear.id;
  });

  it('2. should manage curriculum regulation lifecycle (DRAFT -> PUBLISHED) and log audit event', async () => {
    // Create DRAFT
    const createRes = await request(app)
      .post('/api/academic/regulations')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        code: `R2026_${Date.now()}`,
        title: 'Anna University Autonomous Regulation 2026',
        startYear: 2026,
        description: 'New outcome-based AI & ML curriculum',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.regulation.status).toBe('DRAFT');
    testRegulationId = createRes.body.data.regulation.id;

    // Publish Regulation
    const publishRes = await request(app)
      .post(`/api/academic/regulations/${testRegulationId}/publish`)
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.regulation.status).toBe('PUBLISHED');

    // Verify audit log exists
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        institutionId: collegeInstId,
        action: 'REGULATION_PUBLISHED',
        entityId: testRegulationId,
      },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
  });

  // ── TEST 2: Course Offerings & Faculty Assignment ──────────────────────────
  it('3. should create course offering and assign faculty', async () => {
    const offeringRes = await request(app)
      .post('/api/academic/offerings')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        academicYearId,
        deptId: cseDeptId,
        courseId: testCourseId,
        semester: 7,
        section: `S_${Date.now()}`,
        facultyName: 'Dr. S. Raman',
      });

    expect(offeringRes.status).toBe(201);
    testOfferingId = offeringRes.body.data.offering.id;

    // Assign faculty
    const assignRes = await request(app)
      .patch(`/api/academic/offerings/${testOfferingId}/faculty`)
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        facultyUserId: collegeAdminUserId,
        facultyName: 'Dr. S. Raman Ph.D',
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.offering.facultyName).toBe('Dr. S. Raman Ph.D');
  });

  it('4. should enroll student into course offering', async () => {
    const enrollRes = await request(app)
      .post('/api/academic/enrollments')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        studentId: student1Id,
        courseOfferingId: testOfferingId,
        academicYear: '2026-2027',
      });

    expect(enrollRes.status).toBe(201);
    expect(enrollRes.body.data.enrollment.status).toBe('ACTIVE');
  });

  // ── TEST 3: Bulk CSV Import Engine ─────────────────────────────────────────
  it('5. should preview CSV data with dry-run validation and report errors', async () => {
    const uniqueReg1 = `910026${Math.floor(1000 + Math.random() * 9000)}`;
    const uniqueReg2 = `910026${Math.floor(1000 + Math.random() * 9000)}`;

    const csvContent = `Full Name,Register Number,Gender,Department,Semester
Priya Sharma,${uniqueReg1},FEMALE,${cseDeptCode},5
Invalid Student,,MALE,NONEXISTENT_DEPT,5
Karthik Raja,${uniqueReg2},MALE,${cseDeptCode},5`;

    const previewRes = await request(app)
      .post('/api/imports/preview')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        entityType: 'STUDENTS',
        csvContent,
        fileName: 'students_batch.csv',
      });

    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.totalRows).toBe(3);
    expect(previewRes.body.data.validCount).toBe(2);
    expect(previewRes.body.data.invalidCount).toBe(1);
    expect(previewRes.body.data.errors.length).toBe(1);
    importJobId = previewRes.body.data.jobId;
  });

  it('6. should transactionally commit valid rows from import job', async () => {
    const commitRes = await request(app)
      .post(`/api/imports/${importJobId}/commit`)
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId);

    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.job.status).toBe('COMPLETED');
    expect(commitRes.body.data.job.successCount).toBe(2);

    // Verify student was inserted into DB
    const inserted = await prisma.student.findFirst({
      where: { institutionId: collegeInstId, fullName: 'Priya Sharma' },
    });
    expect(inserted).not.toBeNull();
  });

  it('7. should enforce tenant isolation during CSV import commit', async () => {
    // Attempt to commit using unauthorized school institution header
    const crossTenantRes = await request(app)
      .post(`/api/imports/${importJobId}/commit`)
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', schoolInstId);

    expect([400, 403]).toContain(crossTenantRes.status);
  });

  // ── TEST 4: Attendance Threshold Notifications ─────────────────────────────
  it('8. should configure attendance threshold and retrieve notifications', async () => {
    // Update institution threshold to 80.0%
    const settingRes = await request(app)
      .patch('/api/settings')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({ attendanceThreshold: 80.0 });

    expect(settingRes.status).toBe(200);
    expect(settingRes.body.data.settings.attendanceThreshold).toBe(80.0);

    // Create a dedicated low-attendance student
    const alertStudent = await prisma.student.create({
      data: {
        institutionId: collegeInstId,
        fullName: `Alert Low Attendee ${Date.now()}`,
        gender: 'MALE',
        regNumber: `ALERT_${Date.now()}`,
        deptId: cseDeptId,
        semester: 7,
      },
    });
    alertStudentId = alertStudent.id;

    // Create 4 past records: 3 ABSENT, 1 PRESENT
    await prisma.attendance.createMany({
      data: [
        { institutionId: collegeInstId, studentId: alertStudent.id, date: new Date('2026-03-01'), status: 'ABSENT', hour: 1, courseId: testCourseId },
        { institutionId: collegeInstId, studentId: alertStudent.id, date: new Date('2026-03-02'), status: 'ABSENT', hour: 1, courseId: testCourseId },
        { institutionId: collegeInstId, studentId: alertStudent.id, date: new Date('2026-03-03'), status: 'ABSENT', hour: 1, courseId: testCourseId },
        { institutionId: collegeInstId, studentId: alertStudent.id, date: new Date('2026-03-04'), status: 'PRESENT', hour: 1, courseId: testCourseId },
      ],
    });

    // Trigger batch attendance marking ABSENT for alertStudent (overall 1/5 = 20% < 80%)
    const batchRes = await request(app)
      .post('/api/attendance/batch')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        date: '2026-03-05',
        hour: 2,
        courseId: testCourseId,
        entries: [{ studentId: alertStudent.id, status: 'ABSENT' }],
      });

    expect(batchRes.status).toBe(200);

    // Verify notification was created
    const notifs = await prisma.notification.findMany({
      where: {
        institutionId: collegeInstId,
        category: NotificationCategory.ATTENDANCE,
      },
    });
    expect(notifs.length).toBeGreaterThanOrEqual(1);
  });

  it('9. should allow user to fetch notifications and update preferences', async () => {
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId);

    expect(notifRes.status).toBe(200);
    expect(Array.isArray(notifRes.body.data.notifications)).toBe(true);

    const prefRes = await request(app)
      .patch('/api/notifications/preferences')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({ attendanceThreshold: true, emailAlerts: true });

    expect(prefRes.status).toBe(200);
    expect(prefRes.body.data.preferences.attendanceThreshold).toBe(true);
  });

  // ── TEST 5: Parent-Student Scoped Portal ───────────────────────────────────
  it('10. should link parent to student and allow access only to linked student', async () => {
    // Link parent to student1
    const linkRes = await request(app)
      .post('/api/parents/link')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId)
      .send({
        parentUserId,
        studentId: student1Id,
        relationship: 'FATHER',
      });

    expect(linkRes.status).toBe(201);
    expect(linkRes.body.data.link.studentId).toBe(student1Id);

    // Parent fetches their children
    const childrenRes = await request(app)
      .get('/api/parents/children')
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-institution-id', collegeInstId);

    expect(childrenRes.status).toBe(200);
    expect(childrenRes.body.data.children.length).toBe(1);
    expect(childrenRes.body.data.children[0].student.id).toBe(student1Id);

    // Parent accesses linked student1 details -> 200 OK
    const childSummaryRes = await request(app)
      .get(`/api/parents/student/${student1Id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-institution-id', collegeInstId);

    expect(childSummaryRes.status).toBe(200);
    expect(childSummaryRes.body.data.student.id).toBe(student1Id);
    expect(childSummaryRes.body.data.attendance).toBeDefined();

    // Parent tries to access unlinked student2 details -> 403 FORBIDDEN
    const forbiddenRes = await request(app)
      .get(`/api/parents/student/${student2Id}`)
      .set('Authorization', `Bearer ${parentToken}`)
      .set('x-institution-id', collegeInstId);

    expect(forbiddenRes.status).toBe(403);
  });

  // ── TEST 6: Audit Trail ───────────────────────────────────────────────────
  it('11. should fetch immutable audit trail for sensitive institution actions', async () => {
    const auditRes = await request(app)
      .get('/api/settings/audit-trail')
      .set('Authorization', `Bearer ${collegeAdminToken}`)
      .set('x-institution-id', collegeInstId);

    expect(auditRes.status).toBe(200);
    expect(Array.isArray(auditRes.body.data.auditLogs)).toBe(true);
    expect(auditRes.body.data.auditLogs.length).toBeGreaterThan(0);
  });
});
