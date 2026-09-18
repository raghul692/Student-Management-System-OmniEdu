import { describe, it, expect } from 'vitest';
import { evaluateCourseGrade, calculateSemesterGpa, calculateCumulativeGpa } from './cgpaCalculator';

describe('Anna University R2021 CGPA Engine', () => {
  it('should assign Outstanding (O) grade with 10.0 points for total >= 91', () => {
    const res = evaluateCourseGrade({
      courseCode: 'CS8492',
      courseTitle: 'Database Management Systems',
      credits: 3,
      internalMarks: 38,
      externalMarks: 56,
      totalMarks: 94,
    });

    expect(res.grade).toBe('O');
    expect(res.gradePoints).toBe(10.0);
    expect(res.isPassed).toBe(true);
    expect(res.isArrear).toBe(false);
  });

  it('should assign Re-Appearance (RA) for total < 50 or external < 27', () => {
    // Failing external minimum
    const res1 = evaluateCourseGrade({
      courseCode: 'CS8451',
      courseTitle: 'DAA',
      credits: 4,
      internalMarks: 35,
      externalMarks: 24, // < 27 fail
    });

    expect(res1.grade).toBe('RA');
    expect(res1.gradePoints).toBe(0.0);
    expect(res1.isPassed).toBe(false);
    expect(res1.isArrear).toBe(true);

    // Failing total minimum
    const res2 = evaluateCourseGrade({
      courseCode: 'CS8451',
      courseTitle: 'DAA',
      credits: 4,
      internalMarks: 18,
      externalMarks: 28,
      totalMarks: 46, // < 50 fail
    });

    expect(res2.grade).toBe('RA');
    expect(res2.isPassed).toBe(false);
  });

  it('should assign Shortage of Attendance (SA / Detained) if attendance < 65%', () => {
    const res = evaluateCourseGrade({
      courseCode: 'CS8491',
      courseTitle: 'Computer Architecture',
      credits: 3,
      internalMarks: 36,
      externalMarks: 50,
      totalMarks: 86,
      attendancePercentage: 58.0,
    });

    expect(res.grade).toBe('SA');
    expect(res.gradePoints).toBe(0.0);
    expect(res.isPassed).toBe(false);
    expect(res.isDetained).toBe(true);
  });

  it('should correctly calculate credit-weighted GPA for semester', () => {
    const result = calculateSemesterGpa([
      { courseCode: 'CS8492', courseTitle: 'DBMS', credits: 3, internalMarks: 38, externalMarks: 55 }, // 93 -> O (10) * 3 = 30
      { courseCode: 'CS8451', courseTitle: 'DAA', credits: 4, internalMarks: 34, externalMarks: 48 },  // 82 -> A+ (9) * 4 = 36
      { courseCode: 'CS8491', courseTitle: 'CA', credits: 3, internalMarks: 30, externalMarks: 44 },   // 74 -> A (8) * 3 = 24
      { courseCode: 'CS8461', courseTitle: 'Lab', credits: 2, internalMarks: 38, externalMarks: 56 },  // 94 -> O (10) * 2 = 20
    ]);

    // Total points = 30 + 36 + 24 + 20 = 110
    // Total credits = 3 + 4 + 3 + 2 = 12
    // Expected GPA = 110 / 12 = 9.17
    expect(result.totalCreditsOffered).toBe(12);
    expect(result.totalCreditsEarned).toBe(12);
    expect(result.gpa).toBe(9.17);
    expect(result.hasArrears).toBe(false);
  });

  it('should calculate cumulative CGPA across multiple semesters', () => {
    const cgpa = calculateCumulativeGpa([
      { gpa: 8.5, credits: 20 },
      { gpa: 9.0, credits: 22 },
    ]);
    // (8.5*20 + 9.0*22) / 42 = (170 + 198) / 42 = 368 / 42 = 8.76
    expect(cgpa).toBe(8.76);
  });
});
