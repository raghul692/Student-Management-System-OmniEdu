import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { requireInstitutionContext } from '../../config/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// listOrganizations — for PLATFORM_ADMIN use only
// ─────────────────────────────────────────────────────────────────────────────
export async function listOrganizations() {
  return prisma.organization.findMany({
    include: {
      institutions: { select: { id: true, name: true, type: true, code: true } },
      _count: { select: { memberships: true, institutions: true } },
    },
    orderBy: { name: 'asc' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrganization — returns org detail + institutions
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrganization(userId: string, orgId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { systemRole: true } });
  if (!user) throw new AppError('User not found', 401);

  if (user.systemRole !== 'PLATFORM_ADMIN') {
    const [orgMembership, instMembership] = await Promise.all([
      prisma.organizationMembership.findFirst({
        where: { userId, organizationId: orgId, isActive: true },
      }),
      prisma.institutionMembership.findFirst({
        where: {
          userId,
          isActive: true,
          institution: { organizationId: orgId },
        },
      }),
    ]);

    if (!orgMembership && !instMembership) {
      throw new AppError('Forbidden. You do not belong to this organization.', 403);
    }
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      institutions: {
        where: { isActive: true },
        select: {
          id: true, name: true, code: true, type: true,
          affiliatedUniversity: true, regulationYear: true, board: true,
          address: true, phone: true, email: true,
          _count: { select: { students: true } },
        },
      },
    },
  });
  if (!org) throw new AppError('Organization not found', 404);
  return org;
}

