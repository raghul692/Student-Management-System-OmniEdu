import { Request, Response, NextFunction } from 'express';
import { InterventionStatus } from '@prisma/client';
import * as interventionService from '../../services/interventions/intervention.service';

export async function createIntervention(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId, title, description, riskLevel, riskPredictionId, assignedToUserId } = req.body;
    if (!studentId || !title || !description) {
      return res.status(400).json({ status: 'fail', message: 'studentId, title, and description are required.' });
    }
    const intervention = await interventionService.createIntervention({
      studentId, title, description, riskLevel, riskPredictionId, assignedToUserId,
      createdByUserId: req.user!.id,
      authorName: req.user!.email || 'Staff',
    });
    return res.status(201).json({ status: 'success', data: { intervention } });
  } catch (err) { next(err); }
}

export async function listInterventions(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, studentId, assignedToUserId, riskLevel, page, limit } = req.query;
    const result = await interventionService.listInterventions({
      status: status as InterventionStatus,
      studentId: studentId as string,
      assignedToUserId: assignedToUserId as string,
      riskLevel: riskLevel as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
    });
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
}

export async function getIntervention(req: Request, res: Response, next: NextFunction) {
  try {
    const intervention = await interventionService.getIntervention(req.params.id);
    return res.status(200).json({ status: 'success', data: { intervention } });
  } catch (err) { next(err); }
}

export async function advanceStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { newStatus, outcome, assignedToUserId } = req.body;
    if (!newStatus) return res.status(400).json({ status: 'fail', message: 'newStatus is required.' });
    const updated = await interventionService.advanceStatus({
      id: req.params.id,
      newStatus: newStatus as InterventionStatus,
      outcome,
      assignedToUserId,
      userId: req.user!.id,
    });
    return res.status(200).json({ status: 'success', data: { intervention: updated } });
  } catch (err) { next(err); }
}

export async function addNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ status: 'fail', message: 'content is required.' });
    const note = await interventionService.addNote({
      interventionId: req.params.id,
      content,
      authorUserId: req.user!.id,
      authorName: req.user!.email || 'Staff',
    });
    return res.status(201).json({ status: 'success', data: { note } });
  } catch (err) { next(err); }
}

export async function listNotes(req: Request, res: Response, next: NextFunction) {
  try {
    const notes = await interventionService.listNotes(req.params.id);
    return res.status(200).json({ status: 'success', data: { notes } });
  } catch (err) { next(err); }
}
