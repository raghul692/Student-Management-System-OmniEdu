import crypto from 'crypto';
import { prisma, requireInstitutionContext } from '../../config/prisma';
import { AppError } from '../../middleware/errorHandler';

export interface CreateFeeStructureInput {
  name: string;
  academicYear: string;
  programId?: string;
  deptId?: string;
  standard?: number;
  categories: { name: string; amount: number }[];
}

export async function createFeeStructure(input: CreateFeeStructureInput) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot create fee structures.', 403);
  }

  const structure = await prisma.feeStructure.create({
    data: {
      institutionId,
      name: input.name,
      academicYear: input.academicYear,
      programId: input.programId,
      deptId: input.deptId,
      standard: input.standard,
      categories: {
        create: input.categories.map((c) => ({
          name: c.name,
          amount: c.amount,
        })),
      },
    },
    include: { categories: true },
  });

  await prisma.auditLog.create({
    data: {
      institutionId,
      userId: ctx.userId,
      action: 'FEE_STRUCTURE_CREATED',
      entityType: 'FeeStructure',
      entityId: structure.id,
      details: { name: input.name, academicYear: input.academicYear, totalCategories: input.categories.length },
    },
  });

  return structure;
}

export async function listFeeStructures(academicYear?: string) {
  const ctx = requireInstitutionContext();
  const where: any = { institutionId: ctx.institutionId };
  if (academicYear) where.academicYear = academicYear;

  return prisma.feeStructure.findMany({
    where,
    include: {
      categories: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function assignFeeToStudent(data: {
  studentId: string;
  feeStructureId: string;
  discountAmount?: number;
  scholarshipAmount?: number;
  dueDate?: string;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot assign fees.', 403);
  }

  const structure = await prisma.feeStructure.findFirst({
    where: { id: data.feeStructureId, institutionId },
    include: { categories: true },
  });
  if (!structure) throw new AppError('Fee structure not found', 404);

  const totalAmount = structure.categories.reduce((sum, c) => sum + c.amount, 0);
  const discount = data.discountAmount || 0;
  const scholarship = data.scholarshipAmount || 0;
  const netPayable = Math.max(0, totalAmount - discount - scholarship);

  return prisma.studentFeeAssignment.upsert({
    where: {
      institutionId_studentId_feeStructureId: {
        institutionId,
        studentId: data.studentId,
        feeStructureId: data.feeStructureId,
      },
    },
    update: {
      totalAmount,
      discountAmount: discount,
      scholarshipAmount: scholarship,
      netPayable,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    create: {
      institutionId,
      studentId: data.studentId,
      feeStructureId: data.feeStructureId,
      totalAmount,
      discountAmount: discount,
      scholarshipAmount: scholarship,
      netPayable,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: {
      feeStructure: { include: { categories: true } },
      student: { select: { id: true, fullName: true, regNumber: true, rollNumber: true } },
    },
  });
}

export async function bulkAssignFee(data: {
  feeStructureId: string;
  deptId?: string;
  semester?: number;
  classId?: string;
  dueDate?: string;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot bulk assign fees.', 403);
  }

  const structure = await prisma.feeStructure.findFirst({
    where: { id: data.feeStructureId, institutionId },
    include: { categories: true },
  });
  if (!structure) throw new AppError('Fee structure not found', 404);

  const studentWhere: any = { institutionId, isActive: true };
  if (data.deptId) studentWhere.deptId = data.deptId;
  if (data.semester) studentWhere.semester = data.semester;
  if (data.classId) studentWhere.classId = data.classId;

  const students = await prisma.student.findMany({
    where: studentWhere,
    select: { id: true },
  });

  const totalAmount = structure.categories.reduce((sum, c) => sum + c.amount, 0);

  const assignedCount = await prisma.$transaction(async (tx) => {
    let count = 0;
    for (const student of students) {
      await tx.studentFeeAssignment.upsert({
        where: {
          institutionId_studentId_feeStructureId: {
            institutionId,
            studentId: student.id,
            feeStructureId: data.feeStructureId,
          },
        },
        update: {
          totalAmount,
          netPayable: totalAmount,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
        create: {
          institutionId,
          studentId: student.id,
          feeStructureId: data.feeStructureId,
          totalAmount,
          discountAmount: 0,
          scholarshipAmount: 0,
          netPayable: totalAmount,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        },
      });
      count++;
    }
    return count;
  });

  return { assignedCount, totalStudents: students.length };
}

export async function recordFeePayment(data: {
  assignmentId: string;
  amountPaid: number;
  paymentMethod?: string;
  transactionRef?: string;
}) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  if (ctx.institutionRole === 'STUDENT') {
    throw new AppError('Forbidden. Students cannot record payments directly.', 403);
  }

  const assignment = await prisma.studentFeeAssignment.findFirst({
    where: { id: data.assignmentId, institutionId },
    include: { payments: true, student: true },
  });
  if (!assignment) throw new AppError('Fee assignment not found', 404);

  const currentPaid = assignment.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const remainingDue = assignment.netPayable - currentPaid;

  if (data.amountPaid <= 0) {
    throw new AppError('Payment amount must be greater than zero', 400);
  }
  if (data.amountPaid > remainingDue) {
    throw new AppError(`Amount paid (${data.amountPaid}) exceeds outstanding dues (${remainingDue})`, 400);
  }

  const receiptSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const receiptNumber = `REC-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}-${receiptSuffix}`;

  return prisma.$transaction(async (tx) => {
    const payment = await tx.feePayment.create({
      data: {
        institutionId,
        assignmentId: data.assignmentId,
        studentId: assignment.studentId,
        receiptNumber,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod || 'CASH',
        transactionRef: data.transactionRef,
        recordedBy: ctx.userId,
      },
    });

    await tx.auditLog.create({
      data: {
        institutionId,
        userId: ctx.userId,
        action: 'FEE_PAYMENT_RECORDED',
        entityType: 'FeePayment',
        entityId: payment.id,
        details: {
          receiptNumber,
          amountPaid: data.amountPaid,
          studentId: assignment.studentId,
          assignmentId: data.assignmentId,
        },
      },
    });

    return payment;
  });
}

export async function getStudentFeeLedger(studentId: string) {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  // Student scope validation
  if (ctx.institutionRole === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { userId: ctx.userId, institutionId },
    });
    if (!student || student.id !== studentId) {
      throw new AppError('Forbidden. Students can only view their own fee ledger.', 403);
    }
  }

  // Parent scope validation
  if (ctx.institutionRole === 'PARENT') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { institutionId, parentUserId: ctx.userId, studentId },
    });
    if (!link) {
      throw new AppError('Forbidden. Parents can only view the fee ledger for their linked children.', 403);
    }
  }

  // HOD scope validation
  if (ctx.institutionRole === 'HOD' && ctx.deptId) {
    const studentCheck = await prisma.student.findFirst({
      where: { id: studentId, institutionId, deptId: ctx.deptId },
    });
    if (!studentCheck) {
      throw new AppError('Forbidden. HOD cannot view fee ledger for students outside their department.', 403);
    }
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, institutionId },
    include: {
      department: true,
      schoolClass: true,
      feeAssignments: {
        include: {
          feeStructure: { include: { categories: true } },
          payments: { orderBy: { paidAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!student) throw new AppError('Student not found', 404);

  let totalAssigned = 0;
  let totalDiscount = 0;
  let totalNetPayable = 0;
  let totalPaid = 0;

  const assignments = student.feeAssignments.map((fa) => {
    const paidForThis = fa.payments.reduce((sum, p) => sum + p.amountPaid, 0);
    const balance = fa.netPayable - paidForThis;
    const isOverdue = fa.dueDate ? new Date(fa.dueDate) < new Date() && balance > 0 : false;

    totalAssigned += fa.totalAmount;
    totalDiscount += fa.discountAmount + fa.scholarshipAmount;
    totalNetPayable += fa.netPayable;
    totalPaid += paidForThis;

    return {
      id: fa.id,
      structureName: fa.feeStructure.name,
      academicYear: fa.feeStructure.academicYear,
      categories: fa.feeStructure.categories,
      totalAmount: fa.totalAmount,
      discountAmount: fa.discountAmount,
      scholarshipAmount: fa.scholarshipAmount,
      netPayable: fa.netPayable,
      paidAmount: paidForThis,
      balance,
      dueDate: fa.dueDate,
      isOverdue,
      status: balance === 0 ? 'PAID' : paidForThis > 0 ? 'PARTIAL' : isOverdue ? 'OVERDUE' : 'PENDING',
      payments: fa.payments,
    };
  });

  return {
    student: {
      id: student.id,
      fullName: student.fullName,
      regNumber: student.regNumber,
      rollNumber: student.rollNumber,
      deptOrClass: student.department?.name || `${student.schoolClass?.standard}th - ${student.schoolClass?.section}`,
    },
    summary: {
      totalAssigned,
      totalDiscount,
      totalNetPayable,
      totalPaid,
      totalOutstanding: totalNetPayable - totalPaid,
    },
    assignments,
  };
}

export async function getInstitutionFeeSummary() {
  const ctx = requireInstitutionContext();
  const institutionId = ctx.institutionId;

  const [assignments, payments] = await Promise.all([
    prisma.studentFeeAssignment.findMany({
      where: { institutionId },
      select: { netPayable: true },
    }),
    prisma.feePayment.findMany({
      where: { institutionId },
      select: { amountPaid: true },
    }),
  ]);

  const totalAssigned = assignments.reduce((sum, a) => sum + a.netPayable, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalOutstanding = Math.max(0, totalAssigned - totalCollected);
  const collectionRate = totalAssigned > 0 ? Number(((totalCollected / totalAssigned) * 100).toFixed(1)) : 0;

  return {
    totalAssigned,
    totalCollected,
    totalOutstanding,
    collectionRate,
    totalPaymentsCount: payments.length,
  };
}
