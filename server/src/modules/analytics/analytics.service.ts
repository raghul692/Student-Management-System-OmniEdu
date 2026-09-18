import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export async function getAtRiskStudents() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot access at-risk analytics.', 403);
  }

  const setting = await prisma.institutionSetting.findUnique({
    where: { institutionId },
  });
  const threshold = setting?.attendanceThreshold ? Number(setting.attendanceThreshold) : 75.0;

  const students = await prisma.student.findMany({
    where: { institutionId, isActive: true },
    select: {
      id: true,
      fullName: true,
      regNumber: true,
      rollNumber: true,
      department: { select: { name: true } },
      schoolClass: { select: { standard: true, section: true } },
      attendances: {
        select: { status: true },
      },
      marks: {
        select: { isPassed: true, grade: true },
      },
      feeAssignments: {
        select: {
          dueDate: true,
          netPayable: true,
          payments: { select: { amountPaid: true } },
        },
      },
    },
  });

  const atRiskList = [];

  for (const s of students) {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // 1. Attendance Analysis
    const totalAtt = s.attendances.length;
    const presentAtt = s.attendances.filter((a) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
    const attPercent = totalAtt > 0 ? Number(((presentAtt / totalAtt) * 100).toFixed(1)) : 100;

    if (totalAtt > 0 && attPercent < threshold) {
      if (attPercent < 65) {
        riskScore += 45;
        riskFactors.push(`Critical attendance shortage: ${attPercent}% (<65% Detained Risk)`);
      } else {
        riskScore += 25;
        riskFactors.push(`Low attendance: ${attPercent}% (<${threshold}% Condonation Range)`);
      }
    }

    // 2. Academic / Exam Analysis
    const totalExams = s.marks.length;
    const failedSubjects = s.marks.filter((m) => !m.isPassed || m.grade === 'RA').length;

    if (failedSubjects > 0) {
      riskScore += failedSubjects * 20;
      riskFactors.push(`Arrears / Failed Subjects: ${failedSubjects} out of ${totalExams}`);
    }

    // 3. Fee Default Analysis
    const overdueAssignments = s.feeAssignments.filter((fa) => {
      const paid = fa.payments.reduce((sum, p) => sum + p.amountPaid, 0);
      const isOverdue = fa.dueDate && new Date(fa.dueDate) < new Date();
      return isOverdue && paid < fa.netPayable;
    });

    if (overdueAssignments.length > 0) {
      riskScore += 15;
      const totalDue = overdueAssignments.reduce((sum, fa) => {
        const paid = fa.payments.reduce((pSum, p) => pSum + p.amountPaid, 0);
        return sum + (fa.netPayable - paid);
      }, 0);
      riskFactors.push(`Overdue fee dues: ₹${totalDue}`);
    }

    if (riskScore > 0) {
      const severity: 'HIGH' | 'MEDIUM' | 'LOW' =
        riskScore >= 50 ? 'HIGH' : riskScore >= 25 ? 'MEDIUM' : 'LOW';

      atRiskList.push({
        id: s.id,
        fullName: s.fullName,
        identifier: s.regNumber || s.rollNumber || 'N/A',
        deptOrClass: s.department?.name || `${s.schoolClass?.standard}th-${s.schoolClass?.section}` || 'N/A',
        riskScore: Math.min(100, riskScore),
        severity,
        riskFactors,
        attendancePercentage: attPercent,
        failedSubjectsCount: failedSubjects,
        hasOverdueFees: overdueAssignments.length > 0,
      });
    }
  }

  atRiskList.sort((a, b) => b.riskScore - a.riskScore);

  return {
    totalStudentsEvaluated: students.length,
    atRiskCount: atRiskList.length,
    highRiskCount: atRiskList.filter((s) => s.severity === 'HIGH').length,
    mediumRiskCount: atRiskList.filter((s) => s.severity === 'MEDIUM').length,
    lowRiskCount: atRiskList.filter((s) => s.severity === 'LOW').length,
    students: atRiskList,
  };
}

