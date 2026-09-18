import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Archive,
  Layers,
  GraduationCap,
  Users,
  UserCheck,
  Calendar,
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface AcademicYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface Regulation {
  id: string;
  code: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  startYear: number;
  endYear?: number;
  description?: string;
  _count?: { programs: number; courses: number };
}

interface Department {
  id: string;
  name: string;
  code: string;
  hodName?: string;
  _count?: { students: number; courses: number };
}

interface Program {
  id: string;
  name: string;
  code: string;
  deptId: string;
  durationYears: number;
  totalSemesters: number;
  department?: { id: string; name: string; code: string };
  regulation?: { id: string; code: string; title: string };
}

interface Course {
  id: string;
  courseCode: string;
  title: string;
  semester: number;
  credits: number;
  isLab: boolean;
  deptId?: string;
  department?: { id: string; name: string; code: string };
  regulation?: { id: string; code: string; title: string };
}

interface CourseOffering {
  id: string;
  semester: number;
  section: string;
  facultyName?: string;
  course: { id: string; courseCode: string; title: string; credits: number };
  department: { id: string; name: string; code: string };
  academicYear: { id: string; label: string };
  _count?: { enrollments: number };
}

interface SchoolClass {
  id: string;
  standard: number;
  section: string;
  classTeacher?: string;
  subjects?: SchoolSubject[];
  _count?: { students: number };
}

interface SchoolSubject {
  id: string;
  classId: string;
  name: string;
  code?: string;
  teacherName?: string;
  weeklyHours: number;
  schoolClass?: { standard: number; section: string };
}

