import { Request, Response, NextFunction } from 'express';
import { institutionStorage, InstitutionContext, prisma, getInstitutionContext } from '../config/prisma';
import { SystemRole, InstitutionRole } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// institutionContext middleware
//
// Runs AFTER authenticate. Resolves the active institution context from:
//   1. x-institution-id request header (client-provided — ALWAYS validated)
//   2. Fallback to user's active InstitutionMembership in the database
//   3. Associated RolePermissions for that membership
//
// IDOR PROTECTION:
// If the client provides x-institution-id and the user is NOT authorized for
// that institution, this middleware REJECTS with 403 Forbidden.
// ─────────────────────────────────────────────────────────────────────────────
export async function institutionContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) return next();

  const requestedInstitutionId = req.selectedInstitutionId;

  // 1. If explicit institution requested
  if (requestedInstitutionId) {
    // PLATFORM_ADMIN bypass
    if (req.user.systemRole === SystemRole.PLATFORM_ADMIN) {
      const targetInst = await prisma.institution.findUnique({
        where: { id: requestedInstitutionId, isActive: true },
      });
      if (!targetInst) {
        return res.status(404).json({ status: 'error', message: 'Requested institution not found.' });
      }
      const ctx: InstitutionContext = {
        organizationId: targetInst.organizationId,
        institutionId: targetInst.id,
        userId: req.user.id,
        systemRole: req.user.systemRole,
        institutionRole: InstitutionRole.INSTITUTION_ADMIN,
        resolvedPermissions: [],
      };
      return institutionStorage.run(ctx, () => next());
    }

    // ORG_ADMIN check
    if (req.user.systemRole === SystemRole.ORG_ADMIN) {
      const orgMembership = await prisma.organizationMembership.findFirst({
        where: { userId: req.user.id, role: SystemRole.ORG_ADMIN, isActive: true },
        include: { organization: { include: { institutions: true } } },
      });

      const targetInst = orgMembership?.organization.institutions.find(
        (i) => i.id === requestedInstitutionId && i.isActive
      );

      if (targetInst && orgMembership) {
        const ctx: InstitutionContext = {
          organizationId: orgMembership.organizationId,
          institutionId: targetInst.id,
          userId: req.user.id,
          systemRole: req.user.systemRole,
          institutionRole: InstitutionRole.INSTITUTION_ADMIN,
          resolvedPermissions: [],
        };
        return institutionStorage.run(ctx, () => next());
      }

      // If org admin requested an institution not in their org -> 403 Forbidden
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You do not have access to the requested institution.',
      });
    }

    // REGULAR USER: validate explicit membership
    const membership = await prisma.institutionMembership.findFirst({
      where: {
        userId: req.user.id,
        institutionId: requestedInstitutionId,
        isActive: true,
      },
      include: {
        institution: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. You do not have access to the requested institution.',
      });
    }

    // Load permissions for this membership (System role + Custom role)
    const rolePerms = await prisma.rolePermission.findMany({
      where: { institutionRole: membership.role },
      include: { permission: true },
    });

    const customPerms = membership.customRoleId
      ? await prisma.customRolePermission.findMany({
          where: { customRoleId: membership.customRoleId },
          include: { permission: true },
        })
      : [];

    const resolvedPermissions = Array.from(
      new Set([
        ...rolePerms.map((rp) => `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`),
        ...customPerms.map((cp) => `${cp.permission.resource}:${cp.permission.action}:${cp.permission.scope}`),
      ])
    );

    const ctx: InstitutionContext = {
      organizationId: membership.institution.organizationId,
      institutionId: membership.institutionId,
      userId: req.user.id,
      systemRole: req.user.systemRole,
      institutionRole: membership.role,
      resolvedPermissions,
      deptId: membership.deptId,
      classId: membership.classId,
    };

    return institutionStorage.run(ctx, () => next());
  }

  // 2. Fallback if no explicit institution header was sent
  // For ORG_ADMIN: pick their org's first active institution
  if (req.user.systemRole === SystemRole.ORG_ADMIN) {
    const orgMembership = await prisma.organizationMembership.findFirst({
      where: { userId: req.user.id, role: SystemRole.ORG_ADMIN, isActive: true },
      include: { organization: { include: { institutions: { where: { isActive: true } } } } },
    });

    const defaultInst = orgMembership?.organization.institutions[0];
    if (defaultInst && orgMembership) {
      const ctx: InstitutionContext = {
        organizationId: orgMembership.organizationId,
        institutionId: defaultInst.id,
        userId: req.user.id,
        systemRole: req.user.systemRole,
        institutionRole: InstitutionRole.INSTITUTION_ADMIN,
        resolvedPermissions: [],
      };
      return institutionStorage.run(ctx, () => next());
    }
  }

  // For REGULAR USER: pick their first active membership
  const defaultMembership = await prisma.institutionMembership.findFirst({
    where: { userId: req.user.id, isActive: true },
    include: { institution: true },
  });

  if (defaultMembership) {
    const rolePerms = await prisma.rolePermission.findMany({
      where: { institutionRole: defaultMembership.role },
      include: { permission: true },
    });

    const customPerms = defaultMembership.customRoleId
      ? await prisma.customRolePermission.findMany({
          where: { customRoleId: defaultMembership.customRoleId },
          include: { permission: true },
        })
      : [];

    const resolvedPermissions = Array.from(
      new Set([
        ...rolePerms.map((rp) => `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`),
        ...customPerms.map((cp) => `${cp.permission.resource}:${cp.permission.action}:${cp.permission.scope}`),
      ])
    );

    const ctx: InstitutionContext = {
      organizationId: defaultMembership.institution.organizationId,
      institutionId: defaultMembership.institutionId,
      userId: req.user.id,
      systemRole: req.user.systemRole,
      institutionRole: defaultMembership.role,
      resolvedPermissions,
      deptId: defaultMembership.deptId,
      classId: defaultMembership.classId,
    };

    return institutionStorage.run(ctx, () => next());
  }

  // No membership found — allow request to proceed (e.g. for /auth/me or onboarding)
  next();
}

export function requireActiveInstitution(req: Request, res: Response, next: NextFunction) {
  const ctx = getInstitutionContext();
  if (!ctx?.institutionId) {
    return res.status(403).json({
      status: 'error',
      message: 'Active institution context required. Please provide a valid x-institution-id header.',
    });
  }
  next();
}

export const tenantContext = institutionContext;
