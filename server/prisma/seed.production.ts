import { PrismaClient, SystemRole, InstitutionRole, OrgType, InstitutionType, RegulationStatus, SubscriptionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Running OmniEdu Production Seed (Idempotent)...');

  // 1. Seed Core Permissions
  const resources = [
    'students',
    'attendance',
    'marks',
    'reports',
    'settings',
    'users',
    'admissions',
    'fees',
    'exams',
    'assignments',
  ];
  const actions = ['read', 'write', 'delete', 'export', 'approve'];
  const scopes = ['institution', 'department', 'class', 'self', 'child'];

  for (const resource of resources) {
    for (const action of ['read', 'write']) {
      await prisma.permission.upsert({
        where: {
          resource_action_scope: {
            resource,
            action,
            scope: 'institution',
          },
        },
        update: {},
        create: {
          resource,
          action,
          scope: 'institution',
          description: `Allow ${action} on ${resource} at institution scope`,
        },
      });
    }
  }

  // 2. Ensure Platform Admin Exists
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@omniedu.io';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() },
  });

  if (!existingAdmin) {
    const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'OmniEdu@Production2026';
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        passwordHash,
        fullName: 'OmniEdu Platform Administrator',
        systemRole: SystemRole.PLATFORM_ADMIN,
        isActive: true,
      },
    });
    console.log(`✓ Created initial Platform Administrator: ${adminEmail}`);
  }

  // 3. Ensure Default Subscriptions for Organizations
  const orgs = await prisma.organization.findMany();
  for (const org of orgs) {
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    await prisma.subscription.upsert({
      where: { organizationId: org.id },
      update: {},
      create: {
        organizationId: org.id,
        planTier: org.planTier || 'BASIC',
        status: SubscriptionStatus.ACTIVE,
        maxInstitutions: org.planTier === 'ENTERPRISE' ? 100 : org.planTier === 'PRO' ? 10 : 3,
        maxStudents: org.planTier === 'ENTERPRISE' ? 100000 : org.planTier === 'PRO' ? 10000 : 1000,
        maxStorageGb: org.planTier === 'ENTERPRISE' ? 1000 : org.planTier === 'PRO' ? 100 : 10,
        currentPeriodEnd: oneYearLater,
      },
    });
  }

  console.log(`✓ Production seeding complete. Verified ${orgs.length} organizations and permissions.`);
}

main()
  .catch((e) => {
    console.error('Production seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
