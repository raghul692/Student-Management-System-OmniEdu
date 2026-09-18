import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as timetableService from './timetable.service';

export async function getTimetable(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = {
      deptId: req.query.deptId as string | undefined,
      semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
      classId: req.query.classId as string | undefined,
      dayOfWeek: req.query.dayOfWeek ? parseInt(req.query.dayOfWeek as string, 10) : undefined,
    };
    const entries = await timetableService.getTimetableEntries(filter);
    return res.status(200).json({ status: 'success', data: { entries } });
  } catch (err) {
    next(err);
  }
}

export async function createEntry(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      dayOfWeek: z.number().int().min(1).max(6),
      slotNumber: z.number().int().min(1).max(8),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      deptId: z.string().uuid().optional(),
      semester: z.number().int().min(1).max(8).optional(),
      courseId: z.string().uuid().optional(),
      classId: z.string().uuid().optional(),
      subjectName: z.string().min(1),
      facultyName: z.string().optional(),
      roomNumber: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const entry = await timetableService.createTimetableEntry(validated);
    return res.status(201).json({ status: 'success', data: { entry } });
  } catch (err) {
    next(err);
  }
}

export async function deleteEntry(req: Request, res: Response, next: NextFunction) {
  try {
    await timetableService.deleteTimetableEntry(req.params.id);
    return res.status(200).json({ status: 'success', message: 'Timetable entry deleted successfully' });
  } catch (err) {
    next(err);
  }
}
