import { Request, Response, NextFunction } from 'express';
import * as OrgService from './organization.service';
import { AppError } from '../../middleware/errorHandler';

export async function getMyInstitutionsController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const data = await OrgService.getUserInstitutions(req.user.id);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getOrganizationController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const { id } = req.params;
    const data = await OrgService.getOrganization(req.user.id, id);
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function getInstitutionStatsController(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await OrgService.getInstitutionStats();
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
}

export async function createInstitutionController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const { id: orgId } = req.params;
    const {
      name,
      code,
      type,
      address,
      phone,
      email,
      affiliatedUniversity,
      regulationYear,
      board,
      standardFrom,
      standardTo,
    } = req.body;

    if (!name || !code || !type) {
      throw new AppError('Name, code, and type (COLLEGE or SCHOOL) are required', 400);
    }
    if (type !== 'COLLEGE' && type !== 'SCHOOL') {
      throw new AppError('Type must be COLLEGE or SCHOOL', 400);
    }

    const institution = await OrgService.createInstitutionForOrg(req.user.id, orgId, {
      name,
      code,
      type,
      address,
      phone,
      email,
      affiliatedUniversity,
      regulationYear,
      board,
      standardFrom: standardFrom ? parseInt(standardFrom, 10) : undefined,
      standardTo: standardTo ? parseInt(standardTo, 10) : undefined,
    });

    res.status(201).json({ status: 'success', data: { institution } });
  } catch (err) { next(err); }
}

export async function updateInstitutionController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const { id: orgId, institutionId } = req.params;
    const updated = await OrgService.updateInstitution(req.user.id, orgId, institutionId, req.body);
    res.json({ status: 'success', data: { institution: updated } });
  } catch (err) { next(err); }
}

export async function toggleInstitutionActiveController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const { id: orgId, institutionId } = req.params;
    const toggled = await OrgService.toggleInstitutionActive(req.user.id, orgId, institutionId);
    res.json({ status: 'success', data: { institution: toggled } });
  } catch (err) { next(err); }
}

export async function getOrganizationUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new AppError('Unauthenticated', 401);
    const { id: orgId } = req.params;
    const users = await OrgService.getOrganizationUsers(req.user.id, orgId);
    res.json({ status: 'success', data: { users } });
  } catch (err) { next(err); }
}

