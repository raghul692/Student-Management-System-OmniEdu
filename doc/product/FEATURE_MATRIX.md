# OmniEdu Unified Educational ERP — Enterprise Feature Matrix

This matrix specifies the functional and architectural capabilities available across all subscription tiers (`BASIC`, `PRO`, `ENTERPRISE`) and institutional tenant modalities (`COLLEGE` vs. `SCHOOL`).

---

## 1. Plan Tier Entitlement Matrix

| Capability / Module | Basic Plan | Pro Plan | Enterprise Plan | Feature Key / Gate |
| :--- | :---: | :---: | :---: | :--- |
| **Multi-Campus Multi-Tenancy** | 1 Campus | Up to 5 Campuses | Unlimited Campuses | Platform Core |
| **Student Directory & Enrolment** | Up to 500 Students | Up to 5,000 Students | Unlimited | `maxStudents` Quota |
| **Attendance Tracking** | Hour / Period Matrix | Hour / Period Matrix | Biometric & RFID Ready | Core Attendance |
| **Defaulters Radar** | Basic (<75% Threshold) | Early Warning Alerts | Real-time SMS & Email | Core Defaulters |
| **Examinations & Grading** | CIA / CBSE Marks Ledger | CGPA Calculation Engine | Automated Rank Lists | Core Marks |
| **Academic Catalog & Regulations** | R2021 / CBSE Default | Custom Regulations | Autonomous University CBCS | Core Academic |
| **Timetable Matrix Planner** | Manual Matrix | Conflict Detector | Faculty Workload Balancer | Core Timetable |
| **Parent & Student Portals** | Web Access | Web + PWA Installable | Web + PWA + SMS Digests | `enableParentPortal` |
| **Student 360° Comprehensive Dossier** | — | Included | Included + Deep History | Platform Core |
| **Remedial Interventions Workflow** | — | Basic Mentorship | Multi-faculty Threads & SLAs | `INTERVENTIONS_WORKFLOW` |
| **AI Student Copilot & Study Planner** | — | Standard Quota (10k tok/mo) | High Quota (100k tok/mo) | `AI_STUDENT_COPILOT` |
| **Predictive Early Warning Radar** | — | Included (Daily scan) | Real-time Multi-signal | `EARLY_WARNING_RADAR` |
| **Campus Knowledge Base (RAG)** | — | Up to 10 Documents | Unlimited Knowledge Base | `KNOWLEDGE_BASE_RAG` |
| **Bloom's Question Generator** | — | 20 Sets / Month | Unlimited Question Sets | `QUESTION_GENERATOR` |
| **Tone-Adapted Circular Drafter** | — | Included | Included + Auto-Broadcast | `COMMUNICATIONS_AI` |
| **Webhook Integrations & Events** | — | 3 Active Endpoints | Unlimited + HMAC-SHA256 | `WEBHOOKS_INTEGRATION` |
| **Immutable Security Audit Log Export** | View in Console (30d) | View in Console (90d) | JSON/CSV Export + 1-Year Retention | `AUDIT_LOGS_EXPORT` |
| **FERPA & GDPR Privacy Governance** | Basic Self-Deactivate | Data Export Archive | Scheduled Scrubbing & SLAs | `PRIVACY_CONTROLS` |
| **Custom Visual Branding & Subdomains** | Standard Theme | Custom Hex & Logo | White-label + Custom Domain | Institution Setting |
| **Disaster Recovery & Point-in-Time** | Weekly Snapshot | Daily SHA-256 Backups | Multi-region Hot Standby | Infrastructure Core |

---

## 2. Institutional Modality Comparison

| Dimension | Engineering / Arts College (`COLLEGE`) | K-12 Matriculation School (`SCHOOL`) |
| :--- | :--- | :--- |
| **Governing Framework** | University Affiliation (e.g. Anna University R2021/R2024) | Educational Board (e.g. CBSE / State Board / ICSE) |
| **Academic Structure** | Departments (CSE, ECE, MECH, CIVIL) & Degree Programs | Standards (Class 1 to 12) & Classroom Sections (A, B, C) |
| **Attendance Granularity** | Hour-wise Slot Matrix (Periods 1 to 8, Lab Sessions) | Period-wise / Half-day / Full-day Attendance Session |
| **Exam & Assessment Flow** | Continuous Internal Assessment (CIA-1, CIA-2, Model, Semester Final) | Formative & Summative (Unit Tests, Quarterly, Half-Yearly, Annual) |
| **Grading System** | 10-Point Grade Points (O, A+, A, B+, B, C, RA) & CGPA | Letter Grades (A1, A2, B1, B2, C1, C2, D, E) & Percentage |
| **Student Identifiers** | Anna University Reg No (12 digits) & Roll Number | Admission Number & Roll Number |
| **Regulatory Shortage Cutoff** | < 75% University Detained / Condonation Range (65–74%) | < 75% CBSE Board Exam Condonation Shortage |
