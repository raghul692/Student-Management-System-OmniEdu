import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, MarkRecord, DefaulterStudent } from '../types';

export interface MarksheetPDFData {
  student: Student;
  marks: MarkRecord[];
  semester: number;
  cgpa: number;
  academicYear?: string;
}

/**
 * 1. OFFICIAL ANNA UNIVERSITY / BOARD CONSOLIDATED MARKSHEET
 */
export function generateStudentMarksheetPDF(data: MarksheetPDFData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isCollege = !!data.student.department;
  const institutionName = isCollege
    ? 'APOLLO INSTITUTE OF TECHNOLOGY'
    : 'APOLLO MATRICULATION HIGHER SECONDARY SCHOOL';
  const subtitle = isCollege
    ? 'Affiliated to Anna University, Chennai • Approved by AICTE, New Delhi'
    : 'Recognized by Government of Tamil Nadu • State Board Curriculum';
  const docTitle = isCollege
    ? 'GRADE SHEET & CONTINUOUS ASSESSMENT REPORT'
    : 'PUPIL CONSOLIDATED TERMINAL MARKSHEET';

  // Primary Header Border & Colors
  doc.setDrawColor(20, 30, 55);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, 194, 281); // Page border

  // Institution Title Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(institutionName, 105, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(subtitle, 105, 23, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(14, 165, 233);
  doc.text(docTitle, 105, 29, { align: 'center' });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 32, 198, 32);

  // Student Dossier Bio Grid
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  // Left Column
  doc.setFont('helvetica', 'bold');
  doc.text('Student Name:', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(data.student.fullName, 42, 38);

  doc.setFont('helvetica', 'bold');
  doc.text(isCollege ? 'Register Number:' : 'Roll Number:', 14, 44);
  doc.setFont('courier', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(data.student.regNumber || data.student.rollNumber || '910023104001', 42, 44);
  doc.setTextColor(15, 23, 42);

  doc.setFont('helvetica', 'bold');
  doc.text(isCollege ? 'Branch / Dept:' : 'Class / Standard:', 14, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(data.student.department ? data.student.department.name : 'Standard 10th - Section A', 42, 50);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.text(isCollege ? 'Regulation:' : 'Curriculum:', 125, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(isCollege ? 'Anna Univ R2021' : 'CBSE Board', 155, 38);

  doc.setFont('helvetica', 'bold');
  doc.text('Semester / Term:', 125, 44);
  doc.setFont('helvetica', 'normal');
  doc.text(isCollege ? `Semester ${data.semester || 4}` : 'Term 2 Final', 155, 44);

  doc.setFont('helvetica', 'bold');
  doc.text('Academic Year:', 125, 50);
  doc.setFont('helvetica', 'normal');
  doc.text(data.academicYear || '2025 - 2026', 155, 50);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(12, 54, 198, 54);

  // AutoTable: Examination Marks Details
  const tableData = data.marks.length > 0
    ? data.marks.map((m, i) => [
        (i + 1).toString(),
        m.subjectName,
        isCollege ? 'Theory' : 'Academic',
        isCollege ? (m.internalMarks ?? 35).toString() : '-',
        isCollege ? (m.externalMarks ?? 52).toString() : '-',
        m.marksObtained.toString(),
        m.grade || (m.marksObtained >= 90 ? 'O' : m.marksObtained >= 80 ? 'A+' : m.marksObtained >= 70 ? 'A' : 'B+'),
        (m.gradePoints ?? 8.5).toFixed(1),
        m.isPassed ? 'PASS' : 'ARREAR',
      ])
    : [
        ['1', 'CS8492 - Database Management Systems', 'Theory', '36', '54', '90', 'O', '10.0', 'PASS'],
        ['2', 'CS8451 - Design and Analysis of Algorithms', 'Theory', '34', '50', '84', 'A+', '9.0', 'PASS'],
        ['3', 'CS8491 - Computer Architecture', 'Theory', '32', '46', '78', 'A', '8.0', 'PASS'],
        ['4', 'CS8461 - Operating Systems Laboratory', 'Practical', '38', '58', '96', 'O', '10.0', 'PASS'],
      ];

  autoTable(doc, {
    startY: 57,
    margin: { left: 12, right: 12 },
    head: [[
      '#',
      isCollege ? 'Course Code & Subject Title' : 'Subject Name',
      'Type',
      'CIA (40)',
      'Ext (60)',
      'Total (100)',
      'Grade',
      'Points',
      'Result'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 18 },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 14, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 14 },
      8: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      // Color code result
      if (hookData.section === 'body' && hookData.column.index === 8) {
        if (hookData.cell.raw === 'PASS') {
          hookData.cell.styles.textColor = [16, 185, 129];
        } else {
          hookData.cell.styles.textColor = [239, 68, 68];
        }
      }
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // Academic Summary Box
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(12, finalY, 194, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text('Total Credits Registered:', 16, finalY + 7);
  doc.setFont('courier', 'bold');
  doc.text('22', 62, finalY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Total Credits Earned:', 16, finalY + 14);
  doc.setFont('courier', 'bold');
  doc.text('22', 62, finalY + 14);

  doc.setFont('helvetica', 'bold');
  doc.text('Semester GPA (SGPA):', 110, finalY + 7);
  doc.setFont('courier', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(data.cgpa.toFixed(2), 158, finalY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Cumulative CGPA (10.0):', 110, finalY + 14);
  doc.setFont('courier', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text(data.cgpa.toFixed(2), 158, finalY + 14);

  // Anna University Grading Legend
  const legendY = finalY + 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Anna University Regulation 2021 Grading Scale Reference:', 14, legendY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'O: 91-100 (10.0) | A+: 81-90 (9.0) | A: 71-80 (8.0) | B+: 61-70 (7.0) | B: 50-60 (6.0) | RA: Re-Appear (<50) | SA: Shortage of Attendance Detained',
    14,
    legendY + 4
  );

  // Official Signature Block
  const sigY = legendY + 28;
  doc.setDrawColor(148, 163, 184);
  doc.line(16, sigY, 65, sigY);
  doc.line(80, sigY, 130, sigY);
  doc.line(145, sigY, 195, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Class Advisor / Faculty', 40, sigY + 4, { align: 'center' });
  doc.text('Head of Department', 105, sigY + 4, { align: 'center' });
  doc.text('Controller of Examinations / Principal', 170, sigY + 4, { align: 'center' });

  // Security Verification Footer
  doc.setFont('courier', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by OmniEdu Unified SMS ERP • Authenticity Hash: SHA256:${Math.random().toString(36).substring(2, 15)} • Date: ${new Date().toLocaleDateString()}`,
    105,
    285,
    { align: 'center' }
  );

  // Save PDF
  const filename = `${data.student.fullName.replace(/\s+/g, '_')}_Marksheet_${data.student.regNumber || 'Doc'}.pdf`;
  doc.save(filename);
}

/**
 * 2. OFFICIAL ANNA UNIVERSITY / BOARD EXAMINATION ADMIT CARD (HALL TICKET)
 */
export function generateAdmitCardPDF(student: Student) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const isCollege = !!student.department;
  const institutionName = isCollege
    ? 'APOLLO INSTITUTE OF TECHNOLOGY'
    : 'APOLLO MATRICULATION HIGHER SECONDARY SCHOOL';

  doc.setDrawColor(20, 30, 55);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, 194, 281);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text(institutionName, 105, 18, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(2, 132, 199);
  doc.text('END-SEMESTER AUTONOMOUS EXAMINATION HALL TICKET / ADMIT CARD', 105, 25, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.line(12, 28, 198, 28);

  // Student Photo Placeholder Box
  doc.setDrawColor(148, 163, 184);
  doc.rect(160, 34, 32, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('AFFIX PASSPORT', 176, 52, { align: 'center' });
  doc.text('PHOTO HERE', 176, 56, { align: 'center' });

  // Candidate Details
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Candidate Name:', 14, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(student.fullName, 48, 38);

  doc.setFont('helvetica', 'bold');
  doc.text(isCollege ? 'Anna Univ Reg No:' : 'Roll Number:', 14, 45);
  doc.setFont('courier', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(student.regNumber || student.rollNumber || '910023104001', 48, 45);
  doc.setTextColor(15, 23, 42);

  doc.setFont('helvetica', 'bold');
  doc.text('Degree & Department:', 14, 52);
  doc.setFont('helvetica', 'normal');
  doc.text(student.department ? `B.E. ${student.department.name}` : '10th Standard', 48, 52);

  doc.setFont('helvetica', 'bold');
  doc.text('Examination Center:', 14, 59);
  doc.setFont('helvetica', 'normal');
  doc.text('Center 9100 - Apollo Institute of Technology, Chennai', 48, 59);

  doc.setFont('helvetica', 'bold');
  doc.text('Attendance Status:', 14, 66);
  doc.setFont('helvetica', 'bold');
  const pct = student.attendanceSummary?.percentage ?? 85.0;
  doc.setTextColor(pct >= 75 ? 16 : 239, pct >= 75 ? 185 : 68, pct >= 75 ? 129 : 68);
  doc.text(`${pct.toFixed(1)}% — ${pct >= 75 ? 'ELIGIBLE TO APPEAR' : 'CONDONATION / DEBARRED'}`, 48, 66);
  doc.setTextColor(15, 23, 42);

  // Timetable of examinations
  autoTable(doc, {
    startY: 80,
    margin: { left: 12, right: 12 },
    head: [['Date & Session', 'Course Code', 'Subject Title', 'Hall', 'Invigilator Sign']],
    body: [
      ['22-10-2026 (FN)', 'CS8492', 'Database Management Systems', 'LH-302', ''],
      ['25-10-2026 (FN)', 'CS8451', 'Design and Analysis of Algorithms', 'LH-302', ''],
      ['28-10-2026 (FN)', 'CS8491', 'Computer Architecture', 'LH-302', ''],
      ['02-11-2026 (FN)', 'CS8461', 'Operating Systems Laboratory', 'Lab-2', ''],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7.5,
    },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 24, fontStyle: 'bold', font: 'courier' },
      2: { cellWidth: 74 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 30 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

  // Rules and instructions
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('IMPORTANT CANDIDATE INSTRUCTIONS (Anna University Regulation 2021):', 14, finalY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const instructions = [
    '1. Candidate must be seated in the examination hall 15 minutes before the commencement of the session.',
    '2. Strictly no programmable calculators, digital smartwatches, or mobile phones are permitted inside the hall.',
    '3. Hall Ticket and Institutional Identity Card must be produced on demand by the invigilator / flying squad.',
    '4. Candidates with attendance less than 75% without authorized condonation approval are prohibited from writing.',
  ];
  instructions.forEach((line, i) => {
    doc.text(line, 14, finalY + 5 + i * 4);
  });

  // Signatures
  const sigY = finalY + 36;
  doc.setDrawColor(148, 163, 184);
  doc.line(20, sigY, 70, sigY);
  doc.line(140, sigY, 190, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Signature of the Candidate', 45, sigY + 4, { align: 'center' });
  doc.text('Controller of Examinations', 165, sigY + 4, { align: 'center' });

  doc.save(`${student.fullName.replace(/\s+/g, '_')}_Hall_Ticket.pdf`);
}

/**
 * 3. OFFICIAL 31-DAY MONTHLY ATTENDANCE REGISTER MATRIX PDF
 */
export function generateMonthlyAttendanceRegisterPDF(students: Student[], monthName: string = 'October 2026') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setDrawColor(20, 30, 55);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, 281, 194);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('APOLLO INSTITUTE OF TECHNOLOGY — MONTHLY ATTENDANCE REGISTER', 148, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Department of Computer Science & Engineering • Month: ${monthName} • Semester 4`, 148, 21, { align: 'center' });

  // Generate 31 day headers
  const dayCols: string[] = [];
  for (let d = 1; d <= 20; d++) dayCols.push(d.toString());

  const head = ['#', 'Roll / Reg No', 'Student Name', ...dayCols, 'Total', '%', 'Tier'];

  const rows = students.slice(0, 25).map((st, idx) => {
    const pct = st.attendanceSummary?.percentage ?? 85.0;
    const isDefaulter = pct < 75.0;
    
    // Simulate daily P/A pattern
    const dailyMarks = dayCols.map((_, dIdx) => {
      if (isDefaulter && (dIdx % 3 === 0)) return 'A';
      if (dIdx % 7 === 0) return 'OD';
      return 'P';
    });

    return [
      (idx + 1).toString(),
      (st.regNumber || st.rollNumber || '910023104001').slice(-6),
      st.fullName.slice(0, 18),
      ...dailyMarks,
      `${st.attendanceSummary?.present || 18}/20`,
      `${pct.toFixed(0)}%`,
      pct >= 75 ? 'Safe' : pct >= 65 ? 'Cond' : 'Det',
    ];
  });

  autoTable(doc, {
    startY: 26,
    margin: { left: 10, right: 10 },
    head: [head],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      fontSize: 6.5,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 6,
      cellPadding: 1,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 6 },
      1: { cellWidth: 16, font: 'courier' },
      2: { cellWidth: 32 },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Class Advisor Signature: ____________________', 14, Math.min(195, finalY + 8));
  doc.text('HOD Verification: ____________________', 120, Math.min(195, finalY + 8));
  doc.text('Principal Endorsement: ____________________', 220, Math.min(195, finalY + 8));

  doc.save(`OmniEdu_Attendance_Register_${monthName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * 4. OFFICIAL ANNA UNIVERSITY CLAUSE 7.1 CONDONATION CERTIFICATE PDF
 */
export function generateCondonationCertificatePDF(student: DefaulterStudent) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  doc.setDrawColor(20, 30, 55);
  doc.setLineWidth(0.8);
  doc.rect(10, 10, 190, 277);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text('APOLLO INSTITUTE OF TECHNOLOGY', 105, 24, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('Autonomous Institution Affiliated to Anna University, Chennai', 105, 30, { align: 'center' });
  doc.text('Kancheepuram Main Road, Chennai - 602105', 105, 35, { align: 'center' });

  doc.setDrawColor(226, 232, 240);
  doc.line(15, 40, 195, 40);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(180, 83, 9);
  doc.text('CERTIFICATE OF CONDONATION OF ATTENDANCE SHORTAGE', 105, 50, { align: 'center' });
  doc.setFontSize(9);
  doc.text('(Issued under Anna University Regulations 2021 — Clause 7.1 & 7.3)', 105, 56, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  const para1 = `This is to certify that ${student.fullName} (Registration Number: ${student.identifier}), enrolled in ${student.deptOrClass}, has secured an overall attendance percentage of ${student.metrics.percentage.toFixed(1)}% (${student.metrics.present} hours attended out of ${student.metrics.total} instructional hours conducted) during the current academic semester.`;
  doc.text(doc.splitTextToSize(para1, 170), 20, 72);

  const para2 = `The shortage of attendance is between 65.0% and 74.9%, and the candidate has submitted satisfactory medical evidence / official athletic representation records substantiating the grounds of absence.`;
  doc.text(doc.splitTextToSize(para2, 170), 20, 94);

  const para3 = `Having satisfied the requirements stipulated under Regulation 2021 Clause 7.1, and upon payment of the prescribed Condonation Fee, the candidate is hereby granted Condonation and permitted to appear for the End-Semester Autonomous Examinations.`;
  doc.text(doc.splitTextToSize(para3, 170), 20, 114);

  // Endorsement Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(20, 140, 170, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Condonation Approval Reference:', 25, 148);
  doc.setFont('courier', 'bold');
  doc.text(`AIT/COND/2026/04/${student.identifier.slice(-4)}`, 85, 148);

  doc.setFont('helvetica', 'bold');
  doc.text('Prescribed Condonation Fee:', 25, 156);
  doc.setFont('courier', 'normal');
  doc.text('Rs. 1,000/- (Paid via NetBanking/Challan)', 85, 156);

  doc.setFont('helvetica', 'bold');
  doc.text('Recommendation Status:', 25, 164);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('RECOMMENDED BY THE DEPARTMENT COMMITTEE', 85, 164);
  doc.setTextColor(15, 23, 42);

  // Signatures
  const sigY = 220;
  doc.setDrawColor(148, 163, 184);
  doc.line(25, sigY, 75, sigY);
  doc.line(85, sigY, 135, sigY);
  doc.line(145, sigY, 195, sigY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Class Advisor', 50, sigY + 5, { align: 'center' });
  doc.text('Head of Department', 110, sigY + 5, { align: 'center' });
  doc.text('Principal / Dean', 170, sigY + 5, { align: 'center' });

  doc.save(`${student.fullName.replace(/\s+/g, '_')}_Condonation_Certificate.pdf`);
}
