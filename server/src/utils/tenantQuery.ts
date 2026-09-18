import { requireInstitutionContext, getInstitutionContext } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

/**
 * Ensures the target query filter always includes the active institutionId
 * from the verified AsyncLocalStorage institution context.
 */
export function withTenantContext<T extends Record<string, any>>(filter: T = {} as T): T & { institutionId: string } {
  const ctx = requireInstitutionContext();
  return {
    ...filter,
    institutionId: ctx.institutionId,
  };
}

/**
 * Enforces both institution boundary and academic coordinates (department / class)
 * based on the calling user's scoped institution role.
 */
export function withAcademicScope<T extends Record<string, any>>(filter: T = {} as T): T & {
  institutionId: string;
  deptId?: string;
  classId?: string;
} {
  const ctx = requireInstitutionContext();
  const scopedFilter: any = {
    ...filter,
    institutionId: ctx.institutionId,
  };

  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    scopedFilter.deptId = ctx.deptId;
  }

  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId) {
    scopedFilter.classId = ctx.classId;
  }

  return scopedFilter;
}

/**
 * Verifies that a target entity belongs to the active institution and the user's role scope.
 * Throws 404 if not found or outside tenant, or 403 if outside academic scope.
 */
export function assertEntityScope(entity: { institutionId?: string; deptId?: string | null; classId?: string | null } | null | undefined, entityName = 'Record') {
  const ctx = requireInstitutionContext();

  if (!entity || entity.institutionId !== ctx.institutionId) {
    throw new AppError(`${entityName} not found in active institution`, 404);
  }

  if (ctx.institutionRole === 'HOD' && ctx.deptId && entity.deptId && entity.deptId !== ctx.deptId) {
    throw new AppError(`Forbidden. HOD can only access ${entityName.toLowerCase()}s within their department`, 403);
  }

  if (ctx.institutionRole === 'CLASS_TEACHER' && ctx.classId && entity.classId && entity.classId !== ctx.classId) {
    throw new AppError(`Forbidden. Class teacher can only access ${entityName.toLowerCase()}s within their assigned class`, 403);
  }

  return entity;
}
