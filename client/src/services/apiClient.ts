import axios, { AxiosError, AxiosAdapter } from 'axios';
import { useSandboxStore } from '../store/useSandboxStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Cache standard Axios adapter for live network operations
const standardAdapter = axios.getAdapter(axios.defaults.adapter || 'xhr');

// Sandbox-Aware Custom Network Adapter
apiClient.defaults.adapter = async (config) => {
  const isSandbox = useSandboxStore.getState().isSandbox;

  if (isSandbox) {
    const sandboxStore = useSandboxStore.getState();
    const url = config.url || '';
    const method = (config.method || 'get').toLowerCase();

    // 1. Students List
    if (url.includes('/students') && method === 'get' && !url.includes('/students/')) {
      const students = sandboxStore.getStudents();
      return {
        data: {
          status: 'success',
          data: {
            students,
            pagination: { total: students.length, page: 1, limit: 50, pages: 1 },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 2. Single Student 360 Profile
    const studentMatch = url.match(/\/students\/([^/?]+)/);
    if (studentMatch && method === 'get') {
      const stId = studentMatch[1];
      const student = sandboxStore.getStudentById(stId) || sandboxStore.getStudents()[0];
      return {
        data: { status: 'success', data: { student } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 3. Mark Attendance (Batch) -> ZERO WRITE TO POSTGRESQL!
    if (url.includes('/attendance/mark') && method === 'post') {
      const parsedBody = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
      const res = sandboxStore.markSandboxAttendance({
        entries: parsedBody.entries || [],
        date: parsedBody.date || new Date().toISOString().split('T')[0],
        hour: parsedBody.hour,
        period: parsedBody.period,
      });

      return {
        data: {
          status: 'success',
          data: {
            markedCount: res.markedCount,
            createdCount: res.markedCount,
            date: parsedBody.date,
            isSandbox: true,
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 4. Defaulters Early Warning Radar
    if (url.includes('/attendance/defaulters') && method === 'get') {
      const students = sandboxStore.getStudents();
      const defaulters = students
        .filter((s) => (s.attendanceSummary?.percentage ?? 100) < 75.0)
        .map((s) => ({
          id: s.id,
          fullName: s.fullName,
          identifier: s.regNumber || s.rollNumber || 'DEMO001',
          deptOrClass: s.department ? `${s.department.name} (${s.department.code})` : s.schoolClass ? `${s.schoolClass.standard}-${s.schoolClass.section}` : 'General',
          metrics: s.attendanceSummary!,
        }));

      return {
        data: {
          status: 'success',
          data: {
            defaulters,
            summary: {
              totalDefaulters: defaulters.length,
              condonationEligible: defaulters.filter((d) => d.metrics.tier === 'CONDONATION').length,
              detained: defaulters.filter((d) => d.metrics.tier === 'DETAINED').length,
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 5. Attendance Summary Metrics
    if (url.includes('/attendance/summary') && method === 'get') {
      const students = sandboxStore.getStudents();
      const avg = students.reduce((acc, s) => acc + (s.attendanceSummary?.percentage ?? 0), 0) / (students.length || 1);
      return {
        data: {
          status: 'success',
          data: {
            summary: {
              totalSessions: 120,
              averageAttendance: Number(avg.toFixed(1)),
              defaulterCount: students.filter((s) => (s.attendanceSummary?.percentage ?? 100) < 75.0).length,
            },
          },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 6. Student Examination Transcript
    if (url.includes('/transcript') && method === 'get') {
      const transcriptMatch = url.match(/\/marks\/student\/([^/?]+)\/transcript/);
      const studentId = transcriptMatch ? transcriptMatch[1] : 'demo-st-01';
      const transcriptData = sandboxStore.getTranscript(studentId);
      return {
        data: { status: 'success', data: transcriptData },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 7. Academic Courses
    if (url.includes('/academic/courses') && method === 'get') {
      return {
        data: { status: 'success', data: { courses: sandboxStore.courses } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 8. Academic Classes
    if (url.includes('/academic/classes') && method === 'get') {
      return {
        data: { status: 'success', data: { classes: sandboxStore.classes } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }

    // 9. Academic Departments
    if (url.includes('/academic/departments') && method === 'get') {
      return {
        data: { status: 'success', data: { departments: sandboxStore.departments } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    }
  }

  // Fallback to standard Axios network adapter for production mode
  return standardAdapter(config);
};

// Request Interceptor: Attach JWT Token, Active Campus Context & Correlation ID
apiClient.interceptors.request.use(
  (config) => {
    // Generate correlation ID for end-to-end tracing
    if (!config.headers['x-request-id'] && !config.headers['X-Request-Id']) {
      const generatedId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `req-cl-${Math.random().toString(36).substring(2, 10)}`;
      config.headers['X-Request-Id'] = generatedId;
    }

    const authDataRaw = localStorage.getItem('omniedu_auth');
    if (authDataRaw) {
      try {
        const parsed = JSON.parse(authDataRaw);
        const token = parsed?.state?.accessToken;
        const activeCampusId =
          parsed?.state?.activeInstitution?.id || parsed?.state?.activeCampus?.id;

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        if (activeCampusId) {
          config.headers['x-institution-id'] = activeCampusId;
          config.headers['x-campus-tenant-id'] = activeCampusId;
        }
      } catch (err) {
        // Ignored
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors & Session Expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('omniedu_auth');
      }
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);
