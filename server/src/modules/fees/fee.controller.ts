import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as feeService from './fee.service';

export async function createStructure(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      name: z.string().min(2),
      academicYear: z.string().min(4),
      programId: z.string().uuid().optional(),
      deptId: z.string().uuid().optional(),
      standard: z.number().int().min(1).max(12).optional(),
      categories: z.array(
        z.object({
          name: z.string().min(1),
          amount: z.number().min(0),
        })
      ).min(1),
    });
    const validated = schema.parse(req.body);
    const structure = await feeService.createFeeStructure(validated);
    return res.status(201).json({ status: 'success', data: { structure } });
  } catch (err) {
    next(err);
  }
}

export async function listStructures(req: Request, res: Response, next: NextFunction) {
  try {
    const academicYear = req.query.academicYear as string | undefined;
    const structures = await feeService.listFeeStructures(academicYear);
    return res.status(200).json({ status: 'success', data: { structures } });
  } catch (err) {
    next(err);
  }
}

export async function assignFee(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      studentId: z.string().uuid(),
      feeStructureId: z.string().uuid(),
      discountAmount: z.number().min(0).optional(),
      scholarshipAmount: z.number().min(0).optional(),
      dueDate: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const assignment = await feeService.assignFeeToStudent(validated);
    return res.status(201).json({ status: 'success', data: { assignment } });
  } catch (err) {
    next(err);
  }
}

export async function bulkAssign(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      feeStructureId: z.string().uuid(),
      deptId: z.string().uuid().optional(),
      semester: z.number().int().min(1).max(8).optional(),
      classId: z.string().uuid().optional(),
      dueDate: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const result = await feeService.bulkAssignFee(validated);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function recordPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      assignmentId: z.string().uuid(),
      amountPaid: z.number().min(1),
      paymentMethod: z.string().optional(),
      transactionRef: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const payment = await feeService.recordFeePayment(validated);
    return res.status(201).json({ status: 'success', data: { payment } });
  } catch (err) {
    next(err);
  }
}

export async function getStudentLedger(req: Request, res: Response, next: NextFunction) {
  try {
    const ledger = await feeService.getStudentFeeLedger(req.params.studentId);
    return res.status(200).json({ status: 'success', data: ledger });
  } catch (err) {
    next(err);
  }
}

export async function getSummary(_req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await feeService.getInstitutionFeeSummary();
    return res.status(200).json({ status: 'success', data: summary });
  } catch (err) {
    next(err);
  }
}
