import { prisma, requireInstitutionContext } from '../../config/prisma';
import { ImportJobStatus, InstitutionRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { logAuditEvent } from '../audit/audit.service';

export interface RowError {
  row: number;
  column: string;
  message: string;
  data: any;
}

export function parseCSV(rawText: string): Array<Record<string, string>> {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  }

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : '';
    });
    rows.push(row);
  }
  return rows;
}

function findValue(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') {
      return row[k];
    }
  }
  return '';
}

export async function previewImport(params: {
  entityType: 'STUDENTS' | 'FACULTY' | 'COURSES' | 'CLASSES' | 'SUBJECTS';
  csvContent: string;
  fileName?: string;
  fileSize?: number;
}) {
  const ctx = requireInstitutionContext();
  const rows = parseCSV(params.csvContent);

  if (rows.length === 0) {
    throw new Error('CSV file is empty or missing headers.');
  }

  const errors: RowError[] = [];
  const validData: any[] = [];

  // Pre-load reference maps for validation
  const departments = await prisma.department.findMany({
    where: { institutionId: ctx.institutionId },
    select: { id: true, code: true },
  });
  const deptMap = new Map(departments.map((d) => [d.code.toUpperCase(), d.id]));

  const classes = await prisma.schoolClass.findMany({
    where: { institutionId: ctx.institutionId },
    select: { id: true, standard: true, section: true },
  });
  const classMap = new Map(classes.map((c) => [`${c.standard}-${c.section.toUpperCase()}`, c.id]));

  const regulations = await prisma.regulation.findMany({
    where: { institutionId: ctx.institutionId },
    select: { id: true, code: true },
  });
  const regMap = new Map(regulations.map((r) => [r.code.toUpperCase(), r.id]));

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Header is line 1, first row is line 2

    if (params.entityType === 'STUDENTS') {
      const fullName = findValue(row, ['fullname', 'name', 'studentname', 'firstandlastname', 'student']);
      const regNumber = findValue(row, ['regnumber', 'regno', 'register', 'registrationnumber', 'registernumber', 'reg']);
      const rollNumber = findValue(row, ['rollnumber', 'rollno', 'roll']);
      const email = findValue(row, ['email', 'emailaddress', 'mail']);
      const phone = findValue(row, ['phone', 'phonenumber', 'mobile', 'contact']);
      const gender = findValue(row, ['gender', 'sex']).toUpperCase() || 'MALE';
      const deptCode = findValue(row, ['deptcode', 'dept', 'department', 'departmentcode']).toUpperCase();
      const semester = findValue(row, ['semester', 'sem']);
      const standard = findValue(row, ['standard', 'class', 'grade', 'std']);
      const section = findValue(row, ['section', 'sec']).toUpperCase();
      const batchYear = findValue(row, ['batchyear', 'batch', 'year', 'batchname']);

      if (!fullName) {
        errors.push({ row: rowNum, column: 'fullName', message: 'Full Name is required', data: row });
        continue;
      }
      if (!regNumber && !rollNumber) {
        errors.push({ row: rowNum, column: 'regNumber/rollNumber', message: 'Either Register Number or Roll Number is required', data: row });
        continue;
      }

      let deptId: string | undefined;
      if (deptCode) {
        deptId = deptMap.get(deptCode);
        if (!deptId) {
          errors.push({ row: rowNum, column: 'deptCode', message: `Department '${deptCode}' does not exist`, data: row });
          continue;
        }
      }

      let classId: string | undefined;
      if (standard && section) {
        classId = classMap.get(`${standard}-${section}`);
        if (!classId) {
          errors.push({ row: rowNum, column: 'class', message: `Class ${standard}-${section} does not exist`, data: row });
          continue;
        }
      }

      validData.push({
        fullName,
        regNumber: regNumber || null,
        rollNumber: rollNumber || null,
        email: email || null,
        phone: phone || null,
        gender: ['MALE', 'FEMALE', 'OTHER'].includes(gender) ? gender : 'MALE',
        deptId,
        semester: semester ? parseInt(semester, 10) : null,
        classId,
        batchYear: batchYear || null,
      });
    } else if (params.entityType === 'FACULTY') {
      const fullName = findValue(row, ['fullname', 'name', 'facultyname']);
      const email = findValue(row, ['email', 'emailaddress']);
      const phone = findValue(row, ['phone', 'mobile']);
      const roleStr = findValue(row, ['role']).toUpperCase() || 'FACULTY';
      const deptCode = findValue(row, ['deptcode', 'dept', 'department']).toUpperCase();

      if (!fullName) {
        errors.push({ row: rowNum, column: 'fullName', message: 'Full Name is required', data: row });
        continue;
      }
      if (!email) {
        errors.push({ row: rowNum, column: 'email', message: 'Email is required', data: row });
        continue;
      }

      let deptId: string | undefined;
      if (deptCode) {
        deptId = deptMap.get(deptCode);
        if (!deptId) {
          errors.push({ row: rowNum, column: 'deptCode', message: `Department '${deptCode}' not found`, data: row });
          continue;
        }
      }

      validData.push({
        fullName,
        email: email.toLowerCase(),
        phone: phone || null,
        role: roleStr === 'HOD' ? InstitutionRole.HOD : InstitutionRole.FACULTY,
        deptId,
      });
    } else if (params.entityType === 'COURSES') {
      const courseCode = findValue(row, ['coursecode', 'code', 'subjectcode']).toUpperCase();
      const title = findValue(row, ['title', 'name', 'coursename']);
      const semester = findValue(row, ['semester', 'sem']);
      const credits = findValue(row, ['credits', 'credit']);
      const isLab = findValue(row, ['islab', 'lab']).toLowerCase() === 'true';
      const deptCode = findValue(row, ['deptcode', 'dept', 'department']).toUpperCase();
      const regulationCode = findValue(row, ['regulationcode', 'regulation', 'reg']).toUpperCase();

      if (!courseCode || !title || !semester) {
        errors.push({ row: rowNum, column: 'required', message: 'courseCode, title, and semester are required', data: row });
        continue;
      }

      let deptId: string | undefined;
      if (deptCode) {
        deptId = deptMap.get(deptCode);
      }

      let regulationId: string | undefined;
      if (regulationCode) {
        regulationId = regMap.get(regulationCode);
      }

      validData.push({
        courseCode,
        title,
        semester: parseInt(semester, 10),
        credits: credits ? parseInt(credits, 10) : 3,
        isLab,
        deptId,
        regulationId,
      });
    } else if (params.entityType === 'CLASSES') {
      const standard = findValue(row, ['standard', 'class', 'grade']);
      const section = findValue(row, ['section', 'sec']).toUpperCase();
      const classTeacher = findValue(row, ['classteacher', 'teacher', 'teachername']);

      if (!standard || !section) {
        errors.push({ row: rowNum, column: 'required', message: 'standard and section are required', data: row });
        continue;
      }

      validData.push({
        standard: parseInt(standard, 10),
        section,
        classTeacher: classTeacher || null,
      });
    } else if (params.entityType === 'SUBJECTS') {
      const standard = findValue(row, ['standard', 'class', 'grade']);
      const section = findValue(row, ['section', 'sec']).toUpperCase();
      const name = findValue(row, ['name', 'subjectname', 'subject']);
      const code = findValue(row, ['code', 'subjectcode']);
      const weeklyHours = findValue(row, ['weeklyhours', 'hours']);
      const teacherName = findValue(row, ['teachername', 'teacher']);

      if (!standard || !section || !name) {
        errors.push({ row: rowNum, column: 'required', message: 'standard, section, and name are required', data: row });
        continue;
      }

      const classId = classMap.get(`${standard}-${section}`);
      if (!classId) {
        errors.push({ row: rowNum, column: 'class', message: `Class ${standard}-${section} does not exist`, data: row });
        continue;
      }

      validData.push({
        classId,
        name,
        code: code || null,
        weeklyHours: weeklyHours ? parseInt(weeklyHours, 10) : 4,
        teacherName: teacherName || null,
      });
    }
  }

  // Create ImportJob in DB
  const job = await prisma.importJob.create({
    data: {
      institutionId: ctx.institutionId,
      entityType: params.entityType,
      status: errors.length === rows.length ? ImportJobStatus.FAILED : ImportJobStatus.READY,
      totalRows: rows.length,
      processedRows: rows.length,
      successCount: validData.length,
      failureCount: errors.length,
      fileName: params.fileName,
      fileSize: params.fileSize,
      rawMapping: validData,
      dryRunErrors: errors as any,
      createdBy: ctx.userId,
    },
  });

  return {
    jobId: job.id,
    entityType: params.entityType,
    status: job.status,
    totalRows: rows.length,
    validCount: validData.length,
    invalidCount: errors.length,
    errors: errors.slice(0, 50),
    sampleValid: validData.slice(0, 5),
  };
}

