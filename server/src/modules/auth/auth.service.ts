import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { UserPayload } from '../../middleware/authGuard';
import { SystemRole } from '@prisma/client';

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'omniedu_dev_access_secret_2026_v2';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'omniedu_dev_refresh_secret_2026_v2';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateTokens(payload: UserPayload) {
  const nonce = crypto.randomUUID();
  const accessToken = jwt.sign({ ...payload, jti: nonce }, JWT_ACCESS_SECRET, { expiresIn: '1d' });
  const refreshToken = jwt.sign({ ...payload, jti: nonce }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────────────────────────────────────────
// login
// Returns user + org memberships + institution list for the client to select from
// ─────────────────────────────────────────────────────────────────────────────
export async function login(
  email: string,
  password: string,
  metadata?: { userAgent?: string; ipAddress?: string }
) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      orgMemberships: {
        where: { isActive: true },
        include: {
          organization: {
            include: {
              institutions: {
                where: { isActive: true },
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokenPayload: UserPayload = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    systemRole: user.systemRole,
    organizationId: user.orgMemberships[0]?.organizationId,
  };

  const tokens = generateTokens(tokenPayload);

  // Store refresh token record for revocation & rotation
  const tokenHash = hashToken(tokens.refreshToken);
  await prisma.refreshTokenRecord.create({
    data: {
      userId: user.id,
      tokenHash,
      deviceInfo: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      systemRole: user.systemRole,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      organizations: user.orgMemberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        type: m.organization.type,
        role: m.role,
        institutions: m.organization.institutions,
      })),
    },
    ...tokens,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// demoLogin — convenience endpoint that accepts a role key string
// ─────────────────────────────────────────────────────────────────────────────
export async function demoLogin(
  roleKey: string,
  metadata?: { userAgent?: string; ipAddress?: string }
) {
  const demoEmailMap: Record<string, string> = {
    guest:           'demo.guest@apollo.edu',
    trust_admin:     'trust.admin@apollo.edu',
    org_admin:       'trust.admin@apollo.edu',
    principal_eng:   'principal.eng@apollo.edu',
    principal_sch:   'principal.sch@apollo.edu',
    hod_cse:         'hod.cse@apollo.edu',
    faculty_dbms:    'faculty.dbms@apollo.edu',
    teacher_math:    'teacher.math@apollo.edu',
  };

  const email = demoEmailMap[roleKey.toLowerCase()] || roleKey.toLowerCase();
  return login(email, 'Apollo@2026', metadata);
}

// ─────────────────────────────────────────────────────────────────────────────
// refreshSession — Refresh Token Rotation with reuse detection
// ─────────────────────────────────────────────────────────────────────────────
export async function refreshSession(
  oldRefreshToken: string,
  metadata?: { userAgent?: string; ipAddress?: string }
) {
  if (!oldRefreshToken) throw new AppError('Refresh token required', 400);

  let payload: UserPayload;
  try {
    payload = jwt.verify(oldRefreshToken, JWT_REFRESH_SECRET) as UserPayload;
  } catch {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  const tokenHash = hashToken(oldRefreshToken);
  const existingRecord = await prisma.refreshTokenRecord.findUnique({
    where: { tokenHash },
  });

  if (!existingRecord || existingRecord.isRevoked || existingRecord.expiresAt < new Date()) {
    // Possible reuse attack: revoke all active sessions for this user
    if (existingRecord?.isRevoked) {
      await prisma.refreshTokenRecord.updateMany({
        where: { userId: existingRecord.userId },
        data: { isRevoked: true },
      });
    }
    throw new AppError('Invalid or revoked refresh token', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    include: {
      orgMemberships: { where: { isActive: true } },
    },
  });

  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 401);
  }

  // Revoke the old refresh token
  await prisma.refreshTokenRecord.update({
    where: { id: existingRecord.id },
    data: { isRevoked: true },
  });

  // Generate new token pair
  const tokenPayload: UserPayload = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    systemRole: user.systemRole,
    organizationId: user.orgMemberships[0]?.organizationId,
  };

  const newTokens = generateTokens(tokenPayload);
  const newTokenHash = hashToken(newTokens.refreshToken);

  await prisma.refreshTokenRecord.create({
    data: {
      userId: user.id,
      tokenHash: newTokenHash,
      deviceInfo: metadata?.userAgent || existingRecord.deviceInfo,
      ipAddress: metadata?.ipAddress || existingRecord.ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return newTokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// logoutSession — Explicit refresh token revocation
// ─────────────────────────────────────────────────────────────────────────────
export async function logoutSession(refreshToken?: string) {
  if (!refreshToken) return { success: true };
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshTokenRecord.updateMany({
    where: { tokenHash },
    data: { isRevoked: true },
  });
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// revokeAllUserSessions — Revoke all sessions across all devices
// ─────────────────────────────────────────────────────────────────────────────
export async function revokeAllUserSessions(userId: string) {
  await prisma.refreshTokenRecord.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// getInstitutionSession
// Called when user selects an institution from the client org switcher.
// Validates membership and returns the institution scope info.
// ─────────────────────────────────────────────────────────────────────────────
export async function getInstitutionSession(userId: string, institutionId: string) {
  const membership = await prisma.institutionMembership.findFirst({
    where: { userId, institutionId, isActive: true },
    include: {
      institution: {
        include: {
          organization: { select: { id: true, name: true, slug: true, type: true } },
        },
      },
    },
  });

  if (!membership) {
    throw new AppError('You do not have access to this institution', 403);
  }

  // Also check ORG_ADMIN can access any institution in their org
  const orgMembership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId: membership.institution.organizationId, isActive: true },
  });

  const rolePerms = await prisma.rolePermission.findMany({
    where: { institutionRole: membership.role },
    include: { permission: true },
  });

  const resolvedPermissions = rolePerms.map(
    (rp) => `${rp.permission.resource}:${rp.permission.action}:${rp.permission.scope}`
  );

  return {
    institutionId: membership.institutionId,
    institutionRole: membership.role,
    organization: membership.institution.organization,
    institution: {
      id: membership.institution.id,
      name: membership.institution.name,
      code: membership.institution.code,
      type: membership.institution.type,
      affiliatedUniversity: membership.institution.affiliatedUniversity,
      regulationYear: membership.institution.regulationYear,
      board: membership.institution.board,
    },
    permissions: resolvedPermissions,
    deptId: membership.deptId,
    classId: membership.classId,
    orgRole: orgMembership?.role,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// getProfile
// ─────────────────────────────────────────────────────────────────────────────
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      orgMemberships: {
        where: { isActive: true },
        include: {
          organization: {
            include: {
              institutions: {
                where: { isActive: true },
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
        },
      },
      institutionMemberships: {
        where: { isActive: true },
        include: {
          institution: { select: { id: true, name: true, code: true, type: true } },
        },
      },
    },
  });

  if (!user) throw new AppError('User not found', 404);

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    systemRole: user.systemRole,
    organizations: user.orgMemberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      type: m.organization.type,
      orgRole: m.role,
      institutions: m.organization.institutions,
    })),
    institutionMemberships: user.institutionMemberships.map((m) => ({
      institutionId: m.institutionId,
      institutionName: m.institution.name,
      institutionType: m.institution.type,
      role: m.role,
      deptId: m.deptId,
      classId: m.classId,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// registerUser — used by onboarding to create the first admin user
// ─────────────────────────────────────────────────────────────────────────────
export async function registerUser(data: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) throw new AppError('Email already registered', 409);

  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      fullName: data.fullName,
      phone: data.phone,
      systemRole: SystemRole.ORG_MEMBER,
    },
  });
  return user;
}
