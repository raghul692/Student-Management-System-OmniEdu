import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';
import { InstitutionRole, SystemRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '../audit/audit.service';

export interface StaffListQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  deptId?: string;
  classId?: string;
  isActive?: boolean;
}

const STAFF_ROLES: InstitutionRole[] = [
  InstitutionRole.INSTITUTION_ADMIN,
  InstitutionRole.HOD,
  InstitutionRole.FACULTY,
  InstitutionRole.CLASS_TEACHER,
  InstitutionRole.CLASS_ADVISOR,
];

export async function listStaff(query: StaffListQuery) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // Block student or parent from accessing staff directory
  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT') {
    throw new AppError('Forbidden. Students and parents cannot access staff management.', 403);
  }

  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const where: any = {
    institutionId,
    role: { in: STAFF_ROLES },
  };

  if (query.isActive !== undefined) {
    where.isActive = query.isActive;
  }

  // HOD scope narrowing: HOD can only view staff in their assigned department
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    where.deptId = ctx.deptId;
  } else if (query.deptId) {
    where.deptId = query.deptId;
  }

  if (query.classId) {
    where.classId = query.classId;
  }

  if (query.role && Object.values(InstitutionRole).includes(query.role as InstitutionRole)) {
    // If HOD, ensure they don't bypass their role scope
    if (ctx.institutionRole === 'HOD' && query.role === 'INSTITUTION_ADMIN') {
      where.role = InstitutionRole.FACULTY; // fallback/filter
    } else {
      where.role = query.role as InstitutionRole;
    }
  }

  if (query.search) {
    where.user = {
      OR: [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ],
    };
  }

  const [total, memberships] = await Promise.all([
    prisma.institutionMembership.count({ where }),
    prisma.institutionMembership.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            avatarUrl: true,
            isActive: true,
            systemRole: true,
            createdAt: true,
          },
        },
        department: {
          select: { id: true, name: true, code: true },
        },
        schoolClass: {
          select: { id: true, standard: true, section: true },
        },
      },
      orderBy: [{ role: 'asc' }, { user: { fullName: 'asc' } }],
    }),
  ]);

  // Format staff data with assignments
  const staff = memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    fullName: m.user.fullName,
    email: m.user.email,
    phone: m.user.phone,
    role: m.role,
    department: m.department,
    schoolClass: m.schoolClass,
    isActive: m.isActive && m.user.isActive,
    joinedDate: m.createdAt,
  }));

  return {
    staff,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getStaffById(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT' || ctx.institutionRole === 'PARENT') {
    throw new AppError('Forbidden. Students and parents cannot access staff management.', 403);
  }

  const membership = await prisma.institutionMembership.findFirst({
    where: {
      id,
      institutionId,
      role: { in: STAFF_ROLES },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          avatarUrl: true,
          isActive: true,
          systemRole: true,
          createdAt: true,
        },
      },
      department: true,
      schoolClass: true,
      institution: {
        select: { id: true, name: true, code: true, type: true },
      },
    },
  });

  if (!membership) throw new AppError('Staff member not found in this institution', 404);

  // If HOD, verify department scope
  if (ctx.institutionRole === 'HOD' && ctx.deptId && membership.deptId !== ctx.deptId) {
    throw new AppError('Forbidden. HOD can only view staff within their department.', 403);
  }

  // Fetch assigned courses / timetable entries for this staff member
  const timetableSlots = await prisma.timetableEntry.findMany({
    where: {
      institutionId,
      OR: [
        { facultyName: { contains: membership.user.fullName, mode: 'insensitive' } },
        ...(membership.deptId ? [{ deptId: membership.deptId }] : []),
        ...(membership.classId ? [{ classId: membership.classId }] : []),
      ],
    },
    include: {
      course: { select: { id: true, courseCode: true, title: true, credits: true } },
      schoolClass: { select: { id: true, standard: true, section: true } },
    },
    take: 20,
  });

  return {
    id: membership.id,
    userId: membership.userId,
    fullName: membership.user.fullName,
    email: membership.user.email,
    phone: membership.user.phone,
    role: membership.role,
    department: membership.department,
    schoolClass: membership.schoolClass,
    institution: membership.institution,
    isActive: membership.isActive && membership.user.isActive,
    assignments: timetableSlots,
    createdAt: membership.createdAt,
  };
}

export interface CreateStaffInput {
  email: string;
  fullName: string;
  phone?: string;
  role: InstitutionRole;
  deptId?: string;
  classId?: string;
  defaultPassword?: string;
}

