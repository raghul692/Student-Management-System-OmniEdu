import { Request, Response, NextFunction } from 'express';
import * as notificationService from './notification.service';
import { NotificationCategory } from '@prisma/client';

export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined;
    const category = req.query.category as NotificationCategory | undefined;

    const notifications = await notificationService.getUserNotifications(userId, { isRead, category });
    return res.status(200).json({
      status: 'success',
      data: { notifications },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);
    return res.status(200).json({
      status: 'success',
      data: { unreadCount: count },
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await notificationService.markAsRead(id, userId);
    return res.status(200).json({
      status: 'success',
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    await notificationService.markAllAsRead(userId);
    return res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
}

export async function getPreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const preferences = await notificationService.getPreferences(userId);
    return res.status(200).json({
      status: 'success',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePreferences(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;
    const preferences = await notificationService.updatePreferences(userId, req.body);
    return res.status(200).json({
      status: 'success',
      data: { preferences },
    });
  } catch (err) {
    next(err);
  }
}
