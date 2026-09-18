import { Request, Response, NextFunction } from 'express';
import * as settingsService from './settings.service';

export async function getSettings(_req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getInstitutionSettings();
    return res.status(200).json({
      status: 'success',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      attendanceThreshold,
      workingDaysPerWeek,
      periodsPerDay,
      passingMarksPercent,
      gradingScaleConfig,
      academicAlertEmail,
      enableParentPortal,
    } = req.body;

    const settings = await settingsService.updateInstitutionSettings({
      attendanceThreshold: attendanceThreshold !== undefined ? Number(attendanceThreshold) : undefined,
      workingDaysPerWeek: workingDaysPerWeek !== undefined ? Number(workingDaysPerWeek) : undefined,
      periodsPerDay: periodsPerDay !== undefined ? Number(periodsPerDay) : undefined,
      passingMarksPercent: passingMarksPercent !== undefined ? Number(passingMarksPercent) : undefined,
      gradingScaleConfig,
      academicAlertEmail,
      enableParentPortal: enableParentPortal !== undefined ? Boolean(enableParentPortal) : undefined,
    });

    return res.status(200).json({
      status: 'success',
      data: { settings },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditTrail(req: Request, res: Response, next: NextFunction) {
  try {
    const entityType = req.query.entityType as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const auditLogs = await settingsService.getAuditTrail({ entityType, limit });
    return res.status(200).json({
      status: 'success',
      data: { auditLogs },
    });
  } catch (err) {
    next(err);
  }
}
