import { Request, Response, NextFunction } from 'express';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { assertEntitlement } from '../../services/entitlements/entitlement.service';
import { InstitutionRole } from '@prisma/client';

export async function searchAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    if (ctx.institutionRole !== 'INSTITUTION_ADMIN' && ctx.systemRole !== 'PLATFORM_ADMIN') {
      throw new AppError('Only Institution Admins can access audit logs.', 403);
    }
    const { action, entityType, userId, from, to, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const where: any = { institutionId: ctx.institutionId };
    if (action) where.action = { contains: action as string, mode: 'insensitive' };
    if (entityType) where.entityType = { contains: entityType as string, mode: 'insensitive' };
    if (userId) where.userId = userId as string;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
        select: {
          id: true, action: true, entityType: true, entityId: true,
          userId: true, ipAddress: true, details: true, createdAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);
    return res.status(200).json({
      status: 'success',
      data: { logs, total, page: parseInt(page as string), limit: parseInt(limit as string) },
    });
  } catch (err) { next(err); }
}

export async function exportAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    if (ctx.institutionRole !== 'INSTITUTION_ADMIN' && ctx.systemRole !== 'PLATFORM_ADMIN') {
      throw new AppError('Only Institution Admins can export audit logs.', 403);
    }
    await assertEntitlement(ctx.organizationId, 'AUDIT_LOGS_EXPORT');
    const { from, to } = req.query;
    const where: any = { institutionId: ctx.institutionId };
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from as string) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to as string) };
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
      select: { id: true, action: true, entityType: true, entityId: true, userId: true, ipAddress: true, details: true, createdAt: true },
    });
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log-export.json"');
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify({ exportedAt: new Date(), institutionId: ctx.institutionId, logs }, null, 2));
  } catch (err) { next(err); }
}
