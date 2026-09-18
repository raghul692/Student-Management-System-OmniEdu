import { prisma, requireInstitutionContext } from '../../config/prisma';
import { NotificationCategory, NotificationSeverity, InstitutionRole } from '@prisma/client';
import { logAuditEvent } from '../audit/audit.service';
import { emailService } from '../../services/email/email.service';

export async function getUserNotifications(
  userId: string,
  options?: { isRead?: boolean; category?: NotificationCategory }
) {
  const ctx = requireInstitutionContext();
  return prisma.notification.findMany({
    where: {
      institutionId: ctx.institutionId,
      userId,
      ...(options?.isRead !== undefined ? { isRead: options.isRead } : {}),
      ...(options?.category ? { category: options.category } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  const ctx = requireInstitutionContext();
  return prisma.notification.count({
    where: {
      institutionId: ctx.institutionId,
      userId,
      isRead: false,
    },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  const ctx = requireInstitutionContext();
  return prisma.notification.updateMany({
    where: { institutionId: ctx.institutionId, userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getPreferences(userId: string) {
  let pref = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  if (!pref) {
    pref = await prisma.notificationPreference.create({
      data: { userId },
    });
  }
  return pref;
}

export async function updatePreferences(
  userId: string,
  data: Partial<{
    emailAlerts: boolean;
    attendanceThreshold: boolean;
    examSchedule: boolean;
    gradeReports: boolean;
    announcements: boolean;
  }>
) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  category?: NotificationCategory;
  severity?: NotificationSeverity;
  actionUrl?: string;
  metadata?: any;
}) {
  const ctx = requireInstitutionContext();
  const notification = await prisma.notification.create({
    data: {
      institutionId: ctx.institutionId,
      userId: params.userId,
      title: params.title,
      message: params.message,
      category: params.category || NotificationCategory.GENERAL,
      severity: params.severity || NotificationSeverity.INFO,
      actionUrl: params.actionUrl,
      metadata: params.metadata,
    },
  });

  // Multi-channel dispatch check (email)
  try {
    const pref = await getPreferences(params.userId);
    if (pref.emailAlerts) {
      const recipient = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { email: true, fullName: true },
      });

      if (recipient?.email) {
        await emailService.sendEmail({
          to: recipient.email,
          subject: `[OmniEdu] ${params.title}`,
          text: params.message,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h3 style="color: #0f172a; margin-top: 0;">${params.title}</h3>
              <p style="color: #334155; font-size: 14px;">${params.message}</p>
              ${
                params.actionUrl
                  ? `<a href="${params.actionUrl}" style="display: inline-block; padding: 8px 16px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 13px;">View in OmniEdu</a>`
                  : ''
              }
            </div>
          `,
        });
      }
    }
  } catch (err: any) {
    // Non-blocking for notification creation
    console.error('Failed to dispatch notification email:', err.message);
  }

  return notification;
}

export async function checkAndTriggerAttendanceAlert(studentId: string) {
  try {
    const ctx = requireInstitutionContext();
    const institutionId = ctx.institutionId;

    // 1. Fetch institution settings for attendance threshold
    const setting = await prisma.institutionSetting.findUnique({
      where: { institutionId },
    });
    const threshold = setting?.attendanceThreshold ?? 75.0;

    // 2. Fetch student
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parentLinks: { include: { parentUser: true } },
      },
    });
    if (!student || !student.isActive) return;

    // 3. Calculate attendance percentage
    const totalRecords = await prisma.attendance.count({
      where: { studentId, institutionId },
    });
    if (totalRecords < 3) return; // Need a baseline before firing alerts

    const presentRecords = await prisma.attendance.count({
      where: {
        studentId,
        institutionId,
        status: { in: ['PRESENT', 'LATE', 'ON_DUTY'] },
      },
    });

    const percentage = Number(((presentRecords / totalRecords) * 100).toFixed(1));

    if (percentage < threshold) {
      // 4. Rate-limit check: did we alert in the last 7 days?
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentAlert = await prisma.notification.findFirst({
        where: {
          institutionId,
          category: NotificationCategory.ATTENDANCE,
          title: { contains: student.fullName },
          createdAt: { gte: sevenDaysAgo },
        },
      });

      if (recentAlert) return; // Prevent spam

      const alertTitle = `Attendance Shortage Warning: ${student.fullName}`;
      const alertMsg = `${student.fullName} (${student.regNumber || student.rollNumber || 'ID: ' + student.id}) attendance is currently ${percentage}%, which is below the mandatory ${threshold}% threshold. Please address this immediately to prevent exam ineligibility.`;

      // Alert student if userId exists
      if (student.userId) {
        await createNotification({
          userId: student.userId,
          title: 'Urgent: Low Attendance Warning',
          message: `Your current attendance is ${percentage}%, which is below the required ${threshold}%. Please consult your academic coordinator.`,
          category: NotificationCategory.ATTENDANCE,
          severity: NotificationSeverity.WARNING,
          actionUrl: '/app/attendance',
        });
      }

      // Alert parent(s)
      for (const link of student.parentLinks) {
        if (link.parentUserId) {
          const pref = await getPreferences(link.parentUserId);
          if (pref.attendanceThreshold) {
            await createNotification({
              userId: link.parentUserId,
              title: alertTitle,
              message: alertMsg,
              category: NotificationCategory.ATTENDANCE,
              severity: NotificationSeverity.WARNING,
              actionUrl: `/app/parent/student/${student.id}`,
            });
          }
        }
      }

      // Alert coordinator / HOD / Principal
      const admins = await prisma.institutionMembership.findMany({
        where: {
          institutionId,
          role: { in: [InstitutionRole.INSTITUTION_ADMIN, InstitutionRole.HOD] },
        },
        select: { userId: true },
      });

      for (const admin of admins) {
        await createNotification({
          userId: admin.userId,
          title: alertTitle,
          message: alertMsg,
          category: NotificationCategory.ATTENDANCE,
          severity: NotificationSeverity.WARNING,
          actionUrl: '/app/reports/defaulters',
        });
      }

      await logAuditEvent({
        action: 'ATTENDANCE_THRESHOLD_ALERT_TRIGGERED',
        entityType: 'Student',
        entityId: student.id,
        details: { percentage, threshold, totalRecords, presentRecords },
      });
    }
  } catch (err) {
    console.error('Error in checkAndTriggerAttendanceAlert:', err);
  }
}
