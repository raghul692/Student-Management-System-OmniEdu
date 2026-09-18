import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { app } from '../app';
import { prisma } from '../config/prisma';
import { SystemRole, InstitutionRole, InstitutionType } from '@prisma/client';

describe('OmniEdu Phase B — Staff Directory, Reports Hub, and Organization Scaling Verification', () => {
  let orgId: string;
  let collegeInstId: string;
  let schoolInstId: string;
  let orgAdminToken: string;
  let collegeAdminToken: string;
  let studentToken: string;
  let hodToken: string;
  let cseDeptId: string;
  let createdStaffId: string;
  let newInstitutionId: string;

  beforeAll(async () => {
    // 1. Fetch existing organization and institutions
    const org = await prisma.organization.findFirst({
      where: { slug: 'apollo-trust' },
      include: { institutions: { include: { departments: true } } },
    });
    if (!org) {
      throw new Error('An organization must exist in the database.');
    }
    orgId = org.id;

    const college =
      org.institutions.find((i) => i.code === 'AIT-001') ||
      org.institutions.find((i) => i.type === InstitutionType.COLLEGE && i.departments.length > 0);
    const school =
      org.institutions.find((i) => i.code === 'AMHSS-001') ||
      org.institutions.find((i) => i.type === InstitutionType.SCHOOL);
    if (!college || !school) {
      throw new Error('Both college and school institutions must exist in the database.');
    }
    collegeInstId = college.id;
    schoolInstId = school.id;

    const cseDept = college.departments.find((d) => d.code === 'CSE') || college.departments[0];
    cseDeptId = cseDept.id;

    // Use pre-seeded demo accounts
    const [chairmanRes, principalRes, hodRes] = await Promise.all([
      request(app).post('/api/auth/demo-login').send({ role: 'trust_admin' }),
      request(app).post('/api/auth/demo-login').send({ role: 'principal_eng' }),
      request(app).post('/api/auth/demo-login').send({ role: 'hod_cse' }),
    ]);

    orgAdminToken = chairmanRes.body.data.accessToken;
    collegeAdminToken = principalRes.body.data.accessToken;
    hodToken = hodRes.body.data.accessToken;

    // Create student user for access control testing
    const passwordHash = await bcrypt.hash('Student@PhaseB1', 10);
    const studentUser = await prisma.user.upsert({
      where: { email: 'student.phaseb@ait.apollo.edu' },
      update: {},
      create: {
        email: 'student.phaseb@ait.apollo.edu',
        passwordHash,
        fullName: 'Phase B Test Student',
        systemRole: SystemRole.ORG_MEMBER,
      },
    });

    await prisma.organizationMembership.upsert({
      where: {
        userId_organizationId: {
          userId: studentUser.id,
          organizationId: orgId,
        },
      },
      update: {},
      create: {
        userId: studentUser.id,
        organizationId: orgId,
        role: SystemRole.ORG_MEMBER,
      },
    });

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

    const studentLogin = await request(app).post('/api/auth/login').send({
      email: 'student.phaseb@ait.apollo.edu',
      password: 'Student@PhaseB1',
    });
    studentToken = studentLogin.body.data.accessToken;
  });

  describe('1. Staff / Faculty Directory API (/api/staff)', () => {
    it('should list staff members for authorized institution admin', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.staff)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should block STUDENT from accessing /api/staff with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${studentToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(403);
      expect(['fail', 'error']).toContain(res.body.status);
    });

    it('should scope staff listing for HOD to their department', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${hodToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      if (res.body.data.staff.length > 0) {
        res.body.data.staff.forEach((s: any) => {
          if (s.department) {
            expect(s.department.id).toBe(cseDeptId);
          }
        });
      }
    });

    it('should allow authorized admin to create a new faculty/staff member', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          fullName: 'Prof. Test Instructor',
          email: `instructor.${Date.now()}@college.edu`,
          role: 'FACULTY',
          deptId: cseDeptId,
          designation: 'Assistant Professor',
          phone: '9876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.staff.fullName).toBe('Prof. Test Instructor');
      expect(res.body.data.staff.role).toBe('FACULTY');
      createdStaffId = res.body.data.staff.id;
    });

    it('should prevent privilege escalation: non-platform admin cannot assign invalid/super roles', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          fullName: 'Attacker Attempting Escalation',
          email: `attacker.${Date.now()}@evil.test`,
          role: 'ORG_ADMIN',
        });

      expect([400, 403]).toContain(res.status);
      expect(['fail', 'error']).toContain(res.body.status);
    });

    it('should prevent HOD from escalating privileges to create an Institution Admin (403 Forbidden)', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${hodToken}`)
        .set('x-institution-id', collegeInstId)
        .send({
          fullName: 'HOD Attempting Admin Creation',
          email: `hod.escalation.${Date.now()}@college.edu`,
          role: 'INSTITUTION_ADMIN',
          deptId: cseDeptId,
        });

      expect(res.status).toBe(403);
      expect(['fail', 'error']).toContain(res.body.status);
      expect(res.body.message).toMatch(/HOD/i);
    });

    it('should toggle staff active status', async () => {
      expect(createdStaffId).toBeDefined();
      const res = await request(app)
        .patch(`/api/staff/${createdStaffId}/toggle-active`)
        .set('Authorization', `Bearer ${collegeAdminToken}`)
        .set('x-institution-id', collegeInstId);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.staff.isActive).toBe(false);
    });
  });

  describe('2. Multi-Institution Provisioning & Organization Scaling (/api/organizations)', () => {
    it('should allow Org Admin to provision a 3rd/Nth institution without arbitrary limits', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/institutions`)
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          name: 'Apollo Polytechnic College',
          code: `APC-${Date.now()}`,
          type: 'COLLEGE',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.institution.name).toBe('Apollo Polytechnic College');
      expect(res.body.data.institution.type).toBe('COLLEGE');
      expect(res.body.data.institution.isActive).toBe(true);
      newInstitutionId = res.body.data.institution.id;

      // Check that default departments were provisioned automatically
      const depts = await prisma.department.findMany({
        where: { institutionId: newInstitutionId },
      });
      expect(depts.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow Org Admin to toggle an institution active/inactive status', async () => {
      expect(newInstitutionId).toBeDefined();
      const res = await request(app)
        .patch(`/api/organizations/${orgId}/institutions/${newInstitutionId}/toggle-active`)
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.institution.isActive).toBe(false);
    });

    it('should allow Org Admin to fetch all users across all institutions in the organization', async () => {
      const res = await request(app)
        .get(`/api/organizations/${orgId}/users`)
        .set('Authorization', `Bearer ${orgAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    });

    it('should block non-org admin or student from provisioning an institution (403 Forbidden)', async () => {
      const res = await request(app)
        .post(`/api/organizations/${orgId}/institutions`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          name: 'Unauthorized Fake Campus',
          code: 'UFC-999',
          type: 'SCHOOL',
        });

      expect(res.status).toBe(403);
      expect(['fail', 'error']).toContain(res.body.status);
    });
  });

  afterAll(async () => {
    try {
      if (createdStaffId) {
        const membership = await prisma.institutionMembership.findUnique({
          where: { id: createdStaffId },
        });
        if (membership) {
          await prisma.institutionMembership.deleteMany({ where: { id: createdStaffId } });
          await prisma.organizationMembership.deleteMany({ where: { userId: membership.userId } });
          await prisma.user.deleteMany({ where: { id: membership.userId } });
        }
      }
      if (newInstitutionId) {
        await prisma.department.deleteMany({ where: { institutionId: newInstitutionId } });
        await prisma.institutionMembership.deleteMany({ where: { institutionId: newInstitutionId } });
        await prisma.institution.deleteMany({ where: { id: newInstitutionId } });
      }
    } catch (err) {
      console.error('Error during phase-b afterAll cleanup:', err);
    }
  });
});

