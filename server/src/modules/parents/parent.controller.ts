import { Request, Response, NextFunction } from 'express';
import * as parentService from './parent.service';

export async function getMyChildren(req: Request, res: Response, next: NextFunction) {
  try {
    const parentUserId = req.user!.id;
    const children = await parentService.getParentChildren(parentUserId);
    return res.status(200).json({
      status: 'success',
      data: { children },
    });
  } catch (err) {
    next(err);
  }
}

export async function getChildSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const parentUserId = req.user!.id;
    const { studentId } = req.params;
    const summary = await parentService.getChildAcademicSummary(parentUserId, studentId);
    return res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
}

export async function linkChild(req: Request, res: Response, next: NextFunction) {
  try {
    const { parentUserId, studentId, relationship, isPrimary } = req.body;
    if (!parentUserId || !studentId) {
      return res.status(400).json({
        status: 'fail',
        message: 'parentUserId and studentId are required.',
      });
    }
    const link = await parentService.linkParentToStudent({
      parentUserId,
      studentId,
      relationship,
      isPrimary,
    });
    return res.status(201).json({
      status: 'success',
      data: { link },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Phase H: Extended Parent Portal ──────────────────────────────────────────

export async function getChildAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await parentService.getChildAttendance(req.user!.id, req.params.studentId);
    return res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getChildMarks(req: Request, res: Response, next: NextFunction) {
  try {
    const marks = await parentService.getChildMarks(req.user!.id, req.params.studentId);
    return res.status(200).json({ status: 'success', data: { marks } });
  } catch (err) { next(err); }
}

export async function getChildFees(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await parentService.getChildFees(req.user!.id, req.params.studentId);
    return res.status(200).json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getChildAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const submissions = await parentService.getChildAssignments(req.user!.id, req.params.studentId);
    return res.status(200).json({ status: 'success', data: { submissions } });
  } catch (err) { next(err); }
}

export async function getChildNotices(req: Request, res: Response, next: NextFunction) {
  try {
    const notices = await parentService.getChildNotices(req.user!.id, req.params.studentId);
    return res.status(200).json({ status: 'success', data: { notices } });
  } catch (err) { next(err); }
}
