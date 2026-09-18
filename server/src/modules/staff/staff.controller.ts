import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as staffService from './staff.service';
import { InstitutionRole } from '@prisma/client';

const createStaffSchema = z.object({
  email: z.string().email('Valid email address is required'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(InstitutionRole, {
    errorMap: () => ({ message: 'A valid staff role is required' }),
  }),
  deptId: z.string().uuid().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
  defaultPassword: z.string().min(6).optional(),
});

const updateStaffSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  role: z.nativeEnum(InstitutionRole).optional(),
  deptId: z.string().uuid().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
});

export async function listStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const query: staffService.StaffListQuery = {
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      search: req.query.search as string | undefined,
      role: req.query.role as string | undefined,
      deptId: req.query.deptId as string | undefined,
      classId: req.query.classId as string | undefined,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
    };

    const result = await staffService.listStaff(query);
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStaffById(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await staffService.getStaffById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { staff },
    });
  } catch (err) {
    next(err);
  }
}

export async function createStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createStaffSchema.parse(req.body);
    const staff = await staffService.createStaff({
      ...validated,
      deptId: validated.deptId || undefined,
      classId: validated.classId || undefined,
      phone: validated.phone || undefined,
    });

    return res.status(201).json({
      status: 'success',
      data: { staff },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = updateStaffSchema.parse(req.body);
    const staff = await staffService.updateStaff(req.params.id, validated);

    return res.status(200).json({
      status: 'success',
      data: { staff },
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleStaffActive(req: Request, res: Response, next: NextFunction) {
  try {
    const staff = await staffService.toggleStaffActive(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: { staff },
    });
  } catch (err) {
    next(err);
  }
}

export async function handleGetWorkload(_req: Request, res: Response, next: NextFunction) {
  try {
    const workload = await staffService.getFacultyWorkload();
    return res.status(200).json({ status: 'success', data: { workload } });
  } catch (err) {
    next(err);
  }
}

export async function handleUpdateStaffStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, reason } = req.body;
    if (!status) return res.status(400).json({ status: 'error', message: 'Status is required' });
    const staff = await staffService.updateStaffStatus(req.params.id, status, reason);
    return res.status(200).json({ status: 'success', data: { staff } });
  } catch (err) {
    next(err);
  }
}

export async function handleRecordStaffLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ status: 'error', message: 'leaveType, startDate, endDate are required' });
    }
    const leave = await staffService.recordStaffLeave(req.params.id, { leaveType, startDate, endDate, reason });
    return res.status(201).json({ status: 'success', data: { leave } });
  } catch (err) {
    next(err);
  }
}

export async function handleGetStaffLeaves(req: Request, res: Response, next: NextFunction) {
  try {
    const leaves = await staffService.getStaffLeaves(req.params.id);
    return res.status(200).json({ status: 'success', data: { leaves } });
  } catch (err) {
    next(err);
  }
}

export async function handleReviewStaffLeave(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, reviewNotes } = req.body;
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      return res.status(400).json({ status: 'error', message: 'Status must be APPROVED or REJECTED' });
    }
    const leave = await staffService.reviewStaffLeave(req.params.id, status, reviewNotes);
    return res.status(200).json({ status: 'success', data: { leave } });
  } catch (err) {
    next(err);
  }
}
