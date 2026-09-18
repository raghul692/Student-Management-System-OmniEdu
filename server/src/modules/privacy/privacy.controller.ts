import { Request, Response, NextFunction } from 'express';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { assertEntitlement } from '../../services/entitlements/entitlement.service';
import { logger } from '../../config/logger';

export async function requestDataExport(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    await assertEntitlement(ctx.organizationId, 'PRIVACY_CONTROLS');

    // Queue a background export job (record in audit log)
    const audit = await prisma.auditLog.create({
      data: {
        institutionId: ctx.institutionId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'PRIVACY_EXPORT_REQUESTED',
        entityType: 'User',
        entityId: ctx.userId,
        details: { reason: req.body.reason || 'User requested data export', requestedAt: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info({ userId: ctx.userId, institutionId: ctx.institutionId }, 'Privacy data export requested');

    return res.status(202).json({
      status: 'success',
      message: 'Data export request has been received. You will be notified when your export is ready (typically within 24 hours).',
      data: { requestId: audit.id, requestedAt: new Date().toISOString(), estimatedCompletion: '24 hours' },
    });
  } catch (err) { next(err); }
}

export async function getExportRequests(_req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const logs = await prisma.auditLog.findMany({
      where: {
        userId: ctx.userId,
        action: 'PRIVACY_EXPORT_REQUESTED',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const requests = logs.map((l) => ({
      requestId: l.id,
      status: 'PENDING',
      requestedAt: l.createdAt,
      details: l.details,
    }));
    return res.status(200).json({ status: 'success', data: { requests } });
  } catch (err) { next(err); }
}

export async function deactivateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const { confirmation } = req.body;
    if (confirmation !== 'DEACTIVATE') {
      return res.status(400).json({
        status: 'fail',
        message: 'Confirmation text "DEACTIVATE" is required to proceed.',
      });
    }

    // Deactivate the user (soft delete via isActive = false)
    await prisma.user.update({
      where: { id: ctx.userId },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        institutionId: ctx.institutionId,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: 'ACCOUNT_DEACTIVATED',
        entityType: 'User',
        entityId: ctx.userId,
        details: { selfRequested: true },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    logger.info({ userId: ctx.userId }, 'User account self-deactivated');
    return res.status(200).json({ status: 'success', message: 'Your account has been deactivated.' });
  } catch (err) { next(err); }
}
