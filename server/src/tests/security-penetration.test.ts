import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('OmniEdu Enterprise Security & Penetration Audit Suite', () => {
  let collegeToken: string;
  let schoolToken: string;
  let collegeStudentId: string;
  let schoolStudentId: string;

  beforeAll(async () => {
    // 1. Authenticate College Principal
    const collegeLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'principal_eng' });
    collegeToken = collegeLogin.body.data.accessToken;

    // 2. Authenticate School Principal
    const schoolLogin = await request(app)
      .post('/api/auth/demo-login')
      .send({ role: 'principal_sch' });
    schoolToken = schoolLogin.body.data.accessToken;

    // 3. Fetch a valid college student ID
    const collegeStudentsRes = await request(app)
      .get('/api/students?limit=1')
      .set('Authorization', `Bearer ${collegeToken}`);
    collegeStudentId = collegeStudentsRes.body.data.students[0].id;

    // 4. Fetch a valid school student ID
    const schoolStudentsRes = await request(app)
      .get('/api/students?limit=1')
      .set('Authorization', `Bearer ${schoolToken}`);
    schoolStudentId = schoolStudentsRes.body.data.students[0].id;
  });

  // -------------------------------------------------------------
  // 1. MULTI-TENANT ISOLATION & IDOR ATTACK DEFENSE
  // -------------------------------------------------------------
  describe('IDOR & Cross-Tenant Data Leak Defense', () => {
    it('DEFENSE-01: School token requesting College student profile directly by ID MUST return 404', async () => {
      const res = await request(app)
        .get(`/api/students/${collegeStudentId}`)
        .set('Authorization', `Bearer ${schoolToken}`);

      // The multi-tenant where clause ensures cross-tenant IDs are invisible
      expect([404, 403]).toContain(res.status);
      if (res.status === 404) {
        expect(res.body.message).toMatch(/not found/i);
      }
    });

    it('DEFENSE-02: College token requesting School student profile directly by ID MUST return 404', async () => {
      const res = await request(app)
        .get(`/api/students/${schoolStudentId}`)
        .set('Authorization', `Bearer ${collegeToken}`);

      expect([404, 403]).toContain(res.status);
      if (res.status === 404) {
        expect(res.body.message).toMatch(/not found/i);
      }
    });
  });

  // -------------------------------------------------------------
  // 2. RBAC & PRIVILEGE ESCALATION DEFENSE
  // -------------------------------------------------------------
  describe('RBAC & Role-Based Privilege Escalation Defense', () => {
    it('DEFENSE-03: User attempting unauthorized institution selection MUST be rejected (403)', async () => {
      const dummyCampusUuid = '11111111-2222-3333-4444-555555555555';
      const res = await request(app)
        .post('/api/auth/select-institution')
        .set('Authorization', `Bearer ${collegeToken}`)
        .send({ institutionId: dummyCampusUuid });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/do not have access|forbidden|permission|access denied/i);
    });

    it('DEFENSE-04: Unauthenticated request to protected endpoints MUST be rejected (401)', async () => {
      const res = await request(app).get('/api/students');
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/access denied|missing or invalid|token|unauthorized/i);
    });
  });

  // -------------------------------------------------------------
  // 3. JWT TOKEN TAMPERING & INTEGRITY DEFENSE
  // -------------------------------------------------------------
  describe('Cryptographic JWT Tampering Defense', () => {
    it('DEFENSE-05: Manipulated JWT signature MUST be immediately rejected (401)', async () => {
      // Split valid token and mutate the signature block
      const parts = collegeToken.split('.');
      const tamperedToken = `${parts[0]}.${parts[1]}.TAMPERED_SIGNATURE_HASH_12345`;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid|malformed|unauthorized/i);
    });

    it('DEFENSE-06: Malformed authorization header format MUST return 401', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidHeaderFormatWithoutBearer');

      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------
  // 4. INPUT VALIDATION & BOUNDARY DEFENSE
  // -------------------------------------------------------------
  describe('Zod Schema Validation & Boundary Defense', () => {
    it('DEFENSE-07: Batch attendance with missing date or invalid status MUST return 400', async () => {
      const res = await request(app)
        .post('/api/attendance/mark')
        .set('Authorization', `Bearer ${collegeToken}`)
        .send({
          // Missing date
          hour: 1,
          entries: [
            { studentId: collegeStudentId, status: 'INVALID_STATUS_CODE' },
          ],
        });

      expect(res.status).toBe(400);
      expect(['fail', 'error']).toContain(res.body.status);
    });

    it('DEFENSE-08: SQL Injection attack payload in search parameters MUST be safely escaped', async () => {
      const sqlInjectionPayload = "'; DROP TABLE \"Student\"; --";
      const res = await request(app)
        .get(`/api/students?search=${encodeURIComponent(sqlInjectionPayload)}`)
        .set('Authorization', `Bearer ${collegeToken}`);

      // Prisma parameterized queries prevent SQL injection completely
      expect(res.status).toBe(200);
      expect(res.body.data.students).toBeDefined();
      expect(res.body.data.students.length).toBe(0);
    });
  });
});
