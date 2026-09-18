import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as attendanceService from './attendance.service';
import { AttendanceStatus } from '@prisma/client';
import { cacheService, CacheService } from '../../services/cache/cache.service';

const markAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'),
  hour: z.number().int().min(1).max(8).optional(),
  period: z.number().int().min(1).max(8).optional(),
  courseId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  entries: z.array(
    z.object({
      studentId: z.string().uuid(),
      status: z.nativeEnum(AttendanceStatus),
      remarks: z.string().optional(),
    })
  ).min(1, 'At least one student attendance record is required'),
});

export async function markBatchAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = markAttendanceSchema.parse(req.body);
    const result = await attendanceService.markBatchAttendance(validated);

    // Phase G: Invalidate tenant attendance & defaulters cache
    const instId = req.selectedInstitutionId || 'global';
    await cacheService.invalidatePrefix(CacheService.buildTenantPrefix(instId, 'attendance'));

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getDefaulters(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = {
      deptId: req.query.deptId as string | undefined,
      semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
      classId: req.query.classId as string | undefined,
      cutoff: req.query.cutoff ? parseFloat(req.query.cutoff as string) : 75.0,
    };

    const radar = await attendanceService.getDefaulters(filter);
    return res.status(200).json({
      status: 'success',
      data: radar,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await attendanceService.getAttendanceSummary();
    return res.status(200).json({
      status: 'success',
      data: { summary },
    });
  } catch (err) {
    next(err);
  }
}

export async function requestCorrection(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      attendanceId: z.string().uuid().optional(),
      studentId: z.string().uuid(),
      requestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      currentStatus: z.nativeEnum(AttendanceStatus),
      proposedStatus: z.nativeEnum(AttendanceStatus),
      reason: z.string().min(3),
    });
    const validated = schema.parse(req.body);
    const result = await attendanceService.requestAttendanceCorrection(validated);
    return res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function listCorrections(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as 'PENDING' | 'APPROVED' | 'REJECTED' | undefined;
    const result = await attendanceService.listAttendanceCorrections(status);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function reviewCorrection(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      action: z.enum(['APPROVED', 'REJECTED']),
      reviewNotes: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const result = await attendanceService.reviewAttendanceCorrection(
      req.params.id,
      validated.action,
      validated.reviewNotes
    );
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

