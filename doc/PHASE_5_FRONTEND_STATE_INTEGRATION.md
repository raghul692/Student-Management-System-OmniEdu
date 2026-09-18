# 💻 Phase 5: Frontend Development & State Integration
# OmniEdu: Unified Multi-Tenant Student Management System

---

## Document Control
* **Product Name**: OmniEdu SMS
* **Phase**: Phase 5 — Frontend Architecture, State Management, Dynamic Tenant Adapters & Reactive UI
* **Status**: Complete & Ready for Phase 6 (Testing & Hardening)
* **Framework Alignment**: React 19, Vite 5.x, TypeScript 5.4+, Tailwind CSS v3.4+
* **State Architecture**: Dual-Layer (Zustand for Client State + TanStack Query v5 for Server Cache)
* **Routing & Security**: React Router v6/v7, Protected Layout Guards, Silent JWT Refresh Queue

---

## 1. Frontend System Architecture & Directory Topology

OmniEdu's frontend is architected as a **Feature-Driven, Polymorphic Single-Page Application (SPA)**. It decouples generic design primitives from domain-specific educational workflows:

```
client/
├── public/                       # Static assets, favicons, campus logos
├── src/
│   ├── api/                      # Resilient HTTP Client & Interceptors
│   │   ├── client.ts             # Axios instance with silent refresh queue
│   │   └── endpoints.ts          # Centralized API route dictionary
│   ├── assets/                   # SVG vectors, illustrations, noise texture
│   ├── components/
│   │   ├── layout/               # Global Shell & Navigation
│   │   │   ├── AppShell.tsx      # Collapsible desktop sidebar + mobile drawer
│   │   │   ├── GlobalHeader.tsx  # Campus switcher, theme toggle, user menu
│   │   │   ├── DynamicSidebar.tsx# Adaptive menu links (School vs College)
│   │   │   └── GuestBanner.tsx   # Sticky sandbox notice with demo toggle
│   │   ├── ui/                   # Reusable Design System Primitives (Radix UI)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── StatusBadge.tsx   # Present / Absent / On-Duty / RA badges
│   │   │   ├── BentoCard.tsx     # Glassmorphic dashboard widget container
│   │   │   └── ModalDrawer.tsx   # Desktop Dialog -> Mobile Bottom Sheet
│   │   └── widgets/              # Interactive Visualizations & Charts
│   │       ├── AttendanceTrendChart.tsx
│   │       ├── DepartmentBarChart.tsx
│   │       └── DefaulterAlertStream.tsx
│   ├── context/                  # ThemeContext (Dark/Light mode provider)
│   ├── hooks/                    # Domain Query & Mutation Hooks (TanStack v5)
│   │   ├── useAuth.ts
│   │   ├── useTenantAdapter.ts   # Dynamic terminology & schema resolver
│   │   ├── useStudents.ts
│   │   ├── useAttendance.ts      # With optimistic update support
│   │   ├── useExams.ts
│   │   └── useAnalytics.ts
│   ├── modules/                  # Dynamic Screen Implementations
│   │   ├── dashboard/            # Bento Grid dashboard screen
│   │   ├── students/             # Adaptive roster, dossier modal, CSV import
│   │   ├── attendance/           # Rapid batch attendance marker matrix
│   │   ├── exams/                # Keyboard-first mark entry ledger & CGPA
│   │   └── settings/             # Institution & campus management
│   ├── routes/                   # Declarative Routing & Role Guards
│   │   ├── index.tsx             # createBrowserRouter definition
│   │   ├── ProtectedRoute.tsx    # Auth verification guard
│   │   └── RoleGuard.tsx         # HOD / Teacher / Admin permission gate
│   ├── stores/                   # Zustand Client State Stores
│   │   ├── authStore.ts          # User credentials, JWT, permissions
│   │   ├── tenantStore.ts        # Active campus, tenant type, switcher
│   │   ├── sandboxStore.ts       # Ephemeral in-memory guest sandbox state
│   │   └── uiStore.ts            # Sidebar open/closed, command palette
│   ├── types/                    # TypeScript interfaces matching backend models
│   ├── App.tsx                   # App root with QueryClientProvider
│   └── main.tsx                  # React 19 entrypoint
└── vite.config.ts                # ESBuild fast-refresh configuration
```

---

## 2. Dual State Management Architecture

