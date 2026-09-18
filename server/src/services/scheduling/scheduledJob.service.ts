/**
 * Phase H — Scheduled Job Service
 * Manages configurable recurring automation using the existing queue infrastructure.
 */
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';
import { evaluateAttendancePolicies, evaluateFeePolicies } from '../notifications/notificationPolicy.service';

export const BUILTIN_JOBS = {
  WEEKLY_ATTENDANCE_REPORT: 'weekly_attendance_report',
  MONTHLY_FEE_REPORT: 'monthly_fee_report',
  WEEKLY_RISK_SUMMARY: 'weekly_risk_summary',
  DAILY_ATTENDANCE_POLICY: 'daily_attendance_policy',
  DAILY_FEE_POLICY: 'daily_fee_policy',
} as const;

export type BuiltinJobName = (typeof BUILTIN_JOBS)[keyof typeof BUILTIN_JOBS];

const BUILTIN_JOB_DESCRIPTIONS: Record<string, string> = {
  weekly_attendance_report:  'Generates and sends a weekly attendance summary report.',
  monthly_fee_report:        'Generates monthly fee collection and outstanding analysis.',
  weekly_risk_summary:       'Sends a weekly at-risk student radar summary to HODs.',
  daily_attendance_policy:   'Evaluates attendance thresholds and creates alerts/interventions.',
  daily_fee_policy:          'Evaluates fee overdue status and sends reminder notifications.',
};

const BUILTIN_JOB_SCHEDULES: Record<string, string> = {
  weekly_attendance_report:  '0 8 * * 1',   // Monday 8am
  monthly_fee_report:        '0 9 1 * *',   // 1st of month 9am
  weekly_risk_summary:       '0 7 * * 5',   // Friday 7am
  daily_attendance_policy:   '0 6 * * 1-6', // Mon-Sat 6am
  daily_fee_policy:          '0 7 * * 1-6', // Mon-Sat 7am
};

/** Provision default scheduled jobs for an institution (idempotent). */
export async function provisionDefaultJobs(institutionId: string, organizationId: string, ownerUserId: string): Promise<void> {
  for (const [name, schedule] of Object.entries(BUILTIN_JOB_SCHEDULES)) {
    await prisma.scheduledJob.upsert({
      where: { id: `${institutionId}:${name}` },
      create: {
        id: `${institutionId}:${name}`,
        institutionId,
        organizationId,
        name,
        description: BUILTIN_JOB_DESCRIPTIONS[name],
        schedule,
        ownerUserId,
        isEnabled: false, // Admin must opt-in
      },
      update: {}, // Don't overwrite if already configured
    });
  }
}

export async function listJobs() {
  const ctx = requireInstitutionContext();
  const { institutionId } = ctx;
  if (ctx.institutionRole !== 'INSTITUTION_ADMIN' && ctx.systemRole !== 'PLATFORM_ADMIN') {
    throw new AppError('Only Institution Admins can manage scheduled jobs.', 403);
  }
  return prisma.scheduledJob.findMany({
    where: { institutionId },
    orderBy: { name: 'asc' },
  });
}

export async function toggleJob(jobId: string, isEnabled: boolean): Promise<void> {
  const ctx = requireInstitutionContext();
  const { institutionId } = ctx;
  if (ctx.institutionRole !== 'INSTITUTION_ADMIN' && ctx.systemRole !== 'PLATFORM_ADMIN') {
    throw new AppError('Only Institution Admins can manage scheduled jobs.', 403);
  }
  const job = await prisma.scheduledJob.findFirst({ where: { id: jobId, institutionId } });
  if (!job) throw new AppError('Scheduled job not found.', 404);
  await prisma.scheduledJob.update({ where: { id: jobId }, data: { isEnabled } });
}

/** Execute a built-in job by name (called by a cron or admin trigger). */
export async function executeJob(institutionId: string, organizationId: string, jobName: string): Promise<void> {
  const job = await prisma.scheduledJob.findFirst({ where: { institutionId, name: jobName } });
  if (!job || !job.isEnabled) return;

  const startAt = new Date();
  logger.info({ institutionId, jobName }, 'Executing scheduled job');

  try {
    switch (jobName) {
      case BUILTIN_JOBS.DAILY_ATTENDANCE_POLICY:
        await evaluateAttendancePolicies(institutionId, organizationId);
        break;
      case BUILTIN_JOBS.DAILY_FEE_POLICY:
        await evaluateFeePolicies(institutionId);
        break;
      default:
        logger.info({ jobName }, 'Built-in job not yet implemented — skipping');
    }

    await prisma.scheduledJob.update({
      where: { id: job.id },
      data: {
        lastRunAt: startAt,
        lastRunStatus: 'SUCCESS',
        lastRunError: null,
        runCount: { increment: 1 },
      },
    });
  } catch (err: any) {
    await prisma.scheduledJob.update({
      where: { id: job.id },
      data: { lastRunAt: startAt, lastRunStatus: 'FAILED', lastRunError: err.message },
    });
    logger.error({ institutionId, jobName, err }, 'Scheduled job failed');
  }
}
