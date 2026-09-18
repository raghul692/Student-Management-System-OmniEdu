import { Request, Response, NextFunction } from 'express';
import { getOrCreateSubscription, upgradePlan, checkOrganizationLimit } from '../../services/saas/subscription.service';
import { getOrganizationFeatureFlags, setFeatureFlag } from '../../services/feature-flags/featureFlag.service';
import { AppError } from '../../middleware/errorHandler';

export async function getSubscriptionController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req.query.organizationId as string) || req.user?.organizationId;
    if (!orgId) throw new AppError('Organization context required', 400);

    const subscription = await getOrCreateSubscription(orgId);
    const instLimit = await checkOrganizationLimit(orgId, 'institutions');
    const studentLimit = await checkOrganizationLimit(orgId, 'students');

    res.json({
      status: 'success',
      data: {
        subscription,
        usage: {
          institutions: { current: instLimit.current, max: instLimit.max },
          students: { current: studentLimit.current, max: studentLimit.max },
        },
      },
    });
  } catch (err) { next(err); }
}

export async function upgradePlanController(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationId, planTier } = req.body;
    const orgId = organizationId || req.user?.organizationId;
    if (!orgId || !planTier) throw new AppError('Organization ID and planTier are required', 400);

    const updated = await upgradePlan(orgId, planTier);
    res.json({ status: 'success', data: updated });
  } catch (err) { next(err); }
}

export async function getFeatureFlagsController(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = (req.query.organizationId as string) || req.user?.organizationId;
    if (!orgId) throw new AppError('Organization context required', 400);

    const flags = await getOrganizationFeatureFlags(orgId);
    res.json({ status: 'success', data: flags });
  } catch (err) { next(err); }
}

export async function updateFeatureFlagController(req: Request, res: Response, next: NextFunction) {
  try {
    const { key } = req.params;
    const { organizationId, isEnabled, description } = req.body;
    const orgId = organizationId || req.user?.organizationId;
    if (!orgId || !key || typeof isEnabled !== 'boolean') {
      throw new AppError('organizationId, key, and isEnabled boolean are required', 400);
    }

    const updated = await setFeatureFlag(orgId, key, isEnabled, description);
    res.json({ status: 'success', data: updated });
  } catch (err) { next(err); }
}
