/**
 * Phase H — Notification Policy Engine
 * Evaluates configurable threshold rules and auto-generates notifications.
 */
import { prisma } from '../../config/prisma';
import { logger } from '../../config/logger';

export interface PolicyEvalResult {
  notificationsCreated: number;
  interventionsCreated: number;
  studentsEvaluated: number;
}

/**
 * Evaluate attendance threshold rules for an institution.
 * Should be called by scheduled jobs or after bulk attendance commits.
 */
export async function evaluateAttendancePolicies(institutionId: string, organizationId: string): Promise<PolicyEvalResult> {
  const setting = await prisma.institutionSetting.findUnique({ where: { institutionId } });
  const threshold = setting?.attendanceThreshold ?? 75.0;

  const students = await prisma.student.findMany({
    where: { institutionId, isActive: true },
    select: {
      id: true,
      fullName: true,
      userId: true,
      parentLinks: { select: { parentUserId: true } },
      attendances: { select: { status: true }, take: 60, orderBy: { date: 'desc' } },
    },
  });

  let notificationsCreated = 0;
  let interventionsCreated = 0;

  // Rate limiting: track which students got a notification in the last 24h
  const recentNotifications = await prisma.notification.findMany({
    where: {
      institutionId,
      category: 'ATTENDANCE',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { userId: true },
  });
  const recentlyNotified = new Set(recentNotifications.map((n) => n.userId));

  for (const student of students) {
    const total = student.attendances.length;
    if (total === 0) continue;
    const present = student.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
    const pct = (present / total) * 100;

    if (pct >= threshold) continue;

    // Notify student (if they have a user account and haven't been notified recently)
    if (student.userId && !recentlyNotified.has(student.userId)) {
      const severity = pct < 65 ? 'CRITICAL' : 'WARNING';
      await prisma.notification.create({
        data: {
          institutionId,
          userId: student.userId,
          title: severity === 'CRITICAL' ? 'Detention Risk: Critical Attendance' : 'Low Attendance Warning',
          message: `Your current attendance is ${pct.toFixed(1)}%, which is below the required ${threshold}% threshold.`,
          category: 'ATTENDANCE',
          severity: severity as any,
          actionUrl: '/app/attendance',
        },
      });
      notificationsCreated++;

      // Notify parents
      for (const link of student.parentLinks) {
        if (!recentlyNotified.has(link.parentUserId)) {
          await prisma.notification.create({
            data: {
              institutionId,
              userId: link.parentUserId,
              title: `Attendance Alert: ${student.fullName}`,
              message: `${student.fullName}'s attendance is ${pct.toFixed(1)}%, below the ${threshold}% threshold.`,
              category: 'ATTENDANCE',
              severity: severity as any,
              actionUrl: '/app/parent-portal',
            },
          });
          notificationsCreated++;
        }
      }

      // Auto-create intervention for critical cases
      if (pct < 65) {
        const existingIntervention = await prisma.intervention.findFirst({
          where: { institutionId, studentId: student.id, status: { in: ['DETECTED', 'ASSIGNED', 'IN_PROGRESS'] } },
        });
        if (!existingIntervention) {
          await prisma.intervention.create({
            data: {
              organizationId,
              institutionId,
              studentId: student.id,
              title: 'Critical Attendance — Auto-Detected',
              description: `Attendance has dropped to ${pct.toFixed(1)}%. Immediate intervention required.`,
              riskLevel: 'HIGH',
              status: 'DETECTED',
              createdByUserId: 'SYSTEM',
            },
          });
          interventionsCreated++;
        }
      }
    }
  }

  logger.info(
    { institutionId, studentsEvaluated: students.length, notificationsCreated, interventionsCreated },
    'Attendance policy evaluation complete'
  );

  return { notificationsCreated, interventionsCreated, studentsEvaluated: students.length };
}

/** Evaluate fee overdue policies and notify relevant users. */
export async function evaluateFeePolicies(institutionId: string): Promise<number> {
  const overdueAssignments = await prisma.studentFeeAssignment.findMany({
    where: {
      institutionId,
      dueDate: { lt: new Date() },
    },
    include: {
      student: { select: { userId: true, fullName: true, parentLinks: { select: { parentUserId: true } } } },
      payments: { select: { amountPaid: true } },
    },
  });

  let notificationsCreated = 0;
  const recentlyNotified = new Set<string>();

  for (const fa of overdueAssignments) {
    const paid = fa.payments.reduce((s, p) => s + p.amountPaid, 0);
    if (paid >= fa.netPayable) continue; // fully paid

    const outstanding = fa.netPayable - paid;
    if (fa.student.userId && !recentlyNotified.has(fa.student.userId)) {
      await prisma.notification.create({
        data: {
          institutionId,
          userId: fa.student.userId,
          title: 'Overdue Fee Payment',
          message: `You have an outstanding fee of ₹${outstanding.toFixed(2)}. Please pay immediately to avoid academic hold.`,
          category: 'GENERAL',
          severity: 'WARNING',
          actionUrl: '/app/fees',
        },
      });
      recentlyNotified.add(fa.student.userId);
      notificationsCreated++;
    }
  }

  return notificationsCreated;
}
