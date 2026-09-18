import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { SystemRole, InstitutionRole } from '@prisma/client';
import { getInstitutionContext, hasPermission } from '../config/prisma';

// ─────────────────────────────────────────────────────────────────────────────
// JWT PAYLOAD — identity only, no permissions cached in token
// ─────────────────────────────────────────────────────────────────────────────
export interface UserPayload {
  id: string;
  email: string;
  fullName: string;
  systemRole: SystemRole;
  // Active session context (selected by client after login)
  organizationId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      selectedInstitutionId?: string;
      selectedOrganizationId?: string;
    }
  }
}

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'omniedu_dev_access_secret_2026_v2';

// ─────────────────────────────────────────────────────────────────────────────
// authenticate — verifies Bearer JWT and attaches user payload to req
// ─────────────────────────────────────────────────────────────────────────────
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. Missing or invalid Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as UserPayload;
    req.user = decoded;
    // Institution selection comes from header — validated against membership in tenantContext
    req.selectedInstitutionId = req.headers['x-institution-id'] as string | undefined;
    req.selectedOrganizationId = decoded.organizationId;
    next();
  } catch {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired access token.',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// requirePermission — checks if the resolved context has a specific permission
// MUST be used AFTER authenticate + tenantContext middlewares
// ─────────────────────────────────────────────────────────────────────────────
export function requirePermission(resource: string, action: string, scope?: string) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const { hasPermission } = require('../config/prisma');
    if (!hasPermission(resource, action, scope)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. You do not have permission: ${resource}:${action}${scope ? ':' + scope : ''}`,
      });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireSystemRole — used only for platform/org-level admin routes
// ─────────────────────────────────────────────────────────────────────────────
export function requireSystemRole(...roles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthenticated.' });
    }
    if (req.user.systemRole === SystemRole.PLATFORM_ADMIN) return next();
    if (!roles.includes(req.user.systemRole)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. Required system role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireInstitutionRole — checks if active institution context role matches
// ─────────────────────────────────────────────────────────────────────────────
export function requireInstitutionRole(...roles: (InstitutionRole | string)[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const ctx = getInstitutionContext();
    if (!ctx) {
      return res.status(401).json({ status: 'error', message: 'Institution context missing.' });
    }
    if (ctx.systemRole === SystemRole.ORG_ADMIN || ctx.systemRole === SystemRole.PLATFORM_ADMIN) {
      return next();
    }
    if (!roles.includes(ctx.institutionRole)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. Required role: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRoleOrPermission — allows access if caller has one of the specified system roles OR the specific permission
// ─────────────────────────────────────────────────────────────────────────────
export function requireRoleOrPermission(
  roles: (InstitutionRole | string)[],
  permission?: { resource: string; action: string; scope?: string }
) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const ctx = getInstitutionContext();
    if (!ctx) {
      return res.status(401).json({ status: 'error', message: 'Institution context missing.' });
    }
    if (ctx.systemRole === SystemRole.ORG_ADMIN || ctx.systemRole === SystemRole.PLATFORM_ADMIN) {
      return next();
    }
    if (roles.includes(ctx.institutionRole)) {
      return next();
    }
    if (permission) {
      if (hasPermission(permission.resource, permission.action, permission.scope)) {
        return next();
      }
    }
    return res.status(403).json({
      status: 'error',
      message: `Forbidden. Insufficient permissions. Required role: ${roles.join(' or ')}${
        permission ? ` or permission ${permission.resource}:${permission.action}` : ''
      }.`,
    });
  };
}

export const requireRoles = requireInstitutionRole;
