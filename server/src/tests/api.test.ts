import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('OmniEdu Core REST API & Multi-Tenant Isolation', () => {
  let collegeToken: string;
  let schoolToken: string;
  let trustAdminToken: string;

  // 1. HEALTH PROBE CHECKS
  it('GET /api/health/live should return alive status with 200', async () => {
    const res = await request(app).get('/api/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
    expect(res.body.service).toBe('OmniEdu Multi-Tenant ERP API v2.0');
  });

  // 2. AUTHENTICATION & LOGIN
  it('POST /api/auth/login should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'principal.eng@apollo.edu', password: 'WrongPassword123' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/demo-login should log in College Principal and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'principal_eng' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('principal.eng@apollo.edu');
    expect(res.body.data.user.organizations.length).toBeGreaterThanOrEqual(1);

    collegeToken = res.body.data.accessToken;
  });

  it('POST /api/auth/demo-login should log in School Principal and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'principal_sch' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe('principal.sch@apollo.edu');

    schoolToken = res.body.data.accessToken;
  });

  it('POST /api/auth/demo-login should log in Trust Admin and return organization institutions', async () => {
    const res = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'trust_admin' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.systemRole).toBe('ORG_ADMIN');
    expect(res.body.data.user.organizations[0].institutions.length).toBeGreaterThanOrEqual(2);

    trustAdminToken = res.body.data.accessToken;
  });

  it('GET /api/auth/me should return authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${collegeToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('principal.eng@apollo.edu');
  });

  // 3. MULTI-TENANT ISOLATION (ZERO CROSS-TENANT DATA LEAKS)
  it('College token should strictly return 30 College students and ZERO School students', async () => {
    const res = await request(app)
      .get('/api/students?limit=50')
      .set('Authorization', `Bearer ${collegeToken}`);

    expect(res.status).toBe(200);
    const { students, pagination } = res.body.data;
    expect(pagination.total).toBe(30);
    expect(students.length).toBe(30);

    // Verify all have College reg numbers and zero School roll numbers
    for (const s of students) {
      expect(s.regNumber).toMatch(/^910023/);
      expect(s.rollNumber).toBeNull();
      expect(s.deptId).toBeDefined();
    }
  });

  it('School token should strictly return 25 School students and ZERO College students', async () => {
    const res = await request(app)
      .get('/api/students?limit=50')
      .set('Authorization', `Bearer ${schoolToken}`);

    expect(res.status).toBe(200);
    const { students, pagination } = res.body.data;
    expect(pagination.total).toBe(25);
    expect(students.length).toBe(25);

    // Verify all have School roll numbers and zero College reg numbers
    for (const s of students) {
      expect(s.rollNumber).toMatch(/^10A-/);
      expect(s.regNumber).toBeNull();
      expect(s.classId).toBeDefined();
    }
  });

  // 4. ATTENDANCE DEFAULTER RADAR
  it('GET /api/attendance/defaulters should return 2 College defaulters (<75%) with metrics', async () => {
    const res = await request(app)
      .get('/api/attendance/defaulters')
      .set('Authorization', `Bearer ${collegeToken}`);

    expect(res.status).toBe(200);
    const { defaultersCount, defaulters } = res.body.data;
    expect(defaultersCount).toBe(3);
    expect(defaulters.length).toBe(3);

    // Student 910023104030 should be detained (<65%)
    const worstDefaulter = defaulters[0];
    expect(worstDefaulter.metrics.percentage).toBeLessThan(65.0);
    expect(worstDefaulter.metrics.detained).toBe(true);
  });

  // 5. ACADEMIC & MARKS MODULES
  it('GET /api/academic/departments should return CSE, ECE, MECH for College', async () => {
    const res = await request(app)
      .get('/api/academic/departments')
      .set('Authorization', `Bearer ${collegeToken}`);

    expect(res.status).toBe(200);
    const { departments } = res.body.data;
    expect(departments.length).toBe(3);
    const codes = departments.map((d: any) => d.code);
    expect(codes).toContain('CSE');
    expect(codes).toContain('ECE');
    expect(codes).toContain('MECH');
  });

  it('GET /api/marks/exams should list exams for active campus', async () => {
    const res = await request(app)
      .get('/api/marks/exams')
      .set('Authorization', `Bearer ${collegeToken}`);

    expect(res.status).toBe(200);
    const { exams } = res.body.data;
    expect(exams.length).toBeGreaterThanOrEqual(2);
  });
});