State is cleanly bifurcated into **Server Cache** (managed by TanStack Query) and **Client/UI State** (managed by Zustand). This prevents cache staleness and eliminates prop-drilling.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STATE ARCHITECTURE SEPARATION                   │
├───────────────────────────────────┬────────────────────────────────────┤
│ SERVER STATE (TanStack Query v5)  │ CLIENT STATE (Zustand v4)          │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Student lists & filter queries  │ • Active JWT access token          │
│ • Historical attendance records   │ • Active Campus ID (Trust Switcher)│
│ • Exam marks & CGPA transcripts   │ • Selected Theme (Dark / Light)    │
│ • Dashboard Bento Grid telemetry  │ • Sidebar Collapsed / Expanded     │
│ • Background revalidation & cache │ • In-Memory Guest Sandbox Database │
│ • Optimistic attendance mutations │ • Search modal (Ctrl+K) open state │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

### 2.1 Zustand Stores Specification

#### 1. Tenant Store (`src/stores/tenantStore.ts`):
Manages the active institution context and coordinates seamless multi-campus switching:

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TenantType = 'COLLEGE' | 'SCHOOL' | 'GROUP_TRUST' | 'SOLO_EDUCATOR' | 'DEMO_SANDBOX';

interface CampusSummary {
  id: string;
  name: string;
  code: string;
  type: TenantType;
}

interface TenantState {
  activeTenantId: string | null;
  activeCampusId: string | null;
  tenantType: TenantType;
  campuses: CampusSummary[];
  setTenantContext: (tenantId: string, type: TenantType, campuses?: CampusSummary[]) => void;
  switchCampus: (campusId: string) => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      activeTenantId: null,
      activeCampusId: null,
      tenantType: 'COLLEGE',
      campuses: [],
      setTenantContext: (tenantId, type, campuses = []) =>
        set({
          activeTenantId: tenantId,
          activeCampusId: campuses.length > 0 ? campuses[0].id : tenantId,
          tenantType: type,
          campuses,
        }),
      switchCampus: (campusId) => {
        const target = get().campuses.find((c) => c.id === campusId);
        set({
          activeCampusId: campusId,
          tenantType: target ? target.type : get().tenantType,
        });
      },
    }),
    { name: 'omniedu-tenant-storage' }
  )
);
```

#### 2. Auth Store (`src/stores/authStore.ts`):
Handles user authentication, JWT lifecycle, and silent logout.

```typescript
import { create } from 'zustand';

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'CAMPUS_ADMIN' | 'HOD' | 'FACULTY' | 'CLASS_TEACHER' | 'STUDENT' | 'GUEST';
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, token: string) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  setAuth: (user, token) => set({ user, accessToken: token, isAuthenticated: true }),
  setAccessToken: (token) => set({ accessToken: token }),
  logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
```

---

### 2.2 TanStack Query v5 Architecture: Query Key Factories

To guarantee deterministic cache invalidation when a user switches campuses or modifies attendance, we employ **Query Key Factories**:

```typescript
// src/api/queryKeys.ts
export const queryKeys = {
  tenant: {
    all: ['tenant'] as const,
    detail: (id: string) => [...queryKeys.tenant.all, id] as const,
  },
  students: {
    all: (campusId: string) => ['students', campusId] as const,
    list: (campusId: string, filters: Record<string, any>) =>
      [...queryKeys.students.all(campusId), 'list', filters] as const,
    detail: (id: string) => ['students', 'detail', id] as const,
  },
  attendance: {
    all: (campusId: string) => ['attendance', campusId] as const,
    matrix: (campusId: string, date: string, scopeId: string) =>
      [...queryKeys.attendance.all(campusId), 'matrix', date, scopeId] as const,
    defaulters: (campusId: string) => [...queryKeys.attendance.all(campusId), 'defaulters'] as const,
  },
  exams: {
    all: (campusId: string) => ['exams', campusId] as const,
    marksheet: (examId: string, subjectId: string) =>
      [...queryKeys.exams.all(''), 'marksheet', examId, subjectId] as const,
  },
  analytics: {
    dashboard: (campusId: string) => ['analytics', 'dashboard', campusId] as const,
  },
};
```

---

## 3. Dynamic Tenant Adaptive UI Engine (Polymorphic Adapters)

Instead of maintaining separate front-end codebases or repetitive `if-else` statements across every component, OmniEdu uses a **Centralized Tenant Adaptive Registry**:

```typescript
// src/hooks/useTenantAdapter.ts
import { useTenantStore } from '@/stores/tenantStore';

export interface TenantConfig {
  institutionType: 'COLLEGE' | 'SCHOOL';
  unitLabel: string;             // "Department" vs "Class / Standard"
  unitSubLabel: string;          // "Semester" vs "Section"
  idLabel: string;               // "Register Number" vs "Roll Number"
  sessionLabel: string;          // "Hour" vs "Period"
  gradeLabel: string;            // "CGPA (10.0 scale)" vs "Grade / Rank"
  showDepartments: boolean;
  showRegulations: boolean;
  showPeriods: boolean;
}

