import { prisma, requireInstitutionContext } from '../../config/prisma';

export async function logAuditEvent(params: {
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  userId?: string;
}) {
  try {
    const ctx = requireInstitutionContext();
    return await prisma.auditLog.create({
      data: {
        institutionId: ctx.institutionId,
        userId: params.userId || ctx.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
        ipAddress: params.ipAddress,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
    return null;
  }
}

export async function getAuditLogs(options?: { entityType?: string; limit?: number }) {
  const ctx = requireInstitutionContext();
  return prisma.auditLog.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(options?.entityType ? { entityType: options.entityType } : {}),
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
  });
}
