import { Request, Response, NextFunction } from 'express';
import { isFeatureEnabled } from '../services/feature-flags/featureFlag.service';
import { checkOrganizationLimit } from '../services/saas/subscription.service';
import { getInstitutionContext } from '../config/prisma';

/**
 * Middleware to enforce feature flag availability for current organization
 */
export function requireFeature(featureKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getInstitutionContext();
      const orgId = ctx?.organizationId || req.selectedOrganizationId || req.user?.organizationId;

      if (!orgId) {
        return next(); // If unassociated, defer to role guard
      }

      const enabled = await isFeatureEnabled(orgId, featureKey);
      if (!enabled) {
        return res.status(403).json({
          status: 'error',
          message: `Feature '${featureKey}' is not enabled for your organization's current subscription plan. Please upgrade to access this feature.`,
        });
      }

      next();
    } catch (err: any) {
      next(err);
    }
  };
}

/**
 * Middleware to enforce campus/institution creation limits based on subscription
 */
export async function enforceInstitutionCreationLimit(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.body.organizationId || req.user?.organizationId;
    if (!orgId) return next();

    const limitCheck = await checkOrganizationLimit(orgId, 'institutions');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        status: 'error',
        message: `Institution limit reached for plan '${limitCheck.planTier}' (${limitCheck.current}/${limitCheck.max}). Upgrade your subscription to create additional institutions.`,
      });
    }

    next();
  } catch (err: any) {
    next(err);
  }
}
