import { prisma } from '../../config/prisma';
import { getOrCreateSubscription, PLAN_CONFIGS } from '../saas/subscription.service';

export async function isFeatureEnabled(organizationId: string, featureKey: string): Promise<boolean> {
  // 1. Check explicit organization override
  const override = await prisma.featureFlag.findUnique({
    where: {
      organizationId_key: {
        organizationId,
        key: featureKey,
      },
    },
  });

  if (override) {
    return override.isEnabled;
  }

  // 2. Default to subscription plan tier features
  const sub = await getOrCreateSubscription(organizationId);
  const plan = PLAN_CONFIGS[sub.planTier] || PLAN_CONFIGS.BASIC;
  return plan.allowedFeatures.includes(featureKey);
}

export async function setFeatureFlag(
  organizationId: string,
  featureKey: string,
  isEnabled: boolean,
  description?: string
) {
  return prisma.featureFlag.upsert({
    where: {
      organizationId_key: {
        organizationId,
        key: featureKey,
      },
    },
    update: {
      isEnabled,
      description,
    },
    create: {
      organizationId,
      key: featureKey,
      isEnabled,
      description,
    },
  });
}

export async function getOrganizationFeatureFlags(organizationId: string) {
  const sub = await getOrCreateSubscription(organizationId);
  const plan = PLAN_CONFIGS[sub.planTier] || PLAN_CONFIGS.BASIC;

  const overrides = await prisma.featureFlag.findMany({
    where: { organizationId },
  });

  const overrideMap = new Map<string, boolean>();
  for (const o of overrides) {
    overrideMap.set(o.key, o.isEnabled);
  }

  const standardFeatures = [
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
  ];

  return standardFeatures.map((key) => {
    const hasOverride = overrideMap.has(key);
    const enabled = hasOverride ? overrideMap.get(key)! : plan.allowedFeatures.includes(key);
    return {
      key,
      isEnabled: enabled,
      isOverridden: hasOverride,
      planTier: sub.planTier,
    };
  });
}