export async function getExecutiveOverview() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot view executive overview.', 403);
  }

  const [
    totalStudents,
    totalStaff,
    departmentsCount,
    classesCount,
    totalAttRecords,
    attendedRecords,
    totalMarks,
    passedMarks,
    feeAssignedAgg,
    feeCollectedAgg,
    admissionCounts,
    announcementsCount,
  ] = await Promise.all([
    prisma.student.count({ where: { institutionId, isActive: true } }),
    prisma.institutionMembership.count({
      where: {
        institutionId,
        role: { in: ['INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR'] },
        isActive: true,
      },
    }),
    prisma.department.count({ where: { institutionId } }),
    prisma.schoolClass.count({ where: { institutionId } }),
    // Database-level count queries for attendance
    prisma.attendance.count({ where: { institutionId } }),
    prisma.attendance.count({
      where: { institutionId, status: { in: ['PRESENT', 'ON_DUTY'] } },
    }),
    // Database-level count queries for marks
    prisma.markRecord.count({ where: { institutionId } }),
    prisma.markRecord.count({ where: { institutionId, isPassed: true } }),
    // Database-level sum aggregations for financial metrics
    prisma.studentFeeAssignment.aggregate({
      where: { institutionId },
      _sum: { netPayable: true },
    }),
    prisma.feePayment.aggregate({
      where: { institutionId },
      _sum: { amountPaid: true },
    }),
    // Database-level groupBy for admission funnel
    prisma.studentAdmission.groupBy({
      by: ['status'],
      where: { institutionId },
      _count: { _all: true },
    }),
    prisma.announcement.count({ where: { institutionId } }),
  ]);

  // Attendance metrics
  const avgAttendance = totalAttRecords > 0 ? Number(((attendedRecords / totalAttRecords) * 100).toFixed(1)) : 0;

  // Exam pass rate
  const examPassRate = totalMarks > 0 ? Number(((passedMarks / totalMarks) * 100).toFixed(1)) : 0;

  // Fee collection
  const totalFeesAssigned = feeAssignedAgg._sum.netPayable || 0;
  const totalFeesCollected = feeCollectedAgg._sum.amountPaid || 0;
  const feeCollectionRate = totalFeesAssigned > 0 ? Number(((totalFeesCollected / totalFeesAssigned) * 100).toFixed(1)) : 0;

  // Admission funnel map
  const admissionMap: Record<string, number> = {};
  let totalAdmissions = 0;
  for (const ac of admissionCounts) {
    admissionMap[ac.status] = ac._count._all;
    totalAdmissions += ac._count._all;
  }

  const admissionsPipeline = {
    total: totalAdmissions,
    submitted: admissionMap['SUBMITTED'] || 0,
    underReview: admissionMap['UNDER_REVIEW'] || 0,
    approved: admissionMap['APPROVED'] || 0,
    rejected: admissionMap['REJECTED'] || 0,
  };

  return {
    totalStudents,
    totalStaff,
    academicUnitsCount: departmentsCount || classesCount,
    avgAttendance,
    examPassRate,
    feeCollectionRate,
    totalFeesCollected,
    totalFeesOutstanding: Math.max(0, totalFeesAssigned - totalFeesCollected),
    admissionsPipeline,
    announcementsCount,
  };
}

export async function getAttendanceTrends(startDate?: string, endDate?: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot view attendance trends.', 403);
  }

  const whereClause: any = { institutionId };
  if (startDate || endDate) {
    whereClause.date = {};
    if (startDate) whereClause.date.gte = new Date(startDate);
    if (endDate) whereClause.date.lte = new Date(endDate);
  }

  const records = await prisma.attendance.findMany({
    where: whereClause,
    select: { date: true, status: true },
    orderBy: { date: 'asc' },
  });

  const grouped: Record<string, { date: string; total: number; present: number; absent: number }> = {};
  for (const r of records) {
    const dStr = r.date.toISOString().split('T')[0];
    if (!grouped[dStr]) {
      grouped[dStr] = { date: dStr, total: 0, present: 0, absent: 0 };
    }
    grouped[dStr].total++;
    if (r.status === 'PRESENT' || r.status === 'ON_DUTY') {
      grouped[dStr].present++;
    } else {
      grouped[dStr].absent++;
    }
  }

  const timeline = Object.values(grouped).map((g) => ({
    ...g,
    rate: g.total > 0 ? parseFloat(((g.present / g.total) * 100).toFixed(1)) : 0,
  }));

  const totalAll = records.length;
  const presentAll = records.filter((r) => r.status === 'PRESENT' || r.status === 'ON_DUTY').length;
  const overallRate = totalAll > 0 ? parseFloat(((presentAll / totalAll) * 100).toFixed(1)) : 0;

  return {
    overallRate,
    totalRecords: totalAll,
    timeline,
  };
}

export async function getFeeTrends() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden.', 403);
  }

  const payments = await prisma.feePayment.findMany({
    where: { institutionId },
    select: { paidAt: true, amountPaid: true },
    orderBy: { paidAt: 'asc' },
  });

  const monthlyMap: Record<string, number> = {};
  let cumulative = 0;
  for (const p of payments) {
    const monthKey = p.paidAt.toISOString().slice(0, 7);
    monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + p.amountPaid;
    cumulative += p.amountPaid;
  }

  const months = Object.keys(monthlyMap).sort().map((m) => ({
    month: m,
    collected: monthlyMap[m],
  }));

  const assignmentsAgg = await prisma.studentFeeAssignment.aggregate({
    where: { institutionId },
    _sum: { netPayable: true },
  });

  const totalPayable = assignmentsAgg._sum.netPayable || 0;
  const collectionRate = totalPayable > 0 ? parseFloat(((cumulative / totalPayable) * 100).toFixed(1)) : 0;

  return {
    totalAssigned: totalPayable,
    totalCollected: cumulative,
    outstanding: Math.max(0, totalPayable - cumulative),
    collectionRate,
    trends: months,
  };
}

