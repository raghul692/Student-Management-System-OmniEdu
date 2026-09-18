import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as registrationService from './registration.service';
import { RegistrationStatus } from '@prisma/client';

export async function getAvailableCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = req.query.studentId as string | undefined;
    const courses = await registrationService.getAvailableCourses(studentId);
    return res.status(200).json({ status: 'success', data: { courses } });
  } catch (err) {
    next(err);
  }
}

export async function registerCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      studentId: z.string().uuid(),
      courseIds: z.array(z.string().uuid()).min(1),
      academicYear: z.string().min(4),
      semester: z.number().int().min(1).max(8),
    });
    const validated = schema.parse(req.body);
    const result = await registrationService.registerCourses(validated);
    return res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function listRegistrations(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = {
      status: req.query.status as RegistrationStatus | undefined,
      studentId: req.query.studentId as string | undefined,
      deptId: req.query.deptId as string | undefined,
      semester: req.query.semester ? parseInt(req.query.semester as string, 10) : undefined,
    };
    const registrations = await registrationService.listRegistrations(filter);
    return res.status(200).json({ status: 'success', data: { registrations } });
  } catch (err) {
    next(err);
  }
}

export async function reviewRegistration(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      status: z.enum(['APPROVED', 'REJECTED']),
    });
    const validated = schema.parse(req.body);
    const updated = await registrationService.reviewRegistration(req.params.id, validated.status);
    return res.status(200).json({ status: 'success', data: { registration: updated } });
  } catch (err) {
    next(err);
  }
}