export const CurriculumDesigner: React.FC = () => {
  const { activeInstitution, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [activeTab, setActiveTab] = useState<string>('regulations');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // College Data States
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [regulations, setRegulations] = useState<Regulation[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [offerings, setOfferings] = useState<CourseOffering[]>([]);

  // School Data States
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);

  // Modals
  const [showModal, setShowModal] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Filter States
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedSem, setSelectedSem] = useState<number | ''>('');

  useEffect(() => {
    loadData();
  }, [activeInstitution?.id, isCollege]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (isCollege) {
        const [yRes, rRes, dRes, pRes, cRes, oRes] = await Promise.all([
          apiClient.get('/academic/years'),
          apiClient.get('/academic/regulations'),
          apiClient.get('/academic/departments'),
          apiClient.get('/academic/programs'),
          apiClient.get('/academic/courses'),
          apiClient.get('/academic/offerings'),
        ]);
        setAcademicYears(yRes.data.data.academicYears || []);
        setRegulations(rRes.data.data.regulations || []);
        setDepartments(dRes.data.data.departments || []);
        setPrograms(pRes.data.data.programs || []);
        setCourses(cRes.data.data.courses || []);
        setOfferings(oRes.data.data.offerings || []);
      } else {
        const [yRes, clRes, subRes] = await Promise.all([
          apiClient.get('/academic/years'),
          apiClient.get('/academic/classes'),
          apiClient.get('/academic/subjects'),
        ]);
        setAcademicYears(yRes.data.data.academicYears || []);
        setClasses(clRes.data.data.classes || []);
        setSubjects(subRes.data.data.subjects || []);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to load curriculum data.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishRegulation = async (id: string) => {
    try {
      await apiClient.post(`/academic/regulations/${id}/publish`);
      setFeedback({ type: 'success', message: 'Curriculum Regulation published successfully. Offerings unlocked.' });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to publish regulation.' });
    }
  };

  const handleArchiveRegulation = async (id: string) => {
    try {
      await apiClient.post(`/academic/regulations/${id}/archive`);
      setFeedback({ type: 'success', message: 'Regulation archived.' });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to archive regulation.' });
    }
  };

  const handleCreateRegulation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academic/regulations', formData);
      setFeedback({ type: 'success', message: 'Curriculum Regulation created in DRAFT status.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create regulation.' });
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academic/courses', formData);
      setFeedback({ type: 'success', message: 'Course created and added to master catalog.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create course.' });
    }
  };

  const handleCreateOffering = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academic/offerings', formData);
      setFeedback({ type: 'success', message: 'Course offering scheduled with section allocation.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to schedule course offering.' });
    }
  };

  const handleAssignFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.patch(`/academic/offerings/${formData.offeringId}/faculty`, {
        facultyUserId: formData.facultyUserId || 'faculty-user-id',
        facultyName: formData.facultyName,
      });
      setFeedback({ type: 'success', message: 'Faculty allocated to course section.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to allocate faculty.' });
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academic/classes', formData);
      setFeedback({ type: 'success', message: 'Class & Section configured.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create class.' });
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academic/subjects', formData);
      setFeedback({ type: 'success', message: 'Subject added with weekly period schedule.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create subject.' });
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/academic/years', formData);
      setFeedback({ type: 'success', message: 'Academic Year added successfully.' });
      setShowModal(null);
      setFormData({});
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.message || 'Failed to create academic year.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {isCollege ? 'Higher Education Curriculum' : 'K-12 School Academic Framework'}
            </span>
            <span className="text-xs text-slate-400">• {activeInstitution?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Academic Structure & Curriculum Designer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure curriculum versions, syllabus offerings, faculty assignments, and structural hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({ isCurrent: false });
              setShowModal('newYear');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            Add Academic Year
          </button>
          {isCollege ? (
            <button
              onClick={() => {
                setFormData({ startYear: new Date().getFullYear() });
                setShowModal('newRegulation');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              New Regulation
            </button>
          ) : (
            <button
              onClick={() => {
                setFormData({ standard: 10, section: 'A' });
                setShowModal('newClass');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              Add Class / Section
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-1">
        {isCollege ? (
          <>
            <button
              onClick={() => setActiveTab('regulations')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'regulations'
                  ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Regulations & Versions ({regulations.length})
            </button>
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'departments'
                  ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Departments & Programs ({departments.length})
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'courses'
                  ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Course Catalog ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('offerings')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'offerings'
                  ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Offerings & Faculty Assignment ({offerings.length})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'classes'
                  ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Grades & Sections ({classes.length})
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                activeTab === 'subjects'
                  ? 'bg-emerald-500/10 text-emerald-400 border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Subject Allocation ({subjects.length})
            </button>
          </>
        )}
      </div>

      {/* ── COLLEGE TAB 1: REGULATIONS ── */}
      {isCollege && activeTab === 'regulations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {regulations.map((reg) => (
            <div
              key={reg.id}
              className="bg-slate-900/40 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {reg.code}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      reg.status === 'PUBLISHED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : reg.status === 'DRAFT'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {reg.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">{reg.title}</h3>
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">{reg.description || 'No description provided.'}</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                  <span>Start: {reg.startYear}</span>
                  {reg.endYear && <span>End: {reg.endYear}</span>}
                  <span>• {reg._count?.programs ?? 0} Programs</span>
                  <span>• {reg._count?.courses ?? 0} Courses</span>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-end gap-2">
                {reg.status === 'DRAFT' && (
                  <button
                    onClick={() => handlePublishRegulation(reg.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Publish Version
                  </button>
                )}
                {reg.status === 'PUBLISHED' && (
                  <button
                    onClick={() => handleArchiveRegulation(reg.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}

          {regulations.length === 0 && !loading && (
            <div className="col-span-full p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white">No Curriculum Regulations Found</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                Create a curriculum regulation (e.g. Anna University R2021) to organize programs and courses.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── COLLEGE TAB 2: DEPARTMENTS & PROGRAMS ── */}
      {isCollege && activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setFormData({});
                setShowModal('newDept');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Department
            </button>
            <button
              onClick={() => {
                setFormData({ durationYears: 4, totalSemesters: 8 });
                setShowModal('newProgram');
              }}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Degree Program
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {departments.map((dept) => {
              const deptPrograms = programs.filter((p) => p.deptId === dept.id);
              return (
                <div key={dept.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {dept.code}
                    </span>
                    <span className="text-xs text-slate-400">{dept._count?.students ?? 0} Students</span>
                  </div>
                  <h3 className="text-base font-bold text-white">{dept.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">HOD: {dept.hodName || 'Not Assigned'}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Programs:</h4>
                    {deptPrograms.length > 0 ? (
                      <div className="space-y-1.5">
                        {deptPrograms.map((p) => (
                          <div key={p.id} className="text-xs flex items-center justify-between text-slate-300 bg-slate-800/50 p-2 rounded-lg">
                            <span>{p.name}</span>
                            <span className="text-slate-400">{p.durationYears}Y / {p.totalSemesters}S</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No programs linked.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── COLLEGE TAB 3: COURSE CATALOG ── */}
      {isCollege && activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-4 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-3">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedSem}
                onChange={(e) => setSelectedSem(e.target.value ? Number(e.target.value) : '')}
                className="bg-slate-800 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700"
              >
                <option value="">All Semesters</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                setFormData({ semester: 1, credits: 3, isLab: false });
                setShowModal('newCourse');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Course
            </button>
          </div>

          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Course Title</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Sem</th>
                  <th className="px-5 py-3.5">Credits</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Regulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {courses
                  .filter((c) => (!selectedDept || c.deptId === selectedDept) && (!selectedSem || c.semester === selectedSem))
                  .map((course) => (
                    <tr key={course.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-3 font-mono font-bold text-white">{course.courseCode}</td>
                      <td className="px-5 py-3 font-medium text-slate-200">{course.title}</td>
                      <td className="px-5 py-3 text-slate-400">{course.department?.code || '-'}</td>
                      <td className="px-5 py-3">{course.semester}</td>
                      <td className="px-5 py-3">{course.credits}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            course.isLab
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {course.isLab ? 'Laboratory' : 'Theory'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{course.regulation?.code || 'R2021'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── COLLEGE TAB 4: COURSE OFFERINGS & FACULTY ALLOCATION ── */}
      {isCollege && activeTab === 'offerings' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFormData({
                  semester: 1,
                  section: 'A',
                  academicYearId: academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id,
                });
                setShowModal('newOffering');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Offering
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offerings.map((offering) => (
              <div key={offering.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded">
                      {offering.course.courseCode} - Sec {offering.section}
                    </span>
                    <span className="text-xs text-slate-400">Sem {offering.semester}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{offering.course.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{offering.department.name} ({offering.academicYear.label})</p>

                  <div className="mt-4 p-3 bg-slate-800/40 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-medium">Assigned Faculty</span>
                      <span className="text-xs font-semibold text-slate-200">
                        {offering.facultyName || 'Unassigned'}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setFormData({ offeringId: offering.id, facultyName: offering.facultyName || '' });
                        setShowModal('assignFaculty');
                      }}
                      className="text-xs text-emerald-400 hover:underline font-medium"
                    >
                      {offering.facultyName ? 'Reassign' : 'Assign'}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Enrolled: {offering._count?.enrollments ?? 0} Students</span>
                  <span className="text-emerald-400">{offering.course.credits} Credits</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SCHOOL TAB 1: GRADES & SECTIONS ── */}
      {!isCollege && activeTab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {classes.map((cls) => (
            <div key={cls.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-bold text-white">
                  Grade {cls.standard} - {cls.section}
                </span>
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {cls._count?.students ?? 0} Students
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Class Teacher: {cls.classTeacher || 'Unassigned'}</p>
              <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400">
                Subjects: {cls.subjects?.length ?? 0} Scheduled
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SCHOOL TAB 2: SUBJECTS ── */}
      {!isCollege && activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setFormData({ weeklyHours: 4 });
                setShowModal('newSubject');
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Subject
            </button>
          </div>

          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Subject</th>
                  <th className="px-5 py-3.5">Grade / Section</th>
                  <th className="px-5 py-3.5">Code</th>
                  <th className="px-5 py-3.5">Weekly Periods</th>
                  <th className="px-5 py-3.5">Teacher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {subjects.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-semibold text-white">{sub.name}</td>
                    <td className="px-5 py-3">Grade {sub.schoolClass?.standard} - {sub.schoolClass?.section}</td>
                    <td className="px-5 py-3 font-mono text-xs">{sub.code || '-'}</td>
                    <td className="px-5 py-3">{sub.weeklyHours} Periods/wk</td>
                    <td className="px-5 py-3 text-emerald-400">{sub.teacherName || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {showModal === 'newYear' && (
              <form onSubmit={handleCreateYear} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Add Academic Year</h3>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Label (e.g. 2026-2027)</label>
                  <input
                    type="text"
                    required
                    value={formData.label || ''}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate || ''}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate || ''}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCurrent"
                    checked={formData.isCurrent || false}
                    onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                  />
                  <label htmlFor="isCurrent" className="text-xs text-slate-300">Set as Active Current Academic Year</label>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Create Academic Year
                  </button>
                </div>
              </form>
            )}

            {showModal === 'newRegulation' && (
              <form onSubmit={handleCreateRegulation} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Create Curriculum Regulation</h3>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Regulation Code (e.g. R2026)</label>
                  <input
                    type="text"
                    required
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Start Year</label>
                    <input
                      type="number"
                      required
                      value={formData.startYear || 2026}
                      onChange={(e) => setFormData({ ...formData, startYear: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">End Year (Optional)</label>
                    <input
                      type="number"
                      value={formData.endYear || ''}
                      onChange={(e) => setFormData({ ...formData, endYear: e.target.value ? Number(e.target.value) : undefined })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Save Draft
                  </button>
                </div>
              </form>
            )}

            {showModal === 'newCourse' && (
              <form onSubmit={handleCreateCourse} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Add Course to Master</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      placeholder="CS8492"
                      value={formData.courseCode || ''}
                      onChange={(e) => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Department</label>
                    <select
                      value={formData.deptId || ''}
                      onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    >
                      <option value="">Select Dept</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.code}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Course Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Database Management Systems"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Semester</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      required
                      value={formData.semester || 1}
                      onChange={(e) => setFormData({ ...formData, semester: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Credits</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      required
                      value={formData.credits || 3}
                      onChange={(e) => setFormData({ ...formData, credits: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={formData.isLab || false}
                        onChange={(e) => setFormData({ ...formData, isLab: e.target.checked })}
                      />
                      Is Laboratory
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Create Course
                  </button>
                </div>
              </form>
            )}

            {showModal === 'newOffering' && (
              <form onSubmit={handleCreateOffering} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Schedule Course Offering</h3>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Academic Year</label>
                  <select
                    required
                    value={formData.academicYearId || ''}
                    onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>{y.label} {y.isCurrent ? '(Current)' : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Department</label>
                  <select
                    required
                    value={formData.deptId || ''}
                    onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Course</label>
                  <select
                    required
                    value={formData.courseId || ''}
                    onChange={(e) => {
                      const c = courses.find((x) => x.id === e.target.value);
                      setFormData({ ...formData, courseId: e.target.value, semester: c?.semester || 1 });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="">Select Course</option>
                    {courses
                      .filter((c) => !formData.deptId || c.deptId === formData.deptId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.courseCode} - {c.title} (Sem {c.semester})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Section</label>
                    <input
                      type="text"
                      required
                      placeholder="A"
                      value={formData.section || 'A'}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Faculty Name</label>
                    <input
                      type="text"
                      placeholder="Dr. K. Sharma"
                      value={formData.facultyName || ''}
                      onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Schedule Offering
                  </button>
                </div>
              </form>
            )}

            {showModal === 'assignFaculty' && (
              <form onSubmit={handleAssignFaculty} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Allocate Faculty to Offering</h3>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Faculty Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. Ananya Sen"
                    value={formData.facultyName || ''}
                    onChange={(e) => setFormData({ ...formData, facultyName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Save Allocation
                  </button>
                </div>
              </form>
            )}

            {showModal === 'newClass' && (
              <form onSubmit={handleCreateClass} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Configure Class & Section</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Standard (1-12)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={formData.standard || 10}
                      onChange={(e) => setFormData({ ...formData, standard: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Section</label>
                    <input
                      type="text"
                      required
                      placeholder="A"
                      value={formData.section || 'A'}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Class Teacher Name</label>
                  <input
                    type="text"
                    placeholder="Mrs. M. Vasanthi"
                    value={formData.classTeacher || ''}
                    onChange={(e) => setFormData({ ...formData, classTeacher: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Save Class
                  </button>
                </div>
              </form>
            )}

            {showModal === 'newSubject' && (
              <form onSubmit={handleCreateSubject} className="space-y-4">
                <h3 className="text-lg font-bold text-white">Add Subject to Class</h3>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Class & Section</label>
                  <select
                    required
                    value={formData.classId || ''}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>Standard {c.standard} - {c.section}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Mathematics"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Weekly Periods</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={formData.weeklyHours || 4}
                      onChange={(e) => setFormData({ ...formData, weeklyHours: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Teacher Name</label>
                    <input
                      type="text"
                      placeholder="Mr. Rajesh"
                      value={formData.teacherName || ''}
                      onChange={(e) => setFormData({ ...formData, teacherName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setShowModal(null)} className="px-3 py-1.5 text-xs text-slate-400">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold">
                    Add Subject
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default CurriculumDesigner;
