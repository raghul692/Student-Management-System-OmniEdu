export type OrgType = 'SCHOOL' | 'COLLEGE' | 'SCHOOL_AND_COLLEGE';

export type InstitutionType = 'SCHOOL' | 'COLLEGE';

export type TenantType = 'COLLEGE' | 'SCHOOL' | 'GROUP_TRUST' | 'SOLO_EDUCATOR' | 'DEMO_SANDBOX';

export type SystemRole = 'PLATFORM_ADMIN' | 'ORG_ADMIN' | 'ORG_MEMBER';

export type InstitutionRole =
  | 'INSTITUTION_ADMIN'
  | 'HOD'
  | 'FACULTY'
  | 'CLASS_ADVISOR'
  | 'CLASS_TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'GUEST';

// Legacy Role type compatibility
export type Role =
  | 'SUPER_ADMIN'
  | 'CAMPUS_ADMIN'
  | 'HOD'
  | 'FACULTY'
  | 'CLASS_TEACHER'
  | 'CLASS_ADVISOR'
  | 'STUDENT'
  | 'GUEST';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'ON_DUTY' | 'LATE' | 'HALF_DAY';
export type AttendanceTier = 'ELIGIBLE' | 'CONDONATION' | 'DETAINED';

export interface InstitutionSummary {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  type: InstitutionType | TenantType;
  logoUrl?: string | null;
  role?: InstitutionRole;
}

export type CampusSummary = InstitutionSummary;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrgType;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  planTier: string;
  isActive: boolean;
  institutions?: InstitutionSummary[];
}

export interface Institution {
  id: string;
  organizationId?: string;
  name: string;
  code: string;
  type: InstitutionType | TenantType;
  logoUrl?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  affiliatedUniversity?: string | null;
  regulationYear?: string | null;
  board?: string | null;
  standardFrom?: number | null;
  standardTo?: number | null;
  campuses?: CampusSummary[];
  parent?: { id: string; name: string } | null;
}

export type Tenant = Institution;

export interface OrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: SystemRole;
  isActive: boolean;
  organization: Organization;
}

export interface InstitutionMembership {
  id: string;
  userId: string;
  institutionId: string;
  role: InstitutionRole;
  deptId?: string | null;
  classId?: string | null;
  isActive: boolean;
  institution: InstitutionSummary;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope: string;
  description?: string | null;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  systemRole?: SystemRole;
  role?: Role | InstitutionRole; // compatibility
  phone?: string | null;
  avatarUrl?: string | null;
  organizationId?: string;
  institutionId?: string;
  tenantId?: string;
  tenant?: Tenant;
  department?: { id: string; name: string; code: string } | null;
  orgMemberships?: OrganizationMembership[];
  institutionMemberships?: InstitutionMembership[];
}

export interface AttendanceMetrics {
  total: number;
  present: number;
  absent: number;
  onDuty: number;
  percentage: number;
  tier: AttendanceTier;
  condonationEligible: boolean;
  detained: boolean;
  sessionsNeededFor75: number;
  allowedAbsencesBeforeDefaulter: number;
}

export interface Student {
  id: string;
  institutionId?: string;
  tenantId?: string;
  fullName: string;
  gender: string;
  email?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
  photoUrl?: string | null;
  batchYear?: string | null;
  dob?: string | null;
  // College Scoped
  regNumber?: string | null;
  deptId?: string | null;
  semester?: number | null;
  regulationYear?: string | null;
  department?: { id: string; name: string; code: string } | null;
  program?: { id: string; name: string; code: string } | null;
  // School Scoped
  rollNumber?: string | null;
  classId?: string | null;
  schoolClass?: { id: string; standard: number; section: string } | null;
  // Computed Analytics
  attendanceSummary?: AttendanceMetrics;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hodName?: string | null;
  _count?: { students: number; courses: number; memberships?: number; users?: number };
}

export interface SchoolClass {
  id: string;
  standard: number;
  section: string;
  classTeacher?: string | null;
  _count?: { students: number };
}

export interface Course {
  id: string;
  courseCode: string;
  title: string;
  semester: number;
  credits: number;
  isLab: boolean;
  department?: { id: string; name: string; code: string };
}

export interface Exam {
  id: string;
  title: string;
  type: string;
  academicYear: string;
  semester?: number | null;
  standard?: number | null;
}

export interface MarkRecord {
  id: string;
  subjectName: string;
  internalMarks?: number | null;
  externalMarks?: number | null;
  marksObtained: number;
  maxMarks: number;
  grade?: string | null;
  gradePoints?: number | null;
  creditsEarned?: number | null;
  isPassed: boolean;
}

export interface DefaulterStudent {
  id: string;
  fullName: string;
  identifier: string;
  deptOrClass: string;
  metrics: AttendanceMetrics;
}
