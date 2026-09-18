import { prisma, requireInstitutionContext } from '../../config/prisma';
import { logAuditEvent, getAuditLogs } from '../audit/audit.service';

export async function getInstitutionSettings() {
  const ctx = requireInstitutionContext();
  let setting = await prisma.institutionSetting.findUnique({
    where: { institutionId: ctx.institutionId },
  });

  if (!setting) {
    setting = await prisma.institutionSetting.create({
      data: {
        institutionId: ctx.institutionId,
        attendanceThreshold: 75.0,
        workingDaysPerWeek: 6,
        periodsPerDay: 8,
        passingMarksPercent: 50.0,
        enableParentPortal: true,
      },
    });
  }

  return setting;
}

export async function updateInstitutionSettings(data: {
  attendanceThreshold?: number;
  workingDaysPerWeek?: number;
  periodsPerDay?: number;
  passingMarksPercent?: number;
  gradingScaleConfig?: any;
  academicAlertEmail?: string;
  enableParentPortal?: boolean;
  timezone?: string;
  primaryColor?: string;
  logoUrl?: string;
  reportFooter?: string;
}) {
  const ctx = requireInstitutionContext();
  const setting = await prisma.institutionSetting.upsert({
    where: { institutionId: ctx.institutionId },
    update: data,
    create: {
      institutionId: ctx.institutionId,
      attendanceThreshold: data.attendanceThreshold ?? 75.0,
      workingDaysPerWeek: data.workingDaysPerWeek ?? 6,
      periodsPerDay: data.periodsPerDay ?? 8,
      passingMarksPercent: data.passingMarksPercent ?? 50.0,
      gradingScaleConfig: data.gradingScaleConfig,
      academicAlertEmail: data.academicAlertEmail,
      enableParentPortal: data.enableParentPortal ?? true,
      timezone: data.timezone ?? 'Asia/Kolkata',
      primaryColor: data.primaryColor,
      logoUrl: data.logoUrl,
      reportFooter: data.reportFooter,
    },
  });

  await logAuditEvent({
    action: 'INSTITUTION_SETTINGS_UPDATED',
    entityType: 'InstitutionSetting',
    entityId: setting.id,
    details: data,
  });

  return setting;
}

export async function getAuditTrail(options?: { entityType?: string; limit?: number }) {
  return getAuditLogs(options);
}
