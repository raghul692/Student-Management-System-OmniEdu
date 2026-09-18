import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { AIToolDefinition } from '../providers/aiProvider.interface';

export const AI_ERP_TOOLS: AIToolDefinition[] = [
  {
    name: 'getStudents',
    description: 'Retrieve students filtered by department, academic year, or risk status.',
    parameters: {
      type: 'object',
      properties: {
        deptId: { type: 'string', description: 'Department ID' },
        limit: { type: 'number', description: 'Max number of students to return (default 20)' },
      },
    },
  },
  {
    name: 'getAttendance',
    description: 'Retrieve attendance statistics, overall percentages, and defaulters below threshold.',
    parameters: {
      type: 'object',
      properties: {
        belowThreshold: { type: 'number', description: 'Attendance percentage threshold (e.g. 75)' },
        deptId: { type: 'string', description: 'Department ID filter' },
      },
    },
  },
  {
    name: 'getMarks',
    description: 'Retrieve academic performance, exam grades, and arrears across courses.',
    parameters: {
      type: 'object',
      properties: {
        examId: { type: 'string', description: 'Specific Exam ID' },
        courseId: { type: 'string', description: 'Course ID' },
      },
    },
  },
  {
    name: 'getFees',
    description: 'Retrieve fee summary, collection statistics, and overdue payment records.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Payment status filter: PENDING | OVERDUE | PAID' },
      },
    },
  },
  {
    name: 'getAssignments',
    description: 'Retrieve recent assignments, submissions, and pending evaluation lists.',
    parameters: {
      type: 'object',
      properties: {
        courseId: { type: 'string', description: 'Course ID' },
      },
    },
  },
  {
    name: 'getExams',
    description: 'Retrieve upcoming, ongoing, and completed examination sessions.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getAnalytics',
    description: 'Retrieve institution or department level high-level KPIs and risk metrics.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'getStaffWorkload',
    description: 'Retrieve faculty teaching load and timetable assignments.',
    parameters: {
      type: 'object',
      properties: {
        deptId: { type: 'string', description: 'Department ID' },
      },
    },
  },
];