export async function createStaff(input: CreateStaffInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // Authorization check: Only INSTITUTION_ADMIN, ORG_ADMIN, or HOD (for faculty) can create staff
  const isOrgAdmin = ctx.systemRole === SystemRole.ORG_ADMIN || ctx.systemRole === SystemRole.PLATFORM_ADMIN;
  const isInstAdmin = ctx.institutionRole === InstitutionRole.INSTITUTION_ADMIN;
  const isHod = ctx.institutionRole === InstitutionRole.HOD;

  if (!isOrgAdmin && !isInstAdmin && !isHod) {
    throw new AppError('Forbidden. Insufficient permissions to add staff members.', 403);
  }

  // Privilege escalation check: Cannot assign ORG_ADMIN or INSTITUTION_ADMIN if HOD
  if (isHod) {
    if (input.role !== InstitutionRole.FACULTY && input.role !== InstitutionRole.CLASS_ADVISOR) {
      throw new AppError('Forbidden. HOD can only invite Faculty or Class Advisors.', 403);
    }
    input.deptId = ctx.deptId || input.deptId;
  }

  // Validate department or class exists if provided
  if (input.deptId) {
    const dept = await prisma.department.findFirst({
      where: { id: input.deptId, institutionId },
    });
    if (!dept) throw new AppError('Department not found in this institution', 404);
  }

  if (input.classId) {
    const sClass = await prisma.schoolClass.findFirst({
      where: { id: input.classId, institutionId },
    });
    if (!sClass) throw new AppError('School class not found in this institution', 404);
  }

  const rawPassword = input.defaultPassword || 'Apollo@2026';
  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // Atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Find or create user
    let user = await tx.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          fullName: input.fullName,
          phone: input.phone,
          passwordHash,
          systemRole: SystemRole.ORG_MEMBER,
        },
      });

      // Bind to organization if known
      await tx.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: ctx.organizationId,
          role: SystemRole.ORG_MEMBER,
        },
      });
    }

    // 2. Check if already has membership in this institution
    const existingMembership = await tx.institutionMembership.findFirst({
      where: { userId: user.id, institutionId },
    });

    if (existingMembership) {
      throw new AppError('User is already a member of this institution', 409);
    }

    // 3. Create institution membership
    const membership = await tx.institutionMembership.create({
      data: {
        userId: user.id,
        institutionId,
        role: input.role,
        deptId: input.deptId,
        classId: input.classId,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, email: true, fullName: true, phone: true },
        },
        department: true,
        schoolClass: true,
      },
    });

    return {
      id: membership.id,
      userId: membership.userId,
      fullName: membership.user.fullName,
      email: membership.user.email,
      phone: membership.user.phone,
      role: membership.role,
      department: membership.department,
      schoolClass: membership.schoolClass,
      isActive: membership.isActive,
      createdAt: membership.createdAt,
    };
  });

  return result;
}

export interface UpdateStaffInput {
  fullName?: string;
  phone?: string | null;
  role?: InstitutionRole;
  deptId?: string | null;
  classId?: string | null;
}

export async function updateStaff(id: string, input: UpdateStaffInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const isOrgAdmin = ctx.systemRole === SystemRole.ORG_ADMIN || ctx.systemRole === SystemRole.PLATFORM_ADMIN;
  const isInstAdmin = ctx.institutionRole === InstitutionRole.INSTITUTION_ADMIN;
  const isHod = ctx.institutionRole === InstitutionRole.HOD;

  if (!isOrgAdmin && !isInstAdmin && !isHod) {
    throw new AppError('Forbidden. Insufficient permissions to update staff members.', 403);
  }

  const membership = await prisma.institutionMembership.findFirst({
    where: { id, institutionId },
  });

  if (!membership) throw new AppError('Staff membership not found', 404);

  if (isHod && membership.deptId !== ctx.deptId) {
    throw new AppError('Forbidden. HOD can only update staff within their department.', 403);
  }

  // Update membership and user info atomically
  const updated = await prisma.$transaction(async (tx) => {
    if (input.fullName || input.phone) {
      await tx.user.update({
        where: { id: membership.userId },
        data: {
          ...(input.fullName ? { fullName: input.fullName } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
        },
      });
    }

    const membershipUpdate: any = {};
    if (input.role && !isHod) membershipUpdate.role = input.role;
    if (input.deptId !== undefined) membershipUpdate.deptId = input.deptId;
    if (input.classId !== undefined) membershipUpdate.classId = input.classId;

    return tx.institutionMembership.update({
      where: { id },
      data: membershipUpdate,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true } },
        department: true,
        schoolClass: true,
      },
    });
  });

  return updated;
}

export async function toggleStaffActive(id: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const isOrgAdmin = ctx.systemRole === SystemRole.ORG_ADMIN || ctx.systemRole === SystemRole.PLATFORM_ADMIN;
  const isInstAdmin = ctx.institutionRole === InstitutionRole.INSTITUTION_ADMIN;

  if (!isOrgAdmin && !isInstAdmin) {
    throw new AppError('Forbidden. Only institution or organization admins can deactivate staff.', 403);
  }

  const membership = await prisma.institutionMembership.findFirst({
    where: { id, institutionId },
  });

  if (!membership) throw new AppError('Staff membership not found', 404);

  const updated = await prisma.institutionMembership.update({
    where: { id },
    data: { isActive: !membership.isActive },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
    },
  });

  return updated;
}

