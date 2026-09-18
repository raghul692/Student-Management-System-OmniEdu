import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import * as OnboardingService from './onboarding.service';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

import { z } from 'zod';
import { OrgType, InstitutionType } from '@prisma/client';
import { prisma } from '../../config/prisma';

const institutionSchema = z.object({
  name: z.string().min(2, 'Institution name must be at least 2 characters'),
  code: z.string().min(2, 'Institution code must be at least 2 characters'),
  type: z.nativeEnum(InstitutionType),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  affiliatedUniversity: z.string().optional(),
  regulationYear: z.string().optional(),
  board: z.string().optional(),
  standardFrom: z.number().int().min(1).max(12).optional(),
  standardTo: z.number().int().min(1).max(12).optional(),
});

const onboardingSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgSlug: z.string().min(2, 'Slug must be at least 2 characters'),
  orgType: z.nativeEnum(OrgType),
  institutions: z.array(institutionSchema).min(1, 'At least one institution is required'),
  adminFullName: z.string().min(2, 'Admin full name must be at least 2 characters'),
  adminEmail: z.string().email('Valid admin email is required'),
  adminPassword: z.string().min(6, 'Admin password must be at least 6 characters'),
  adminPhone: z.string().optional(),
});

// Public endpoint — no auth required (creates the first admin user + org)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let payload = req.body;

    // Backward-compatibility transform if client sends nested objects
    if (payload.organization && payload.admin && !payload.orgName) {
      const institutions = [];
      if (payload.college) {
        institutions.push({
          name: payload.college.name,
          code: payload.college.code,
          type: InstitutionType.COLLEGE,
          affiliatedUniversity: payload.college.affiliatedUniversity,
          regulationYear: payload.college.regulationYear,
        });
      }
      if (payload.school) {
        institutions.push({
          name: payload.school.name,
          code: payload.school.code,
          type: InstitutionType.SCHOOL,
          board: payload.school.board,
          standardFrom: payload.school.standardFrom || 1,
          standardTo: payload.school.standardTo || 12,
        });
      }
      payload = {
        orgName: payload.organization.name,
        orgSlug: payload.organization.slug,
        orgType: payload.organization.type,
        institutions,
        adminFullName: payload.admin.fullName,
        adminEmail: payload.admin.email,
        adminPassword: payload.admin.password,
        adminPhone: payload.admin.phone,
      };
    }

    const validated = onboardingSchema.parse(payload);

    const result = await OnboardingService.onboard(validated);
    res.status(201).json({ status: 'success', data: result });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        status: 'fail',
        message: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
        errors: err.errors,
      });
    }
    next(err);
  }
});

// Validate slug availability (called during wizard step 1)
router.get('/check-slug/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await prisma.organization.findUnique({ where: { slug: req.params.slug } });
    res.json({ status: 'success', data: { available: !existing } });
  } catch (err) { next(err); }
});

export default router;