export class AIToolRegistry {
  private static TOOL_ALLOWED_ROLES: Record<string, string[]> = {
    getStudents: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR'],
    getAttendance: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR', 'STUDENT'],
    getMarks: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR', 'STUDENT'],
    getFees: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'STUDENT', 'PARENT'],
    getAssignments: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR', 'STUDENT'],
    getExams: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD', 'FACULTY', 'CLASS_TEACHER', 'CLASS_ADVISOR', 'STUDENT'],
    getAnalytics: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD'],
    getStaffWorkload: ['PLATFORM_ADMIN', 'ORG_ADMIN', 'INSTITUTION_ADMIN', 'HOD'],
  };

  public static async executeTool(
    toolName: string,
    args: Record<string, any> = {},
    ctx: TenantContext
  ): Promise<any> {
    if (!ctx.institutionId) {
      throw new AppError('Tenant isolation error: No active institution context', 400);
    }

    const allowed = this.TOOL_ALLOWED_ROLES[toolName];
    if (!allowed) {
      throw new AppError(`Unknown ERP tool: ${toolName}`, 400);
    }

    const { institutionId, institutionRole: role, userId, deptId: departmentId } = ctx;

    // Server-side authorization check per tool
    if (ctx.systemRole !== 'PLATFORM_ADMIN' && ctx.systemRole !== 'ORG_ADMIN') {
      if (!allowed.includes(role)) {
        throw new AppError(`Forbidden: Your role (${role}) is not authorized to execute tool ${toolName}`, 403);
      }
    }

    switch (toolName) {
      case 'getStudents': {
        // Scope by department if HOD/Faculty
        const scopedDeptId = departmentId || args.deptId;
        const limit = Math.max(1, Math.min(Number(args.limit) || 20, 50));
        const students = await prisma.student.findMany({
          where: {
            institutionId,
            ...(scopedDeptId ? { deptId: scopedDeptId } : {}),
            ...(role === 'STUDENT' ? { userId } : {}),
          },
          take: limit,
          select: {
            id: true,
            fullName: true,
            regNumber: true,
            rollNumber: true,
            department: { select: { name: true, code: true } },
            semester: true,
          },
        });
        const formatted = students.map((s) => ({
          id: s.id,
          fullName: s.fullName,
          rollOrRegNo: s.regNumber || s.rollNumber || '',
          department: s.department,
          semester: s.semester,
        }));
        return { total: formatted.length, students: formatted };
      }

      case 'getAttendance': {
        const rawThreshold = Number(args.belowThreshold);
        const threshold = isNaN(rawThreshold) || rawThreshold <= 0 ? 75 : Math.min(rawThreshold, 100);
        // Fetch students and attendance percentage
        const students = await prisma.student.findMany({
          where: {
            institutionId,
            ...(departmentId ? { deptId: departmentId } : {}),
            ...(role === 'STUDENT' ? { userId } : {}),
          },
          include: {
            attendances: {
              where: { institutionId },
              select: { status: true },
            },
          },
          take: 50,
        });

        const defaulters: any[] = [];
        for (const s of students) {
          const total = s.attendances.length;
          if (total === 0) continue;
          const present = s.attendances.filter((a: any) => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
          const pct = Math.round((present / total) * 100);
          if (pct < threshold) {
            defaulters.push({
              studentId: s.id,
              name: s.fullName,
              rollNo: s.regNumber || s.rollNumber || '',
              attendancePercentage: pct,
              sessionsRecorded: total,
            });
          }
        }

        return {
          threshold,
          defaultersCount: defaulters.length,
          defaulters,
        };
      }

      case 'getMarks': {
        const marks = await prisma.markRecord.findMany({
          where: {
            institutionId,
            ...(args.examId ? { examId: args.examId } : {}),
            ...(args.courseId ? { courseId: args.courseId } : {}),
            ...(role === 'STUDENT' ? { student: { userId } } : {}),
          },
          take: 30,
          select: {
            id: true,
            examId: true,
            marksObtained: true,
            maxMarks: true,
            grade: true,
            isPassed: true,
            student: { select: { fullName: true, regNumber: true, rollNumber: true } },
            course: { select: { courseCode: true, title: true } },
          },
        });
        const formattedMarks = marks.map((m) => ({
          id: m.id,
          examId: m.examId,
          totalMarks: m.marksObtained,
          maxMarks: m.maxMarks,
          letterGrade: m.grade,
          isArrear: !m.isPassed,
          student: {
            fullName: m.student.fullName,
            rollOrRegNo: m.student.regNumber || m.student.rollNumber || '',
          },
          course: m.course ? { courseCode: m.course.courseCode, title: m.course.title } : null,
        }));
        return { marksCount: formattedMarks.length, marks: formattedMarks };
      }

      case 'getFees': {
        if (role === 'STUDENT' || role === 'PARENT') {
          // Scoped to student
          const student = await prisma.student.findFirst({
            where: {
              institutionId,
              ...(role === 'STUDENT' ? { userId } : {}),
            },
          });
          if (!student) return { pendingFees: 0, assignments: [] };
          const assignments = await prisma.studentFeeAssignment.findMany({
            where: { institutionId, studentId: student.id },
            include: { feeStructure: true },
          });
          return { studentName: student.fullName, assignments };
        }

        // Admin / HOD institutional view
        const count = await prisma.studentFeeAssignment.count({
          where: { institutionId },
        });
        const totalCollected = await prisma.feePayment.aggregate({
          where: { institutionId },
          _sum: { amountPaid: true },
        });

        return {
          totalFeeAssignments: count,
          totalCollected: totalCollected._sum.amountPaid || 0,
        };
      }

      case 'getAssignments': {
        const assignments = await prisma.assignment.findMany({
          where: {
            institutionId,
            ...(args.courseId ? { courseId: args.courseId } : {}),
            ...(departmentId ? { course: { deptId: departmentId } } : {}),
          },
          take: 20,
          select: {
            id: true,
            title: true,
            dueDate: true,
            subjectName: true,
            course: { select: { courseCode: true, title: true } },
          },
        });
        return { totalAssignments: assignments.length, assignments };
      }

      case 'getExams': {
        const exams = await prisma.exam.findMany({
          where: { institutionId },
          take: 15,
          select: {
            id: true,
            title: true,
            type: true,
            academicYear: true,
            startDate: true,
            status: true,
            maxMarks: true,
            passingMarks: true,
          },
        });
        return { totalExams: exams.length, exams };
      }

      case 'getAnalytics': {
        const totalStudents = await prisma.student.count({ where: { institutionId } });
        const totalCourses = await prisma.course.count({ where: { institutionId } });
        const totalExams = await prisma.exam.count({ where: { institutionId } });

        return {
          institutionId,
          totalStudents,
          totalCourses,
          totalExams,
        };
      }

      case 'getStaffWorkload': {
        const faculty = await prisma.institutionMembership.findMany({
          where: {
            institutionId,
            role: { in: ['FACULTY', 'HOD', 'CLASS_TEACHER', 'CLASS_ADVISOR'] },
            ...(departmentId ? { deptId: departmentId } : {}),
          },
          select: {
            id: true,
            role: true,
            user: { select: { fullName: true, email: true } },
            department: { select: { name: true, code: true } },
          },
        });
        return { totalStaff: faculty.length, staff: faculty };
      }

      default:
        throw new AppError(`Unknown ERP tool: ${toolName}`, 400);
    }
  }
}
