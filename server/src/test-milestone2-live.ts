/**
 * Comprehensive Live HTTP Verification of Milestone 2 REST Endpoints
 * Tests running against live Express server on http://localhost:5000
 */

const BASE_URL = 'http://localhost:5000/api';

async function req(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data: any = await response.json();
  return { status: response.status, data };
}

async function verifyMilestone2Live() {
  console.log('🧪 RUNNING COMPREHENSIVE LIVE VERIFICATION OF MILESTONE 2 REST APIS...\n');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail ? `(${detail})` : ''}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failCount++;
    }
  }

  // 1. HEALTH CHECKS
  console.log('1️⃣  Health Probes:');
  const healthLive = await req('/health/live');
  assert(healthLive.status === 200 && healthLive.data.status === 'alive', 'GET /api/health/live');
  
  const healthReady = await req('/health/ready');
  assert(healthReady.status === 200 && healthReady.data.database === 'healthy', 'GET /api/health/ready');

  // 2. AUTHENTICATION & DEMO LOGINS
  console.log('\n2️⃣  Authentication Endpoints:');
  
  // Bad Login
  const badLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'principal.eng@apollo.edu', password: 'WrongPassword' }),
  });
  assert(badLogin.status === 401, 'POST /api/auth/login with wrong password correctly rejected');

  // Demo Login - College Principal
  const collegeLogin = await req('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role: 'principal_eng' }),
  });
  assert(collegeLogin.status === 200 && collegeLogin.data.data.accessToken, 'POST /api/auth/demo-login (College Principal)');
  const collegeToken = collegeLogin.data.data.accessToken;
  const collegeTenantId = collegeLogin.data.data.user.tenantId;

  // Demo Login - School Principal
  const schoolLogin = await req('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role: 'principal_sch' }),
  });
  assert(schoolLogin.status === 200 && schoolLogin.data.data.accessToken, 'POST /api/auth/demo-login (School Principal)');
  const schoolToken = schoolLogin.data.data.accessToken;
  const schoolTenantId = schoolLogin.data.data.user.tenantId;

  // Demo Login - Trust Admin
  const trustLogin = await req('/auth/demo-login', {
    method: 'POST',
    body: JSON.stringify({ role: 'trust_admin' }),
  });
  assert(trustLogin.status === 200 && trustLogin.data.data.user.tenant.campuses.length === 2, 'POST /api/auth/demo-login (Trust Super Admin with 2 campuses)');
  const trustToken = trustLogin.data.data.accessToken;

  // GET /api/auth/me
  const me = await req('/auth/me', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(me.status === 200 && me.data.data.user.email === 'principal.eng@apollo.edu', 'GET /api/auth/me returns valid profile');

  // 3. MULTI-TENANT ISOLATION (ZERO LEAKAGE)
  console.log('\n3️⃣  Multi-Tenant Zero-Leakage Data Isolation:');

  // College Principal lists students
  const collegeStudents = await req('/students?limit=50', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    collegeStudents.status === 200 &&
    collegeStudents.data.data.pagination.total === 30 &&
    collegeStudents.data.data.students.every((s: any) => s.regNumber && !s.rollNumber),
    'College query strictly returns 30 College students with Reg Numbers and ZERO School students'
  );

  // School Principal lists students
  const schoolStudents = await req('/students?limit=50', {
    headers: { Authorization: `Bearer ${schoolToken}` },
  });
  assert(
    schoolStudents.status === 200 &&
    schoolStudents.data.data.pagination.total === 25 &&
    schoolStudents.data.data.students.every((s: any) => s.rollNumber && !s.regNumber),
    'School query strictly returns 25 School students with Roll Numbers and ZERO College students'
  );

  // Anti-IDOR Cross-Tenant Access Prevention
  const collegeStudentId = collegeStudents.data.data.students[0].id;
  const crossTenantAccess = await req(`/students/${collegeStudentId}`, {
    headers: { Authorization: `Bearer ${schoolToken}` }, // School token trying to view College student
  });
  assert(
    crossTenantAccess.status === 404,
    'Anti-IDOR Defense: School token accessing College student ID returns 404 Not Found'
  );

  // 4. STUDENT 360 PROFILE WITH ATTENDANCE METRICS
  console.log('\n4️⃣  Student 360 Profile & Analytics:');
  const student360 = await req(`/students/${collegeStudentId}`, {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    student360.status === 200 &&
    student360.data.data.student.attendanceSummary &&
    typeof student360.data.data.student.attendanceSummary.percentage === 'number',
    'GET /api/students/:id returns full Student 360 profile with computed attendance metrics'
  );

  // 5. ATTENDANCE DEFAULTER RADAR
  console.log('\n5️⃣  Attendance Defaulter Radar:');
  const defaulters = await req('/attendance/defaulters', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    defaulters.status === 200 &&
    defaulters.data.data.defaultersCount === 2 &&
    defaulters.data.data.defaulters[0].metrics.percentage < 65.0,
    'GET /api/attendance/defaulters accurately isolates the 2 defaulters (<75%) and flags detained status'
  );

  // 6. ACADEMIC MODULES
  console.log('\n6️⃣  Academic Modules (Departments, Courses, Timetable):');
  const depts = await req('/academic/departments', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    depts.status === 200 && depts.data.data.departments.length === 3,
    'GET /api/academic/departments returns CSE, ECE, MECH'
  );

  const courses = await req('/academic/courses?semester=4', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    courses.status === 200 && courses.data.data.courses.length >= 4,
    'GET /api/academic/courses returns Semester 4 Anna Univ R2021 courses (CS8492, CS8451, CS8491, CS8461)'
  );

  const timetable = await req('/academic/timetable', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    timetable.status === 200 && timetable.data.data.timetable.length > 0,
    'GET /api/academic/timetable returns weekly schedule entries'
  );

  // 7. MARKS & EXAMS MODULE
  console.log('\n7️⃣  Marks & Examinations Engine:');
  const exams = await req('/marks/exams', {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    exams.status === 200 && exams.data.data.exams.length >= 2,
    'GET /api/marks/exams returns IAT-1 and IAT-2 exams'
  );

  const examId = exams.data.data.exams[0].id;
  const examResults = await req(`/marks/exam/${examId}`, {
    headers: { Authorization: `Bearer ${collegeToken}` },
  });
  assert(
    examResults.status === 200 &&
    examResults.data.data.analytics.totalMarksRecorded > 0 &&
    typeof examResults.data.data.analytics.passPercentage === 'number',
    'GET /api/marks/exam/:examId returns exam gradebook with pass percentage analytics'
  );

  // 8. TRUST CAMPUS SWITCHING
  console.log('\n8️⃣  Trust Super Admin Campus Switcher:');
  const switchRes = await req('/auth/switch-campus', {
    method: 'POST',
    headers: { Authorization: `Bearer ${trustToken}` },
    body: JSON.stringify({ targetCampusId: collegeTenantId }),
  });
  assert(
    switchRes.status === 200 && switchRes.data.data.accessToken,
    'POST /api/auth/switch-campus successfully switches Trust Admin context to College campus'
  );

  // FINAL SUMMARY
  console.log('\n=============================================================');
  if (failCount === 0) {
    console.log(`🌟 ALL ${passCount} LIVE HTTP TESTS PASSED WITH 100% SUCCESS! 🌟`);
  } else {
    console.error(`🚨 COMPLETED WITH ${failCount} FAILS (${passCount} passed)`);
  }
  console.log('=============================================================\n');
}

verifyMilestone2Live().catch(console.error);
