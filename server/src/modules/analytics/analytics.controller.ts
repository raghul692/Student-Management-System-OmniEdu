import { Request, Response, NextFunction } from 'express';
import * as analyticsService from './analytics.service';

export async function getAtRiskStudents(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getAtRiskStudents();
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getExecutiveOverview(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getExecutiveOverview();
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getAttendanceTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getAttendanceTrends(
      typeof startDate === 'string' ? startDate : undefined,
      typeof endDate === 'string' ? endDate : undefined
    );
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getFeeTrends(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getFeeTrends();
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getDepartmentComparison(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getDepartmentComparison();
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getCohortAnalysis(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getCohortAnalysis();
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}

export async function getAiUsageAnalytics(_req: Request, res: Response, next: NextFunction) {
  try {
    const data = await analyticsService.getAiUsageAnalytics();
    return res.status(200).json({ status: 'success', data });
  } catch (err) {
    next(err);
  }
}
