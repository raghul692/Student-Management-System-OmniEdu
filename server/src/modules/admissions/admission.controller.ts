import { Request, Response, NextFunction } from 'express';
import * as admissionService from './admission.service';

export async function handleListAdmissions(req: Request, res: Response, next: NextFunction) {
  try {
    const list = await admissionService.listAdmissions(req.query as any);
    res.status(200).json({ status: 'success', data: { admissions: list } });
  } catch (error) {
    next(error);
  }
}

export async function handleGetAdmission(req: Request, res: Response, next: NextFunction) {
  try {
    const admission = await admissionService.getAdmissionDetails(req.params.id);
    res.status(200).json({ status: 'success', data: { admission } });
  } catch (error) {
    next(error);
  }
}

export async function handleSubmitAdmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { applicantName, gender, guardianName, guardianPhone, academicYear } = req.body;
    if (!applicantName || !gender || !guardianName || !guardianPhone || !academicYear) {
      return res.status(400).json({
        status: 'error',
        message: 'applicantName, gender, guardianName, guardianPhone, academicYear are required',
      });
    }
    const admission = await admissionService.submitAdmission(req.body);
    res.status(201).json({ status: 'success', data: { admission } });
  } catch (error) {
    next(error);
  }
}

export async function handleReviewAdmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, reviewNotes, classId, rollOrRegNo } = req.body;
    if (!status) {
      return res.status(400).json({ status: 'error', message: 'Status is required' });
    }
    const result = await admissionService.reviewAdmission(req.params.id, {
      status,
      reviewNotes,
      classId,
      rollOrRegNo,
    });
    res.status(200).json({ status: 'success', data: result });
  } catch (error) {
    next(error);
  }
}
