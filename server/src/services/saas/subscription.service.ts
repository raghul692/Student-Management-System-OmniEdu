import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { SubscriptionStatus } from '@prisma/client';

export interface PlanLimits {
  planTier: string;
  maxInstitutions: number;
  maxStudents: number;
  maxStorageGb: number;
  allowedFeatures: string[];
}

export const PLAN_CONFIGS: Record<string, PlanLimits> = {
  BASIC: {
    planTier: 'BASIC',
    maxInstitutions: 3,
    maxStudents: 1000,
    maxStorageGb: 10,
    allowedFeatures: ['ATTENDANCE', 'MARKS', 'STAFF_DIRECTORY', 'REPORTS'],
  },
  PRO: {
    planTier: 'PRO',
    maxInstitutions: 10,
    maxStudents: 10000,
    maxStorageGb: 100,
    allowedFeatures: [
      'ATTENDANCE',
      'MARKS',
      'STAFF_DIRECTORY',
      'REPORTS',
      'CUSTOM_ROLES',
      'CSV_IMPORTS',
      'HALL_TICKETS',
      'FEES_LEDGER',
      'DEFAULTER_RADAR',
    ],
  },
  ENTERPRISE: {
    planTier: 'ENTERPRISE',
    maxInstitutions: 100,
    maxStudents: 100000,
    maxStorageGb: 1000,
    allowedFeatures: [
      'ATTENDANCE',
      'MARKS',
      'STAFF_DIRECTORY',
      'REPORTS',
      'CUSTOM_ROLES',
      'CSV_IMPORTS',
      'HALL_TICKETS',
      'FEES_LEDGER',
      'DEFAULTER_RADAR',
      'AI_ASSISTANT',
      'ADVANCED_ANALYTICS',
      'SMS_GATEWAY',
    ],
  },
};

export async function getOrCreateSubscription(organizationId: string) {
  let sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!sub) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planTier: true },
    });
    const tier = org?.planTier || 'BASIC';
    const config = PLAN_CONFIGS[tier] || PLAN_CONFIGS.BASIC;

    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    sub = await prisma.subscription.create({
      data: {
        organizationId,
        planTier: config.planTier,
        status: SubscriptionStatus.ACTIVE,
        maxInstitutions: config.maxInstitutions,
        maxStudents: config.maxStudents,
        maxStorageGb: config.maxStorageGb,
        currentPeriodEnd: oneYearLater,
      },
    });
  }

  return sub;
}

export async function checkOrganizationLimit(
  organizationId: string,
  resource: 'institutions' | 'students'
): Promise<{ allowed: boolean; current: number; max: number; planTier: string }> {
  const sub = await getOrCreateSubscription(organizationId);

  let current = 0;
  let max = 0;

  if (resource === 'institutions') {
    current = await prisma.institution.count({
      where: { organizationId, isActive: true },
    });
    max = sub.maxInstitutions;
  } else if (resource === 'students') {
    current = await prisma.student.count({
      where: {
        institution: { organizationId },
        isActive: true,
      },
    });
    max = sub.maxStudents;
  }

  return {
    allowed: current < max,
    current,
    max,
    planTier: sub.planTier,
  };
}

export async function upgradePlan(organizationId: string, newPlanTier: 'BASIC' | 'PRO' | 'ENTERPRISE') {
  const config = PLAN_CONFIGS[newPlanTier];
  if (!config) throw new AppError('Invalid plan tier', 400);

  const sub = await getOrCreateSubscription(organizationId);

  const updatedSub = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      planTier: config.planTier,
      maxInstitutions: config.maxInstitutions,
      maxStudents: config.maxStudents,
      maxStorageGb: config.maxStorageGb,
    },
  });

  await prisma.organization.update({
    where: { id: organizationId },
    data: { planTier: config.planTier },
  });

  return updatedSub;
}
