import { describe, it, expect } from 'vitest';
import { calculateAttendanceMetrics } from './attendanceDefaulter';

describe('Attendance Metrics & Defaulter Radar Engine', () => {
  it('should classify >= 75% as ELIGIBLE', () => {
    const metrics = calculateAttendanceMetrics(100, 85, 5); // 90 / 100 = 90%
    expect(metrics.percentage).toBe(90.0);
    expect(metrics.tier).toBe('ELIGIBLE');
    expect(metrics.condonationEligible).toBe(false);
    expect(metrics.detained).toBe(false);
    expect(metrics.sessionsNeededFor75).toBe(0);
    expect(metrics.allowedAbsencesBeforeDefaulter).toBeGreaterThan(0);
  });

  it('should classify 65% - 74.9% as CONDONATION', () => {
    const metrics = calculateAttendanceMetrics(100, 68, 0); // 68%
    expect(metrics.percentage).toBe(68.0);
    expect(metrics.tier).toBe('CONDONATION');
    expect(metrics.condonationEligible).toBe(true);
    expect(metrics.detained).toBe(false);
    // Needed for 75%: 3*100 - 4*68 = 300 - 272 = 28 sessions
    expect(metrics.sessionsNeededFor75).toBe(28);
  });

  it('should classify < 65% as DETAINED (Shortage of Attendance)', () => {
    const metrics = calculateAttendanceMetrics(100, 52, 0); // 52%
    expect(metrics.percentage).toBe(52.0);
    expect(metrics.tier).toBe('DETAINED');
    expect(metrics.detained).toBe(true);
    expect(metrics.condonationEligible).toBe(false);
    // Needed for 75%: 3*100 - 4*52 = 300 - 208 = 92 sessions
    expect(metrics.sessionsNeededFor75).toBe(92);
  });

  it('should handle zero sessions gracefully', () => {
    const metrics = calculateAttendanceMetrics(0, 0);
    expect(metrics.percentage).toBe(100.0);
    expect(metrics.tier).toBe('ELIGIBLE');
  });

  it('should correctly evaluate with configurable 70% threshold', () => {
    // Threshold = 70%, Condonation cutoff = 60%
    const eligible = calculateAttendanceMetrics(100, 72, 0, 70.0);
    expect(eligible.tier).toBe('ELIGIBLE');
    expect(eligible.threshold).toBe(70.0);
    expect(eligible.condonationThreshold).toBe(60.0);

    const condonation = calculateAttendanceMetrics(100, 65, 0, 70.0);
    expect(condonation.tier).toBe('CONDONATION');
    expect(condonation.condonationEligible).toBe(true);

    const detained = calculateAttendanceMetrics(100, 55, 0, 70.0);
    expect(detained.tier).toBe('DETAINED');
    expect(detained.detained).toBe(true);
  });

  it('should correctly evaluate with configurable 80% threshold', () => {
    // Threshold = 80%, Condonation cutoff = 70%
    const condonation = calculateAttendanceMetrics(100, 75, 0, 80.0);
    expect(condonation.tier).toBe('CONDONATION');
    expect(condonation.threshold).toBe(80.0);
    expect(condonation.condonationThreshold).toBe(70.0);

    const eligible = calculateAttendanceMetrics(100, 82, 0, 80.0);
    expect(eligible.tier).toBe('ELIGIBLE');

    const detained = calculateAttendanceMetrics(100, 68, 0, 80.0);
    expect(detained.tier).toBe('DETAINED');
  });
});
