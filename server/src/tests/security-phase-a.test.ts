import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { SystemRole, InstitutionRole, InstitutionType } from '@prisma/client';

describe('OmniEdu Phase A — RBAC, Scoping & Multi-Tenant Security Verification', () => {
  let collegeInstId: string;
  let schoolInstId: string;
  let collegePrincipalToken: string;
  let schoolPrincipalToken: string;
  let hodCseToken: string;
  let facultyDbmsToken: string;
  let studentToken: string;
  let student1Id: string;
  let student2Id: string;
  let eceDeptId: string;
  let eceCourseId: string;
  let cseCourseId: string;
  let collegeExamId: string;

  beforeAll(async () => {
    // 1. Fetch institutions
    const collegeInst =
      (await prisma.institution.findFirst({
        where: { code: 'AIT-001' },
        include: { departments: true, courses: true, exams: true },
      })) ||
      (await prisma.institution.findFirst({
        where: { type: InstitutionType.COLLEGE },
        include: { departments: true, courses: true, exams: true },
      }));
    const schoolInst =
      (await prisma.institution.findFirst({
        where: { code: 'AMHSS-001' },
      })) ||
      (await prisma.institution.findFirst({
        where: { type: InstitutionType.SCHOOL },
      }));

    if (!collegeInst || !schoolInst) {
      throw new Error('College and School institutions must exist in the database.');
    }

    collegeInstId = collegeInst.id;
    schoolInstId = schoolInst.id;
    cseCourseId = collegeInst.courses.find((c) => c.courseCode === 'CS8492')?.id || collegeInst.courses[0].id;
    collegeExamId = collegeInst.exams[0].id;

    // Find or create ECE department & course for faculty out-of-scope testing
    let deptECE = collegeInst.departments.find((d) => d.code === 'ECE');
    if (!deptECE) {
      deptECE = await prisma.department.create({
        data: {
          institutionId: collegeInst.id,
          name: 'Electronics & Communication Engineering',
          code: 'ECE',
        },
      });
    }
    eceDeptId = deptECE.id;

    let eceCourse = await prisma.course.findFirst({
      where: { institutionId: collegeInst.id, deptId: eceDeptId },
    });
    if (!eceCourse) {
      eceCourse = await prisma.course.create({
        data: {
          institutionId: collegeInst.id,
          deptId: eceDeptId,
          courseCode: 'EC8401',
          title: 'Digital Communication',
          semester: 4,
          credits: 3,
        },
      });
    }
    eceCourseId = eceCourse.id;

    // 2. Fetch two college students
    const students = await prisma.student.findMany({
      where: { institutionId: collegeInstId },
      take: 2,
    });
    student1Id = students[0].id;
    student2Id = students[1].id;

    // 3. Create or setup student user
    const passwordHash = await bcrypt.hash('Apollo@2026', 10);
    const studentUser = await prisma.user.upsert({
      where: { email: 'student.phasea@ait.apollo.edu' },
      update: {},
      create: {
        email: 'student.phasea@ait.apollo.edu',
        passwordHash,
        fullName: students[0].fullName,
        systemRole: SystemRole.ORG_MEMBER,
      },
    });

    // Ensure student has institution membership as STUDENT
    await prisma.institutionMembership.upsert({
      where: {
        userId_institutionId: {
          userId: studentUser.id,
          institutionId: collegeInstId,
        },
      },
      update: { role: InstitutionRole.STUDENT },
      create: {
        userId: studentUser.id,
        institutionId: collegeInstId,
        role: InstitutionRole.STUDENT,
      },
    });

    // Ensure student record is linked to this user
    await prisma.student.update({
      where: { id: student1Id },
      data: { userId: studentUser.id, email: 'student.phasea@ait.apollo.edu' },
    });

    // 4. Authenticate all test roles
    const [cPrinc, sPrinc, hod, fac, stud] = await Promise.all([
      request(app).post('/api/auth/demo-login').send({ role: 'principal_eng' }),
      request(app).post('/api/auth/demo-login').send({ role: 'principal_sch' }),
      request(app).post('/api/auth/demo-login').send({ role: 'hod_cse' }),
      request(app).post('/api/auth/demo-login').send({ role: 'faculty_dbms' }),
      request(app).post('/api/auth/login').send({
        email: 'student.phasea@ait.apollo.edu',
        password: 'Apollo@2026',
      }),
    ]);

    collegePrincipalToken = cPrinc.body.data.accessToken;
    schoolPrincipalToken = sPrinc.body.data.accessToken;
    hodCseToken = hod.body.data.accessToken;
    facultyDbmsToken = fac.body.data.accessToken;
    studentToken = stud.body.data.accessToken;
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 1. INSTITUTION CONTEXT & IDOR DEFENSE
  // ─────────────────────────────────────────────────────────────────────────
  describe('IDOR Defense & Header Verification', () => {
    it('IDOR-01: Cross-institution header spoofing by School Principal must return 403 Forbidden', async () => {
      // School Principal has membership in School only, not College
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${schoolPrincipalToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|access denied|not authorized|membership/i);
    });

    it('IDOR-02: Non-existent institution UUID in x-institution-id header must return 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${collegePrincipalToken}`)
        .set('x-institution-id', '00000000-1111-2222-3333-444444444444');

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|access denied|membership/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. STUDENT ROLE RESTRICTION & SELF PROFILE SCOPING
  // ─────────────────────────────────────────────────────────────────────────
  describe('Student Role Authorization & Directory Lockdown', () => {
    it('STUDENT-01: Student requesting student directory /api/students must be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|students cannot access/i);
    });

    it('STUDENT-02: Student requesting defaulters radar /api/attendance/defaulters must be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/attendance/defaulters')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it('STUDENT-03: Student requesting exam list /api/marks/exams must be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get('/api/marks/exams')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it('STUDENT-04: Student requesting exam results /api/marks/exam/:examId must be blocked (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/marks/exam/${collegeExamId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden/i);
    });

    it('STUDENT-05: Student CAN access their own profile via GET /api/students/me (200 OK)', async () => {
      const res = await request(app)
        .get('/api/students/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.student.id).toBe(student1Id);
      expect(res.body.data.student.attendanceSummary).toBeDefined();
      expect(res.body.data.student.attendanceSummary.percentage).toBeDefined();
    });

    it('STUDENT-06: Student CAN access their own transcript via GET /api/marks/student/:ownId (200 OK)', async () => {
      const res = await request(app)
        .get(`/api/marks/student/${student1Id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.student.id).toBe(student1Id);
    });

    it("STUDENT-07: Student CANNOT access another student's transcript via GET /api/marks/student/:otherId (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/marks/student/${student2Id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|own transcript/i);
    });

    it("STUDENT-08: Student CANNOT access another student's profile via GET /api/students/:otherId (403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/students/${student2Id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|own student record/i);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. FACULTY & HOD SCOPING ENFORCEMENT
  // ─────────────────────────────────────────────────────────────────────────
  describe('Faculty & HOD Scope Guarding', () => {
    it('FACULTY-01: Faculty cannot enter marks for a course outside their department (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/marks/exam/${collegeExamId}/batch`)
        .set('Authorization', `Bearer ${facultyDbmsToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          entries: [
            {
              studentId: student1Id,
              courseId: eceCourseId, // ECE course, but faculty is in CSE dept
              subjectName: 'Digital Communication',
              internalMarks: 40,
              externalMarks: 50,
              maxMarks: 100,
            },
          ],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|outside your department|not assigned/i);
    });

    it('FACULTY-02: Faculty cannot mark attendance for a course outside their department (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${facultyDbmsToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          date: '2026-04-01',
          hour: 1,
          courseId: eceCourseId, // Outside faculty's CSE dept
          entries: [{ studentId: student1Id, status: 'PRESENT' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|outside your department|not assigned/i);
    });

    it('HOD-01: HOD cannot filter students from a department outside their own (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/students?deptId=${eceDeptId}`)
        .set('Authorization', `Bearer ${hodCseToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/forbidden|outside your department/i);
    });

    it('HOD-02: HOD CAN access students in their own department (200 OK)', async () => {
      const res = await request(app)
        .get('/api/students')
        .set('Authorization', `Bearer ${hodCseToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.data.students.length).toBeGreaterThan(0);
      // All returned students must belong to CSE dept
      for (const s of res.body.data.students) {
        expect(s.department.code).toBe('CSE');
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. ONBOARDING WIZARD TRANSACTIONAL CONTRACT & BASELINE INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  describe('Onboarding Wizard API Verification', () => {
    it('ONBOARD-01: Rejects malformed onboarding payloads with 400 Bad Request and validation errors', async () => {
      const res = await request(app)
        .post('/api/onboarding')
        .send({
          // Missing required fields
          orgName: '',
          orgSlug: 'bad slug',
          adminEmail: 'invalid-email',
        });

      expect(res.status).toBe(400);
      expect(['fail', 'error']).toContain(res.body.status);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('ONBOARD-02: Successfully onboards a College with baseline CSE & ECE departments', async () => {
      const timestamp = Date.now();
      const payload = {
        orgName: `Test University ${timestamp}`,
        orgSlug: `test-univ-${timestamp}`,
        orgType: 'COLLEGE',
        institutions: [
          {
            name: `Test Engineering Campus ${timestamp}`,
            code: `TEC-${timestamp.toString().slice(-4)}`,
            type: 'COLLEGE',
            affiliatedUniversity: 'Anna University',
            regulationYear: '2021',
          },
        ],
        adminFullName: 'Admin Tester',
        adminEmail: `admin.univ.${timestamp}@test.edu`,
        adminPassword: 'Password@123',
      };

      const res = await request(app).post('/api/onboarding').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.organization.id).toBeDefined();
      expect(res.body.data.institutions.length).toBe(1);

      const createdInstId = res.body.data.institutions[0].id;

      // Verify baseline departments were created
      const depts = await prisma.department.findMany({
        where: { institutionId: createdInstId },
      });
      expect(depts.length).toBeGreaterThanOrEqual(2);
      const codes = depts.map((d) => d.code);
      expect(codes).toContain('CSE');
      expect(codes).toContain('ECE');
    });

    it('ONBOARD-03: Successfully onboards a School with baseline Classes 1-12 Section A', async () => {
      const timestamp = Date.now() + 1;
      const payload = {
        orgName: `Test School Trust ${timestamp}`,
        orgSlug: `test-school-${timestamp}`,
        orgType: 'SCHOOL',
        institutions: [
          {
            name: `Test Matriculation School ${timestamp}`,
            code: `TMS-${timestamp.toString().slice(-4)}`,
            type: 'SCHOOL',
            board: 'CBSE',
            standardFrom: 1,
            standardTo: 12,
          },
        ],
        adminFullName: 'School Admin Tester',
        adminEmail: `admin.school.${timestamp}@test.edu`,
        adminPassword: 'Password@123',
      };

      const res = await request(app).post('/api/onboarding').send(payload);

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');

      const createdInstId = res.body.data.institutions[0].id;

      // Verify baseline classes were created
      const classes = await prisma.schoolClass.findMany({
        where: { institutionId: createdInstId },
      });
      expect(classes.length).toBe(12);
      expect(classes.map((c) => c.standard).sort((a, b) => a - b)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
    });
  });
});
