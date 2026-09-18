import { Request, Response, NextFunction } from 'express';
import * as webhookService from '../../services/webhooks/webhook.service';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { assertEntitlement } from '../../services/entitlements/entitlement.service';

export async function registerWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    await assertEntitlement(ctx.organizationId, 'WEBHOOK');
    const { url, events, description } = req.body;
    if (!url || !events?.length) {
      return res.status(400).json({ status: 'fail', message: 'url and events[] are required.' });
    }
    const result = await webhookService.registerWebhook({
      institutionId: ctx.institutionId,
      organizationId: ctx.organizationId,
      url, events, description,
      createdByUserId: req.user!.id,
    });
    return res.status(201).json({
      status: 'success',
      data: {
        endpointId: result.endpointId,
        secret: result.secret,
        warning: 'Store this secret securely. It will NOT be shown again.',
      },
    });
  } catch (err) { next(err); }
}

export async function listWebhooks(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { institutionId: ctx.institutionId },
      select: { id: true, url: true, events: true, isActive: true, description: true, failureCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return res.status(200).json({ status: 'success', data: { endpoints } });
  } catch (err) { next(err); }
}

export async function deleteWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, institutionId: ctx.institutionId } });
    if (!ep) throw new AppError('Webhook endpoint not found.', 404);
    await prisma.webhookEndpoint.delete({ where: { id: req.params.id } });
    return res.status(200).json({ status: 'success', message: 'Webhook endpoint deleted.' });
  } catch (err) { next(err); }
}

export async function listDeliveries(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    const ep = await prisma.webhookEndpoint.findFirst({ where: { id: req.params.id, institutionId: ctx.institutionId } });
    if (!ep) throw new AppError('Webhook endpoint not found.', 404);
    const deliveries = await prisma.webhookDelivery.findMany({
      where: { endpointId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, eventType: true, status: true, responseCode: true, attemptCount: true, deliveredAt: true, createdAt: true },
    });
    return res.status(200).json({ status: 'success', data: { deliveries } });
  } catch (err) { next(err); }
}

export async function sendTestEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const ctx = requireInstitutionContext();
    await webhookService.sendTestEvent(req.params.id, ctx.institutionId);
    return res.status(200).json({ status: 'success', message: 'Test event dispatched.' });
  } catch (err) { next(err); }
}
