import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { getAIProvider } from '../providers/aiProvider.factory';
import { AppError } from '../../../middleware/errorHandler';

export interface CareerAnalysisRequest {
  studentId: string;
  targetRole?: string;
  resumeText?: string;
}

export class CareerIntelligenceService {
  /**
   * Evaluate career readiness score, skill gaps, and interview prep roadmap.
   */
  public static async analyzeCareerReadiness(req: CareerAnalysisRequest, ctx: TenantContext) {
    if (!ctx.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    const student = await prisma.student.findFirst({
      where: { id: req.studentId, institutionId: ctx.institutionId },
      include: {
        department: true,
        marks: { where: { institutionId: ctx.institutionId } },
      },
    });

    if (!student) {
      throw new AppError('Student not found', 404);
    }

    // 1. Calculate Academic Foundation Metric (0-40 pts)
    const passedMarks = student.marks.filter((m: any) => m.isPassed);
    const avgMark = passedMarks.length > 0
      ? passedMarks.reduce((sum: number, m: any) => sum + m.marksObtained, 0) / passedMarks.length
      : 70;
    const academicScore = Math.round((avgMark / 100) * 40);

    // 2. Resume & Skills Analysis via AI Provider (0-60 pts)
    const provider = getAIProvider();
    const targetRole = req.targetRole || 'Full-Stack Software Engineer';

    const prompt = `Perform a career readiness assessment for student:
Target Role: ${targetRole}
Department: ${student.department?.name || 'Computer Science & Engineering'}
Average Academic Score: ${avgMark}%
Resume / Skill Highlights:
${req.resumeText || 'Core Java, Python, Relational Databases, Data Structures, Web Development'}

Output strictly as a JSON object with:
- score: number (between 50 and 95)
- strengths: string[]
- skillGaps: string[]
- recommendedRoadmap: string[]
- interviewPrepTips: string[]`;

    const completion = await provider.generateCompletion(prompt, {
      responseFormat: 'json',
      temperature: 0.2,
    });

    let analysis: any;
    try {
      analysis = JSON.parse(completion.content);
    } catch {
      analysis = {
        score: academicScore + 40,
        strengths: ['Solid foundation in core algorithms & relational databases', 'High academic attendance'],
        skillGaps: ['Production Docker deployment & Cloud architecture', 'System design interview practice'],
        recommendedRoadmap: [
          'Week 1-2: Master Docker containerization and CI/CD pipelines',
          'Week 3-4: Build a portfolio microservices project',
          'Week 5-6: LeetCode medium problem sets and mock behavioral interviews',
        ],
        interviewPrepTips: [
          'Practice explaining database ACID properties and indexing strategies',
          'Prepare STAR-format answers for team project experiences',
        ],
      };
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      targetRole,
      careerReadinessScore: Math.min(100, Math.max(0, analysis.score || 80)),
      strengths: analysis.strengths || [],
      skillGaps: analysis.skillGaps || [],
      recommendedRoadmap: analysis.recommendedRoadmap || [],
      interviewPrepTips: analysis.interviewPrepTips || [],
      evidence: {
        academicScoreFraction: academicScore,
        averageMark: avgMark,
        passedSubjects: passedMarks.length,
        totalSubjects: student.marks.length,
      },
      disclaimer: 'Advisory estimation only. Not an official placement guarantee.',
    };
  }
}
