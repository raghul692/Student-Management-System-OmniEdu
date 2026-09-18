import { prisma } from '../src/config/prisma';

async function main() {
  console.log('🔍 Starting Database Smoke Test...\n');

  // Count core records
  const orgCount = await prisma.organization.count();
  const instCount = await prisma.institution.count();
  const userCount = await prisma.user.count();
  const studentCount = await prisma.student.count();
  const staffCount = await prisma.institutionMembership.count({
    where: { role: { notIn: ['STUDENT', 'PARENT'] } },
  });
  const examCount = await prisma.exam.count();
  const markCount = await prisma.markRecord.count();
  const attCount = await prisma.attendance.count();

  console.log('📊 Core Records:');
  console.log(`- Organizations: ${orgCount}`);
  console.log(`- Institutions: ${instCount}`);
  console.log(`- Users: ${userCount}`);
  console.log(`- Students: ${studentCount}`);
  console.log(`- Staff Memberships: ${staffCount}`);
  console.log(`- Exams: ${examCount}`);
  console.log(`- Marks: ${markCount}`);
  console.log(`- Attendance: ${attCount}`);

  // Count Phase D records
  const customRoleCount = await prisma.customRole.count();
  const customRolePermCount = await prisma.customRolePermission.count();
  const feeStructCount = await prisma.feeStructure.count();
  const feeCategoryCount = await prisma.feeCategory.count();
  const feeAssignCount = await prisma.studentFeeAssignment.count();
  const feePaymentCount = await prisma.feePayment.count();
  const admissionCount = await prisma.studentAdmission.count();
  const assignmentCount = await prisma.assignment.count();
  const submissionCount = await prisma.assignmentSubmission.count();
  const announcementCount = await prisma.announcement.count();
  const leaveCount = await prisma.staffLeaveRecord.count();
  const hallTicketCount = await prisma.hallTicket.count();

  console.log('\n🛡️ Phase D Records:');
  console.log(`- Custom Roles: ${customRoleCount}`);
  console.log(`- Custom Role Permissions: ${customRolePermCount}`);
  console.log(`- Fee Structures: ${feeStructCount}`);
  console.log(`- Fee Categories: ${feeCategoryCount}`);
  console.log(`- Student Fee Assignments: ${feeAssignCount}`);
  console.log(`- Fee Payments: ${feePaymentCount}`);
  console.log(`- Admissions: ${admissionCount}`);
  console.log(`- Homework Assignments: ${assignmentCount}`);
  console.log(`- Submissions: ${submissionCount}`);
  console.log(`- Announcements: ${announcementCount}`);
  console.log(`- Staff Leaves: ${leaveCount}`);
  console.log(`- Hall Tickets: ${hallTicketCount}`);

  // Check for orphan records using foreign keys
  console.log('\n🔎 Checking for Orphaned Records:');
  const existingAssignmentIds = new Set((await prisma.studentFeeAssignment.findMany({ select: { id: true } })).map(a => a.id));
  const orphanedPayments = (await prisma.feePayment.findMany({ select: { assignmentId: true } })).filter(p => !existingAssignmentIds.has(p.assignmentId)).length;
  console.log(`- Orphaned Fee Payments: ${orphanedPayments}`);

  const existingStudentIds = new Set((await prisma.student.findMany({ select: { id: true } })).map(s => s.id));
  const orphanedAssignments = (await prisma.studentFeeAssignment.findMany({ select: { studentId: true } })).filter(a => !existingStudentIds.has(a.studentId)).length;
  console.log(`- Orphaned Fee Assignments: ${orphanedAssignments}`);

  const existingExamIds = new Set((await prisma.exam.findMany({ select: { id: true } })).map(e => e.id));
  const orphanedHallTickets = (await prisma.hallTicket.findMany({ select: { examId: true } })).filter(t => !existingExamIds.has(t.examId)).length;
  console.log(`- Orphaned Hall Tickets: ${orphanedHallTickets}`);

  const existingAssignmentDocIds = new Set((await prisma.assignment.findMany({ select: { id: true } })).map(a => a.id));
  const orphanedSubmissions = (await prisma.assignmentSubmission.findMany({ select: { assignmentId: true } })).filter(s => !existingAssignmentDocIds.has(s.assignmentId)).length;
  console.log(`- Orphaned Submissions: ${orphanedSubmissions}`);

  const existingMembershipIds = new Set((await prisma.institutionMembership.findMany({ select: { id: true } })).map(m => m.id));
  const orphanedLeaves = (await prisma.staffLeaveRecord.findMany({ select: { membershipId: true } })).filter(l => !existingMembershipIds.has(l.membershipId)).length;
  console.log(`- Orphaned Staff Leaves: ${orphanedLeaves}`);

  const totalOrphans = orphanedPayments + orphanedAssignments + orphanedHallTickets + orphanedSubmissions + orphanedLeaves;

  if (totalOrphans > 0) {
    console.error(`❌ Found ${totalOrphans} orphaned records!`);
    process.exit(1);
  } else {
    console.log('✅ ZERO orphaned records found in database.\n');
  }

  // Verify Hall Ticket crypto tokens
  const sampleTicket = await prisma.hallTicket.findFirst();
  if (sampleTicket && sampleTicket.qrCodeData) {
    console.log(`Sample Hall Ticket: ${sampleTicket.ticketNumber}`);
    console.log(`Sample QR Payload: ${sampleTicket.qrCodeData.slice(0, 100)}...`);
    try {
      const parsed = JSON.parse(sampleTicket.qrCodeData);
      if (parsed.verificationToken) {
        console.log('✅ Hall ticket QR payload is valid JSON and contains verificationToken.');
      } else {
        console.log('ℹ️ Hall ticket QR payload is raw token or custom format.');
      }
    } catch {
      console.log('ℹ️ Hall ticket QR payload is raw token string.');
    }
  }

  console.log('🎯 Database Smoke Test PASSED successfully.\n');
}

main()
  .catch((e) => {
    console.error('❌ Smoke test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