export async function updateStaffStatus(id: string, staffStatus: any, reason?: string) {
  const ctx = requireInstitutionContext();
  const membership = await prisma.institutionMembership.findFirst({
    where: { id, institutionId: ctx.institutionId },
  });
  if (!membership) throw new AppError('Staff member not found', 404);

  const updated = await prisma.institutionMembership.update({
    where: { id },
    data: {
      staffStatus,
      isActive: staffStatus === 'ACTIVE' || staffStatus === 'ON_LEAVE',
    },
  });

  await logAuditEvent({
    action: 'STAFF_STATUS_CHANGED',
    entityType: 'InstitutionMembership',
    entityId: id,
    details: { oldStatus: membership.staffStatus, newStatus: staffStatus, reason },
  });

  return updated;
}

export async function recordStaffLeave(
  membershipId: string,
  data: { leaveType: string; startDate: string; endDate: string; reason?: string }
) {
  const ctx = requireInstitutionContext();
  const membership = await prisma.institutionMembership.findFirst({
    where: { id: membershipId, institutionId: ctx.institutionId },
  });
  if (!membership) throw new AppError('Staff member not found', 404);

  const leave = await prisma.staffLeaveRecord.create({
    data: {
      membershipId,
      leaveType: data.leaveType,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      reason: data.reason,
      status: 'PENDING',
      approvedBy: null,
    },
  });

  await logAuditEvent({
    action: 'STAFF_LEAVE_RECORDED',
    entityType: 'StaffLeaveRecord',
    entityId: leave.id,
    details: { membershipId, leaveType: data.leaveType, startDate: data.startDate, endDate: data.endDate },
  });

  return leave;
}

export async function reviewStaffLeave(
  leaveId: string,
  status: 'APPROVED' | 'REJECTED',
  reviewNotes?: string
) {
  const ctx = requireInstitutionContext();

  if (ctx.institutionRole !== 'INSTITUTION_ADMIN' && ctx.institutionRole !== 'HOD') {
    throw new AppError('Forbidden. Only Institution Admin or HOD can review leave requests.', 403);
  }

  const leave = await prisma.staffLeaveRecord.findUnique({
    where: { id: leaveId },
    include: {
      membership: {
        select: {
          institutionId: true,
          deptId: true,
          userId: true,
        },
      },
    },
  });

  if (!leave || leave.membership.institutionId !== ctx.institutionId) {
    throw new AppError('Staff leave record not found in this institution', 404);
  }

  // HOD scope check
  if (ctx.institutionRole === 'HOD' && ctx.deptId && leave.membership.deptId !== ctx.deptId) {
    throw new AppError('Forbidden. HOD can only review leave requests for their department staff.', 403);
  }

  const updated = await prisma.staffLeaveRecord.update({
    where: { id: leaveId },
    data: {
      status,
      approvedBy: ctx.userId,
    },
  });

  await logAuditEvent({
    action: `STAFF_LEAVE_${status}`,
    entityType: 'StaffLeaveRecord',
    entityId: leaveId,
    details: { membershipId: leave.membershipId, status, reviewNotes },
  });

  return updated;
}

export async function getStaffLeaves(membershipId: string) {
  const ctx = requireInstitutionContext();
  const membership = await prisma.institutionMembership.findFirst({
    where: { id: membershipId, institutionId: ctx.institutionId },
  });
  if (!membership) throw new AppError('Staff member not found', 404);

  return prisma.staffLeaveRecord.findMany({
    where: { membershipId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getFacultyWorkload() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const staffMembers = await prisma.institutionMembership.findMany({
    where: {
      institutionId,
      role: { in: [InstitutionRole.FACULTY, InstitutionRole.HOD, InstitutionRole.CLASS_TEACHER, InstitutionRole.CLASS_ADVISOR] },
      isActive: true,
    },
    include: {
      user: { select: { id: true, fullName: true, email: true } },
      department: true,
      schoolClass: true,
      leaves: { where: { status: 'APPROVED' } },
    },
  });

  const timetableEntries = await prisma.timetableEntry.findMany({
    where: { institutionId },
  });

  const courseOfferings = await prisma.courseOffering.findMany({
    where: { institutionId },
    include: { _count: { select: { enrollments: true } }, course: true },
  });

  return staffMembers.map((staff) => {
    // Count weekly slots assigned
    const assignedSlots = timetableEntries.filter(
      (t) => t.facultyName && t.facultyName.toLowerCase().includes(staff.user.fullName.toLowerCase())
    );
    const weeklyPeriods = assignedSlots.length;
    const maxHours = staff.weeklyMaxHours || 20;
    const workloadPercentage = Math.min(100, Math.round((weeklyPeriods / maxHours) * 100));

    // Offerings
    const offerings = courseOfferings.filter((o) => o.facultyUserId === staff.userId);
    const totalEnrolledStudents = offerings.reduce((acc, o) => acc + o._count.enrollments, 0);

    return {
      id: staff.id,
      userId: staff.userId,
      fullName: staff.user.fullName,
      email: staff.user.email,
      role: staff.role,
      department: staff.department?.name || 'N/A',
      schoolClass: staff.schoolClass ? `${staff.schoolClass.standard}-${staff.schoolClass.section}` : undefined,
      staffStatus: staff.staffStatus,
      weeklyPeriods,
      maxHours,
      workloadPercentage,
      totalEnrolledStudents,
      offeringCount: offerings.length,
      leavesCount: staff.leaves.length,
    };
  });
}
