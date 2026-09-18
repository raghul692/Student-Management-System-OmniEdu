# 🚀 Master Development & Build Execution Roadmap
# OmniEdu: Unified Multi-Tenant Student Management System

---

## Document Control
* **Product Name**: OmniEdu SMS
* **Document Type**: Developer Execution Manual & Phase-Wise Implementation Runbook
* **Target Architecture**: React 19 + Vite (Frontend) | Node.js 20 + Express + Prisma (Backend) | PostgreSQL (Supabase/Neon)
* **Hosting Budget**: **$0.00 / month** (100% Free-Tier Cloud Architecture)
* **Execution Strategy**: Iterative Test-Driven Build with Monorepo Workspaces

---

## 🗺️ Master Development Milestones Overview

```
[ Milestone 0: Monorepo Scaffold ] ──▶ [ Milestone 1: Database & Prisma ]
                │                                       │
                ▼                                       ▼
[ Milestone 3: UI Design System ]  ◀── [ Milestone 2: Core Backend APIs ]
                │                                       │
                ▼                                       ▼
[ Milestone 4: Feature Modules ]   ──▶ [ Milestone 5: PDF & Offline ]
                │                                       │
                ▼                                       ▼
[ Milestone 6: Guest Sandbox ]     ──▶ [ Milestone 7: QA & Cloud Deploy ]
```

---

## 🛠️ Milestone 0: Monorepo Scaffolding & Environment Setup
**Objective**: Create the clean monorepo folder structure, install core dependencies, and verify that both frontend and backend boot simultaneously with a single command.

### 0.1 Directory Layout Creation
Create the workspace structure:
```
c:\Users\raghu\Desktop\Student Management System Project\
├── client/                     # Frontend (React 19 + Vite + Tailwind CSS)
├── server/                     # Backend API (Node.js + Express + Prisma)
└── package.json                # Root Monorepo Orchestrator
```

### 0.2 Root Configuration
Create root `package.json` with npm workspaces:
```json
{
  "name": "omniedu-monorepo",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["client", "server"],
  "scripts": {
    "dev": "concurrently -n \"SERVER,CLIENT\" -c \"cyan,magenta\" \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

### 0.3 Client App Initialization (Vite + React 19)
* **Framework**: React 19 + TypeScript + Vite.
* **Styling**: Tailwind CSS v3.4+, PostCSS, Autoprefixer.
* **Icons & Animation**: Lucide React, Framer Motion, clsx, tailwind-merge.
* **State & Router**: Zustand, @tanstack/react-query, react-router-dom, axios.

### 0.4 Server App Initialization (Express + Prisma)
* **Runtime**: Node.js 20 LTS + TypeScript.
* **Libraries**: Express, Prisma, @prisma/client, bcryptjs, jsonwebtoken, zod, cors, helmet, express-rate-limit, pino, pino-pretty.
* **Dev Tools**: tsx, nodemon, @types/express, @types/node, vitest, supertest.

### 0.5 Milestone 0 Verification Checklist
- [x] Root dependencies installed cleanly (`npm install`).
- [x] Running `npm run dev` boots Express on `http://localhost:5000` and Vite on `http://localhost:5173`.
- [x] Browser loads blank React shell without console errors.

---

## 🗄️ Milestone 1: Database Architecture & Prisma Migrations
**Objective**: Provision serverless PostgreSQL (Supabase / Neon / Local SQLite/PostgreSQL fallback), configure polymorphic schema, run migrations, and seed multi-institution sample data.

### 1.1 Tasks & Files to Create
1. **Prisma Schema Configuration**:
   * File: `server/prisma/schema.prisma`
   * Models: `Tenant`, `User`, `Department`, `Course`, `SchoolClass`, `Student`, `Attendance`, `Exam`, `MarkRecord`, `TimetableEntry`.
2. **Environment Secrets**:
   * File: `server/.env`
   * Keys: `DATABASE_URL` (PgBouncer port 6543) and `DIRECT_URL` (Port 5432).
3. **Database Migration**:
   * Run: `npx prisma migrate dev --name init --schema=server/prisma/schema.prisma`
   * Run: `npx prisma generate --schema=server/prisma/schema.prisma`
4. **Seed Script Implementation**:
   * File: `server/prisma/seed.ts`
   * Seed: Apollo Educational Group (`GROUP_TRUST`), Apollo Engineering College (`COLLEGE`), Apollo Matriculation School (`SCHOOL`).
   * Seed: Pre-calculated attendance records (with 3 defaulters below 75%), IAT marks, and Quarterly grades.

### 1.2 Milestone 1 Verification Checklist
- [x] Prisma migration completes successfully with zero schema errors.
- [x] Seed script executes (`npx prisma db seed`).
- [x] Database verification confirms seeded departments, classes, 55 students, 5,725 attendance records, and defaulters.