export function useTenantAdapter(): TenantConfig {
  const { tenantType } = useTenantStore();

  if (tenantType === 'SCHOOL') {
    return {
      institutionType: 'SCHOOL',
      unitLabel: 'Standard',
      unitSubLabel: 'Section',
      idLabel: 'Roll Number',
      sessionLabel: 'Period',
      gradeLabel: 'Term Grade',
      showDepartments: false,
      showRegulations: false,
      showPeriods: true,
    };
  }

  // Defaults to Engineering College
  return {
    institutionType: 'COLLEGE',
    unitLabel: 'Department',
    unitSubLabel: 'Semester',
    idLabel: 'Register Number',
    sessionLabel: 'Hour',
    gradeLabel: 'CGPA',
    showDepartments: true,
    showRegulations: true,
    showPeriods: false,
  };
}
```

#### Component Usage Example:
```tsx
// In any generic table or form component:
export function StudentIdentifierHeader() {
  const { idLabel, unitLabel } = useTenantAdapter();
  return (
    <div className="flex justify-between font-semibold">
      <span>{idLabel}</span>
      <span>{unitLabel}</span>
    </div>
  );
}
// Outputs: "Register Number" & "Department" for College
// Outputs: "Roll Number" & "Standard" for School
```

---

## 4. Resilient Networking & Silent JWT Refresh Queue

OmniEdu's HTTP client automatically injects the active **Bearer Token** and the active **`x-campus-id` header**. If an access token expires mid-request ($401$), it queues all pending requests, silently requests a fresh token, and replays the requests without flickering the UI:

```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Sends HttpOnly Refresh Cookie
});

// Request Interceptor: Attach Auth & Active Campus ID
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  const campusId = useTenantStore.getState().activeCampusId;

  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (campusId) config.headers['x-campus-id'] = campusId;

  return config;
});

// Response Interceptor: Silent Refresh Queue on 401
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.data.accessToken;
        useAuthStore.getState().setAccessToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 5. Core Screen Implementations & Optimistic Mutations

### 5.1 Batch Attendance Ledger with Optimistic UI Update
When a teacher toggles attendance for a student (Present $\rightarrow$ Absent), the UI updates instantly with natural spring physics. If the network request fails, it rolls back gracefully with a toast notification:

```typescript
// src/hooks/useAttendance.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { queryKeys } from '@/api/queryKeys';

export function useSubmitAttendance(campusId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { date: string; hour?: number; records: any[] }) => {
      const res = await api.post('/attendance/mark', payload);
      return res.data;
    },
    onMutate: async (newBatch) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.attendance.all(campusId) });
      const previousState = queryClient.getQueryData(queryKeys.attendance.all(campusId));

      // Optimistically update query cache
      queryClient.setQueryData(queryKeys.attendance.all(campusId), (old: any) => ({
        ...old,
        lastSubmitted: newBatch,
      }));

      return { previousState };
    },
    onError: (err, newBatch, context) => {
      // Rollback on network failure
      if (context?.previousState) {
        queryClient.setQueryData(queryKeys.attendance.all(campusId), context.previousState);
      }
    },
    onSettled: () => {
      // Invalidate queries to ensure absolute server truth
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all(campusId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.dashboard(campusId) });
    },
  });
}
```

---

### 5.2 Keyboard-First Mark Entry Ledger
Built for speed. Teachers can record marks for 60 students in under 2 minutes:
* `Enter` / `Down Arrow`: Commits cell and moves focus to the next student.
* `Up Arrow`: Moves focus to previous student.
* Real-time calculation: Typing `85` immediately shows `A+` grade badge and updates the running Class Average metric widget.

```tsx
// Excerpt from src/modules/exams/MarkEntryCell.tsx
export function MarkEntryCell({ student, maxMarks = 100, onCommit }: any) {
  const [value, setValue] = useState(student.marksObtained || '');
  const isInvalid = Number(value) > maxMarks || Number(value) < 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`mark-input-${student.index + 1}`);
      nextInput?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`mark-input-${student.index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        id={`mark-input-${student.index}`}
        type="number"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onCommit(student.id, Number(e.target.value));
        }}
        onKeyDown={handleKeyDown}
        className={`w-20 px-3 py-1.5 rounded-lg border font-mono font-bold text-center ${
          isInvalid ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-slate-700 bg-slate-900'
        }`}
      />
      <GradePill marks={Number(value)} maxMarks={maxMarks} />
    </div>
  );
}
```

---

## 6. Interactive Ephemeral Guest Sandbox State Engine

When a prospective client or guest clicks **"Try College Demo"** or **"Try School Demo"**, the platform activates `useSandboxStore`. It bypasses network calls and serves pre-seeded fixture data from local memory:

```typescript
// src/stores/sandboxStore.ts
import { create } from 'zustand';
import { COLLEGE_SEED_FIXTURE, SCHOOL_SEED_FIXTURE } from '@/assets/fixtures/demoData';

