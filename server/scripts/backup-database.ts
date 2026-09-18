import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { prisma } from '../src/config/prisma';
import { logger } from '../src/config/logger';

async function generateBackup() {
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `omniedu_backup_${timestamp}.json`;
  const backupPath = path.join(backupDir, backupFileName);

  logger.info('Starting OmniEdu Database Backup...');

  // Extract critical tables in dependency order
  const [
    organizations,
    institutions,
    users,
    orgMemberships,
    instMemberships,
    departments,
    classes,
    regulations,
    academicYears,
    programs,
    courses,
    courseOfferings,
    schoolSubjects,
    students,
    attendances,
    exams,
    marks,
    feeStructures,
    feeAssignments,
    feePayments,
    admissions,
    announcements,
  ] = await Promise.all([
    prisma.organization.findMany(),
    prisma.institution.findMany(),
    prisma.user.findMany({ select: { id: true, email: true, fullName: true, phone: true, systemRole: true, isActive: true, createdAt: true, updatedAt: true } }),
    prisma.organizationMembership.findMany(),
    prisma.institutionMembership.findMany(),
    prisma.department.findMany(),
    prisma.schoolClass.findMany(),
    prisma.regulation.findMany(),
    prisma.academicYear.findMany(),
    prisma.program.findMany(),
    prisma.course.findMany(),
    prisma.courseOffering.findMany(),
    prisma.schoolSubject.findMany(),
    prisma.student.findMany(),
    prisma.attendance.findMany(),
    prisma.exam.findMany(),
    prisma.markRecord.findMany(),
    prisma.feeStructure.findMany(),
    prisma.studentFeeAssignment.findMany(),
    prisma.feePayment.findMany(),
    prisma.studentAdmission.findMany(),
    prisma.announcement.findMany(),
  ]);

  const backupData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      version: '2.0.0',
      system: 'OmniEdu Multi-Tenant ERP',
      counts: {
        organizations: organizations.length,
        institutions: institutions.length,
        users: users.length,
        students: students.length,
        attendances: attendances.length,
        exams: exams.length,
        marks: marks.length,
        feePayments: feePayments.length,
        admissions: admissions.length,
      },
    },
    tables: {
      organizations,
      institutions,
      users,
      orgMemberships,
      instMemberships,
      departments,
      classes,
      regulations,
      academicYears,
      programs,
      courses,
      courseOfferings,
      schoolSubjects,
      students,
      attendances,
      exams,
      marks,
      feeStructures,
      feeAssignments,
      feePayments,
      admissions,
      announcements,
    },
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  await fs.promises.writeFile(backupPath, jsonString, 'utf-8');

  // Compute checksum for tamper verification
  const checksum = crypto.createHash('sha256').update(jsonString).digest('hex');
  const sha256Path = `${backupPath}.sha256`;
  await fs.promises.writeFile(sha256Path, `${checksum}  ${backupFileName}\n`, 'utf-8');

  const metaPath = path.join(backupDir, `omniedu_backup_${timestamp}.meta.json`);
  await fs.promises.writeFile(
    metaPath,
    JSON.stringify(
      {
        backupFile: backupFileName,
        sizeBytes: Buffer.byteLength(jsonString),
        sha256: checksum,
        generatedAt: backupData.metadata.generatedAt,
        recordCounts: backupData.metadata.counts,
      },
      null,
      2
    )
  );

  logger.info(
    {
      backupPath,
      sizeBytes: Buffer.byteLength(jsonString),
      sha256: checksum,
      counts: backupData.metadata.counts,
    },
    'OmniEdu Backup Successfully Completed'
  );

  console.log(`\n✓ Backup saved to: ${backupPath}`);
  console.log(`✓ Checksum (SHA-256): ${checksum}`);
  console.log(`✓ Total Students: ${students.length}, Attendances: ${attendances.length}, Marks: ${marks.length}\n`);

  await prisma.$disconnect();
}

generateBackup().catch((err) => {
  console.error('Backup failed:', err);
  process.exit(1);
});
