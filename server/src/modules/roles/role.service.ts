import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { InstitutionRole } from '@prisma/client';
import { logAuditEvent } from '../audit/audit.service';

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

export async function listAllRoles() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // 1. Get system roles with their permissions
  const systemRolePerms = await prisma.rolePermission.findMany({
    include: { permission: true },
  });

  const systemRolesMap: Record<string, any> = {};
  for (const role of Object.values(InstitutionRole)) {
    const perms = systemRolePerms
      .filter((rp) => rp.institutionRole === role)
      .map((rp) => ({
        id: rp.permission.id,
        resource: rp.permission.resource,
        action: rp.permission.action,
        scope: rp.permission.scope,
        description: rp.permission.description,
      }));

    const memberCount = await prisma.institutionMembership.count({
      where: { institutionId, role, isActive: true },
    });

    systemRolesMap[role] = {
      id: `SYSTEM_${role}`,
      name: role.replace(/_/g, ' '),
      code: role,
      isSystem: true,
      isActive: true,
      memberCount,
      permissions: perms,
    };
  }

  // 2. Get custom roles for this institution
  const customRoles = await prisma.customRole.findMany({
    where: {
      OR: [{ institutionId }, { institutionId: null }],
    },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { memberships: { where: { institutionId, isActive: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedCustomRoles = customRoles.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    description: r.description,
    isSystem: r.isSystem,
    isActive: r.isActive,
    memberCount: r._count.memberships,
    permissions: r.rolePermissions.map((rp) => ({
      id: rp.permission.id,
      resource: rp.permission.resource,
      action: rp.permission.action,
      scope: rp.permission.scope,
      description: rp.permission.description,
    })),
  }));

  return {
    systemRoles: Object.values(systemRolesMap),
    customRoles: formattedCustomRoles,
  };
}

export async function getRoleDetails(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (id.startsWith('SYSTEM_')) {
    const roleCode = id.replace('SYSTEM_', '') as InstitutionRole;
    const perms = await prisma.rolePermission.findMany({
      where: { institutionRole: roleCode },
      include: { permission: true },
    });
    const memberCount = await prisma.institutionMembership.count({
      where: { institutionId, role: roleCode, isActive: true },
    });

    return {
      id,
      name: roleCode.replace(/_/g, ' '),
      code: roleCode,
      isSystem: true,
      isActive: true,
      memberCount,
      permissions: perms.map((p) => p.permission),
    };
  }

  const role = await prisma.customRole.findFirst({
    where: { id, OR: [{ institutionId }, { institutionId: null }] },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { memberships: true } },
    },
  });

  if (!role) {
    throw new AppError('Role not found', 404);
  }

  return {
    id: role.id,
    name: role.name,
    code: role.code,
    description: role.description,
    isSystem: role.isSystem,
    isActive: role.isActive,
    memberCount: role._count.memberships,
    permissions: role.rolePermissions.map((rp) => rp.permission),
  };
}

export async function createCustomRole(input: CreateRoleInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // Verify unique code for this institution
  const existing = await prisma.customRole.findFirst({
    where: { institutionId, code: input.code.toUpperCase() },
  });
  if (existing) {
    throw new AppError('A role with this code already exists in this institution.', 400);
  }

  // Validate permission IDs
  if (input.permissionIds.length > 0) {
    const validPermCount = await prisma.permission.count({
      where: { id: { in: input.permissionIds } },
    });
    if (validPermCount !== input.permissionIds.length) {
      throw new AppError('One or more invalid permission IDs provided.', 400);
    }
  }

  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.customRole.create({
      data: {
        institutionId,
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        isSystem: false,
        isActive: true,
      },
    });

    if (input.permissionIds.length > 0) {
      await tx.customRolePermission.createMany({
        data: input.permissionIds.map((pId) => ({
          customRoleId: created.id,
          permissionId: pId,
        })),
      });
    }

    return created;
  });

  await logAuditEvent({
    action: 'CUSTOM_ROLE_CREATED',
    entityType: 'CustomRole',
    entityId: role.id,
    details: { name: role.name, code: role.code, permissionCount: input.permissionIds.length },
  });

  return getRoleDetails(role.id);
}

export async function updateCustomRole(id: string, input: UpdateRoleInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const role = await prisma.customRole.findFirst({
    where: { id, institutionId },
  });
  if (!role) {
    throw new AppError('Custom role not found or not editable', 404);
  }
  if (role.isSystem) {
    throw new AppError('System-defined roles cannot be modified directly.', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.customRole.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    if (input.permissionIds) {
      // Overwrite permissions
      await tx.customRolePermission.deleteMany({ where: { customRoleId: id } });
      if (input.permissionIds.length > 0) {
        await tx.customRolePermission.createMany({
          data: input.permissionIds.map((pId) => ({
            customRoleId: id,
            permissionId: pId,
          })),
        });
      }
    }
  });

  await logAuditEvent({
    action: 'CUSTOM_ROLE_UPDATED',
    entityType: 'CustomRole',
    entityId: id,
    details: input,
  });

  return getRoleDetails(id);
}

export async function duplicateCustomRole(id: string, newName: string, newCode: string) {
  const source = await getRoleDetails(id);
  const permissionIds = source.permissions.map((p: any) => p.id);

  return createCustomRole({
    name: newName,
    code: newCode,
    description: `Duplicated from ${source.name}`,
    permissionIds,
  });
}

export async function toggleCustomRoleActive(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const role = await prisma.customRole.findFirst({
    where: { id, institutionId },
  });
  if (!role) throw new AppError('Role not found', 404);
  if (role.isSystem) throw new AppError('Cannot toggle system roles', 403);

  const updated = await prisma.customRole.update({
    where: { id },
    data: { isActive: !role.isActive },
  });

  await logAuditEvent({
    action: 'CUSTOM_ROLE_STATUS_TOGGLED',
    entityType: 'CustomRole',
    entityId: id,
    details: { isActive: updated.isActive },
  });

  return updated;
}

export async function listAllPermissions() {
  const permissions = await prisma.permission.findMany({
    orderBy: [{ resource: 'asc' }, { action: 'asc' }, { scope: 'asc' }],
  });

  // Group by resource
  const grouped: Record<string, any[]> = {};
  for (const p of permissions) {
    if (!grouped[p.resource]) grouped[p.resource] = [];
    grouped[p.resource].push(p);
  }

  return {
    total: permissions.length,
    permissions,
    grouped,
  };
}