export async function getDepartmentComparison() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden.', 403);
  }

  const departments = await prisma.department.findMany({
    where: { institutionId },
    include: {
      students: {
        where: { isActive: true },
        select: {
          id: true,
          attendances: { select: { status: true } },
          marks: { select: { isPassed: true } },
        },
      },
    },
  });

  const comparison = departments.map((d) => {
    const studentCount = d.students.length;
    let totalAtt = 0;
    let presentAtt = 0;
    let totalMarks = 0;
    let passedMarks = 0;

    for (const s of d.students) {
      for (const a of s.attendances) {
        totalAtt++;
        if (a.status === 'PRESENT' || a.status === 'ON_DUTY') presentAtt++;
      }
      for (const m of s.marks) {
        totalMarks++;
        if (m.isPassed) passedMarks++;
      }
    }

    const avgAttendance = totalAtt > 0 ? parseFloat(((presentAtt / totalAtt) * 100).toFixed(1)) : 0;
    const passRate = totalMarks > 0 ? parseFloat(((passedMarks / totalMarks) * 100).toFixed(1)) : 0;

    return {
      departmentId: d.id,
      name: d.name,
      code: d.code,
      studentCount,
      avgAttendance,
      passRate,
    };
  });

  return { departments: comparison };
}

export async function getCohortAnalysis() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;
  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden.', 403);
  }

  const students = await prisma.student.findMany({
    where: { institutionId },
    select: {
      batchYear: true,
      semester: true,
      status: true,
      isActive: true,
      marks: { select: { isPassed: true } },
    },
  });

  const cohorts: Record<string, { batchYear: string; totalStudents: number; activeStudents: number; totalMarks: number; passedMarks: number }> = {};

  for (const s of students) {
    const batch = s.batchYear || 'Unassigned';
    if (!cohorts[batch]) {
      cohorts[batch] = { batchYear: batch, totalStudents: 0, activeStudents: 0, totalMarks: 0, passedMarks: 0 };
    }
    cohorts[batch].totalStudents++;
    if (s.isActive && s.status === 'ACTIVE') cohorts[batch].activeStudents++;
    for (const m of s.marks) {
      cohorts[batch].totalMarks++;
      if (m.isPassed) cohorts[batch].passedMarks++;
    }
  }

  const result = Object.values(cohorts).map((c) => ({
    batchYear: c.batchYear,
    totalStudents: c.totalStudents,
    activeStudents: c.activeStudents,
    retentionRate: c.totalStudents > 0 ? parseFloat(((c.activeStudents / c.totalStudents) * 100).toFixed(1)) : 0,
    passRate: c.totalMarks > 0 ? parseFloat(((c.passedMarks / c.totalMarks) * 100).toFixed(1)) : 0,
  }));

  return { cohorts: result };
}

export async function getAiUsageAnalytics() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;
  const organizationId = ctx.organizationId;
  if (ctx.institutionRole !== 'INSTITUTION_ADMIN') {
    throw new AppError('Only administrators can access AI usage and cost analytics.', 403);
  }

  const records = await prisma.aiUsageRecord.findMany({
    where: {
      OR: [
        { institutionId },
        { organizationId },
      ],
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  let totalTokens = 0;
  let totalCostUsd = 0;
  let successCount = 0;
  const byFeature: Record<string, { calls: number; tokens: number; costUsd: number }> = {};

  for (const r of records) {
    totalTokens += r.totalTokens;
    totalCostUsd += r.costUsd;
    if (r.success) successCount++;

    if (!byFeature[r.feature]) {
      byFeature[r.feature] = { calls: 0, tokens: 0, costUsd: 0 };
    }
    byFeature[r.feature].calls++;
    byFeature[r.feature].tokens += r.totalTokens;
    byFeature[r.feature].costUsd += r.costUsd;
  }

  return {
    totalCalls: records.length,
    successRate: records.length > 0 ? parseFloat(((successCount / records.length) * 100).toFixed(1)) : 100,
    totalTokens,
    totalCostUsd: parseFloat(totalCostUsd.toFixed(4)),
    byFeature,
    recentActivity: records.slice(0, 20).map((r) => ({
      feature: r.feature,
      model: r.model,
      tokens: r.totalTokens,
      costUsd: r.costUsd,
      latencyMs: r.latencyMs,
      timestamp: r.timestamp,
    })),
  };
}