export async function commitImport(jobId: string) {
  const ctx = requireInstitutionContext();
  const job = await prisma.importJob.findFirst({
    where: { id: jobId, institutionId: ctx.institutionId },
  });

  if (!job) {
    throw new Error('Import job not found.');
  }

  if (job.status !== ImportJobStatus.READY) {
    throw new Error(`Job cannot be committed. Current status: ${job.status}`);
  }

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: ImportJobStatus.PROCESSING },
  });

  const validData = (job.rawMapping as any[]) || [];

  try {
    let committedCount = 0;
    await prisma.$transaction(async (tx) => {
      if (job.entityType === 'STUDENTS') {
        for (const item of validData) {
          await tx.student.create({
            data: {
              institutionId: ctx.institutionId,
              fullName: item.fullName,
              regNumber: item.regNumber,
              rollNumber: item.rollNumber,
              email: item.email,
              phone: item.phone,
              gender: item.gender,
              deptId: item.deptId,
              semester: item.semester,
              classId: item.classId,
              batchYear: item.batchYear,
            },
          });
          committedCount++;
        }
      } else if (job.entityType === 'FACULTY') {
        const defaultPasswordHash = await bcrypt.hash('OmniEdu@2026', 10);
        for (const item of validData) {
          let user = await tx.user.findUnique({ where: { email: item.email } });
          if (!user) {
            user = await tx.user.create({
              data: {
                email: item.email,
                fullName: item.fullName,
                phone: item.phone,
                passwordHash: defaultPasswordHash,
              },
            });
          }
          await tx.institutionMembership.upsert({
            where: {
              userId_institutionId: {
                userId: user.id,
                institutionId: ctx.institutionId,
              },
            },
            update: { role: item.role, deptId: item.deptId },
            create: {
              userId: user.id,
              institutionId: ctx.institutionId,
              role: item.role,
              deptId: item.deptId,
            },
          });
          committedCount++;
        }
      } else if (job.entityType === 'COURSES') {
        for (const item of validData) {
          await tx.course.upsert({
            where: {
              institutionId_courseCode: {
                institutionId: ctx.institutionId,
                courseCode: item.courseCode,
              },
            },
            update: {
              title: item.title,
              semester: item.semester,
              credits: item.credits,
              isLab: item.isLab,
              deptId: item.deptId,
              regulationId: item.regulationId,
            },
            create: {
              institutionId: ctx.institutionId,
              courseCode: item.courseCode,
              title: item.title,
              semester: item.semester,
              credits: item.credits,
              isLab: item.isLab,
              deptId: item.deptId,
              regulationId: item.regulationId,
            },
          });
          committedCount++;
        }
      } else if (job.entityType === 'CLASSES') {
        for (const item of validData) {
          await tx.schoolClass.upsert({
            where: {
              institutionId_standard_section: {
                institutionId: ctx.institutionId,
                standard: item.standard,
                section: item.section,
              },
            },
            update: { classTeacher: item.classTeacher },
            create: {
              institutionId: ctx.institutionId,
              standard: item.standard,
              section: item.section,
              classTeacher: item.classTeacher,
            },
          });
          committedCount++;
        }
      } else if (job.entityType === 'SUBJECTS') {
        for (const item of validData) {
          await tx.schoolSubject.upsert({
            where: {
              institutionId_classId_name: {
                institutionId: ctx.institutionId,
                classId: item.classId,
                name: item.name,
              },
            },
            update: {
              code: item.code,
              weeklyHours: item.weeklyHours,
              teacherName: item.teacherName,
            },
            create: {
              institutionId: ctx.institutionId,
              classId: item.classId,
              name: item.name,
              code: item.code,
              weeklyHours: item.weeklyHours,
              teacherName: item.teacherName,
            },
          });
          committedCount++;
        }
      }
    });

    const completed = await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: ImportJobStatus.COMPLETED,
        successCount: committedCount,
        committedAt: new Date(),
      },
    });

    await logAuditEvent({
      action: 'CSV_IMPORTED',
      entityType: 'ImportJob',
      entityId: jobId,
      details: { entityType: job.entityType, committedCount, totalRows: job.totalRows },
    });

    return completed;
  } catch (err: any) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: ImportJobStatus.FAILED },
    });
    throw new Error(`Import commit failed and was rolled back: ${err.message}`);
  }
}

export async function listImportHistory(entityType?: string) {
  const ctx = requireInstitutionContext();
  return prisma.importJob.findMany({
    where: {
      institutionId: ctx.institutionId,
      ...(entityType ? { entityType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getImportJob(jobId: string) {
  const ctx = requireInstitutionContext();
  return prisma.importJob.findFirst({
    where: { id: jobId, institutionId: ctx.institutionId },
  });
}
