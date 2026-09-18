# 🎓 OmniEdu — Unified Multi-Tenant Student Management System (SMS)
### Enterprise Multi-Campus Academic ERP for Engineering Colleges & K-12 Schools

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.14-2D3748.svg?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Tests-33%2F33_Passing-brightgreen.svg?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Hosting Cost](https://img.shields.io/badge/Cloud_Hosting-$0.00%2Fmonth-emerald.svg)](#-zero-cost-cloud-architecture-000--month)

---

## 🏛️ Executive Summary

**OmniEdu** is a unified multi-tenant Student Management System (SMS) ERP engineered to bridge the operational gap between **Higher Education Engineering Colleges** and **K-12 Matriculation / CBSE Schools** under a single consolidated administrative pane.

Built with a **Linear / Vercel / Stripe tier aesthetic** (Midnight Obsidian `#07090e` dark mode and Porcelain `#f8fafc` light mode), OmniEdu eliminates paper-based academic registers, automates Anna University statutory compliance, and operates entirely on a **$0.00 / month 100% free-tier cloud budget**.

---

## ✨ Core Highlights & Architectural Pillars

### 1. Dual Academic Paradigms in One Relational Core
* **Engineering Colleges**:
  * Anna University Regulation 2021/2024 compliance.
  * 12-Digit University Registration Numbers (e.g., `910023104001`).
  * Semesters 1 to 8, Theory / Practical credits, and 40 CIA + 60 External mark split.
  * **Anna Univ Clause 7.1 Compliance**: Strict 75% attendance cutoff, Clause 7.2 Condonation (65%–74.9%), and Shortage of Attendance (`SA`) Detention (<65%).
* **K-12 Schools**:
  * Standards 6 to 12, Sections A/B/C, Roll Numbers (e.g., `10A-01`).
  * Daily Periods 1 to 8 with class-level period attendance.
  * CBSE / Samacheer 9-point grading scale (`A1` to `E`).
* **Educational Trusts**:
  * Unified management of multiple campuses with seamless animated campus switching via Framer Motion.

### 2. Zero-Cost Client-Side Document Generation
* High-fidelity official PDFs generated **100% client-side in the browser** using `jspdf` and `jspdf-autotable`.
* **Zero server RAM and $0.00 compute cost**:
  * **Anna University Marksheet / Grade Sheet**: Complete with CIA/External split, SGPA/CGPA, credits, and verification security hash.
  * **End-Semester Examination Hall Ticket / Admit Card**: Complete with photo affixation box, exam timetable, and candidate instructions.
  * **31-Day Monthly Attendance Register Matrix**: Official landscape grid with daily P/A/OD markings and institutional signatures.
  * **Clause 7.1 Condonation Order & Medical Undertaking**: Statutory exemption certificate.

### 3. Spotty Connectivity & Offline Sync Engine
* Local-first persistence in browser `localStorage` (`omniedu_offline_attendance_queue_v1`).
* Automatically detects offline mode in rural classrooms, queues bulk attendance actions, and silently synchronizes via FIFO queue with exponential backoff upon network restoration.
* Real-time network telemetry pill in the header with manual flush trigger.

### 4. 1-Click Interactive Ephemeral Guest Sandbox
* Zero-login interactive demo mode for prospective educational leaders and evaluators.
* Custom zero-DB-write Axios network adapter routes read and write requests to client memory.
* Allows evaluators to test attendance marking and grade adjustments with **zero write requests sent to PostgreSQL**.

### 5. Multi-Tenant Row-Level Security (RLS) & Anti-IDOR Defense
* Express middleware utilizes Node.js `AsyncLocalStorage` to enforce tenant context across all database queries.
* Rigorously tested against Cross-Tenant IDOR attacks, role-based privilege escalation, JWT tampering, and SQL injection (33/33 tests green).

---

## 🏢 Pre-Seeded Demonstration Personas

All seeded accounts share the password: **`Apollo@2026`**

| Persona / Role | Email | Campus / Scope | Capabilities |
| :--- | :--- | :--- | :--- |
| **Trust Super Admin** | `trust.admin@apollo.edu` | Apollo Educational Trust | Multi-campus overview, live campus switching between College & School |
| **College Principal** | `principal.eng@apollo.edu` | Apollo Institute of Technology | Full college administration, Defaulters radar, departmental analytics |
| **School Principal** | `principal.sch@apollo.edu` | Apollo Matriculation School | School governance, class performance, period turnout |
| **HOD Computer Science** | `hod.cse@apollo.edu` | College (CSE Dept) | Course syllabus, faculty allocation, semester CGPA rankings |
| **College Faculty** | `faculty.dbms@apollo.edu` | College (CS8492 DBMS) | Hour-wise attendance ledger, 40 CIA + 60 Ext grade entry |
| **School Class Teacher** | `teacher.math@apollo.edu` | School (10th Std Sec A) | Period-wise attendance, term marks, parent notifications |
| **Guest Explorer** | *1-Click Sandbox* | Multi-Campus Demo | In-memory interactive sandbox with zero database mutations |

---

## 📂 Monorepo Project Structure

```
c:\Users\raghu\Desktop\Student Management System Project\
├── client/                             # Frontend Web Application (React 19 + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/                 # GlobalHeader, DynamicSidebar, AppShell, GuestBanner
│   │   │   ├── dashboard/              # Executive Bento Grid Dashboard
│   │   │   └── ui/                     # Button, Input, BentoCard, StatusBadge, ModalDrawer
│   │   ├── modules/
│   │   │   ├── attendance/             # AttendanceLedger (Hour/Period-wise)
│   │   │   ├── students/               # StudentDirectory & Student360Drawer
│   │   │   ├── marks/                  # MarksLedger (Live keystroke CGPA engine)
│   │   │   ├── defaulters/             # DefaultersRadarView (Clause 7 early warning)
│   │   │   └── academic/               # AcademicCatalogView & TimetableView
│   │   ├── data/                       # Pre-seeded demo fixtures for sandbox
│   │   ├── services/                   # apiClient with custom Axios sandbox adapter
│   │   ├── store/                      # Zustand state (useAuthStore, useSandboxStore)
│   │   └── utils/                      # Client-side jsPDF engine & offline FIFO queue
│   ├── vercel.json                     # Vercel Edge SPA rewrites & security headers
│   └── vite.config.ts
│
├── server/                             # Backend Core API (Node.js 20 + Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma               # 10 relational models with polymorphic student mapping
│   │   └── seed.ts                     # Multi-tenant seed (3 Tenants, 7 Users, 55 Students)
│   ├── src/
│   │   ├── middleware/                 # authGuard, tenantContext (AsyncLocalStorage), rateLimiter
│   │   ├── modules/                    # Auth, Academic, Students, Attendance, Marks, Analytics
│   │   ├── utils/                      # cgpaCalculator (Anna Univ), gradeCalculator (CBSE), attendanceDefaulter
│   │   ├── tests/                      # Automated Vitest & Supertest penetration test suite
│   │   ├── deep-audit.ts               # Standalone database integrity & polymorphic auditor
│   │   ├── app.ts                      # Express app with Helmet, CORS & health probes
│   │   └── server.ts                   # Graceful shutdown server entrypoint
│   └── scripts/
│       └── keep-alive-ping.ts          # Render 14-minute sleep defense ping utility
│
├── .github/workflows/
│   └── keepalive.yml                   # Automated 14-min cron keep-alive for Render Free Tier
├── render.yaml                         # Render Cloud Infrastructure Blueprint
├── DEPLOYMENT_GUIDE.md                 # Complete Step-by-Step Cloud Go-Live Runbook
├── DEVELOPMENT_EXECUTION_ROADMAP.md    # Master milestones & verification tracking
└── package.json                        # Root npm workspaces orchestrator
```

---

## ⚡ Quickstart & Local Setup

### Prerequisites
* **Node.js**: `v20.x` or later
* **npm**: `v10.x` or later
* **PostgreSQL**: Docker container or local PostgreSQL 15+ (Port 5432)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/omniedu-sms.git
cd omniedu-sms
npm install
```

### 2. Configure Environment Variables
Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://resumate:resumate_secret@localhost:5432/omniedu_db?schema=public"
JWT_ACCESS_SECRET="omniedu_super_secure_access_secret_key_2026"
JWT_REFRESH_SECRET="omniedu_super_secure_refresh_secret_key_2026"
CORS_ORIGIN="http://localhost:5173"
```

### 3. Database Migration & Seeding
```bash
# Push schema migrations
npm run db:migrate

# Seed multi-tenant data (Apollo Trust, College, School, 55 students, 5,725 attendances)
npm run db:seed

# Verify database purity (Zero defects)
npm run db:audit
```

### 4. Boot Concurrent Development Server
```bash
npm run dev
```
* **Frontend Application**: `http://localhost:5173/`
* **Backend Core API**: `http://localhost:5000/`
* **Health Probe**: `http://localhost:5000/api/health/live`

---

## 🧪 Testing & Quality Assurance

Run the automated test suite covering unit math engines, CBSE grade converters, and security penetration tests:

```bash
# Run all 33 automated tests (Vitest + Supertest)
npm test

# Run TypeScript compilation check across all workspaces
npm run typecheck

# Run production build (Vite + TypeScript)
npm run build

# Run deep database audit
npm run db:audit
```

### Test Suite Summary:
```
 ✓ src/utils/gradeCalculator.test.ts     (5 tests)  - CBSE 9-Point Scale (A1 to E)
 ✓ src/utils/cgpaCalculator.test.ts      (5 tests)  - Anna Univ R2021 40/60 Split & Arrears
 ✓ src/utils/attendanceDefaulter.test.ts (4 tests)  - 75% Cutoff, Condonation & Recovery Hrs
 ✓ src/tests/security-penetration.test.ts (8 tests) - IDOR, RBAC, JWT & SQL Injection
 ✓ src/tests/api.test.ts                 (11 tests) - REST APIs & Multi-Tenant Isolation

 Test Files  5 passed (5)
      Tests  33 passed (33) 100% GREEN
```

---

## ☁️ Zero-Cost Cloud Architecture ($0.00 / month)

OmniEdu is designed from day one to operate entirely within cloud free-tiers without incurring unexpected bills:

| Layer | Provider | Free Tier Allocation | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | **Vercel** | 100 GB Bandwidth, Edge CDN | React 19 SPA hosting, instant SSL, global distribution |
| **Backend** | **Render** | 512 MB RAM, 0.1 CPU Free Instance | Express API container with auto-deploy on git push |
| **Database** | **Supabase / Neon** | 500 MB Storage, Connection Pooler | Serverless PostgreSQL with automated daily backups |
| **Keep-Alive** | **GitHub Actions** | 2,000 Free CI/CD minutes | 14-min cron job preventing Render instance sleep |
| **Total Cost** | | | **$0.00 / month (100% Free)** |

For full deployment instructions, see [DEPLOYMENT_GUIDE.md](file:///c:/Users/raghu/Desktop/Student%20Management%20System%20Project/DEPLOYMENT_GUIDE.md).

---

## 📜 Regulatory Standards Implemented

* **Anna University Regulation 2021 / 2024**:
  * Clause 7.1: Minimum 75% overall attendance requirement.
  * Clause 7.2 & 7.3: Condonation between 65% and 74.9% on certified medical / sports grounds.
  * Clause 7.4: Prevention / Detention (`SA` tag) for attendance below 65%.
  * Continuous Assessment Split: 40 CIA + 60 External with minimum 45% external pass mark.
* **CBSE Continuous & Comprehensive Evaluation**:
  * 9-point grading scale (`A1` to `E`).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