interface SandboxState {
  isSandboxMode: boolean;
  demoType: 'COLLEGE' | 'SCHOOL';
  students: any[];
  attendanceLog: any[];
  marksLog: any[];
  enableSandbox: (type: 'COLLEGE' | 'SCHOOL') => void;
  toggleAttendance: (studentId: string) => void;
  exitSandbox: () => void;
}

export const useSandboxStore = create<SandboxState>((set, get) => ({
  isSandboxMode: false,
  demoType: 'COLLEGE',
  students: [],
  attendanceLog: [],
  marksLog: [],
  enableSandbox: (type) => {
    const fixture = type === 'COLLEGE' ? COLLEGE_SEED_FIXTURE : SCHOOL_SEED_FIXTURE;
    set({
      isSandboxMode: true,
      demoType: type,
      students: fixture.students,
      attendanceLog: fixture.attendance,
      marksLog: fixture.marks,
    });
  },
  toggleAttendance: (studentId) => {
    const updated = get().students.map((s) => {
      if (s.id === studentId) {
        const nextStatus = s.todayStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
        return { ...s, todayStatus: nextStatus };
      }
      return s;
    });
    set({ students: updated });
  },
  exitSandbox: () => set({ isSandboxMode: false }),
}));
```

---

## 7. Client-Side Document Export Engine & Offline Resilience

### 7.1 Zero-Server-Cost PDF Generation (`jspdf` + `jspdf-autotable`)
Instead of utilizing heavy, expensive Puppeteer headless Chrome instances on the backend (which would exceed Render's 512MB RAM free limit), all documents are generated directly in the user's browser:
1. **Consolidated Student Report Card / Marksheet**:
   * Header: Institution Logo, Affiliation (Anna Univ / CBSE), Student Name, Reg/Roll No.
   * Tabular breakdown: Subject Name, Subject Code, Credits, Internal Marks (40), External Marks (60), Total, Grade Point, Letter Grade.
   * Footer: SGPA / CGPA Summary, Class Teacher & Principal digital signature blocks.
2. **Monthly Class Attendance Register**:
   * Compact 31-day attendance grid showing daily `P`, `A`, or `OD` marks with monthly totals and percentage.
3. **Examination Hall Ticket / Admit Card**:
   * Includes student photo (from Supabase Storage), timetable of enrolled courses, exam center code, and instructions.

### 7.2 Offline Attendance Synchronization Queue (Rural Campus Defense)
To support school and college classrooms with intermittent Wi-Fi connectivity, attendance marks are queued locally if a network disconnect occurs:
1. When submitting attendance, the client detects `navigator.onLine === false`.
2. The submission payload is stored in `IndexedDB` / `localStorage` under `omniedu_offline_queue`.
3. The UI shows an Amber Sync badge: *"Saved Offline (1 Batch Pending)"*.
4. When `window.addEventListener('online')` triggers, the queue automatically drains and replays batch requests with exponential backoff.

---

## 8. Phase 5 Deliverables Checklist & Sign-Off

| Frontend Deliverable Area | Technical Implementation Details | Status |
| :--- | :--- | :--- |
| **Directory Topology** | Decoupled feature architecture with React 19 + Vite | **COMPLETE** |
| **State Management** | Dual-tier: Zustand for client UI + TanStack Query v5 for server cache | **COMPLETE** |
| **Multi-Campus Switching** | Instant navbar campus switcher with automatic query invalidation | **COMPLETE** |
| **Tenant Adaptive Engine** | `useTenantAdapter()` dynamically re-labeling tables & forms | **COMPLETE** |
| **Resilient Networking** | Axios with silent 401 JWT refresh queue & `x-campus-id` header | **COMPLETE** |
| **Optimistic Attendance** | Instant tactile button feedback with automatic network rollback | **COMPLETE** |
| **Keyboard Mark Entry** | Excel-style `Enter`/`Arrow` navigation with live CGPA calculation | **COMPLETE** |
| **Guest Sandbox Store** | 100% Client-side in-memory trial engine with pre-seeded fixtures | **COMPLETE** |
| **Client-Side Document PDF**| Zero-server RAM PDF generator (`jspdf`) for Marksheets & Hall Tickets | **COMPLETE** |
| **Offline Sync Queue** | Local storage queue for network drops in rural classrooms | **COMPLETE** |

---
**Phase 5 Frontend Development & State Integration is officially COMPLETE.**  
Ready to proceed with **Phase 6: Testing, Hardening & Security Audit** upon instruction.
