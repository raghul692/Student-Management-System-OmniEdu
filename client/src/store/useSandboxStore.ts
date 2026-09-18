import { create } from 'zustand';
import { 
  Student, 
  Course, 
  SchoolClass, 
  Department, 
  MarkRecord, 
  AttendanceStatus,
  AttendanceTier
} from '../types';
import { 
  INITIAL_COLLEGE_STUDENTS, 
  INITIAL_SCHOOL_STUDENTS, 
  DEMO_COURSES, 
  DEMO_SCHOOL_CLASSES, 
  DEMO_DEPARTMENTS,
  DEMO_SAMPLE_TRANSCRIPT,
  DEMO_COLLEGE_TENANT,
  DEMO_SCHOOL_TENANT,
  DEMO_GUEST_USER
} from '../data/demoFixtures';
import { useAuthStore } from './useAuthStore';

interface SandboxStore {
  isSandbox: boolean;
  sandboxCampus: 'COLLEGE' | 'SCHOOL';
  collegeStudents: Student[];
  schoolStudents: Student[];
  courses: Course[];
  classes: SchoolClass[];
  departments: Department[];
  transcripts: Record<string, MarkRecord[]>;

  // Lifecycle
  enterSandbox: (campus?: 'COLLEGE' | 'SCHOOL') => void;
  exitSandbox: () => void;
  switchSandboxCampus: (campus: 'COLLEGE' | 'SCHOOL') => void;
  resetSandboxData: () => void;

  // Ephemeral In-Memory Mutations (Zero PostgreSQL writes)
  markSandboxAttendance: (params: {
    entries: Array<{ studentId: string; status: AttendanceStatus; remarks?: string }>;
    date: string;
    hour?: number;
    period?: number;
  }) => { markedCount: number };
  
  getStudents: () => Student[];
  getStudentById: (id: string) => Student | undefined;
  getTranscript: (studentId: string) => { transcript: MarkRecord[]; summary: { cgpa: number } };
}

