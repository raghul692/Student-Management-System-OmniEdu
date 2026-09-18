import { Request, Response, NextFunction } from 'express';
import * as AuthService from './auth.service';
import { AppError } from '../../middleware/errorHandler';

export async function loginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    if (!email || !password) throw new AppError('Email and password are required', 400);
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const data = await AuthService.login(email, password, metadata);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function demoLoginController(req: Request, res: Response, next: NextFunction) {
  try {
    const { role } = req.body;
    if (!role) throw new AppError('Role key is required', 400);
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const data = await AuthService.demoLogin(role, metadata);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function refreshTokenController(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.body.refreshToken || (req.headers['x-refresh-token'] as string);
    if (!refreshToken) throw new AppError('Refresh token required', 400);
    const metadata = {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
    const data = await AuthService.refreshSession(refreshToken, metadata);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function logoutController(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.body.refreshToken || (req.headers['x-refresh-token'] as string);
    await AuthService.logoutSession(refreshToken);
    res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) { next(err); }
}

export async function revokeSessionsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    await AuthService.revokeAllUserSessions(req.user.id);
    res.json({ status: 'success', message: 'All sessions revoked' });
  } catch (err) { next(err); }
}

export async function selectInstitutionController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const { institutionId } = req.body;
    if (!institutionId) throw new AppError('institutionId is required', 400);
    const session = await AuthService.getInstitutionSession(req.user.id, institutionId);
    res.json({ status: 'success', data: session });
  } catch (err) { next(err); }
}

export async function profileController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const profile = await AuthService.getProfile(req.user.id);
    res.json({ status: 'success', data: profile });
  } catch (err) { next(err); }
}

