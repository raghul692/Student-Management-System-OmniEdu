import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as announcementService from './announcement.service';
import { AnnouncementScope } from '@prisma/client';

export async function createAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      title: z.string().min(2),
      content: z.string().min(5),
      scope: z.nativeEnum(AnnouncementScope).optional(),
      deptId: z.string().uuid().optional(),
      classId: z.string().uuid().optional(),
      isPinned: z.boolean().optional(),
    });
    const validated = schema.parse(req.body);
    const announcement = await announcementService.createAnnouncement(validated);
    return res.status(201).json({ status: 'success', data: { announcement } });
  } catch (err) {
    next(err);
  }
}

export async function listAnnouncements(req: Request, res: Response, next: NextFunction) {
  try {
    const filter = {
      scope: req.query.scope as AnnouncementScope | undefined,
      deptId: req.query.deptId as string | undefined,
      classId: req.query.classId as string | undefined,
    };
    const announcements = await announcementService.listAnnouncements(filter);
    return res.status(200).json({ status: 'success', data: { announcements } });
  } catch (err) {
    next(err);
  }
}

export async function deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    await announcementService.deleteAnnouncement(req.params.id);
    return res.status(200).json({ status: 'success', message: 'Announcement deleted successfully' });
  } catch (err) {
    next(err);
  }
}
