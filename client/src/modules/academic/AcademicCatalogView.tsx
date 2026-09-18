import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Building2, 
  GraduationCap, 
  Users, 
  Layers, 
  Code, 
  Cpu, 
  Wrench,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Department, Course, SchoolClass } from '../../types';

export const AcademicCatalogView: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      try {
        if (isCollege) {
          const [deptRes, courseRes] = await Promise.all([
            apiClient.get('/academic/departments'),
            apiClient.get('/academic/courses'),
          ]);
          setDepartments(deptRes.data.data.departments || []);
          setCourses(courseRes.data.data.courses || []);
        } else {
          const classRes = await apiClient.get('/academic/classes');
          setClasses(classRes.data.data.classes || []);
        }
      } catch (err) {
        console.error('Failed to load academic catalog:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, [activeCampus?.id, isCollege]);

  const getDeptIcon = (code: string) => {
    if (code === 'CSE') return <Code className="w-5 h-5 text-academic-primary" />;
    if (code === 'ECE') return <Cpu className="w-5 h-5 text-cyan-400" />;
    return <Wrench className="w-5 h-5 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-academic-secondary/20 text-academic-secondary border border-academic-secondary/30">
                Curriculum Repository
              </span>
              <span className="text-xs text-obsidian-muted">
                {isCollege ? 'Anna Univ Regulation 2021 Syllabus' : 'CBSE Matriculation Standards'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-obsidian-text">
              Academic Catalog & Curriculum Architecture
            </h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Institutional departments, credit ratings, laboratory mappings, and designated course faculty.
            </p>
          </div>
        </div>
      </div>

      {isCollege ? (
        <>
          {/* Departments Grid */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-obsidian-muted mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-academic-primary" />
              Academic Departments
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments.map((d) => (
                <div
                  key={d.id}
                  className="bg-obsidian-surface border border-obsidian-border p-5 rounded-2xl hover:border-academic-primary/50 transition-all shadow-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-obsidian-card border border-obsidian-border flex items-center justify-center">
                      {getDeptIcon(d.code)}
                    </div>
                    <span className="font-mono text-xs font-bold text-academic-primary px-2 py-0.5 rounded bg-academic-primary/10 border border-academic-primary/20">
                      {d.code}
                    </span>
                  </div>

                  <h4 className="font-bold text-base text-obsidian-text mt-4">{d.name}</h4>
                  <p className="text-xs text-obsidian-muted mt-1">
                    Head of Dept: <span className="text-obsidian-text font-medium">{d.hodName || 'Dr. K. Ramanathan'}</span>
                  </p>

                  <div className="mt-4 pt-4 border-t border-obsidian-border/60 grid grid-cols-2 text-xs">
                    <div>
                      <span className="text-obsidian-muted block text-[10px]">Students</span>
                      <span className="font-mono font-bold text-obsidian-text">30 Enrolled</span>
                    </div>
                    <div>
                      <span className="text-obsidian-muted block text-[10px]">Courses</span>
                      <span className="font-mono font-bold text-academic-primary">4 Active</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Anna Univ Semester Courses Table */}
          <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl overflow-hidden shadow-card">
            <div className="p-4 border-b border-obsidian-border bg-obsidian-card/40 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-obsidian-text flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-academic-secondary" />
                  Semester 4 Course Offerings (Anna University R2021)
                </h3>
                <span className="text-xs text-obsidian-muted">
                  Department of Computer Science and Engineering
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-obsidian-border bg-obsidian-card/60 text-xs uppercase tracking-wider text-obsidian-muted">
                    <th className="py-3 px-4">Course Code</th>
                    <th className="py-3 px-4">Course Title</th>
                    <th className="py-3 px-4 text-center">Semester</th>
                    <th className="py-3 px-4 text-center">Credits</th>
                    <th className="py-3 px-4 text-center">Course Type</th>
                    <th className="py-3 px-4 text-center">Continuous Assessment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-border/60 text-xs">
                  {courses.map((c) => (
                    <tr key={c.id} className="hover:bg-obsidian-card/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-academic-primary">
                        {c.courseCode}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-obsidian-text">
                        {c.title}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-obsidian-muted">
                        Semester {c.semester}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-obsidian-text">
                        {c.credits}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.isLab
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-academic-primary/20 text-academic-primary border border-academic-primary/30'
                          }`}
                        >
                          {c.isLab ? 'PRACTICAL LAB' : 'THEORY'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-obsidian-muted">
                        40 CIA + 60 End Sem
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : classes.length === 0 ? (
        <div className="p-8 text-center text-obsidian-muted bg-obsidian-surface border border-obsidian-border rounded-2xl">
          <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-400" />
          <p className="font-semibold text-obsidian-text">No School Classes Configured</p>
          <p className="text-xs mt-1">Standards and sections will appear once configured for this campus.</p>
        </div>
      ) : (
        /* School Classes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => (
            <div
              key={c.id}
              className="bg-obsidian-surface border border-obsidian-border p-5 rounded-2xl shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-base text-obsidian-text">
                  Standard {c.standard}th — Section {c.section}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {c._count?.students ?? 0} Students
                </span>
              </div>
              <p className="text-xs text-obsidian-muted mt-2">
                Class Teacher: <span className="text-obsidian-text font-medium">{c.classTeacher || 'Staff In-Charge'}</span>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AcademicCatalogView;