// ─────────────────────────────────────────────────────────────────────────────
// getInstitutionsByOrg — institutions the requesting user can access
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserInstitutions(userId: string) {
  const memberships = await prisma.institutionMembership.findMany({
    where: { userId, isActive: true },
    include: {
      institution: {
        include: { organization: { select: { id: true, name: true, slug: true, type: true } } },
      },
    },
  });

  return memberships.map((m) => ({
    institutionId: m.institutionId,
    institutionName: m.institution.name,
    institutionCode: m.institution.code,
    institutionType: m.institution.type,
    role: m.role,
    organization: m.institution.organization,
    deptId: m.deptId,
    classId: m.classId,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// getInstitutionStats — dashboard summary for the active institution
// ─────────────────────────────────────────────────────────────────────────────
export async function getInstitutionStats() {
  const ctx = requireInstitutionContext();

  const [studentCount, deptCount, courseCount, classCount] = await Promise.all([
    prisma.student.count({ where: { institutionId: ctx.institutionId, isActive: true } }),
    prisma.department.count({ where: { institutionId: ctx.institutionId } }),
    prisma.course.count({ where: { institutionId: ctx.institutionId } }),
    prisma.schoolClass.count({ where: { institutionId: ctx.institutionId } }),
  ]);

  return { studentCount, deptCount, courseCount, classCount };
}

// ─────────────────────────────────────────────────────────────────────────────
// createInstitutionForOrg — allows ORG_ADMIN to provision 3rd/Nth institutions
// ─────────────────────────────────────────────────────────────────────────────
export interface CreateInstitutionInput {
  name: string;
  code: string;
  type: 'COLLEGE' | 'SCHOOL';
  address?: string;
  phone?: string;
  email?: string;
  affiliatedUniversity?: string;
  regulationYear?: string;
  board?: string;
  standardFrom?: number;
  standardTo?: number;
}

export async function createInstitutionForOrg(userId: string, orgId: string, input: CreateInstitutionInput) {
  // 1. Verify user is ORG_ADMIN in this organization
  const orgMembership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, role: 'ORG_ADMIN', isActive: true },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const isPlatformAdmin = user?.systemRole === 'PLATFORM_ADMIN';

  if (!orgMembership && !isPlatformAdmin) {
    throw new AppError('Forbidden. Only organization admins can add institutions.', 403);
  }

  // 2. Check code uniqueness
  const existing = await prisma.institution.findUnique({
    where: { code: input.code.toUpperCase() },
  });
  if (existing) {
    throw new AppError(`Institution code "${input.code}" is already in use.`, 409);
  }

  // 3. Execute atomic creation
  const institution = await prisma.$transaction(async (tx) => {
    const inst = await tx.institution.create({
      data: {
        organizationId: orgId,
        name: input.name,
        code: input.code.toUpperCase(),
        type: input.type,
        address: input.address,
        phone: input.phone,
        email: input.email,
        affiliatedUniversity: input.type === 'COLLEGE' ? input.affiliatedUniversity || 'Anna University' : undefined,
        regulationYear: input.type === 'COLLEGE' ? input.regulationYear || '2021' : undefined,
        board: input.type === 'SCHOOL' ? input.board || 'CBSE' : undefined,
        standardFrom: input.type === 'SCHOOL' ? input.standardFrom || 1 : undefined,
        standardTo: input.type === 'SCHOOL' ? input.standardTo || 12 : undefined,
        isActive: true,
      },
    });

    // Auto-create initial Academic Year
    await tx.academicYear.create({
      data: {
        institutionId: inst.id,
        label: '2025-2026',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2026-05-31'),
        isCurrent: true,
      },
    });

    // Automatically assign the creating user as INSTITUTION_ADMIN so they can manage it immediately
    await tx.institutionMembership.create({
      data: {
        userId,
        institutionId: inst.id,
        role: 'INSTITUTION_ADMIN',
        isActive: true,
      },
    });

    // Auto-provision baseline structures
    if (input.type === 'COLLEGE') {
      await tx.department.createMany({
        data: [
          { institutionId: inst.id, name: 'Computer Science and Engineering', code: 'CSE', hodName: 'Staff In-Charge' },
          { institutionId: inst.id, name: 'Electronics and Communication Engineering', code: 'ECE', hodName: 'Staff In-Charge' },
        ],
      });
    } else {
      const classesData = Array.from({ length: 12 }, (_, i) => ({
        institutionId: inst.id,
        standard: i + 1,
        section: 'A',
      }));
      await tx.schoolClass.createMany({ data: classesData });
    }

    return inst;
  });

  return institution;
}

// ─────────────────────────────────────────────────────────────────────────────
// updateInstitution — updates institution settings
// ─────────────────────────────────────────────────────────────────────────────
export async function updateInstitution(userId: string, orgId: string, institutionId: string, input: Partial<CreateInstitutionInput>) {
  const orgMembership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, role: 'ORG_ADMIN', isActive: true },
  });
  if (!orgMembership) {
    throw new AppError('Forbidden. Only organization admins can update institution settings.', 403);
  }

  const inst = await prisma.institution.findFirst({
    where: { id: institutionId, organizationId: orgId },
  });
  if (!inst) throw new AppError('Institution not found in this organization', 404);

  return prisma.institution.update({
    where: { id: institutionId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.affiliatedUniversity !== undefined ? { affiliatedUniversity: input.affiliatedUniversity } : {}),
      ...(input.regulationYear !== undefined ? { regulationYear: input.regulationYear } : {}),
      ...(input.board !== undefined ? { board: input.board } : {}),
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// toggleInstitutionActive — activates / deactivates an institution
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleInstitutionActive(userId: string, orgId: string, institutionId: string) {
  const orgMembership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, role: 'ORG_ADMIN', isActive: true },
  });
  if (!orgMembership) {
    throw new AppError('Forbidden. Only organization admins can toggle campus status.', 403);
  }

  const inst = await prisma.institution.findFirst({
    where: { id: institutionId, organizationId: orgId },
  });
  if (!inst) throw new AppError('Institution not found in this organization', 404);

  return prisma.institution.update({
    where: { id: institutionId },
    data: { isActive: !inst.isActive },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// getOrganizationUsers — lists cross-campus users and memberships
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrganizationUsers(userId: string, orgId: string) {
  const orgMembership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId: orgId, isActive: true },
  });
  if (!orgMembership) {
    throw new AppError('Forbidden. You do not belong to this organization.', 403);
  }

  const orgMembers = await prisma.organizationMembership.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          systemRole: true,
          isActive: true,
          createdAt: true,
          institutionMemberships: {
            where: { institution: { organizationId: orgId } },
            include: {
              institution: { select: { id: true, name: true, code: true, type: true } },
              department: { select: { id: true, name: true, code: true } },
              schoolClass: { select: { id: true, standard: true, section: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return orgMembers.map((m) => ({
    membershipId: m.id,
    orgRole: m.role,
    user: m.user,
  }));
}

