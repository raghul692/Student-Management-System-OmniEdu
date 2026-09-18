import { describe, it, expect } from 'vitest';
import { evaluateSchoolSubject, calculateSchoolReport } from './gradeCalculator';

describe('K-12 School Grading Engine (CBSE 9-Point Scale)', () => {
  it('should evaluate 91-100 marks as A1 with grade point 10 and passed status', () => {
    const res = evaluateSchoolSubject('Mathematics', 95, 100);
    expect(res.grade).toBe('A1');
    expect(res.gradePoint).toBe(10);
    expect(res.isPassed).toBe(true);
  });

  it('should evaluate 81-90 marks as A2 with grade point 9', () => {
    const res = evaluateSchoolSubject('Science', 85, 100);
    expect(res.grade).toBe('A2');
    expect(res.gradePoint).toBe(9);
    expect(res.isPassed).toBe(true);
  });

  it('should evaluate boundary of 33 marks as D (minimum pass) with grade point 4', () => {
    const res = evaluateSchoolSubject('Social Studies', 33, 100);
    expect(res.grade).toBe('D');
    expect(res.gradePoint).toBe(4);
    expect(res.isPassed).toBe(true);
  });

  it('should evaluate <= 32 marks as E with grade point 0 and failed status', () => {
    const res = evaluateSchoolSubject('English', 28, 100);
    expect(res.grade).toBe('E');
    expect(res.gradePoint).toBe(0);
    expect(res.isPassed).toBe(false);
  });

  it('should calculate comprehensive school report card correctly', () => {
    const report = calculateSchoolReport([
      { subjectName: 'Mathematics', marksObtained: 95 },
      { subjectName: 'Science', marksObtained: 85 },
      { subjectName: 'English', marksObtained: 75 },
      { subjectName: 'Social Science', marksObtained: 65 },
      { subjectName: 'Tamil', marksObtained: 90 },
    ]);

    expect(report.totalMarks).toBe(410);
    expect(report.totalMaxMarks).toBe(500);
    expect(report.overallPercentage).toBe(82);
    expect(report.allPassed).toBe(true);
    // Grade points: 10 + 9 + 8 + 7 + 9 = 43. 43 / 5 = 8.6
    expect(report.cgpa).toBe(8.6);
  });
});