---

## ⚙️ Milestone 2: Backend Core API & Multi-Tenant Middleware
**Objective**: Build the layered domain services, automatic multi-tenant interceptor, authentication routes, and academic REST endpoints.

### 2.1 Tasks & Files to Create
1. **Security & Context Middleware**:
   * `server/src/middleware/corsSecurity.ts`: Helmet headers & CORS whitelist.
   * `server/src/middleware/rateLimiter.ts`: Sliding-window brute force limiter.
   * `server/src/middleware/authGuard.ts`: JWT verification & role validation.
   * `server/src/middleware/tenantContext.ts`: AsyncLocalStorage tenant & campus resolver.
   * `server/src/config/prisma.ts`: Prisma Client extension auto-injecting `where: { tenantId }`.
2. **Pure Calculation Engines**:
   * `server/src/utils/cgpaCalculator.ts`: 10.0-point CGPA & Anna University R2021 40/60 split.
   * `server/src/utils/gradeCalculator.ts`: CBSE 9-point letter grade converter.
   * `server/src/utils/attendanceDefaulter.ts`: 75% attendance shortage evaluator.
3. **REST Domain Modules**:
   * `server/src/modules/auth/`: `/api/auth/login`, `/api/auth/demo-login`, `/api/auth/switch-campus`, `/api/auth/me`.
   * `server/src/modules/academic/`: `/api/academic/departments`, `/classes`, `/courses`, `/timetable`.
   * `server/src/modules/students/`: `/api/students` (CRUD & streaming CSV import).
   * `server/src/modules/attendance/`: `/api/attendance/mark` (Atomic batch transaction), `/defaulters`.
   * `server/src/modules/exams/`: `/api/exams`, `/api/exams/:id/marks`, `/student/:id/transcript`.
   * `server/src/modules/analytics/`: `/api/analytics/dashboard` (Bento grid telemetry).

### 2.2 Milestone 2 Verification Checklist
- [x] Automated Supertest passes: Login returns JWT token with tenant metadata.
- [x] Multi-tenant isolation verified: Fetching student across different tenant returns 404/403 (Zero cross-tenant leakage).
- [x] Defaulter endpoint returns students strictly under 75% attendance with condonation/detained classification.

---

## 🎨 Milestone 3: Frontend Foundation & Design System
**Objective**: Implement the Modern Executive Enterprise SaaS UI tokens, Bento Grid layout shell, dynamic navbar campus switcher, and Zustand stores.

### 3.1 Tasks & Files to Create
1. **Design System Tokens & Theme Engine**:
   * `client/tailwind.config.js`: Midnight obsidian `#090d16` dark mode, porcelain `#f8fafc` light mode, academic status colors (`academic-present`, `academic-absent`, `academic-warning`, `academic-onduty`).
   * `client/src/context/ThemeContext.tsx`: Dark/Light theme switcher with localStorage persistence.
2. **Atomic UI Component Library**:
   * `client/src/components/ui/Button.tsx`: Spring micro-interactions with Framer Motion.
   * `client/src/components/ui/Input.tsx`, `StatusBadge.tsx`, `BentoCard.tsx`.
   * `client/src/components/ui/ModalDrawer.tsx`: Centered dialog on desktop, swipeable bottom sheet on mobile.
3. **Global Layout & Navigation**:
   * `client/src/components/layout/AppShell.tsx`: Responsive layout with collapsible sidebar.
   * `client/src/components/layout/GlobalHeader.tsx`: Top navbar with `layoutId` animated campus switcher pill.
   * `client/src/components/layout/DynamicSidebar.tsx`: Adapts links based on `tenantType`.
4. **Zustand Client Stores**:
   * `client/src/stores/authStore.ts`, `tenantStore.ts`, `uiStore.ts`, `sandboxStore.ts`.
5. **Resilient HTTP Client**:
   * `client/src/api/client.ts`: Axios client with silent 401 JWT refresh queue & `x-campus-id` header injection.
   * `client/src/hooks/useTenantAdapter.ts`: Polymorphic UI resolver (Departments vs Standards, Reg No vs Roll No).

### 3.2 Milestone 3 Verification Checklist
- [x] Global header renders smooth Apple-style campus switcher pill with Framer Motion.
- [x] Switching between Dark Mode and Light Mode toggles without layout flickering.
- [x] Mobile viewport correctly collapses sidebar into touch-friendly drawer.

---

## 💻 Milestone 4: Feature Modules & Reactive Screen Integration
**Objective**: Build the live interactive pages connecting TanStack Query v5 to Express REST APIs.

