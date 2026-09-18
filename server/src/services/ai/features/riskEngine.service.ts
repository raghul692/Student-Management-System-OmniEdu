import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { AiRiskLevel } from '@prisma/client';
import { AppError } from '../../../middleware/errorHandler';

export interface StudentRiskEvaluation {
  studentId: string;
  studentName: string;
  rollNumber: string;
  departmentName?: string;
  riskScore: number; // 0 - 100
  riskLevel: AiRiskLevel;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  contributingSignals: {
    attendancePercentage: number;
    arrearsCount: number;
    failedExamsCount: number;
    pendingFeeAmount: number;
  };
  factors: string[];
  recommendedAction: string;
  /** Phase H: Per-factor score contribution breakdown for explainability. */
  explainability: {
    attendanceContribution: number;  // Weighted score from attendance signal
    arrearsContribution: number;     // Weighted score from arrears signal
    internalMarksContribution: number; // Weighted score from internal marks
    feeContribution: number;         // Weighted score from fee signal
    totalRawScore: number;
  };
}

export class RiskEngineService {
  /**
   * Evaluate multi-signal predictive risk for a student and record snapshot.
   */
  public static async evaluateStudentRisk(
    studentId: string,
    ctx: TenantContext
  ): Promise<StudentRiskEvaluation> {
    if (!ctx.institutionId) {
      throw new AppError('Tenant isolation error: No active institution context', 400);
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, institutionId: ctx.institutionId },
      include: {
        department: true,
        attendances: { where: { institutionId: ctx.institutionId } },
        marks: { where: { institutionId: ctx.institutionId } },
        feeAssignments: { where: { institutionId: ctx.institutionId } },
      },
    });

    if (!student) {
      throw new AppError('Student not found in this institution', 404);
    }

    // 1. Compute Attendance Signal (Weight: 40%)
    const totalSessions = student.attendances.length;
    let attendanceRate = 100;
    if (totalSessions > 0) {
      const present = student.attendances.filter(
        (a: any) => a.status === 'PRESENT' || a.status === 'ON_DUTY'
      ).length;
      attendanceRate = Math.round((present / totalSessions) * 100);
    }
    let attendanceRisk = 0;
    if (attendanceRate < 65) {
      attendanceRisk = Math.min(100, Math.round((100 - attendanceRate) * 1.5));
    } else if (attendanceRate < 75) {
      attendanceRisk = Math.min(100, Math.round((100 - attendanceRate) * 1.2));
    } else if (attendanceRate < 85) {
      attendanceRisk = Math.max(0, 100 - attendanceRate);
    }

    // 2. Compute Arrears Signal (Weight: 25%)
    const arrearsCount = student.marks.filter((m: any) => !m.isPassed).length;
    const arrearsRisk = Math.min(100, arrearsCount * 25);

    // 3. Compute Internal Marks Signal (Weight: 25%)
    const failedExams = student.marks.filter((m: any) => m.marksObtained < 50).length;
    let internalMarksRisk = 0;
    if (student.marks.length > 0) {
      const totalMarks = student.marks.reduce((acc: number, m: any) => acc + (m.marksObtained || 0), 0);
      const avgMarks = totalMarks / student.marks.length;
      internalMarksRisk = Math.max(0, Math.min(100, Math.round(100 - avgMarks)));
    } else if (failedExams > 0) {
      internalMarksRisk = Math.min(100, failedExams * 30);
    }

    // 4. Compute Financial Fee Signal (Weight: 10%)
    let pendingFee = 0;
    for (const fa of student.feeAssignments) {
      pendingFee += fa.netPayable;
    }
    const feesRisk = Math.min(100, Math.max(0, Math.round((pendingFee / 50000) * 100)));

    // Mathematical Risk Scoring (0.40 * attendance + 0.25 * arrears + 0.25 * internalMarks + 0.10 * fees)
    const rawWeighted =
      0.40 * attendanceRisk +
      0.25 * arrearsRisk +
      0.25 * internalMarksRisk +
      0.10 * feesRisk;
    let score = Math.min(100, Math.max(0, Math.round(rawWeighted)));

    const factors: string[] = [];
    if (attendanceRate < 65) {
      factors.push(`Critically low attendance (${attendanceRate}% is below the 65% condonation threshold).`);
    } else if (attendanceRate < 75) {
      factors.push(`Attendance deficit (${attendanceRate}% is below the mandatory 75% university eligibility cutoff).`);
    } else if (attendanceRate < 85) {
      factors.push(`Marginal attendance (${attendanceRate}%).`);
    }

    if (arrearsCount > 2) {
      factors.push(`Multiple standing backlogs (${arrearsCount} arrears requiring remedial exams).`);
    } else if (arrearsCount > 0) {
      factors.push(`Standing arrears in ${arrearsCount} course(s).`);
    }

    if (failedExams > 0) {
      factors.push(`Internal assessments alert: ${failedExams} exam test(s) scored below passing grade.`);
    }

    if (pendingFee > 50000) {
      factors.push(`Substantial pending tuition dues exceeding ₹50,000.`);
    } else if (pendingFee > 10000) {
      factors.push(`Tuition fee balance pending payment.`);
    }

    factors.push('Advisory Note: Risk scores are predictive guidance indicators intended to assist faculty mentorship, not definitive academic judgments.');

    // Determine Risk Level
    let riskLevel: AiRiskLevel = AiRiskLevel.LOW;
    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    let recommendedAction = 'Continue standard academic progression.';

    if (score >= 60) {
      riskLevel = AiRiskLevel.HIGH;
      trend = 'DECLINING';
      recommendedAction =
        'Schedule mandatory parent-faculty conference, assign faculty mentor, and enroll in remedial tutorial classes.';
    } else if (score >= 30) {
      riskLevel = AiRiskLevel.MEDIUM;
      trend = 'STABLE';
      recommendedAction =
        'Notify student advisor, review attendance logs weekly, and conduct peer tutoring in challenging courses.';
    }

    if (factors.length === 0) {
      factors.push('Student demonstrates steady academic attendance and passing marks.');
    }

    // Persist snapshot to PostgreSQL for audit and historical trajectory tracking
    await prisma.aiRiskPrediction.create({
      data: {
        organizationId: ctx.organizationId,
        institutionId: ctx.institutionId,
        studentId: student.id,
        riskScore: score,
        riskLevel,
        trend,
        contributingSignals: {
          attendancePercentage: attendanceRate,
          arrearsCount,
          failedExamsCount: failedExams,
          pendingFeeAmount: pendingFee,
        },
        factors,
        recommendedAction,
      },
    });

    const weightedAttendance  = Math.round(0.40 * attendanceRisk);
    const weightedArrears     = Math.round(0.25 * arrearsRisk);
    const weightedInternal    = Math.round(0.25 * internalMarksRisk);
    const weightedFee         = Math.round(0.10 * feesRisk);

    return {
      studentId: student.id,
      studentName: student.fullName,
      rollNumber: student.regNumber || student.rollNumber || '',
      departmentName: student.department?.name,
      riskScore: score,
      riskLevel,
      trend,
      contributingSignals: {
        attendancePercentage: attendanceRate,
        arrearsCount,
        failedExamsCount: failedExams,
        pendingFeeAmount: pendingFee,
      },
      factors,
      recommendedAction,
      explainability: {
        attendanceContribution: weightedAttendance,
        arrearsContribution: weightedArrears,
        internalMarksContribution: weightedInternal,
        feeContribution: weightedFee,
        totalRawScore: weightedAttendance + weightedArrears + weightedInternal + weightedFee,
      },
    };
  }
}
