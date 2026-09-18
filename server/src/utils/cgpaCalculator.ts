/**
 * Anna University Regulations (R2021 / R2024) CGPA & Continuous Assessment Engine
 * 10.0 Grading Scale:
 * - O (Outstanding): 10.0 (91 - 100)
 * - A+ (Excellent): 9.0 (81 - 90)
 * - A (Very Good): 8.0 (71 - 80)
 * - B+ (Good): 7.0 (61 - 70)
 * - B (Average): 6.0 (50 - 60)
 * - C (Satisfactory): 5.0 (Passing grade)
 * - RA (Re-Appearance / Arrear): 0.0 (< 50)
 * - SA (Shortage of Attendance / Detained): 0.0 (< 75% attendance without condonation)
 * - W (Withdrawal): 0.0
 */

export interface CourseMarkInput {
  courseCode: string;
  courseTitle: string;
  credits: number;
  internalMarks?: number | null; // Max 40 CIA
  externalMarks?: number | null; // Max 60 Semester
  totalMarks?: number;           // Max 100
  attendancePercentage?: number;
  attendanceThreshold?: number;
  detentionThreshold?: number;
}

export interface CourseGradeResult {
  courseCode: string;
  courseTitle: string;
  credits: number;
  internalMarks: number;
  externalMarks: number;
  totalMarks: number;
  grade: string;
  gradePoints: number;
  isPassed: boolean;
  isArrear: boolean;
  isDetained: boolean;
}

export interface SemesterGpaResult {
  courses: CourseGradeResult[];
  totalCreditsOffered: number;
  totalCreditsEarned: number;
  gpa: number;
  hasArrears: boolean;
}

export function evaluateCourseGrade(input: CourseMarkInput): CourseGradeResult {
  const internal = Math.min(Math.max(input.internalMarks ?? 0, 0), 40);
  const external = Math.min(Math.max(input.externalMarks ?? 0, 0), 60);
  const total = input.totalMarks ?? (internal + external);

  const detentionLimit = input.detentionThreshold ?? (input.attendanceThreshold ? Math.max(0, input.attendanceThreshold - 10) : 65);
  // Check shortage of attendance
  if (input.attendancePercentage !== undefined && input.attendancePercentage < detentionLimit) {
    return {
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      credits: input.credits,
      internalMarks: internal,
      externalMarks: external,
      totalMarks: total,
      grade: 'SA',
      gradePoints: 0.0,
      isPassed: false,
      isArrear: true,
      isDetained: true,
    };
  }

  // Minimum passing requirement: at least 45% in external (27/60) and 50% overall
  if (total < 50 || external < 27) {
    return {
      courseCode: input.courseCode,
      courseTitle: input.courseTitle,
      credits: input.credits,
      internalMarks: internal,
      externalMarks: external,
      totalMarks: total,
      grade: 'RA',
      gradePoints: 0.0,
      isPassed: false,
      isArrear: true,
      isDetained: false,
    };
  }

  let grade = 'B';
  let gradePoints = 6.0;

  if (total >= 91) {
    grade = 'O';
    gradePoints = 10.0;
  } else if (total >= 81) {
    grade = 'A+';
    gradePoints = 9.0;
  } else if (total >= 71) {
    grade = 'A';
    gradePoints = 8.0;
  } else if (total >= 61) {
    grade = 'B+';
    gradePoints = 7.0;
  } else {
    grade = 'B';
    gradePoints = 6.0;
  }

  return {
    courseCode: input.courseCode,
    courseTitle: input.courseTitle,
    credits: input.credits,
    internalMarks: internal,
    externalMarks: external,
    totalMarks: total,
    grade,
    gradePoints,
    isPassed: true,
    isArrear: false,
    isDetained: false,
  };
}

export function calculateSemesterGpa(courses: CourseMarkInput[]): SemesterGpaResult {
  const evaluatedCourses = courses.map(evaluateCourseGrade);

  let totalPoints = 0;
  let totalCreditsOffered = 0;
  let totalCreditsEarned = 0;
  let hasArrears = false;

  for (const c of evaluatedCourses) {
    totalCreditsOffered += c.credits;
    if (c.isPassed) {
      totalCreditsEarned += c.credits;
      totalPoints += c.credits * c.gradePoints;
    } else {
      hasArrears = true;
    }
  }

  const gpa = totalCreditsOffered > 0 ? Number((totalPoints / totalCreditsOffered).toFixed(2)) : 0.0;

  return {
    courses: evaluatedCourses,
    totalCreditsOffered,
    totalCreditsEarned,
    gpa,
    hasArrears,
  };
}

export function calculateCumulativeGpa(semesters: { gpa: number; credits: number }[]): number {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const s of semesters) {
    totalPoints += s.gpa * s.credits;
    totalCredits += s.credits;
  }

  return totalCredits > 0 ? Number((totalPoints / totalCredits).toFixed(2)) : 0.0;
}
