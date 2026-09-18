/**
 * Attendance Evaluation & Defaulter Radar Engine
 * Standards:
 * - >= 75%: Eligible for Examinations
 * - 65% - 74.9%: Eligible under Condonation (Requires Medical Certificate & approval)
 * - < 65%: Shortage of Attendance (SA / Detained - Cannot write semester exams)
 */

export type AttendanceTier = 'ELIGIBLE' | 'CONDONATION' | 'DETAINED';

export interface AttendanceMetrics {
  total: number;
  present: number;
  absent: number;
  onDuty: number;
  percentage: number;
  tier: AttendanceTier;
  condonationEligible: boolean;
  detained: boolean;
  sessionsNeededForThreshold: number;
  sessionsNeededFor75: number;
  allowedAbsencesBeforeDefaulter: number;
  threshold: number;
  condonationThreshold: number;
}

export function calculateAttendanceMetrics(
  total: number,
  present: number,
  onDuty: number = 0,
  threshold: number = 75.0,
  condonationThreshold?: number
): AttendanceMetrics {
  const condonationCutoff = condonationThreshold ?? Math.max(0, threshold - 10.0);
  const targetRatio = threshold / 100.0;

  if (total <= 0) {
    return {
      total: 0,
      present: 0,
      absent: 0,
      onDuty: 0,
      percentage: 100.0,
      tier: 'ELIGIBLE',
      condonationEligible: false,
      detained: false,
      sessionsNeededForThreshold: 0,
      sessionsNeededFor75: 0,
      allowedAbsencesBeforeDefaulter: 0,
      threshold,
      condonationThreshold: condonationCutoff,
    };
  }

  const effectivePresent = present + onDuty;
  const absent = Math.max(0, total - effectivePresent);
  const percentage = Number(((effectivePresent / total) * 100).toFixed(2));

  let tier: AttendanceTier = 'ELIGIBLE';
  let condonationEligible = false;
  let detained = false;

  if (percentage < condonationCutoff) {
    tier = 'DETAINED';
    detained = true;
  } else if (percentage < threshold) {
    tier = 'CONDONATION';
    condonationEligible = true;
  }

  // Sessions needed to reach threshold:
  let sessionsNeededForThreshold = 0;
  if (percentage < threshold) {
    if (targetRatio < 1) {
      const needed = Math.ceil((targetRatio * total - effectivePresent) / (1 - targetRatio));
      sessionsNeededForThreshold = Math.max(0, needed);
    } else {
      sessionsNeededForThreshold = total > effectivePresent ? 1 : 0;
    }
  }

  // Allowed future absences before dropping below threshold:
  let allowedAbsencesBeforeDefaulter = 0;
  if (percentage >= threshold && targetRatio > 0) {
    const margin = Math.floor(effectivePresent / targetRatio - total);
    allowedAbsencesBeforeDefaulter = Math.max(0, margin);
  }

  return {
    total,
    present,
    absent,
    onDuty,
    percentage,
    tier,
    condonationEligible,
    detained,
    sessionsNeededForThreshold,
    sessionsNeededFor75: sessionsNeededForThreshold,
    allowedAbsencesBeforeDefaulter,
    threshold,
    condonationThreshold: condonationCutoff,
  };
}