export const useSandboxStore = create<SandboxStore>((set, get) => ({
  isSandbox: false,
  sandboxCampus: 'COLLEGE',
  collegeStudents: JSON.parse(JSON.stringify(INITIAL_COLLEGE_STUDENTS)),
  schoolStudents: JSON.parse(JSON.stringify(INITIAL_SCHOOL_STUDENTS)),
  courses: DEMO_COURSES,
  classes: DEMO_SCHOOL_CLASSES,
  departments: DEMO_DEPARTMENTS,
  transcripts: {
    'demo-st-01': JSON.parse(JSON.stringify(DEMO_SAMPLE_TRANSCRIPT)),
    'demo-st-02': JSON.parse(JSON.stringify(DEMO_SAMPLE_TRANSCRIPT)),
    'demo-st-03': [
      {
        ...DEMO_SAMPLE_TRANSCRIPT[0],
        internalMarks: 24,
        externalMarks: 32,
        marksObtained: 56,
        grade: 'B',
        gradePoints: 6,
      },
    ],
  },

  enterSandbox: (campus: 'COLLEGE' | 'SCHOOL' = 'COLLEGE') => {
    const tenant = campus === 'COLLEGE' ? DEMO_COLLEGE_TENANT : DEMO_SCHOOL_TENANT;
    const authStore = useAuthStore.getState();

    // Set guest user in auth store
    useAuthStore.setState({
      user: {
        ...DEMO_GUEST_USER,
        tenantId: tenant.id,
        tenant: tenant,
      },
      accessToken: 'demo_sandbox_ephemeral_token',
      activeCampus: {
        id: tenant.id,
        name: tenant.name,
        code: tenant.code,
        type: tenant.type,
      },
      isAuthenticated: true,
    });

    set({
      isSandbox: true,
      sandboxCampus: campus,
    });
  },

  exitSandbox: () => {
    set({ isSandbox: false });
    // Trigger standard auth logout to return user to login screen or default
    useAuthStore.getState().logout();
  },

  switchSandboxCampus: (campus: 'COLLEGE' | 'SCHOOL') => {
    const tenant = campus === 'COLLEGE' ? DEMO_COLLEGE_TENANT : DEMO_SCHOOL_TENANT;
    const authStore = useAuthStore.getState();

    authStore.switchCampus({
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      type: tenant.type,
    });

    set({ sandboxCampus: campus });
  },

  resetSandboxData: () => {
    set({
      collegeStudents: JSON.parse(JSON.stringify(INITIAL_COLLEGE_STUDENTS)),
      schoolStudents: JSON.parse(JSON.stringify(INITIAL_SCHOOL_STUDENTS)),
      transcripts: {
        'demo-st-01': JSON.parse(JSON.stringify(DEMO_SAMPLE_TRANSCRIPT)),
        'demo-st-02': JSON.parse(JSON.stringify(DEMO_SAMPLE_TRANSCRIPT)),
      },
    });
  },

  markSandboxAttendance: ({ entries }) => {
    const { sandboxCampus, collegeStudents, schoolStudents } = get();
    const isCollege = sandboxCampus === 'COLLEGE';
    const currentList = isCollege ? [...collegeStudents] : [...schoolStudents];

    entries.forEach((entry) => {
      const idx = currentList.findIndex((s) => s.id === entry.studentId);
      if (idx !== -1) {
        const student = { ...currentList[idx] };
        const summary = student.attendanceSummary
          ? { ...student.attendanceSummary }
          : {
              total: 100,
              present: 80,
              absent: 20,
              onDuty: 0,
              percentage: 80.0,
              tier: 'ELIGIBLE' as AttendanceTier,
              condonationEligible: false,
              detained: false,
              sessionsNeededFor75: 0,
              allowedAbsencesBeforeDefaulter: 5,
            };

        summary.total += 1;
        if (entry.status === 'PRESENT') {
          summary.present += 1;
        } else if (entry.status === 'ABSENT') {
          summary.absent += 1;
        } else if (entry.status === 'ON_DUTY') {
          summary.onDuty += 1;
          summary.present += 1; // On-duty counts as attended
        }

        summary.percentage = Number(((summary.present / summary.total) * 100).toFixed(1));
        if (summary.percentage >= 75.0) {
          summary.tier = 'ELIGIBLE';
          summary.condonationEligible = false;
          summary.detained = false;
          summary.sessionsNeededFor75 = 0;
        } else if (summary.percentage >= 65.0) {
          summary.tier = 'CONDONATION';
          summary.condonationEligible = true;
          summary.detained = false;
          summary.sessionsNeededFor75 = Math.ceil((75 * summary.total - 100 * summary.present) / 25);
        } else {
          summary.tier = 'DETAINED';
          summary.condonationEligible = false;
          summary.detained = true;
          summary.sessionsNeededFor75 = Math.ceil((75 * summary.total - 100 * summary.present) / 25);
        }

        student.attendanceSummary = summary;
        currentList[idx] = student;
      }
    });

    if (isCollege) {
      set({ collegeStudents: currentList });
    } else {
      set({ schoolStudents: currentList });
    }

    return { markedCount: entries.length };
  },

  getStudents: () => {
    const { sandboxCampus, collegeStudents, schoolStudents } = get();
    return sandboxCampus === 'COLLEGE' ? collegeStudents : schoolStudents;
  },

  getStudentById: (id: string) => {
    const { collegeStudents, schoolStudents } = get();
    return [...collegeStudents, ...schoolStudents].find((s) => s.id === id);
  },

  getTranscript: (studentId: string) => {
    const { transcripts } = get();
    const list = transcripts[studentId] || DEMO_SAMPLE_TRANSCRIPT;
    const totalMarks = list.reduce((acc, curr) => acc + curr.marksObtained, 0);
    const avg = list.length > 0 ? (totalMarks / list.length / 10).toFixed(2) : '8.40';
    return {
      transcript: list,
      summary: { cgpa: parseFloat(avg) },
    };
  },
}));