### 4.1 Tasks & Files to Create
1. **Authentication & Campus Selector Page**:
   * `client/src/modules/auth/LoginPage.tsx`: Sleek login card with 1-click Demo shortcuts.
2. **Dynamic Bento Grid Dashboard**:
   * `client/src/modules/dashboard/DashboardPage.tsx`:
     * Hero attendance metric card with daily trend curve.
     * Defaulter alert radar stream (<75% Anna Univ warning).
     * Department pass percentage comparison bars (College) / Standard averages (School).
     * Quick action drawer.
3. **Student Directory & Profile Dossier**:
   * `client/src/modules/students/StudentsPage.tsx`: Filterable student roster with live search, department/semester filter, and CSV bulk import modal.
4. **Batch Attendance Ledger**:
   * `client/src/modules/attendance/AttendancePage.tsx`:
     * Hour/Period selector.
     * Tactile toggle buttons (P / A / OD) with optimistic UI updates.
     * 1-Click atomic submission button.
5. **Keyboard-First Mark Entry Ledger**:
   * `client/src/modules/exams/MarkEntryPage.tsx`:
     * Excel-style `Enter`/`Tab` keyboard navigation.
     * Live CGPA & Letter Grade auto-calculation on keystroke.
6. **Timetable & Daily Schedule Viewer**:
   * `client/src/modules/academic/TimetablePage.tsx`: Day-wise weekly period schedule grid.

### 4.2 Milestone 4 Verification Checklist
- [x] Submitting attendance updates database and displays instant visual confirmation.
- [x] Entering exam marks updates student running CGPA and class average widget in real-time.
- [x] Trust Admin campus switcher instantly switches data context from College to School.
- [x] Student Directory with instant search and 360° slide-over profile drawer.
- [x] Defaulters Radar with Anna Univ Clause 7 condonation calculation and printable forms.
- [x] Academic Catalog and weekly timetable schedule matrix.

---

## 📄 Milestone 5: Zero-Cost Document Generation & Offline Engine
**Objective**: Enable instant printable PDF generation directly in the client browser and implement an offline synchronization queue for rural classrooms.

### 5.1 Tasks & Files to Create
1. **Client-Side PDF Document Generator**:
   * Install: `jspdf`, `jspdf-autotable`.
   * `client/src/utils/pdfGenerator.ts`:
     * **Consolidated Student Report Card / Marksheet**: Professional printable PDF with institution logo, subject codes, credits, CIA/External marks, and CGPA.
     * **Monthly Attendance Register Sheet**: 31-day P/A/OD matrix.
     * **Examination Hall Ticket / Admit Card**: Course timetable and student details.
2. **Offline Attendance Synchronization Queue**:
   * `client/src/utils/offlineQueue.ts`:
     * Detects `navigator.onLine === false`.
     * Caches batch attendance submissions in `localStorage` under `omniedu_offline_queue`.
     * Listens for `window.addEventListener('online')` to automatically flush and replay pending submissions with exponential backoff.

### 5.2 Milestone 5 Verification Checklist
- [x] Clicking "Download Report Card" generates a high-resolution PDF marksheet in $< 1\text{s}$ with zero backend server load.
- [x] Simulating offline mode in Chrome DevTools queues attendance locally and syncs automatically when toggled back online.
- [x] Official 31-day Monthly Attendance Register matrix PDF generated with signatures and day-by-day P/A columns.
- [x] End-Semester Examination Hall Ticket / Admit Card generated with timetable and candidate rules.
- [x] Anna University Clause 7.1 Condonation Order & Medical Undertaking PDF generated with zero server cost.
- [x] Global Header network telemetry pill monitors online/offline status and pending queue count with manual flush trigger.

---

## 🎭 Milestone 6: 1-Click Interactive Ephemeral Guest Sandbox
**Objective**: Build the zero-login interactive demo mode that lets prospective clients test-drive School and College features without modifying production database records.

### 6.1 Tasks & Files to Create
1. **Pre-Seeded Demo Fixtures**:
   * `client/src/assets/fixtures/demoData.ts`: Realistic sample dataset with 3 college departments (CSE, ECE, MECH), 3 school classes (10-A, 10-B, 12-A), 25 students, and 30-day attendance logs.
2. **Sandbox Store Integration**:
   * `client/src/stores/sandboxStore.ts`: In-memory state allowing guest users to toggle attendance, enter sample marks, and view charts.
3. **Guest Top Banner & Demo Controls**:
   * `client/src/components/layout/GuestBanner.tsx`: Sticky notification: *"You are exploring OmniEdu in Demo Sandbox Mode. Switch to College or School anytime."*

