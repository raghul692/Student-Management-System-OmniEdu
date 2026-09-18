import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { AnnouncementScope } from '@prisma/client';

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  scope?: AnnouncementScope;
  deptId?: string;
  classId?: string;
  isPinned?: boolean;
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot create announcements.', 403);
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { fullName: true },
  });

  const announcement = await prisma.announcement.create({
    data: {
      institutionId,
      title: input.title,
      content: input.content,
      scope: input.scope || 'INSTITUTION',
      deptId: input.deptId,
      classId: input.classId,
      isPinned: input.isPinned ?? false,
      authorName: user?.fullName || 'Staff Member',
      authorUserId: ctx.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId,
      userId: ctx.userId,
      action: 'ANNOUNCEMENT_CREATED',
      entityType: 'Announcement',
      entityId: announcement.id,
      details: { title: input.title, scope: input.scope || 'INSTITUTION' },
    },
  });

  return announcement;
}

export async function listAnnouncements(filter?: {
  scope?: AnnouncementScope;
  deptId?: string;
  classId?: string;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const where: any = { institutionId };

  if (filter?.scope) where.scope = filter.scope;
  if (filter?.deptId) where.deptId = filter.deptId;
  if (filter?.classId) where.classId = filter.classId;

  // If student caller, show institution-wide + their own dept or class
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (student) {
      where.OR = [
        { scope: 'INSTITUTION' },
        ...(student.deptId ? [{ scope: 'DEPARTMENT', deptId: student.deptId }] : []),
        ...(student.classId ? [{ scope: 'CLASS', classId: student.classId }] : []),
      ];
    }
  }

  return prisma.announcement.findMany({
    where,
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function deleteAnnouncement(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot delete announcements.', 403);
  }

  const announcement = await prisma.announcement.findFirst({
    where: { id, institutionId },
  });
  if (!announcement) throw new AppError('Announcement not found', 404);

  return prisma.announcement.delete({
    where: { id },
  });
}
