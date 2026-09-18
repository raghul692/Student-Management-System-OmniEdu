/**
 * K-12 School Grading Engine (CBSE & State Board / Samacheer)
 * 9-Point Scale:
 * - A1: 91 - 100 (Grade Point 10)
 * - A2: 81 - 90  (Grade Point 9)
 * - B1: 71 - 80  (Grade Point 8)
 * - B2: 61 - 70  (Grade Point 7)
 * - C1: 51 - 60  (Grade Point 6)
 * - C2: 41 - 50  (Grade Point 5)
 * - D:  33 - 40  (Grade Point 4 - Minimum Passing)
 * - E:  <= 32    (Grade Point 0 - Needs Improvement / Failed)
 */

export interface SchoolSubjectGrade {
  subjectName: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
  gradePoint: number;
  isPassed: boolean;
}

export function evaluateSchoolSubject(
  subjectName: string,
  marksObtained: number,
  maxMarks: number = 100
): SchoolSubjectGrade {
  const percentage = (marksObtained / maxMarks) * 100;

  if (percentage >= 91) {
    return { subjectName, marksObtained, maxMarks, grade: 'A1', gradePoint: 10, isPassed: true };
  }
  if (percentage >= 81) {
    return { subjectName, marksObtained, maxMarks, grade: 'A2', gradePoint: 9, isPassed: true };
  }
  if (percentage >= 71) {
    return { subjectName, marksObtained, maxMarks, grade: 'B1', gradePoint: 8, isPassed: true };
  }
  if (percentage >= 61) {
    return { subjectName, marksObtained, maxMarks, grade: 'B2', gradePoint: 7, isPassed: true };
  }
  if (percentage >= 51) {
    return { subjectName, marksObtained, maxMarks, grade: 'C1', gradePoint: 6, isPassed: true };
  }
  if (percentage >= 41) {
    return { subjectName, marksObtained, maxMarks, grade: 'C2', gradePoint: 5, isPassed: true };
  }
  if (percentage >= 33) {
    return { subjectName, marksObtained, maxMarks, grade: 'D', gradePoint: 4, isPassed: true };
  }
  return { subjectName, marksObtained, maxMarks, grade: 'E', gradePoint: 0, isPassed: false };
}

export function calculateSchoolReport(
  subjects: { subjectName: string; marksObtained: number; maxMarks?: number }[]
) {
  const evaluated = subjects.map((s) =>
    evaluateSchoolSubject(s.subjectName, s.marksObtained, s.maxMarks ?? 100)
  );

  const totalMarks = evaluated.reduce((sum, s) => sum + s.marksObtained, 0);
  const totalMaxMarks = evaluated.reduce((sum, s) => sum + s.maxMarks, 0);
  const totalGradePoints = evaluated.reduce((sum, s) => sum + s.gradePoint, 0);

  const overallPercentage = totalMaxMarks > 0 ? Number(((totalMarks / totalMaxMarks) * 100).toFixed(2)) : 0;
  const cgpa = evaluated.length > 0 ? Number((totalGradePoints / evaluated.length).toFixed(2)) : 0;
  const allPassed = evaluated.every((s) => s.isPassed);

  return {
    subjects: evaluated,
    totalMarks,
    totalMaxMarks,
    overallPercentage,
    cgpa,
    allPassed,
  };
}
