import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';
import { metricsRegistry } from './metrics';

// Singleton Prisma instance
const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Attach performance telemetry middleware to measure production DB query latencies
prisma.$use(async (params, next) => {
  const start = Date.now();
  try {
    const result = await next(params);
    const duration = Date.now() - start;
    metricsRegistry.recordDbQuery(duration);
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    metricsRegistry.recordDbQuery(duration);
    throw err;
  }
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-TENANT INSTITUTION CONTEXT via AsyncLocalStorage
// Every request stores the resolved org + institution context here,
// derived from the authenticated membership — never from client-provided IDs.
// ─────────────────────────────────────────────────────────────────────────────

export interface InstitutionContext {
  organizationId: string;
  institutionId: string;
  userId: string;
  systemRole: string;
  institutionRole: string;
  resolvedPermissions: string[]; // e.g. ["students:read:institution", ...]
  deptId?: string | null;
  classId?: string | null;
}

export const institutionStorage = new AsyncLocalStorage<InstitutionContext>();

export function getInstitutionContext(): InstitutionContext | undefined {
  return institutionStorage.getStore();
}

export function requireInstitutionContext(): InstitutionContext {
  const ctx = institutionStorage.getStore();
  if (!ctx?.institutionId) {
    throw new Error('Institution context is missing in the active execution scope');
  }
  return ctx;
}

export function getActiveInstitutionId(): string {
  return requireInstitutionContext().institutionId;
}

/** Check if the current context has a given permission */
export function hasPermission(resource: string, action: string, scope?: string): boolean {
  const ctx = institutionStorage.getStore();
  if (!ctx) return false;
  // ORG_ADMIN and PLATFORM_ADMIN have universal access
  if (ctx.systemRole === 'ORG_ADMIN' || ctx.systemRole === 'PLATFORM_ADMIN') return true;
  // INSTITUTION_ADMIN has universal access within their institution
  if (ctx.institutionRole === 'INSTITUTION_ADMIN') return true;

  const key = scope ? `${resource}:${action}:${scope}` : `${resource}:${action}`;
  if (scope) return ctx.resolvedPermissions.includes(key);
  // Without scope: check if any permission matches resource:action
  return ctx.resolvedPermissions.some(
    (p) => p === `${resource}:${action}` || p.startsWith(`${resource}:${action}:`)
  );
}
