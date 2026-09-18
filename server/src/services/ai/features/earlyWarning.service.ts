import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { RiskEngineService, StudentRiskEvaluation } from './riskEngine.service';

export interface EarlyWarningRadarData {
  institutionId: string;
  totalEvaluated: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  urgentCases: StudentRiskEvaluation[];
  departmentBreakdown: Array<{
    departmentName: string;
    highRiskCount: number;
    mediumRiskCount: number;
    averageRiskScore: number;
  }>;
}

export class EarlyWarningService {
  /**
   * Scan active institution students and compile the Early Warning Radar.
   */
  public static async getEarlyWarningRadar(ctx: TenantContext): Promise<EarlyWarningRadarData> {
    if (!ctx.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    const { institutionId, deptId } = ctx;

    // Fetch students
    const students = await prisma.student.findMany({
      where: {
        institutionId,
        ...(deptId ? { deptId } : {}),
      },
      select: { id: true },
      take: 60,
    });

    const evaluations: StudentRiskEvaluation[] = [];
    for (const s of students) {
      const evalResult = await RiskEngineService.evaluateStudentRisk(s.id, ctx);
      evaluations.push(evalResult);
    }

    const highRisk = evaluations.filter((e) => e.riskLevel === 'HIGH');
    const mediumRisk = evaluations.filter((e) => e.riskLevel === 'MEDIUM');
    const lowRisk = evaluations.filter((e) => e.riskLevel === 'LOW');

    // Aggregate by department
    const deptMap = new Map<string, { high: number; med: number; totalScore: number; count: number }>();
    for (const e of evaluations) {
      const deptName = e.departmentName || 'General';
      const existing = deptMap.get(deptName) || { high: 0, med: 0, totalScore: 0, count: 0 };
      if (e.riskLevel === 'HIGH') existing.high++;
      if (e.riskLevel === 'MEDIUM') existing.med++;
      existing.totalScore += e.riskScore;
      existing.count++;
      deptMap.set(deptName, existing);
    }

    const departmentBreakdown = Array.from(deptMap.entries()).map(([deptName, stats]) => ({
      departmentName: deptName,
      highRiskCount: stats.high,
      mediumRiskCount: stats.med,
      averageRiskScore: Math.round(stats.totalScore / stats.count),
    }));

    // Sort urgent cases by highest risk score
    evaluations.sort((a, b) => b.riskScore - a.riskScore);

    return {
      institutionId,
      totalEvaluated: evaluations.length,
      highRiskCount: highRisk.length,
      mediumRiskCount: mediumRisk.length,
      lowRiskCount: lowRisk.length,
      urgentCases: evaluations.slice(0, 10),
      departmentBreakdown,
    };
  }
}
