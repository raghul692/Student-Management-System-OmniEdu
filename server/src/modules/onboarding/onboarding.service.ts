import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { OrgType, InstitutionType, SystemRole, InstitutionRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { registerUser } from '../auth/auth.service';

// ─────────────────────────────────────────────────────────────────────────────
// Input shape from the 4-step onboarding wizard
// ─────────────────────────────────────────────────────────────────────────────
export interface OnboardingInput {
  // Step 1 — Organization
  orgName: string;
  orgSlug: string;
  orgType: OrgType;

  // Step 2 — Institutions (at least one required)
  institutions: Array<{
    name: string;
    code: string;
    type: InstitutionType;
    address?: string;
    phone?: string;
    email?: string;
    affiliatedUniversity?: string;
    regulationYear?: string;
    board?: string;
    standardFrom?: number;
    standardTo?: number;
  }>;

  // Step 3 — Admin Account
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
  adminPhone?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// onboard — Single atomic transaction:
//   Organization → Institutions → AcademicYears → Admin User →
//   OrgMembership → InstitutionMembership(s)
// ─────────────────────────────────────────────────────────────────────────────
export async function onboard(input: OnboardingInput) {
  // Validate slug uniqueness
  const slugExists = await prisma.organization.findUnique({ where: { slug: input.orgSlug } });
  if (slugExists) throw new AppError('Organization slug is already taken. Please choose another.', 409);

  const emailExists = await prisma.user.findUnique({ where: { email: input.adminEmail.toLowerCase() } });
  if (emailExists) throw new AppError('Admin email is already registered.', 409);

  const passwordHash = await bcrypt.hash(input.adminPassword, 10);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Organization
    const org = await tx.organization.create({
      data: {
        name: input.orgName,
        slug: input.orgSlug.toLowerCase().trim().replace(/\s+/g, '-'),
        type: input.orgType,
        planTier: 'BASIC',
      },
    });

    // 2. Create Institutions
    const currentYear = new Date().getFullYear();
    const academicYearLabel = `${currentYear}-${currentYear + 1}`;
    const createdInstitutions = [];

    for (const inst of input.institutions) {
      const institution = await tx.institution.create({
        data: {
          organizationId: org.id,
          name: inst.name,
          code: inst.code.toUpperCase(),
          type: inst.type,
          address: inst.address,
          phone: inst.phone,
          email: inst.email,
          affiliatedUniversity: inst.affiliatedUniversity,
          regulationYear: inst.regulationYear,
          board: inst.board,
          standardFrom: inst.standardFrom,
          standardTo: inst.standardTo,
        },
      });

      // Create academic year
      await tx.academicYear.create({
        data: {
          institutionId: institution.id,
          label: academicYearLabel,
          startDate: new Date(`${currentYear}-07-01`),
          endDate: new Date(`${currentYear + 1}-06-30`),
          isCurrent: true,
        },
      });

      // Auto-provision initial academic structures
      if (inst.type === InstitutionType.COLLEGE) {
        await tx.department.createMany({
          data: [
            { institutionId: institution.id, name: 'Computer Science and Engineering', code: 'CSE', hodName: input.adminFullName },
            { institutionId: institution.id, name: 'Electronics and Communication Engineering', code: 'ECE', hodName: 'Staff In-Charge' },
          ],
        });
      } else if (inst.type === InstitutionType.SCHOOL) {
        const fromStd = inst.standardFrom ?? 1;
        const toStd = inst.standardTo ?? 12;
        const classesToCreate = [];
        for (let s = fromStd; s <= toStd; s++) {
          classesToCreate.push({
            institutionId: institution.id,
            standard: s,
            section: 'A',
            classTeacher: `Class Teacher (${s}-A)`,
          });
        }
        await tx.schoolClass.createMany({ data: classesToCreate });
      }

      createdInstitutions.push(institution);
    }

    // 3. Create Admin User
    const adminUser = await tx.user.create({
      data: {
        email: input.adminEmail.toLowerCase(),
        passwordHash,
        fullName: input.adminFullName,
        phone: input.adminPhone,
        systemRole: SystemRole.ORG_ADMIN,
      },
    });

    // 4. Organization Membership
    await tx.organizationMembership.create({
      data: {
        userId: adminUser.id,
        organizationId: org.id,
        role: SystemRole.ORG_ADMIN,
      },
    });

    // 5. Institution Memberships (admin gets INSTITUTION_ADMIN in all)
    for (const inst of createdInstitutions) {
      await tx.institutionMembership.create({
        data: {
          userId: adminUser.id,
          institutionId: inst.id,
          role: InstitutionRole.INSTITUTION_ADMIN,
        },
      });
    }

    return { org, institutions: createdInstitutions, adminUser };
  });

  return {
    organization: { id: result.org.id, name: result.org.name, slug: result.org.slug, type: result.org.type },
    institutions: result.institutions.map((i) => ({ id: i.id, name: i.name, code: i.code, type: i.type })),
    adminUser: { id: result.adminUser.id, email: result.adminUser.email, fullName: result.adminUser.fullName },
    message: 'Organization created successfully! You can now log in.',
  };
}
