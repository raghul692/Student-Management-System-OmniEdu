import { prisma, InstitutionContext as TenantContext } from '../../../config/prisma';
import { getAIProvider } from '../providers/aiProvider.factory';
import { AppError } from '../../../middleware/errorHandler';

export interface StudyPlanRequest {
  studentId: string;
  targetExam: string;
  dailyHours: number;
  weakAreas: string[];
}

export class LearningService {
  /**
   * Generate personalized learning topics and revision targets for a student.
   */
  public static async getPersonalizedRecommendations(studentId: string, ctx: TenantContext) {
    if (!ctx.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId, institutionId: ctx.institutionId },
      include: {
        department: true,
        marks: {
          where: { institutionId: ctx.institutionId },
          include: { course: true },
        },
        attendances: { where: { institutionId: ctx.institutionId } },
      },
    });

    if (!student) {
      throw new AppError('Student not found in this institution', 404);
    }

    // Identify weak courses where marks < 60 or marked as failed
    const weakCourses = student.marks
      .filter((m: any) => m.marksObtained < 60 || !m.isPassed)
      .map((m: any) => ({
        code: m.course?.courseCode || 'SUBJ',
        title: m.course?.title || m.subjectName || 'Subject',
        marks: m.marksObtained,
        grade: m.grade,
      }));

    // Fetch syllabus topics or course catalog from DB
    const institutionalCourses = await prisma.course.findMany({
      where: { institutionId: ctx.institutionId },
      take: 5,
      select: { courseCode: true, title: true, credits: true },
    });

    const recommendedTopics = weakCourses.length > 0
      ? weakCourses.map((c: any) => ({
          course: `${c.code} - ${c.title}`,
          topic: `Unit Mastery: Core concepts, solved problem sets, and past examination papers for ${c.title}`,
          urgency: c.marks < 50 ? 'HIGH' : 'MEDIUM',
        }))
      : [
          {
            course: institutionalCourses[0]?.title || 'Advanced Core Computing',
            topic: 'Honors Electives: Distributed Systems & Cloud Microservices',
            urgency: 'LOW',
          },
        ];

    const revisionPlan = {
      weeklyGoal: weakCourses.length > 0 ? 'Clear arrears and improve internal marks to >70%' : 'Maintain CGPA > 8.5 for Dean honor list',
      practiceTasks: [
        'Complete two previous Anna University semester exam question papers',
        'Participate in weekly laboratory coding problem reviews',
        'Review lecture notes on normalized relational design and indexing',
      ],
      suggestedResources: institutionalCourses.map((c: any) => ({
        title: `${c.courseCode} Departmental Course Pack & Lecture Notes`,
        type: 'INSTITUTIONAL_REPOSITORY',
      })),
    };

    return {
      studentId: student.id,
      studentName: student.fullName,
      weakCourses,
      recommendedTopics,
      revisionPlan,
    };
  }

  /**
   * Generate and persist a structured AI study schedule.
   */
  public static async generateStudyPlan(req: StudyPlanRequest, ctx: TenantContext) {
    if (!ctx.institutionId) {
      throw new AppError('Tenant context required', 400);
    }

    const provider = getAIProvider();
    const prompt = `Create a rigorous 7-day academic revision study plan for target exam "${req.targetExam}".
Daily Available Hours: ${req.dailyHours}
Weak Subject Areas: ${req.weakAreas.join(', ')}

Format the output strictly as JSON with daily schedules, revision cycles, and mock exam allocation.`;

    const completion = await provider.generateCompletion(prompt, {
      responseFormat: 'json',
      temperature: 0.2,
    });

    let scheduleData: any;
    try {
      scheduleData = JSON.parse(completion.content);
    } catch {
      scheduleData = {
        overview: `Intensive ${req.dailyHours}-hour daily revision schedule for ${req.targetExam}`,
        dailySchedule: [
          { day: 'Day 1-2', focus: req.weakAreas[0] || 'Core Subject', hours: req.dailyHours, activity: 'Concept review & textbook exercises' },
          { day: 'Day 3-4', focus: req.weakAreas[1] || 'Secondary Subject', hours: req.dailyHours, activity: 'Past exam problem sets' },
          { day: 'Day 5-6', focus: 'Formulas & Lab Programs', hours: req.dailyHours, activity: 'Timed quiz practice' },
          { day: 'Day 7', focus: 'Full Mock Exam', hours: req.dailyHours, activity: 'Simulated 3-hour examination' },
        ],
      };
    }

    // Persist to database
    const studyPlan = await prisma.aiStudyPlan.create({
      data: {
        organizationId: ctx.organizationId,
        institutionId: ctx.institutionId,
        studentId: req.studentId,
        targetExam: req.targetExam,
        dailyHours: req.dailyHours,
        schedule: scheduleData,
        weakAreas: req.weakAreas,
      },
    });

    return studyPlan;
  }
}
