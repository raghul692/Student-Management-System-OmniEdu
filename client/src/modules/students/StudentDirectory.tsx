import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  List, 
  Download, 
  GraduationCap, 
  ShieldAlert, 
  CheckCircle2, 
  Eye, 
  Sparkles,
  Users,
  Building2
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { Student } from '../../types';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import Student360Drawer from './Student360Drawer';

export const StudentDirectory: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  // Data & loading states
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Filters & view modes
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    async function loadStudents() {
      setLoading(true);
      try {
        const res = await apiClient.get('/students?limit=100');
        const fetched: Student[] = res.data.data.students || [];
        setStudents(fetched);
      } catch (err) {
        console.error('Failed to load students:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStudents();
  }, [activeCampus?.id]);

  // Client-side instant filter pipeline
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const nameMatch = s.fullName.toLowerCase().includes(query);
      const regMatch = s.regNumber?.toLowerCase().includes(query);
      const rollMatch = s.rollNumber?.toLowerCase().includes(query);
      const matchesSearch = !query || nameMatch || regMatch || rollMatch;

      // Dept match
      const matchesDept =
        selectedDept === 'ALL' ||
        (s.department && s.department.code === selectedDept);

      // Attendance Tier match
      const pct = s.attendanceSummary?.percentage ?? 85.0;
      let matchesTier = true;
      if (selectedTier === 'SAFE') matchesTier = pct >= 75.0;
      if (selectedTier === 'CONDONATION') matchesTier = pct >= 65.0 && pct < 75.0;
      if (selectedTier === 'DETAINED') matchesTier = pct < 65.0;

      return matchesSearch && matchesDept && matchesTier;
    });
  }, [students, searchQuery, selectedDept, selectedTier]);

  // Telemetry aggregates
  const totalCount = students.length;
  const defaulterCount = students.filter(
    (s) => (s.attendanceSummary?.percentage ?? 85.0) < 75.0
  ).length;
  const avgAttendance =
    totalCount > 0
      ? Math.round(
          students.reduce(
            (acc, s) => acc + (s.attendanceSummary?.percentage ?? 85.0),
            0
          ) / totalCount
        )
      : 0;

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Name', 'Identifier', 'Department/Class', 'Attendance %', 'Status'];
    const rows = filteredStudents.map((s) => [
      `"${s.fullName}"`,
      `"${s.regNumber || s.rollNumber}"`,
      `"${s.department?.code || (s.schoolClass ? `${s.schoolClass.standard}th-${s.schoolClass.section}` : 'General')}"`,
      (s.attendanceSummary?.percentage ?? 85.0).toFixed(1),
      (s.attendanceSummary?.percentage ?? 85.0) >= 75 ? 'Eligible' : 'Defaulter',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OmniEdu_Student_Directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Student 360 Slide-over Drawer */}
      <Student360Drawer
        studentId={selectedStudentId}
        onClose={() => setSelectedStudentId(null)}
      />

      {/* Header & Meta Bar */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-academic-secondary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-academic-secondary/20 text-academic-secondary border border-academic-secondary/30">
                Institutional Directory
              </span>
              <span className="text-xs text-obsidian-muted">
                {isCollege ? 'Anna Univ Engineering Students' : 'K-12 School Student Body'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-obsidian-text">
              Student Directory & 360° Profiles
            </h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Search by Anna Univ 12-digit Reg No or Roll No, analyze semester standing, and inspect individual academic histories.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-obsidian-card p-1 rounded-xl border border-obsidian-border">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'table'
                    ? 'bg-academic-primary text-black font-semibold shadow-glow-cyan'
                    : 'text-obsidian-muted hover:text-obsidian-text'
                }`}
                title="Table View"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'grid'
                    ? 'bg-academic-primary text-black font-semibold shadow-glow-cyan'
                    : 'text-obsidian-muted hover:text-obsidian-text'
                }`}
                title="Bento Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-obsidian-border/60">
          <div className="bg-obsidian-card/60 p-3 rounded-xl border border-obsidian-border">
            <span className="text-xs text-obsidian-muted block">Enrolled Students</span>
            <span className="text-xl font-bold font-mono text-obsidian-text mt-0.5 block">{totalCount}</span>
          </div>

          <div className="bg-obsidian-card/60 p-3 rounded-xl border border-obsidian-border">
            <span className="text-xs text-obsidian-muted block">Campus Scope</span>
            <span className="text-sm font-bold text-academic-primary mt-1 block truncate">
              {activeCampus?.name || 'Institutional Roster'}
            </span>
          </div>

          <div className="bg-obsidian-card/60 p-3 rounded-xl border border-obsidian-border">
            <span className="text-xs text-obsidian-muted block">Average Attendance</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">{avgAttendance}%</span>
          </div>

          <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
            <span className="text-xs text-rose-400 font-medium block">Defaulters (&lt;75%)</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-0.5 block">{defaulterCount}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-obsidian-surface border border-obsidian-border p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-obsidian-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              isCollege
                ? 'Search by Anna Univ Reg No or Name...'
                : 'Search by Roll No or Student Name...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-obsidian-card border border-obsidian-border rounded-xl pl-9 pr-4 py-2 text-xs text-obsidian-text placeholder:text-obsidian-muted/60 focus:outline-none focus:border-academic-primary transition-colors font-mono"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Department Filter (College only) */}
          {isCollege && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-obsidian-card border border-obsidian-border rounded-xl px-3 py-2 text-xs text-obsidian-text focus:outline-none focus:border-academic-primary"
            >
              <option value="ALL">All Departments</option>
              <option value="CSE">CSE Dept</option>
              <option value="ECE">ECE Dept</option>
              <option value="MECH">MECH Dept</option>
            </select>
          )}

          {/* Attendance Tier Filter */}
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="bg-obsidian-card border border-obsidian-border rounded-xl px-3 py-2 text-xs text-obsidian-text focus:outline-none focus:border-academic-primary"
          >
            <option value="ALL">All Attendance Tiers</option>
            <option value="SAFE">Safe (≥ 75%)</option>
            <option value="CONDONATION">Condonation (65% - 74.9%)</option>
            <option value="DETAINED">Detained (&lt; 65%)</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table View OR Bento Grid View */}
      {viewMode === 'table' ? (
        <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-obsidian-border bg-obsidian-card/60 text-xs uppercase tracking-wider text-obsidian-muted">
                  <th className="py-3.5 px-4 font-semibold">#</th>
                  <th className="py-3.5 px-4 font-semibold">Student Identity</th>
                  <th className="py-3.5 px-4 font-semibold">Registration Identifier</th>
                  <th className="py-3.5 px-4 font-semibold">{isCollege ? 'Department / Sem' : 'Standard / Section'}</th>
                  <th className="py-3.5 px-4 font-semibold">Attendance Radar</th>
                  <th className="py-3.5 px-4 font-semibold">Academic Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-obsidian-muted">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-academic-primary border-t-transparent" />
                      <p className="mt-2 text-xs">Loading institutional directory...</p>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-obsidian-muted text-xs">
                      No matching students found for "{searchQuery}".
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((st, idx) => {
                    const pct = st.attendanceSummary?.percentage ?? 85.0;
                    const isDefaulter = pct < 75.0;

                    return (
                      <motion.tr
                        key={st.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, delay: idx * 0.015 }}
                        className="hover:bg-obsidian-card/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedStudentId(st.id)}
                      >
                        <td className="py-3.5 px-4 text-xs font-mono text-obsidian-muted">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-academic-primary/20 to-academic-secondary/20 border border-academic-primary/30 flex items-center justify-center font-bold text-xs text-academic-primary shrink-0">
                              {st.fullName
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            <div>
                              <div className="font-medium text-obsidian-text">{st.fullName}</div>
                              <div className="text-[11px] text-obsidian-muted capitalize">{st.gender.toLowerCase()}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-obsidian-card border border-obsidian-border text-academic-primary">
                            {st.regNumber || st.rollNumber}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="text-xs text-obsidian-text font-medium">
                            {isCollege
                              ? `${st.department?.code || 'CSE'} • Sem ${st.semester || 4}`
                              : st.schoolClass
                              ? `${st.schoolClass.standard}th Standard • Sec ${st.schoolClass.section}`
                              : 'General Class'}
                          </div>
                          <div className="text-[10px] text-obsidian-muted">
                            {isCollege ? 'R2021 Regulation' : 'CBSE Board'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-obsidian-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 75
                                    ? 'bg-emerald-400'
                                    : pct >= 65
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                pct >= 75
                                  ? 'text-emerald-400'
                                  : pct >= 65
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isDefaulter ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              {pct < 65 ? 'SA DETAINED' : 'CONDONATION'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              ELIGIBLE
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Eye className="w-3.5 h-3.5" />}
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setSelectedStudentId(st.id);
                            }}
                          >
                            360°
                          </Button>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bento Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((st, idx) => {
            const pct = st.attendanceSummary?.percentage ?? 85.0;
            const isDefaulter = pct < 75.0;

            return (
              <motion.div
                key={st.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.02 }}
                onClick={() => setSelectedStudentId(st.id)}
                className="bg-obsidian-surface border border-obsidian-border hover:border-academic-primary/50 p-5 rounded-2xl transition-all cursor-pointer shadow-card group relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-academic-primary/20 to-academic-secondary/20 border border-academic-primary/30 flex items-center justify-center font-bold text-sm text-academic-primary shrink-0 group-hover:shadow-glow-cyan transition-shadow">
                      {st.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-obsidian-text group-hover:text-academic-primary transition-colors">
                        {st.fullName}
                      </h4>
                      <span className="font-mono text-xs text-obsidian-muted">
                        {st.regNumber || st.rollNumber}
                      </span>
                    </div>
                  </div>

                  <StatusBadge status="active" />
                </div>

                <div className="mt-4 pt-4 border-t border-obsidian-border/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-obsidian-muted block">Department</span>
                    <span className="font-medium text-obsidian-text">
                      {st.department?.code || (st.schoolClass ? `${st.schoolClass.standard}th Standard` : 'General Class')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-obsidian-muted block">Attendance</span>
                    <span
                      className={`font-mono font-bold ${
                        pct >= 75
                          ? 'text-emerald-400'
                          : pct >= 65
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDirectory;
