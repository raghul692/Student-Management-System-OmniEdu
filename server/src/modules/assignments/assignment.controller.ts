import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as assignmentService from './assignment.service';

export async function createAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      dueDate: z.string().min(1),
      courseId: z.string().uuid().optional(),
      classId: z.string().uuid().optional(),
      subjectName: z.string().min(1),
    });
    const validated = schema.parse(req.body);
    const assignment = await assignmentService.createAssignment(validated);
    return res.status(201).json({ status: 'success', data: { assignment } });
  } catch (err) {
    next(err);
  }
}

export async function listAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = {
      courseId: req.query.courseId as string | undefined,
      classId: req.query.classId as string | undefined,
    };
    const assignments = await assignmentService.listAssignments(filter);
    return res.status(200).json({ status: 'success', data: { assignments } });
  } catch (err) {
    next(err);
  }
}

export async function getAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const assignment = await assignmentService.getAssignmentDetails(req.params.id);
    return res.status(200).json({ status: 'success', data: { assignment } });
  } catch (err) {
    next(err);
  }
}

export async function submitAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      submissionText: z.string().optional(),
      fileUrl: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const submission = await assignmentService.submitAssignment(req.params.id, validated);
    return res.status(200).json({ status: 'success', data: { submission } });
  } catch (err) {
    next(err);
  }
}

export async function evaluateSubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      grade: z.string().min(1),
      feedback: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const submission = await assignmentService.evaluateSubmission(req.params.id, validated);
    return res.status(200).json({ status: 'success', data: { submission } });
  } catch (err) {
    next(err);
  }
}
