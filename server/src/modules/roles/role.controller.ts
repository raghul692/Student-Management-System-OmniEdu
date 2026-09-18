import { Request, Response, NextFunction } from 'express';
import * as roleService from './role.service';

export async function handleListRoles(_req: Request, res: Response, next: NextFunction) {
  try {
    const roles = await roleService.listAllRoles();
    res.status(200).json({ status: 'success', data: roles });
  } catch (error) {
    next(error);
  }
}

export async function handleGetRole(req: Request, res: Response, next: NextFunction) {
  try {
    const role = await roleService.getRoleDetails(req.params.id);
    res.status(200).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
}

export async function handleCreateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, code, description, permissionIds } = req.body;
    if (!name || !code) {
      return res.status(400).json({ status: 'error', message: 'Name and code are required' });
    }
    const role = await roleService.createCustomRole({
      name,
      code,
      description,
      permissionIds: permissionIds || [],
    });
    res.status(201).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
}

export async function handleUpdateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const role = await roleService.updateCustomRole(req.params.id, req.body);
    res.status(200).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
}

export async function handleDuplicateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { newName, newCode } = req.body;
    if (!newName || !newCode) {
      return res.status(400).json({ status: 'error', message: 'newName and newCode are required' });
    }
    const role = await roleService.duplicateCustomRole(req.params.id, newName, newCode);
    res.status(201).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
}

export async function handleToggleRole(req: Request, res: Response, next: NextFunction) {
  try {
    const role = await roleService.toggleCustomRoleActive(req.params.id);
    res.status(200).json({ status: 'success', data: { role } });
  } catch (error) {
    next(error);
  }
}

export async function handleListPermissions(_req: Request, res: Response, next: NextFunction) {
  try {
    const permissions = await roleService.listAllPermissions();
    res.status(200).json({ status: 'success', data: permissions });
  } catch (error) {
    next(error);
  }
}
