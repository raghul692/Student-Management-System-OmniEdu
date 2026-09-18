/**
 * Phase H — Intervention Lifecycle Service
 * Tracks the full DETECTED → ASSIGNED → IN_PROGRESS → RESOLVED → REOPENED lifecycle.
 */
import { InterventionStatus } from '@prisma/client';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

const VALID_TRANSITIONS: Record<InterventionStatus, InterventionStatus[]> = {
  DETECTED:    ['ASSIGNED'],
  ASSIGNED:    ['IN_PROGRESS', 'RESOLVED'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED:    ['REOPENED'],
  REOPENED:    ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED'],
};

export async function createIntervention(params: {
  studentId: string;
  title: string;
  description: string;
  riskLevel?: string;
  riskPredictionId?: string;
  assignedToUserId?: string;
  createdByUserId: string;
  authorName: string;
}) {
  const ctx = requireInstitutionContext();
  const { institutionId, organizationId } = ctx;

  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT' || ctx.institutionRole === 'GUEST') {
    throw new AppError('Insufficient permissions to create interventions.', 403);
  }

  const student = await prisma.student.findFirst({
    where: { id: params.studentId, institutionId },
    select: { id: true, fullName: true },
  });
  if (!student) throw new AppError('Student not found in this institution.', 404);

  const intervention = await prisma.intervention.create({
    data: {
      organizationId,
      institutionId,
      studentId: params.studentId,
      title: params.title,
      description: params.description,
      riskLevel: params.riskLevel ?? 'MEDIUM',
      riskPredictionId: params.riskPredictionId,
      assignedToUserId: params.assignedToUserId,
      assignedAt: params.assignedToUserId ? new Date() : null,
      status: params.assignedToUserId ? 'ASSIGNED' : 'DETECTED',
      createdByUserId: params.createdByUserId,
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId,
      organizationId,
      userId: params.createdByUserId,
      action: 'INTERVENTION_CREATED',
      entityType: 'Intervention',
      entityId: intervention.id,
      details: { studentId: params.studentId, riskLevel: params.riskLevel, title: params.title },
    },
  });

  logger.info({ interventionId: intervention.id, institutionId, studentId: params.studentId }, 'Intervention created');
  return intervention;
}

export async function listInterventions(filters: {
  status?: InterventionStatus;
  studentId?: string;
  assignedToUserId?: string;
  riskLevel?: string;
  page?: number;
  limit?: number;
}) {
  const ctx = requireInstitutionContext();
  const { institutionId } = ctx;

  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT' || ctx.institutionRole === 'GUEST') {
    throw new AppError('Insufficient permissions to view interventions.', 403);
  }

  const { page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = { institutionId };
  if (filters.status) where.status = filters.status;
  if (filters.studentId) where.studentId = filters.studentId;
  if (filters.assignedToUserId) where.assignedToUserId = filters.assignedToUserId;
  if (filters.riskLevel) where.riskLevel = filters.riskLevel;

  const [interventions, total] = await Promise.all([
    prisma.intervention.findMany({
      where,
      include: { notes: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.intervention.count({ where }),
  ]);

  return { interventions, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getIntervention(id: string) {
  const ctx = requireInstitutionContext();
  const { institutionId } = ctx;

  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT' || ctx.institutionRole === 'GUEST') {
    throw new AppError('Insufficient permissions.', 403);
  }

  const intervention = await prisma.intervention.findFirst({
    where: { id, institutionId },
    include: { notes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!intervention) throw new AppError('Intervention not found.', 404);
  return intervention;
}

export async function advanceStatus(params: {
  id: string;
  newStatus: InterventionStatus;
  outcome?: string;
  assignedToUserId?: string;
  userId: string;
}) {
  const ctx = requireInstitutionContext();
  const { institutionId, organizationId } = ctx;

  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT' || ctx.institutionRole === 'GUEST') {
    throw new AppError('Insufficient permissions.', 403);
  }

  const intervention = await prisma.intervention.findFirst({ where: { id: params.id, institutionId } });
  if (!intervention) throw new AppError('Intervention not found.', 404);

  const allowed = VALID_TRANSITIONS[intervention.status] ?? [];
  if (!allowed.includes(params.newStatus)) {
    throw new AppError(
      `Cannot transition from ${intervention.status} to ${params.newStatus}. Allowed: ${allowed.join(', ')}`,
      422
    );
  }

  const updateData: any = { status: params.newStatus, updatedAt: new Date() };
  if (params.newStatus === 'ASSIGNED' && params.assignedToUserId) {
    updateData.assignedToUserId = params.assignedToUserId;
    updateData.assignedAt = new Date();
  }
  if (params.newStatus === 'RESOLVED') {
    updateData.resolvedAt = new Date();
    updateData.outcome = params.outcome;
  }

  const updated = await prisma.intervention.update({
    where: { id: params.id },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      institutionId,
      organizationId,
      userId: params.userId,
      action: 'INTERVENTION_STATUS_CHANGED',
      entityType: 'Intervention',
      entityId: params.id,
      details: { from: intervention.status, to: params.newStatus, outcome: params.outcome },
    },
  });

  return updated;
}

export async function addNote(params: {
  interventionId: string;
  content: string;
  authorUserId: string;
  authorName: string;
}) {
  const ctx = requireInstitutionContext();
  const { institutionId } = ctx;

  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT' || ctx.institutionRole === 'GUEST') {
    throw new AppError('Insufficient permissions.', 403);
  }

  const intervention = await prisma.intervention.findFirst({ where: { id: params.interventionId, institutionId } });
  if (!intervention) throw new AppError('Intervention not found.', 404);

  return prisma.interventionNote.create({
    data: {
      interventionId: params.interventionId,
      authorUserId: params.authorUserId,
      authorName: params.authorName,
      content: params.content,
    },
  });
}

export async function listNotes(interventionId: string) {
  const ctx = requireInstitutionContext();
  const { institutionId } = ctx;
  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT' || ctx.institutionRole === 'GUEST') {
    throw new AppError('Insufficient permissions.', 403);
  }
  const intervention = await prisma.intervention.findFirst({ where: { id: interventionId, institutionId } });
  if (!intervention) throw new AppError('Intervention not found.', 404);
  return prisma.interventionNote.findMany({ where: { interventionId }, orderBy: { createdAt: 'asc' } });
}
