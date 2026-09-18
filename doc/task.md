# OmniEdu — Phase A Critical Fixes Task List

## Task 1 — Fix Onboarding API Payload Mismatch
- [x] Define canonical DTO `OnboardingInput` in client & server
- [x] Update `client/src/pages/OnboardingWizard.tsx` to construct and submit canonical payload
- [x] Add field validation and backend error display in `OnboardingWizard.tsx`
- [x] Update `server/src/modules/onboarding/onboarding.routes.ts` with Zod validation
- [x] Update `server/src/modules/onboarding/onboarding.service.ts` for atomic creation of SCHOOL, COLLEGE, and SCHOOL_AND_COLLEGE with baseline departments/classes

## Task 2 to 5 — Backend Authorization & Scoping
- [x] Secure `tenantContext.ts`: return 403 Forbidden for unauthorized `x-institution-id` (IDOR defense)
- [x] Protect `GET /api/students` with role guard (block STUDENT, allow admins/HOD/teachers)
- [x] Implement `GET /api/students/me` for self student profile and metrics
- [x] Protect `GET /api/students/:id`: allow admins/HOD; if STUDENT, only allow their own record
- [x] Protect `GET /api/attendance/defaulters` (allow INSTITUTION_ADMIN, HOD, CLASS_TEACHER, CLASS_ADVISOR; block STUDENT)
- [x] Protect `GET /api/marks/exam/:examId` (block STUDENT from institution exam results)
- [x] Protect `GET /api/marks/student/:studentId` (STUDENT can only view own transcript)
- [x] Audit & protect POST/PUT/PATCH/DELETE endpoints in students, attendance, marks

## Task 6 — Faculty Assignment Scoping
- [x] Validate faculty department / course scope in `attendance.service.ts:markBatchAttendance`
- [x] Validate faculty department / course scope in `marks.service.ts:batchRecordMarks`
- [x] Reject unauthorized course/class modifications with 403 Forbidden

## Task 7 — Fix Hardcoded School Academic Data
- [x] Remove hardcoded `10th-A` and `12th-B` in `AcademicCatalogView.tsx`
- [x] Fetch school classes from `/academic/classes` and render dynamically

## Task 8 — Audit Other Hardcoded Production Data
- [x] Audit and fix static fallbacks in `StudentDirectory.tsx` and `AttendanceLedger.tsx`
- [x] Classify hardcoded occurrences across the project

## Task 9 & 10 — Institution Context Security & Authorization Matrix
- [x] Verify IDOR protection on all institution-scoped endpoints
- [x] Compile complete API Authorization Matrix

## Task 11 — Frontend Permission UX
- [x] Update `DynamicSidebar.tsx` using `usePermissionStore.can(...)` so STUDENT cannot see defaulters radar, admin settings, or raw student directory
- [x] Ensure navigation adapts accurately to active role

## Task 12 — Legacy Context Cleanup
- [x] Clean up obsolete tenant context references without breaking offline sandbox

## Verification & Security Testing
- [x] Create `server/src/tests/security-phase-a.test.ts` covering student isolation, faculty scoping, HOD scoping, IDOR defense, and onboarding
- [x] Run `npm run typecheck` across server and client
- [x] Run `npm run test:unit`
- [x] Run `security-phase-a.test.ts` (17/17 tests passed)
- [x] Run `npm run build -w client` (Built successfully in 13.22s)
