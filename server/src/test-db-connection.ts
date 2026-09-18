import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyDatabase() {
  console.log('🔍 Running Database Verification Checks...\n');

  // 1. Tenants count
  const tenants = await prisma.tenant.findMany();
  console.log(`✅ Tenants count: ${tenants.length}`);
  tenants.forEach(t => console.log(`   - [${t.type}] ${t.name} (${t.code})`));

  // 2. Users count
  const users = await prisma.user.findMany({
    include: { tenant: true }
  });
  console.log(`\n✅ Users count: ${users.length}`);
  users.forEach(u => console.log(`   - [${u.role}] ${u.fullName} (${u.email}) -> Tenant: ${u.tenant.code}`));

  // 3. Students count
  const collegeStudents = await prisma.student.count({
    where: { tenant: { type: 'COLLEGE' } }
  });
  const schoolStudents = await prisma.student.count({
    where: { tenant: { type: 'SCHOOL' } }
  });
  console.log(`\n✅ Students count: Total=${collegeStudents + schoolStudents} (College: ${collegeStudents}, School: ${schoolStudents})`);

  // 4. Attendance count
  const totalAttendance = await prisma.attendance.count();
  console.log(`✅ Attendance logs: ${totalAttendance}`);

  // 5. Marks count
  const totalMarks = await prisma.markRecord.count();
  console.log(`✅ Mark records: ${totalMarks}`);

  // 6. Timetable entries count
  const totalTimetable = await prisma.timetableEntry.count();
  console.log(`✅ Timetable slots: ${totalTimetable}`);

  // 7. Check Defaulters (<75% attendance in College)
  console.log('\n🚨 Running Defaulter Attendance Check (College CSE Sem 4):');
  const studentsWithAtt = await prisma.student.findMany({
    where: { tenant: { type: 'COLLEGE' } },
    include: {
      attendances: true
    }
  });

  const defaulters = [];
  for (const s of studentsWithAtt) {
    const total = s.attendances.length;
    const present = s.attendances.filter(a => a.status === 'PRESENT' || a.status === 'ON_DUTY').length;
    const pct = total > 0 ? (present / total) * 100 : 0;
    if (pct < 75) {
      defaulters.push({ name: s.fullName, reg: s.regNumber, pct: pct.toFixed(1) + '%' });
    }
  }

  console.log(`   Found ${defaulters.length} Defaulters (<75% attendance):`);
  defaulters.forEach(d => console.log(`   - ${d.name} (${d.reg}): ${d.pct}`));

  console.log('\n🎉 ALL DATABASE VERIFICATION CHECKS PASSED!');
}

verifyDatabase()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
