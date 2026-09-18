import { Request, Response, NextFunction } from 'express';
import * as importService from './import.service';

export async function preview(req: Request, res: Response, next: NextFunction) {
  try {
    const { entityType, csvContent, fileName, fileSize } = req.body;
    if (!entityType || !csvContent) {
      return res.status(400).json({
        status: 'fail',
        message: 'entityType and csvContent are required.',
      });
    }
    const result = await importService.previewImport({
      entityType,
      csvContent,
      fileName,
      fileSize,
    });
    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'Failed to process CSV import preview.',
    });
  }
}

export async function commit(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;
    const job = await importService.commitImport(jobId);
    return res.status(200).json({
      status: 'success',
      data: { job },
    });
  } catch (err: any) {
    return res.status(400).json({
      status: 'fail',
      message: err.message || 'Failed to commit CSV import.',
    });
  }
}

export async function history(req: Request, res: Response, next: NextFunction) {
  try {
    const entityType = req.query.entityType as string | undefined;
    const jobs = await importService.listImportHistory(entityType);
    return res.status(200).json({
      status: 'success',
      data: { jobs },
    });
  } catch (err) {
    next(err);
  }
}

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId } = req.params;
    const job = await importService.getImportJob(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'fail',
        message: 'Import job not found.',
      });
    }
    return res.status(200).json({
      status: 'success',
      data: { job },
    });
  } catch (err) {
    next(err);
  }
}
