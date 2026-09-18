import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as marksService from './marks.service';
import { ExamType, ExamStatus } from '@prisma/client';

const createExamSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  type: z.nativeEnum(ExamType),
  academicYear: z.string().min(4, 'Academic year is required (e.g. 2025-2026)'),
  semester: z.number().int().min(1).max(8).optional(),
  standard: z.number().int().min(1).max(12).optional(),
  startDate: z.string().optional(),
});

const batchMarksSchema = z.object({
  entries: z.array(
    z.object({
      studentId: z.string().uuid(),
      courseId: z.string().uuid().optional(),
      subjectName: z.string().min(1),
      internalMarks: z.number().min(0).max(40).optional(),
      externalMarks: z.number().min(0).max(60).optional(),
      marksObtained: z.number().min(0).max(100).optional(),
      maxMarks: z.number().min(1).max(100).optional(),
    })
  ).min(1, 'At least one mark entry is required'),
});

export async function listExams(_req: Request, res: Response, next: NextFunction) {
  try {
    const exams = await marksService.listExams();
    return res.status(200).json({
      status: 'success',
      data: { exams },
    });
  } catch (err) {
    next(err);
  }
}

export async function createExam(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createExamSchema.parse(req.body);
    const exam = await marksService.createExam(validated);
    return res.status(201).json({
      status: 'success',
      data: { exam },
    });
  } catch (err) {
    next(err);
  }
}

export async function batchRecordMarks(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = batchMarksSchema.parse(req.body);
    const result = await marksService.batchRecordMarks(req.params.examId, validated.entries);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getExamResults(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await marksService.getExamResults(req.params.examId);
    return res.status(200).json({
      status: 'success',
      data: results,
    });
  } catch (err) {
    next(err);
  }
}

export async function getStudentTranscript(req: Request, res: Response, next: NextFunction) {
  try {
    const transcript = await marksService.getStudentTranscript(req.params.studentId);
    return res.status(200).json({
      status: 'success',
      data: transcript,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateExamStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      status: z.nativeEnum(ExamStatus),
    });
    const validated = schema.parse(req.body);
    const updated = await marksService.updateExamStatus(req.params.examId, validated.status);
    return res.status(200).json({ status: 'success', data: { exam: updated } });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      courseId: z.string().uuid().optional(),
      subjectName: z.string().min(1),
      examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      roomNumber: z.string().optional(),
      invigilatorName: z.string().optional(),
    });
    const validated = schema.parse(req.body);
    const schedule = await marksService.createExamSchedule(req.params.examId, validated);
    return res.status(201).json({ status: 'success', data: { schedule } });
  } catch (err) {
    next(err);
  }
}

export async function getSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const schedules = await marksService.getExamSchedules(req.params.examId);
    return res.status(200).json({ status: 'success', data: { schedules } });
  } catch (err) {
    next(err);
  }
}

export async function generateHallTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await marksService.generateHallTickets(req.params.examId);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

export async function listHallTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const tickets = await marksService.listHallTickets(req.params.examId);
    return res.status(200).json({ status: 'success', data: { tickets } });
  } catch (err) {
    next(err);
  }
}

export async function getMyHallTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const ticket = await marksService.getMyHallTicket(req.params.examId);
    return res.status(200).json({ status: 'success', data: { ticket } });
  } catch (err) {
    next(err);
  }
}

export async function getReportCard(req: Request, res: Response, next: NextFunction) {
  try {
    const examId = req.query.examId as string | undefined;
    const reportCard = await marksService.getStudentReportCard(req.params.studentId, examId);
    return res.status(200).json({ status: 'success', data: reportCard });
  } catch (err) {
    next(err);
  }
}

export async function verifyHallTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ status: 'error', message: 'Verification token is required' });
    }
    const result = await marksService.verifyPublicHallTicket(token);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
}

