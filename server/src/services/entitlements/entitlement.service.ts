/**
 * Phase H — Centralized Feature Entitlement Service
 *
 * Single source of truth for plan-tier to feature mappings.
 * All feature gates across the codebase should call this service
 * instead of ad-hoc FeatureFlag lookups.
 */

import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

export const FEATURE_KEYS = {
  // Core (all plans)
  BASIC_ANALYTICS: 'BASIC_ANALYTICS',
  IMPORT: 'IMPORT',
  NOTIFICATIONS: 'NOTIFICATIONS',
  ANNOUNCEMENTS: 'ANNOUNCEMENTS',
  PARENT_PORTAL: 'PARENT_PORTAL',
  ATTENDANCE: 'ATTENDANCE',
  MARKS: 'MARKS',
  ADMISSIONS: 'ADMISSIONS',
  FEES: 'FEES',
  ASSIGNMENTS: 'ASSIGNMENTS',
  TIMETABLE: 'TIMETABLE',
  // PRO features
  AI_ASSISTANT: 'AI_ASSISTANT',
  EARLY_WARNING: 'EARLY_WARNING',
  ADVANCED_ANALYTICS: 'ADVANCED_ANALYTICS',
  RAG: 'RAG',
  CAREER_INTELLIGENCE: 'CAREER_INTELLIGENCE',
  QUESTION_GENERATOR: 'QUESTION_GENERATOR',
  AI_GRADING: 'AI_GRADING',
  RISK_ENGINE: 'RISK_ENGINE',
  AI_COMMUNICATIONS: 'AI_COMMUNICATIONS',
  INTERVENTIONS: 'INTERVENTIONS',
  SCHEDULED_JOBS: 'SCHEDULED_JOBS',
  // ENTERPRISE features
  EXPORTS: 'EXPORTS',
  API_ACCESS: 'API_ACCESS',
  WEBHOOK: 'WEBHOOK',
  CUSTOM_ROLES: 'CUSTOM_ROLES',
  AUDIT_LOGS_EXPORT: 'AUDIT_LOGS_EXPORT',
  AI_GOVERNANCE: 'AI_GOVERNANCE',
  PRIVACY_CONTROLS: 'PRIVACY_CONTROLS',
  SSO: 'SSO',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const BASIC_FEATURES: FeatureKey[] = [
  'BASIC_ANALYTICS','IMPORT','NOTIFICATIONS','ANNOUNCEMENTS','PARENT_PORTAL',
  'ATTENDANCE','MARKS','ADMISSIONS','FEES','ASSIGNMENTS','TIMETABLE',
];
const PRO_FEATURES: FeatureKey[] = [
  ...BASIC_FEATURES,
  'AI_ASSISTANT','EARLY_WARNING','ADVANCED_ANALYTICS','RAG','CAREER_INTELLIGENCE',
  'QUESTION_GENERATOR','AI_GRADING','RISK_ENGINE','AI_COMMUNICATIONS','INTERVENTIONS','SCHEDULED_JOBS',
];
const ENTERPRISE_FEATURES: FeatureKey[] = [
  ...PRO_FEATURES,
  'EXPORTS','API_ACCESS','WEBHOOK','CUSTOM_ROLES','AUDIT_LOGS_EXPORT','AI_GOVERNANCE','PRIVACY_CONTROLS','SSO',
];

const PLAN_FEATURES: Record<string, FeatureKey[]> = {
  BASIC: BASIC_FEATURES,
  PRO: PRO_FEATURES,
  ENTERPRISE: ENTERPRISE_FEATURES,
};

async function getOrgPlanTier(organizationId: string): Promise<string> {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId },
    select: { planTier: true, status: true },
  });
  if (!sub || sub.status === 'CANCELLED' || sub.status === 'EXPIRED') return 'BASIC';
  return sub.planTier?.toUpperCase() ?? 'BASIC';
}

export async function hasEntitlement(organizationId: string, featureKey: FeatureKey): Promise<boolean> {
  try {
    const [planTier, flag] = await Promise.all([
      getOrgPlanTier(organizationId),
      prisma.featureFlag.findUnique({
        where: { organizationId_key: { organizationId, key: featureKey } },
        select: { isEnabled: true },
      }),
    ]);
    if (flag !== null && flag !== undefined) return flag.isEnabled;
    return (PLAN_FEATURES[planTier] ?? BASIC_FEATURES).includes(featureKey);
  } catch (err) {
    logger.warn({ organizationId, featureKey, err }, 'Entitlement check error');
    return false;
  }
}

export async function assertEntitlement(
  organizationId: string,
  featureKey: FeatureKey,
  upgradeMessage?: string
): Promise<void> {
  const allowed = await hasEntitlement(organizationId, featureKey);
  if (!allowed) {
    throw new AppError(
      upgradeMessage ?? `Feature '${featureKey}' is not available on your current plan. Please upgrade.`,
      403
    );
  }
}

export async function getEntitlements(organizationId: string): Promise<{
  planTier: string;
  features: FeatureKey[];
  overrides: { key: string; isEnabled: boolean }[];
}> {
  const [planTier, overrides] = await Promise.all([
    getOrgPlanTier(organizationId),
    prisma.featureFlag.findMany({ where: { organizationId }, select: { key: true, isEnabled: true } }),
  ]);
  const planFeatures = PLAN_FEATURES[planTier] ?? BASIC_FEATURES;
  const overrideMap = new Map(overrides.map((o) => [o.key, o.isEnabled]));
  const effectiveFeatures = (Object.values(FEATURE_KEYS) as FeatureKey[]).filter((key) => {
    if (overrideMap.has(key)) return overrideMap.get(key);
    return planFeatures.includes(key);
  });
  return { planTier, features: effectiveFeatures, overrides };
}