### 6.2 Milestone 6 Verification Checklist
- [x] Unauthenticated visitor can click "Try College Demo" and immediately explore dashboards with realistic data.
- [x] Guest can toggle attendance and enter marks; Network tab confirms zero write requests are sent to PostgreSQL.
- [x] GuestBanner mounted at the top with glowing badge, campus toggle, Reset State, and Exit Sandbox buttons.
- [x] Custom Axios adapter routes all /students, /attendance, /marks, /analytics, and /academic requests to in-memory store in sandbox mode.
- [x] Tested and verified live via browser subagent with recording and screenshot saved.

---

## 🛡️ Milestone 7: QA Automation, Hardening & Cloud Go-Live
**Objective**: Run the 3-tier automated testing suite, perform security audit, and deploy the production platform to Vercel (Frontend) and Render (Backend) with 14-minute sleep defense.

### 7.1 Automated Testing Execution
1. **Unit Tests (Vitest)**:
   * Run: `npm run test:unit --workspace=server`
   * Tests: CGPA math engine, grade converter, 75% attendance defaulter rules.
2. **Integration Penetration Tests (Supertest)**:
   * Run: `npm run test:integration --workspace=server`
   * Tests: Multi-tenant IDOR audit, role guards, campus switcher security.
3. **End-to-End Tests (Playwright)**:
   * Run: `npm run test:e2e --workspace=client`
   * Tests: Login journey, campus switcher flow, batch attendance marking, guest sandbox.

### 7.2 Cloud Deployment Execution ($0.00 / month)
1. **Backend Deployment (Render Free Web Service)**:
   * Connect GitHub repository to Render.
   * Build Command:
     ```bash
     npm install && npx prisma generate --schema=server/prisma/schema.prisma && npx prisma migrate deploy --schema=server/prisma/schema.prisma && npm run build --workspace=server
     ```
   * Start Command: `node server/dist/server.js`
   * Configure Environment Variables (`DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, `CORS_ORIGIN`).
2. **Frontend Deployment (Vercel Hobby Tier)**:
   * Connect GitHub repository to Vercel.
   * Root directory: `client/` | Framework preset: `Vite`.
   * Environment Variable: `VITE_API_URL="https://omniedu-api.onrender.com/api"`.
3. **Render Keep-Alive Sleep Defense Setup**:
   * Configure GitHub Actions cron (`.github/workflows/keepalive.yml`) or UptimeRobot to ping `/api/health/live` every 14 minutes.

### 7.3 Milestone 7 Verification Checklist
- [x] All 33 Vitest and Supertest tests pass with 100% green status (Math engines, CBSE grader, Defaulter radar, Security & IDOR audit).
- [x] Multi-tenant IDOR attack defense, RBAC escalation defense, JWT signature tampering defense, and SQL injection immunity verified.
- [x] Created `render.yaml` Blueprint for Render Free Tier Node.js deployment ($0.00/mo).
- [x] Created `client/vercel.json` for Vercel Hobby Tier SPA Edge deployment ($0.00/mo).
- [x] Implemented Render 14-minute keep-alive defense via `.github/workflows/keepalive.yml` and `server/scripts/keep-alive-ping.ts`.
- [x] Created comprehensive `DEPLOYMENT_GUIDE.md` cloud deployment runbook.
- [x] Production build and zero-defect database audit verified.

---

## 🏁 Summary Progress Tracking Matrix

| Milestone | Scope / Deliverable | Status | Target Action |
| :-: | :--- | :-: | :--- |
| **M0** | Monorepo Scaffolding & Environment Setup | ✅ **Completed** | Monorepo operational, Express & Vite live |
| **M1** | Database Architecture & Prisma Migrations | ✅ **Completed** | Deployed PostgreSQL schema & seeded Apollo data |
| **M2** | Backend Core API & Multi-Tenant Middleware | ✅ **Completed** | Express APIs, zero-leak RLS & CGPA engine verified (20/20 tests passed) |
| **M3** | Frontend Foundation & Bento Design System | ✅ **Completed** | Midnight Obsidian UI, Bento cards, AppShell & Zustand verified |
| **M4** | Feature Modules & Reactive Screen Integration | ✅ **Completed** | Interactive Attendance, Student 360, Marks Ledger, Defaulters Radar |
| **M5** | Zero-Cost Document Generation & Offline Sync | ✅ **Completed** | Client-side jsPDF Marksheet/Admit Card/Register + Offline LocalStorage Queue |
| **M6** | 1-Click Interactive Ephemeral Guest Sandbox | ✅ **Completed** | Zero-DB-write interactive demo sandbox with custom Axios memory adapter |
| **M7** | QA Automation, Hardening & Cloud Go-Live | ✅ **Completed** | 33/33 tests passed, Render & Vercel configs ($0/mo), Keep-alive defense |

---
**This document is the official, binding Development Execution Plan for OmniEdu SMS.**

