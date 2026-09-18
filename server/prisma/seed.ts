import {
  PrismaClient,
  OrgType,
  InstitutionType,
  SystemRole,
  InstitutionRole,
  AttendanceStatus,
  ExamType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 OmniEdu — Multi-Tenant ERP Seeding...\n');

  // ── Cleanup in safe dependency order ─────────────────────────────────────
  await prisma.feePayment.deleteMany();
  await prisma.studentFeeAssignment.deleteMany();
  await prisma.feeCategory.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.courseRegistration.deleteMany();
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.hallTicket.deleteMany();
  await prisma.examSchedule.deleteMany();
  await prisma.attendanceCorrectionRequest.deleteMany();
  await prisma.studentDocument.deleteMany();
  await prisma.studentPromotionHistory.deleteMany();
  await prisma.studentAdmission.deleteMany();
  await prisma.staffLeaveRecord.deleteMany();
  await prisma.customRolePermission.deleteMany();
  await prisma.customRole.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.importJob.deleteMany();
  await prisma.institutionSetting.deleteMany();
  await prisma.parentStudentLink.deleteMany();
  await prisma.studentEnrollment.deleteMany();
  await prisma.courseOffering.deleteMany();
  await prisma.schoolSubject.deleteMany();
  await prisma.regulation.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.markRecord.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.student.deleteMany();
  await prisma.course.deleteMany();
  await prisma.program.deleteMany();
  await prisma.schoolClass.deleteMany();
  await prisma.department.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.institutionMembership.deleteMany();
  await prisma.organizationMembership.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
  console.log('🧹 Cleaned all records.\n');

  const passwordHash = await bcrypt.hash('Apollo@2026', 10);

  // ── 1. SEED PERMISSIONS & ROLE PERMISSIONS ────────────────────────────────
  const permDefs = [
    // Institution Admin — full institution scope
    { resource: 'students',   action: 'read',   scope: 'institution' },
    { resource: 'students',   action: 'write',  scope: 'institution' },
    { resource: 'students',   action: 'delete', scope: 'institution' },
    { resource: 'students',   action: 'export', scope: 'institution' },
    { resource: 'attendance', action: 'read',   scope: 'institution' },
    { resource: 'attendance', action: 'write',  scope: 'institution' },
    { resource: 'marks',      action: 'read',   scope: 'institution' },
    { resource: 'marks',      action: 'write',  scope: 'institution' },
    { resource: 'reports',    action: 'read',   scope: 'institution' },
    { resource: 'reports',    action: 'export', scope: 'institution' },
    { resource: 'users',      action: 'read',   scope: 'institution' },
    { resource: 'users',      action: 'write',  scope: 'institution' },
    { resource: 'settings',   action: 'read',   scope: 'institution' },
    { resource: 'settings',   action: 'write',  scope: 'institution' },
    // HOD — department scope
    { resource: 'students',   action: 'read',   scope: 'department' },
    { resource: 'students',   action: 'export', scope: 'department' },
    { resource: 'attendance', action: 'read',   scope: 'department' },
    { resource: 'marks',      action: 'read',   scope: 'department' },
    { resource: 'reports',    action: 'read',   scope: 'department' },
    { resource: 'reports',    action: 'export', scope: 'department' },
    // Faculty — assigned scope
    { resource: 'students',   action: 'read',   scope: 'assigned' },
    { resource: 'attendance', action: 'read',   scope: 'assigned' },
    { resource: 'attendance', action: 'write',  scope: 'assigned' },
    { resource: 'marks',      action: 'read',   scope: 'assigned' },
    { resource: 'marks',      action: 'write',  scope: 'assigned' },
    // Class Teacher — class scope
    { resource: 'students',   action: 'read',   scope: 'class' },
    { resource: 'attendance', action: 'read',   scope: 'class' },
    { resource: 'attendance', action: 'write',  scope: 'class' },
    { resource: 'marks',      action: 'read',   scope: 'class' },
    { resource: 'marks',      action: 'write',  scope: 'class' },
    // Student — self
    { resource: 'students',   action: 'read',   scope: 'self' },
    { resource: 'attendance', action: 'read',   scope: 'self' },
    { resource: 'marks',      action: 'read',   scope: 'self' },
    // Parent — child
    { resource: 'attendance', action: 'read',   scope: 'child' },
    { resource: 'marks',      action: 'read',   scope: 'child' },
    // Guest — read-only institution
    { resource: 'students',   action: 'read',   scope: 'institution' },
    { resource: 'attendance', action: 'read',   scope: 'institution' },
    { resource: 'marks',      action: 'read',   scope: 'institution' },
  ];

  // Deduplicate
  const uniquePerms = Array.from(
    new Map(permDefs.map((p) => [`${p.resource}:${p.action}:${p.scope}`, p])).values()
  );

  const createdPerms = await Promise.all(
    uniquePerms.map((p) =>
      prisma.permission.create({ data: { ...p, description: `${p.action} ${p.resource} at ${p.scope} scope` } })
    )
  );

  const permMap: Record<string, string> = {};
  createdPerms.forEach((p) => { permMap[`${p.resource}:${p.action}:${p.scope}`] = p.id; });

  const rolePermMapping: { role: InstitutionRole; keys: string[] }[] = [
    {
      role: InstitutionRole.INSTITUTION_ADMIN,
      keys: [
        'students:read:institution','students:write:institution','students:delete:institution','students:export:institution',
        'attendance:read:institution','attendance:write:institution',
        'marks:read:institution','marks:write:institution',
        'reports:read:institution','reports:export:institution',
        'users:read:institution','users:write:institution',
        'settings:read:institution','settings:write:institution',
      ],
    },
    {
      role: InstitutionRole.HOD,
      keys: [
        'students:read:department','students:export:department',
        'attendance:read:department',
        'marks:read:department',
        'reports:read:department','reports:export:department',
      ],
    },
    {
      role: InstitutionRole.FACULTY,
      keys: [
        'students:read:assigned',
        'attendance:read:assigned','attendance:write:assigned',
        'marks:read:assigned','marks:write:assigned',
      ],
    },
    {
      role: InstitutionRole.CLASS_ADVISOR,
      keys: [
        'students:read:assigned',
        'attendance:read:assigned','attendance:write:assigned',
        'marks:read:assigned',
      ],
    },
    {
      role: InstitutionRole.CLASS_TEACHER,
      keys: [
        'students:read:class',
        'attendance:read:class','attendance:write:class',
        'marks:read:class','marks:write:class',
      ],
    },
    {
      role: InstitutionRole.STUDENT,
      keys: ['students:read:self','attendance:read:self','marks:read:self'],
    },
    {
      role: InstitutionRole.PARENT,
      keys: ['attendance:read:child','marks:read:child'],
    },
    {
      role: InstitutionRole.GUEST,
      keys: ['students:read:institution','attendance:read:institution','marks:read:institution'],
    },
  ];

  for (const { role, keys } of rolePermMapping) {
    await Promise.all(
      keys.map((key) => {
        const permId = permMap[key];
        if (!permId) return Promise.resolve();
        return prisma.rolePermission.upsert({
          where: { institutionRole_permissionId: { institutionRole: role, permissionId: permId } },
          create: { institutionRole: role, permissionId: permId },
          update: {},
        });
      })
    );
  }
  console.log('🔑 Seeded Permissions & Role-Permission mappings.\n');

  // ── 2. CREATE ORGANIZATION ────────────────────────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'Apollo Educational Trust',
      slug: 'apollo-trust',
      type: OrgType.SCHOOL_AND_COLLEGE,
      address: '77 Trust Road, Chennai, Tamil Nadu 600001',
      phone: '+91 44 2828 1000',
      email: 'chairman@apollo.edu',
      planTier: 'ENTERPRISE',
    },
  });
  console.log(`🏛️  Organization: ${org.name} [${org.slug}]`);

  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

  await prisma.subscription.upsert({
    where: { organizationId: org.id },
    create: {
      organizationId: org.id,
      planTier: 'ENTERPRISE',
      status: 'ACTIVE',
      maxInstitutions: 50,
      maxStudents: 50000,
      maxStorageGb: 500,
      currentPeriodEnd: oneYearFromNow,
    },
    update: {
      planTier: 'ENTERPRISE',
      status: 'ACTIVE',
    },
  });

  // ── 3. CREATE INSTITUTIONS ────────────────────────────────────────────────
  const collegeInst = await prisma.institution.create({
    data: {
      organizationId: org.id,
      name: 'Apollo Institute of Technology',
      code: 'AIT-001',
      type: InstitutionType.COLLEGE,
      address: 'GST Road, Chengalpattu, Tamil Nadu 603001',
      phone: '+91 44 2745 5000',
      email: 'info@ait.apollo.edu',
      affiliatedUniversity: 'Anna University',
      regulationYear: '2021',
    },
  });

  const schoolInst = await prisma.institution.create({
    data: {
      organizationId: org.id,
      name: 'Apollo Matriculation Higher Secondary School',
      code: 'AMHSS-001',
      type: InstitutionType.SCHOOL,
      address: 'Bazaar Road, Tambaram, Chennai 600045',
      phone: '+91 44 2226 3000',
      email: 'school@apollo.edu',
      board: 'State Board',
      standardFrom: 6,
      standardTo: 12,
    },
  });
  console.log(`🎓 Institutions: ${collegeInst.name} | ${schoolInst.name}`);

  // Academic Years
  await prisma.academicYear.create({ data: { institutionId: collegeInst.id, label: '2025-2026', startDate: new Date('2025-07-01'), endDate: new Date('2026-06-30'), isCurrent: true } });
  await prisma.academicYear.create({ data: { institutionId: schoolInst.id, label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-03-31'), isCurrent: true } });

  // ── 4. CREATE USERS ───────────────────────────────────────────────────────
  const trustAdmin = await prisma.user.create({
    data: { email: 'trust.admin@apollo.edu', passwordHash, fullName: 'Dr. K. Rajagopal', phone: '+91 98400 11223', systemRole: SystemRole.ORG_ADMIN },
  });
  const collegePrincipal = await prisma.user.create({
    data: { email: 'principal.eng@apollo.edu', passwordHash, fullName: 'Dr. S. Sundaram', phone: '+91 98401 22334' },
  });
  const schoolPrincipal = await prisma.user.create({
    data: { email: 'principal.sch@apollo.edu', passwordHash, fullName: 'Mrs. P. Shanthi', phone: '+91 98402 33445' },
  });
  const hodCSE = await prisma.user.create({
    data: { email: 'hod.cse@apollo.edu', passwordHash, fullName: 'Dr. M. Lakshmi', phone: '+91 98403 44556' },
  });
  const facultyDbms = await prisma.user.create({
    data: { email: 'faculty.dbms@apollo.edu', passwordHash, fullName: 'Prof. R. Vignesh', phone: '+91 98404 55667' },
  });
  const teacherMath = await prisma.user.create({
    data: { email: 'teacher.math@apollo.edu', passwordHash, fullName: 'Mr. A. Ramesh', phone: '+91 98405 66778' },
  });
  const guestUser = await prisma.user.create({
    data: { email: 'demo.guest@apollo.edu', passwordHash, fullName: 'Guest Explorer', phone: '+91 90000 00000' },
  });
  console.log('👥 Created 7 Users.');

  // ── 5. ORGANIZATION MEMBERSHIPS ───────────────────────────────────────────
  await prisma.organizationMembership.createMany({
    data: [
      { userId: trustAdmin.id, organizationId: org.id, role: SystemRole.ORG_ADMIN },
      { userId: collegePrincipal.id, organizationId: org.id, role: SystemRole.ORG_MEMBER },
      { userId: schoolPrincipal.id, organizationId: org.id, role: SystemRole.ORG_MEMBER },
      { userId: hodCSE.id, organizationId: org.id, role: SystemRole.ORG_MEMBER },
      { userId: facultyDbms.id, organizationId: org.id, role: SystemRole.ORG_MEMBER },
      { userId: teacherMath.id, organizationId: org.id, role: SystemRole.ORG_MEMBER },
      { userId: guestUser.id, organizationId: org.id, role: SystemRole.ORG_MEMBER },
    ],
  });

  // ── 6. COLLEGE ACADEMIC STRUCTURE ────────────────────────────────────────
  const deptCSE = await prisma.department.create({ data: { institutionId: collegeInst.id, name: 'Computer Science & Engineering', code: 'CSE', hodName: 'Dr. M. Lakshmi', hodUserId: hodCSE.id } });
  const deptECE = await prisma.department.create({ data: { institutionId: collegeInst.id, name: 'Electronics & Communication Engineering', code: 'ECE', hodName: 'Dr. V. Murugan' } });
  const deptMECH = await prisma.department.create({ data: { institutionId: collegeInst.id, name: 'Mechanical Engineering', code: 'MECH', hodName: 'Dr. K. Selvam' } });

  const progBECSE = await prisma.program.create({ data: { institutionId: collegeInst.id, deptId: deptCSE.id, name: 'B.E. Computer Science & Engineering', code: 'BE-CSE', regulationYear: '2021' } });

  // ── 7. INSTITUTION MEMBERSHIPS ───────────────────────────────────────────
  await prisma.institutionMembership.createMany({
    data: [
      { userId: trustAdmin.id, institutionId: collegeInst.id, role: InstitutionRole.INSTITUTION_ADMIN },
      { userId: trustAdmin.id, institutionId: schoolInst.id, role: InstitutionRole.INSTITUTION_ADMIN },
      { userId: collegePrincipal.id, institutionId: collegeInst.id, role: InstitutionRole.INSTITUTION_ADMIN },
      { userId: schoolPrincipal.id, institutionId: schoolInst.id, role: InstitutionRole.INSTITUTION_ADMIN },
      { userId: hodCSE.id, institutionId: collegeInst.id, role: InstitutionRole.HOD, deptId: deptCSE.id },
      { userId: facultyDbms.id, institutionId: collegeInst.id, role: InstitutionRole.FACULTY, deptId: deptCSE.id },
      { userId: guestUser.id, institutionId: collegeInst.id, role: InstitutionRole.GUEST },
      { userId: guestUser.id, institutionId: schoolInst.id, role: InstitutionRole.GUEST },
    ],
  });

  // ── 8. COLLEGE COURSES ────────────────────────────────────────────────────
  const courseDBMS = await prisma.course.create({ data: { institutionId: collegeInst.id, deptId: deptCSE.id, courseCode: 'CS8492', title: 'Database Management Systems', semester: 4, credits: 3, regulationYear: '2021' } });
  const courseDAA  = await prisma.course.create({ data: { institutionId: collegeInst.id, deptId: deptCSE.id, courseCode: 'CS8451', title: 'Design and Analysis of Algorithms', semester: 4, credits: 4, regulationYear: '2021' } });
  const courseCA   = await prisma.course.create({ data: { institutionId: collegeInst.id, deptId: deptCSE.id, courseCode: 'CS8491', title: 'Computer Architecture', semester: 4, credits: 3, regulationYear: '2021' } });
  const courseOSLab= await prisma.course.create({ data: { institutionId: collegeInst.id, deptId: deptCSE.id, courseCode: 'CS8461', title: 'Operating Systems Laboratory', semester: 4, credits: 2, isLab: true, regulationYear: '2021' } });
  console.log('📚 College Courses: CS8492, CS8451, CS8491, CS8461 (Anna Univ R2021)');

  // ── 9. SCHOOL CLASSES ─────────────────────────────────────────────────────
  const class10A = await prisma.schoolClass.create({ data: { institutionId: schoolInst.id, standard: 10, section: 'A', classTeacher: 'Mr. A. Ramesh' } });
  const class10B = await prisma.schoolClass.create({ data: { institutionId: schoolInst.id, standard: 10, section: 'B', classTeacher: 'Mrs. K. Malathi' } });
  const class12A = await prisma.schoolClass.create({ data: { institutionId: schoolInst.id, standard: 12, section: 'A', classTeacher: 'Dr. G. Sivakumar' } });

  // Assign teacher to class
  await prisma.institutionMembership.create({
    data: { userId: teacherMath.id, institutionId: schoolInst.id, role: InstitutionRole.CLASS_TEACHER, classId: class10A.id },
  });

  // ── 10. COLLEGE STUDENTS ──────────────────────────────────────────────────
  const collegeStudentNames = [
    { name: 'Arun Kumar M', gender: 'MALE' },        // idx 0
    { name: 'Balaji R', gender: 'MALE' },
    { name: 'Bhavani M', gender: 'FEMALE' },
    { name: 'Deepika S', gender: 'FEMALE' },
    { name: 'Dinesh Karthik K', gender: 'MALE' },
    { name: 'Divya Bharathi P', gender: 'FEMALE' },
    { name: 'Ganesh Moorthy S', gender: 'MALE' },
    { name: 'Gayathri N', gender: 'FEMALE' },
    { name: 'Gokulnath R', gender: 'MALE' },
    { name: 'Hansika Sri V', gender: 'FEMALE' },
    { name: 'Harish Kumar S', gender: 'MALE' },      // idx 10
    { name: 'Indrajith K', gender: 'MALE' },
    { name: 'Jeeva Anandhan P', gender: 'MALE' },
    { name: 'Karthikeyan V', gender: 'MALE' },
    { name: 'Keerthana S', gender: 'FEMALE' },       // idx 14 - Defaulter 68%
    { name: 'Kowsalya Devi P', gender: 'FEMALE' },
    { name: 'Manoj Kumar R', gender: 'MALE' },
    { name: 'Meenakshi Sundaram S', gender: 'MALE' },
    { name: 'Naveen Prashanth S', gender: 'MALE' },
    { name: 'Nithya Shree B', gender: 'FEMALE' },
    { name: 'Pooja Varshini K', gender: 'FEMALE' },  // idx 20
    { name: 'Praveen Raj M', gender: 'MALE' },       // idx 21 - Defaulter 62%
    { name: 'Rahul Madhavan T', gender: 'MALE' },
    { name: 'Ramya Krishnan R', gender: 'FEMALE' },
    { name: 'Sanjay Varshan V', gender: 'MALE' },
    { name: 'Sneha Priya P', gender: 'FEMALE' },
    { name: 'Surya Prakash K', gender: 'MALE' },
    { name: 'Swetha Manoharan M', gender: 'FEMALE' },
    { name: 'Vigneshwaran S', gender: 'MALE' },
    { name: 'Vinoth Kumar K', gender: 'MALE' },      // idx 29 - Detained 54%
  ];

  const collegeStudents = [];
  for (let i = 0; i < collegeStudentNames.length; i++) {
    const regNumber = `9100231040${(i + 1).toString().padStart(2, '0')}`;
    const s = await prisma.student.create({
      data: {
        institutionId: collegeInst.id,
        fullName: collegeStudentNames[i].name,
        gender: collegeStudentNames[i].gender,
        regNumber,
        deptId: deptCSE.id,
        programId: progBECSE.id,
        semester: 4,
        batchYear: '2023-2027',
        regulationYear: '2021',
        email: `${regNumber}@student.ait.apollo.edu`,
        phone: `+91 97890 ${10000 + i}`,
        guardianName: `${collegeStudentNames[i].name.split(' ')[0]}'s Parent`,
        guardianPhone: `+91 94440 ${10000 + i}`,
      },
    });
    collegeStudents.push(s);
  }
  console.log(`👨‍🎓 Created ${collegeStudents.length} College Students.`);

  // ── 11. COLLEGE ATTENDANCE ────────────────────────────────────────────────
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 35);
  const collegeCourses = [courseDBMS, courseDAA, courseCA, courseOSLab];
  let attCount = 0;

  for (let dayOff = 0; dayOff < 35; dayOff++) {
    const logDate = new Date(baseDate);
    logDate.setDate(baseDate.getDate() + dayOff);
    if (logDate.getDay() === 0) continue;

    for (let hour = 1; hour <= 4; hour++) {
      const activeCourse = collegeCourses[hour - 1];
      for (let sIdx = 0; sIdx < collegeStudents.length; sIdx++) {
        const s = collegeStudents[sIdx];
        let status = AttendanceStatus.PRESENT;
        if (sIdx === 29 && (dayOff * 4 + hour) % 2 === 0) status = AttendanceStatus.ABSENT;
        else if (sIdx === 21 && (dayOff * 4 + hour) % 3 === 0) status = AttendanceStatus.ABSENT;
        else if (sIdx === 14 && (dayOff * 4 + hour) % 4 === 0) status = AttendanceStatus.ABSENT;
        else {
          const r = Math.random();
          if (r < 0.04) status = AttendanceStatus.ABSENT;
          else if (r < 0.07) status = AttendanceStatus.ON_DUTY;
        }
        await prisma.attendance.create({
          data: { institutionId: collegeInst.id, studentId: s.id, date: logDate, hour, courseId: activeCourse.id, status },
        });
        attCount++;
      }
    }
  }
  console.log(`📊 ${attCount} College Attendance records.`);

  // ── 12. COLLEGE EXAMS & MARKS ──────────────────────────────────────────────
  const examIAT1 = await prisma.exam.create({ data: { institutionId: collegeInst.id, title: 'Internal Assessment Test 1 (IAT-1)', type: ExamType.IAT_1, academicYear: '2025-2026', semester: 4, startDate: new Date('2026-02-15') } });
  const examIAT2 = await prisma.exam.create({ data: { institutionId: collegeInst.id, title: 'Internal Assessment Test 2 (IAT-2)', type: ExamType.IAT_2, academicYear: '2025-2026', semester: 4, startDate: new Date('2026-04-10') } });

  let markCount = 0;
  for (const exam of [examIAT1, examIAT2]) {
    for (const student of collegeStudents) {
      for (const course of collegeCourses) {
        let internalMarks = Math.floor(Math.random() * 10) + 28;
        let externalMarks = Math.floor(Math.random() * 20) + 38;
        let marksObtained = internalMarks + externalMarks;
        let grade = 'A', gradePoints = 8.0, isPassed = true;

        if (student.regNumber?.endsWith('30') && course.courseCode === 'CS8451') {
          internalMarks = 14; externalMarks = 22; marksObtained = 36;
          grade = 'RA'; gradePoints = 0.0; isPassed = false;
        } else if (student.regNumber?.endsWith('22') && course.courseCode === 'CS8492') {
          grade = 'SA'; gradePoints = 0.0; isPassed = false;
        } else if (marksObtained >= 91) { grade = 'O'; gradePoints = 10.0; }
        else if (marksObtained >= 81) { grade = 'A+'; gradePoints = 9.0; }
        else if (marksObtained >= 71) { grade = 'A'; gradePoints = 8.0; }
        else if (marksObtained >= 61) { grade = 'B+'; gradePoints = 7.0; }
        else { grade = 'B'; gradePoints = 6.0; }

        await prisma.markRecord.create({
          data: { institutionId: collegeInst.id, examId: exam.id, studentId: student.id, courseId: course.id, subjectName: course.title, internalMarks, externalMarks, marksObtained, maxMarks: 100, grade, gradePoints, creditsEarned: isPassed ? course.credits : 0, isPassed },
        });
        markCount++;
      }
    }
  }
  console.log(`📝 ${markCount} College Mark Records (Anna Univ R2021 with RA/SA tags).`);

  // College Timetable
  for (let day = 1; day <= 5; day++) {
    for (let slot = 1; slot <= 4; slot++) {
      const course = collegeCourses[(day + slot) % collegeCourses.length];
      await prisma.timetableEntry.create({
        data: { institutionId: collegeInst.id, dayOfWeek: day, slotNumber: slot, startTime: `${8 + slot}:30`, endTime: `${9 + slot}:20`, deptId: deptCSE.id, semester: 4, courseId: course.id, subjectName: course.title, facultyName: slot === 1 ? 'Prof. R. Vignesh' : 'Dr. M. Lakshmi', roomNumber: course.isLab ? 'Lab-OS-02' : 'LH-302' },
      });
    }
  }

  // ── 13. SCHOOL STUDENTS ───────────────────────────────────────────────────
  const schoolStudentNames = [
    'Aadhavan K','Abinaya S','Adithya R','Ananya M','Bharath Kumar V',
    'Chandru P','Dharani S','Elango M','Fathima Banu S','Gowtham K',
    'Harini R','Hariharan T','Iswarya S','Jaganathan M','Kavitha V',
    'Logeshwaran S','Madhumitha K','Nandhini P','Praveena R','Rohit Sharma S',
    'Sai Saran M','Tamilselvan K','Varun Raj S','Yamini B','Yuvan Shankar P',
  ];

  const schoolStudents = [];
  for (let i = 0; i < schoolStudentNames.length; i++) {
    const rollNumber = `10A-${(i + 1).toString().padStart(2, '0')}`;
    const s = await prisma.student.create({
      data: { institutionId: schoolInst.id, fullName: schoolStudentNames[i], gender: i % 2 === 0 ? 'MALE' : 'FEMALE', rollNumber, classId: class10A.id, batchYear: '2025-2026', email: `student.${rollNumber.toLowerCase()}@school.apollo.edu`, phone: `+91 96000 ${20000 + i}`, guardianName: `${schoolStudentNames[i].split(' ')[0]}'s Parent`, guardianPhone: `+91 94441 ${20000 + i}` },
    });
    schoolStudents.push(s);
  }
  console.log(`🎒 ${schoolStudents.length} School Students (10th-A).`);

  // School Attendance
  let schAttCount = 0;
  for (let dayOff = 0; dayOff < 20; dayOff++) {
    const logDate = new Date(baseDate);
    logDate.setDate(baseDate.getDate() + dayOff);
    if (logDate.getDay() === 0) continue;
    for (let period = 1; period <= 5; period++) {
      for (const s of schoolStudents) {
        await prisma.attendance.create({
          data: { institutionId: schoolInst.id, studentId: s.id, date: logDate, period, status: Math.random() < 0.05 ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT },
        });
        schAttCount++;
      }
    }
  }
  console.log(`📅 ${schAttCount} School Attendance records.`);

  // School Exam & Marks
  const examQtly = await prisma.exam.create({ data: { institutionId: schoolInst.id, title: 'Quarterly Examination 2025-2026', type: ExamType.QUARTERLY, academicYear: '2025-2026', standard: 10, startDate: new Date('2025-09-20') } });
  const schoolSubjects = ['Tamil', 'English', 'Mathematics', 'Science', 'Social Science'];
  let schMarkCount = 0;
  for (const s of schoolStudents) {
    for (const subj of schoolSubjects) {
      const m = Math.floor(Math.random() * 35) + 60;
      let grade = 'B1';
      if (m >= 91) grade = 'A1'; else if (m >= 81) grade = 'A2'; else if (m >= 71) grade = 'B1'; else if (m >= 61) grade = 'B2'; else grade = 'C1';
      await prisma.markRecord.create({ data: { institutionId: schoolInst.id, examId: examQtly.id, studentId: s.id, subjectName: subj, marksObtained: m, maxMarks: 100, grade, isPassed: true } });
      schMarkCount++;
    }
  }
  console.log(`📋 ${schMarkCount} School Mark records.`);

  // School Timetable
  for (let day = 1; day <= 5; day++) {
    for (let period = 1; period <= 5; period++) {
      await prisma.timetableEntry.create({
        data: { institutionId: schoolInst.id, dayOfWeek: day, slotNumber: period, startTime: `${9 + period}:00`, endTime: `${9 + period}:45`, classId: class10A.id, subjectName: schoolSubjects[(day + period) % schoolSubjects.length], facultyName: period === 3 ? 'Mr. A. Ramesh' : 'Mrs. P. Shanthi', roomNumber: 'Room 10-A' },
      });
    }
  }

  // ── 14. PHASE D SEED DATA ─────────────────────────────────────────────────
  // Custom Role: EXAM_COORDINATOR
  const customRoleExamCoord = await prisma.customRole.create({
    data: {
      institutionId: collegeInst.id,
      name: 'Exam Coordinator',
      code: 'EXAM_COORDINATOR',
      description: 'Manages examination schedules, hall tickets, and marks ledger',
      isSystem: false,
      isActive: true,
    },
  });

  const examPerms = await prisma.permission.findMany({
    where: {
      OR: [
        { resource: 'marks', scope: 'institution' },
        { resource: 'reports', scope: 'institution' },
      ],
    },
  });
  for (const p of examPerms) {
    await prisma.customRolePermission.create({
      data: {
        customRoleId: customRoleExamCoord.id,
        permissionId: p.id,
      },
    });
  }
  console.log('🛡️ Created Custom Role EXAM_COORDINATOR with permissions.');

  // Fee Structures & Categories
  const collegeFeeStruct = await prisma.feeStructure.create({
    data: {
      institutionId: collegeInst.id,
      name: 'B.E. CSE Annual Academic Fee 2025-2026',
      academicYear: '2025-2026',
      deptId: deptCSE.id,
      categories: {
        create: [
          { name: 'Tuition Fee', amount: 50000 },
          { name: 'Laboratory & Computing Facility', amount: 15000 },
          { name: 'Special Training & Placement', amount: 10000 },
          { name: 'Examination & Evaluation Fee', amount: 5000 },
        ],
      },
    },
  });

  const schoolFeeStruct = await prisma.feeStructure.create({
    data: {
      institutionId: schoolInst.id,
      name: 'Standard 10 Annual Academic Fee 2025-2026',
      academicYear: '2025-2026',
      standard: 10,
      categories: {
        create: [
          { name: 'Tuition Fee', amount: 25000 },
          { name: 'Extracurricular & Sports', amount: 5000 },
        ],
      },
    },
  });
  console.log('💳 Created Fee Structures for College (₹80,000) and School (₹30,000).');

  // Fee Assignments & Payments
  for (let i = 0; i < 5; i++) {
    const s = collegeStudents[i];
    const discount = i === 1 ? 20000 : 0;
    const netPayable = 80000 - discount;
    const assign = await prisma.studentFeeAssignment.create({
      data: {
        institutionId: collegeInst.id,
        studentId: s.id,
        feeStructureId: collegeFeeStruct.id,
        totalAmount: 80000,
        discountAmount: 0,
        scholarshipAmount: discount,
        netPayable,
        dueDate: new Date('2026-03-31'),
      },
    });

    if (i === 0) {
      await prisma.feePayment.create({
        data: {
          institutionId: collegeInst.id,
          assignmentId: assign.id,
          studentId: s.id,
          receiptNumber: 'REC-2026-000001',
          amountPaid: 40000,
          paymentMethod: 'ONLINE',
          transactionRef: 'TXN-HDFC-99182',
          recordedBy: collegePrincipal.id,
        },
      });
    } else if (i === 1) {
      await prisma.feePayment.create({
        data: {
          institutionId: collegeInst.id,
          assignmentId: assign.id,
          studentId: s.id,
          receiptNumber: 'REC-2026-000002',
          amountPaid: 60000,
          paymentMethod: 'BANK_TRANSFER',
          transactionRef: 'NEFT-SBI-44123',
          recordedBy: collegePrincipal.id,
        },
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    const s = schoolStudents[i];
    const assign = await prisma.studentFeeAssignment.create({
      data: {
        institutionId: schoolInst.id,
        studentId: s.id,
        feeStructureId: schoolFeeStruct.id,
        totalAmount: 30000,
        netPayable: 30000,
        dueDate: new Date('2026-03-31'),
      },
    });

    if (i === 0) {
      await prisma.feePayment.create({
        data: {
          institutionId: schoolInst.id,
          assignmentId: assign.id,
          studentId: s.id,
          receiptNumber: 'REC-2026-000003',
          amountPaid: 30000,
          paymentMethod: 'CASH',
          recordedBy: schoolPrincipal.id,
        },
      });
    }
  }
  console.log('💰 Seeded Fee Assignments & Recorded Payments.');

  // Student Admissions
  await prisma.studentAdmission.create({
    data: {
      institutionId: collegeInst.id,
      applicationNo: 'APP-2026-0001',
      applicantName: 'Naveen Kumar R',
      gender: 'MALE',
      dob: new Date('2005-04-12'),
      email: 'naveen.r@gmail.com',
      phone: '+91 97890 12345',
      guardianName: 'Ramasamy K',
      guardianPhone: '+91 98410 98765',
      academicYear: '2025-2026',
      appliedDeptId: deptCSE.id,
      status: 'APPROVED',
      admissionNumber: 'ADM-2026-0001',
      reviewedBy: collegePrincipal.id,
      reviewNotes: 'High cutoff score in mathematics and physics. Verified.',
    },
  });

  await prisma.studentAdmission.create({
    data: {
      institutionId: collegeInst.id,
      applicationNo: 'APP-2026-0002',
      applicantName: 'Sneha Priyadharshini M',
      gender: 'FEMALE',
      dob: new Date('2005-08-23'),
      email: 'sneha.priya@gmail.com',
      phone: '+91 97890 54321',
      guardianName: 'Murugesan V',
      guardianPhone: '+91 98410 12345',
      academicYear: '2025-2026',
      appliedDeptId: deptCSE.id,
      status: 'SUBMITTED',
    },
  });

  await prisma.studentAdmission.create({
    data: {
      institutionId: schoolInst.id,
      applicationNo: 'APP-2026-0003',
      applicantName: 'Vikramaditya S',
      gender: 'MALE',
      dob: new Date('2010-11-05'),
      guardianName: 'Senthil Nathan P',
      guardianPhone: '+91 99400 33221',
      academicYear: '2025-2026',
      appliedStandard: 10,
      status: 'REJECTED',
      reviewedBy: schoolPrincipal.id,
      reviewNotes: 'Transfer certificate missing required board counter-signature.',
    },
  });
  console.log('📋 Seeded Student Admissions (Approved, Submitted, Rejected).');

  // Homework Assignments & Submissions
  const collegeAssignment = await prisma.assignment.create({
    data: {
      institutionId: collegeInst.id,
      title: 'Database Normalization & BCNF Case Study',
      description: 'Deconstruct unnormalized transaction records into 3NF and BCNF schemas with dependency preservation proofs.',
      courseId: courseDBMS.id,
      subjectName: courseDBMS.title,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      teacherUserId: facultyDbms.id,
    },
  });

  await prisma.assignment.create({
    data: {
      institutionId: collegeInst.id,
      title: 'Algorithm Complexity Analysis Assignment',
      description: 'Recurrence relation proofs using Master Theorem and Substitution Method.',
      courseId: courseDAA.id,
      subjectName: courseDAA.title,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Overdue
      teacherUserId: facultyDbms.id,
    },
  });

  const schoolAssignment = await prisma.assignment.create({
    data: {
      institutionId: schoolInst.id,
      title: 'Quadratic Equations & Roots Practice',
      description: 'Solve textbook exercises 4.1 to 4.3 with step-by-step discriminant calculations.',
      classId: class10A.id,
      subjectName: 'Mathematics',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      teacherUserId: teacherMath.id,
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: collegeAssignment.id,
      studentId: collegeStudents[0].id,
      submissionText: 'https://github.com/omnieu/bcnf-decomposition-case-study',
      grade: 'A+',
      feedback: 'Clean BCNF decompositions and excellent dependency preservation analysis.',
      evaluatedAt: new Date(),
    },
  });

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: schoolAssignment.id,
      studentId: schoolStudents[0].id,
      submissionText: 'Completed 15 problems from Chapter 4 with complete proofs.',
    },
  });
  console.log('📝 Seeded Homework Assignments & Submissions.');

  // Announcements
  await prisma.announcement.create({
    data: {
      institutionId: collegeInst.id,
      title: 'IAT-1 Examination Hall Tickets Released',
      content: 'Hall tickets for Continuous Assessment Test 1 (IAT-1) are now available with cryptographic QR verification.',
      scope: 'INSTITUTION',
      authorName: 'Controller of Examinations',
      authorUserId: collegePrincipal.id,
      isPinned: true,
    },
  });

  await prisma.announcement.create({
    data: {
      institutionId: schoolInst.id,
      title: 'Parent-Teacher Meeting Scheduled for Term 1',
      content: 'The first term parent-teacher meeting is scheduled for next Saturday at 10:00 AM.',
      scope: 'INSTITUTION',
      authorName: 'Principal Office',
      authorUserId: schoolPrincipal.id,
      isPinned: true,
    },
  });
  console.log('📢 Seeded Institutional Announcements.');

  // Staff Leaves
  const facultyMembership = await prisma.institutionMembership.findFirst({
    where: { userId: facultyDbms.id, institutionId: collegeInst.id },
  });
  if (facultyMembership) {
    await prisma.staffLeaveRecord.create({
      data: {
        membershipId: facultyMembership.id,
        leaveType: 'CASUAL',
        startDate: new Date('2026-03-15'),
        endDate: new Date('2026-03-16'),
        reason: 'Attending national technology symposium as guest speaker',
        status: 'PENDING',
        approvedBy: null,
      },
    });
  }

  const teacherMembership = await prisma.institutionMembership.findFirst({
    where: { userId: teacherMath.id, institutionId: schoolInst.id },
  });
  if (teacherMembership) {
    await prisma.staffLeaveRecord.create({
      data: {
        membershipId: teacherMembership.id,
        leaveType: 'MEDICAL',
        startDate: new Date('2026-02-10'),
        endDate: new Date('2026-02-12'),
        reason: 'Viral fever recovery',
        status: 'APPROVED',
        approvedBy: schoolPrincipal.id,
      },
    });
  }
  console.log('🏖️ Seeded Staff Leave Records (Pending & Approved).');

  // Hall Tickets with Signed Crypto Tokens
  const jwtSecret = process.env.JWT_SECRET || 'omnieu_secret_key_change_in_prod';
  for (let i = 0; i < 5; i++) {
    const s = collegeStudents[i];
    const ticketNumber = `HT-IAT1-${s.regNumber || (i + 1)}`;
    const hmac = crypto
      .createHmac('sha256', jwtSecret)
      .update(`${collegeInst.id}:${examIAT1.id}:${s.id}:${ticketNumber}`)
      .digest('hex');
    const qrCodeData = `${ticketNumber}.${hmac}`;

    await prisma.hallTicket.create({
      data: {
        institutionId: collegeInst.id,
        examId: examIAT1.id,
        studentId: s.id,
        ticketNumber,
        roomNumber: 'LH-302',
        seatNumber: `S-${String(i + 1).padStart(2, '0')}`,
        isEligible: true,
        qrCodeData,
      },
    });
  }
  console.log('🎫 Seeded Cryptographically Signed Hall Tickets.');

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ SEEDING COMPLETE');
  console.log('═══════════════════════════════════════════════════');
  console.log('🔑 All passwords: Apollo@2026');
  console.log('  trust.admin@apollo.edu    → ORG_ADMIN (both institutions)');
  console.log('  principal.eng@apollo.edu  → INSTITUTION_ADMIN (College)');
  console.log('  principal.sch@apollo.edu  → INSTITUTION_ADMIN (School)');
  console.log('  hod.cse@apollo.edu        → HOD (CSE Dept, College)');
  console.log('  faculty.dbms@apollo.edu   → FACULTY (College)');
  console.log('  teacher.math@apollo.edu   → CLASS_TEACHER (10-A, School)');
  console.log('  demo.guest@apollo.edu     → GUEST (both institutions)');
  console.log('═══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('❌ Seeding error:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
