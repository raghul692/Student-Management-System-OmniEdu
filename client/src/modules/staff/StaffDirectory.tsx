import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  GraduationCap,
  School,
  Mail,
  Phone,
  Calendar,
  Building2,
  BookOpen,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Shield,
  Eye,
  Edit2,
  Power,
  RefreshCw,
  LayoutGrid,
  List,
  ChevronRight,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';
import { apiClient } from '../../services/apiClient';

interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  department?: { id: string; name: string; code: string } | null;
  schoolClass?: { id: string; standard: number; section: string } | null;
  isActive: boolean;
  joinedDate?: string;
}

interface StaffProfileDetail extends StaffMember {
  institution?: { id: string; name: string; code: string; type: string };
  assignments?: Array<{
    id: string;
    dayOfWeek: number;
    slotNumber: number;
    startTime: string;
    endTime: string;
    subjectName: string;
    roomNumber?: string;
    course?: { id: string; courseCode: string; title: string };
    schoolClass?: { id: string; standard: number; section: string };
  }>;
}

export const StaffDirectory: React.FC = () => {
  const { activeInstitution, getActiveTenantType } = useAuthStore();
  const { can, institutionRole } = usePermissionStore();

  const isCollege = getActiveTenantType() === 'COLLEGE';
  const isStudent = institutionRole === 'STUDENT';
  const isHod = institutionRole === 'HOD';
  const canManage = can('users', 'write') || institutionRole === 'INSTITUTION_ADMIN' || isHod;

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');

  // Available metadata options
  const [departments, setDepartments] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: string; standard: number; section: string }>>([]);

  // Modals
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<StaffProfileDetail | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: isCollege ? 'FACULTY' : 'CLASS_TEACHER',
    deptId: '',
    classId: '',
    defaultPassword: 'Apollo@2026',
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Fetch departments and classes for dropdowns
  useEffect(() => {
    async function loadMeta() {
      try {
        if (isCollege) {
          const res = await apiClient.get('/academic/departments');
          if (res.data?.data?.departments) setDepartments(res.data.data.departments);
        } else {
          const res = await apiClient.get('/academic/classes');
          if (res.data?.data?.classes) setClasses(res.data.data.classes);
        }
      } catch (e) {
        // Meta fetch error handled gracefully
      }
    }
    loadMeta();
  }, [isCollege, activeInstitution?.id]);

  // 2. Fetch staff list
  const fetchStaff = async () => {
    if (isStudent) {
      setError('Access Denied. Students are not authorized to view the staff directory.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params: any = { limit: 100 };
      if (search) params.search = search;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (deptFilter !== 'ALL') params.deptId = deptFilter;
      if (classFilter !== 'ALL') params.classId = classFilter;

      const res = await apiClient.get('/staff', { params });
      setStaff(res.data?.data?.staff || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load staff directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [activeInstitution?.id, roleFilter, deptFilter, classFilter]);

  // 3. Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStaff();
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // 4. Fetch Staff Profile Details
  const handleOpenProfile = async (id: string) => {
    setSelectedStaffId(id);
    setLoadingProfile(true);
    try {
      const res = await apiClient.get(`/staff/${id}`);
      setProfileDetail(res.data?.data?.staff || null);
    } catch (err: any) {
      setError('Failed to load staff details');
    } finally {
      setLoadingProfile(false);
    }
  };

  // 5. Toggle active status
  const handleToggleStatus = async (id: string) => {
    try {
      await apiClient.patch(`/staff/${id}/toggle-status`);
      setActionSuccess('Staff status updated successfully');
      setTimeout(() => setActionSuccess(null), 3000);
      fetchStaff();
      if (selectedStaffId === id) handleOpenProfile(id);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to toggle status');
    }
  };

  // 6. Handle create staff submit
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAdd(true);
    setError(null);
    try {
      await apiClient.post('/staff', {
        fullName: addForm.fullName,
        email: addForm.email,
        phone: addForm.phone || undefined,
        role: addForm.role,
        deptId: addForm.deptId || undefined,
        classId: addForm.classId || undefined,
        defaultPassword: addForm.defaultPassword || undefined,
      });

      setShowAddModal(false);
      setActionSuccess('Staff member registered successfully');
      setAddForm({
        fullName: '',
        email: '',
        phone: '',
        role: isCollege ? 'FACULTY' : 'CLASS_TEACHER',
        deptId: '',
        classId: '',
        defaultPassword: 'Apollo@2026',
      });
      setTimeout(() => setActionSuccess(null), 3000);
      fetchStaff();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add staff member');
    } finally {
      setSubmittingAdd(false);
    }
  };

  if (isStudent) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center max-w-xl mx-auto space-y-4 my-12">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-black text-white">Staff Management Access Restricted</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          Student accounts are scoped strictly to personal academic records. The institutional faculty and staff directory is reserved for academic personnel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              {isCollege ? <GraduationCap className="w-3 h-3" /> : <School className="w-3 h-3" />}
              {isCollege ? 'Collegiate Faculty Roster' : 'School Teaching Staff'}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {activeInstitution?.code}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {isCollege ? 'Faculty & Academic Staff' : 'Teaching & Advisory Staff'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {isCollege
              ? 'Manage department professors, HODs, course assignments, and faculty status.'
              : 'Manage class teachers, subject educators, and advisory personnel.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'TABLE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('GRID')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'GRID' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchStaff}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            title="Refresh Staff List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isCollege ? 'Add Faculty Member' : 'Add Teacher'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filtering Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="ALL">All Roles</option>
            <option value="INSTITUTION_ADMIN">Institution Admin</option>
            {isCollege && <option value="HOD">Head of Department (HOD)</option>}
            <option value="FACULTY">{isCollege ? 'Faculty / Professor' : 'Teacher'}</option>
            {isCollege ? (
              <option value="CLASS_ADVISOR">Class Advisor</option>
            ) : (
              <option value="CLASS_TEACHER">Class Teacher</option>
            )}
          </select>

          {/* Department Filter (College) */}
          {isCollege && (
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          )}

          {/* Class Filter (School) */}
          {!isCollege && (
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.standard}-{c.section}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Staff Display */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Loading staff records...</p>
        </div>
      ) : staff.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-slate-900/30 border border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No staff members found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {search || roleFilter !== 'ALL' || deptFilter !== 'ALL' || classFilter !== 'ALL'
              ? 'Try modifying your search query or filter parameters.'
              : 'Add educators and administrative staff to begin scheduling and assignments.'}
          </p>
        </div>
      ) : viewMode === 'TABLE' ? (
        /* Table View */
        <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3.5 px-4">Name & Contact</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">{isCollege ? 'Department' : 'Class Assignment'}</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-white text-sm block">{member.fullName}</span>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {member.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        {member.role.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {isCollege ? (
                        member.department ? (
                          <div>
                            <span className="font-semibold text-white">{member.department.code}</span>
                            <span className="text-[11px] text-slate-400 block">
                              {member.department.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Institution Wide</span>
                        )
                      ) : member.schoolClass ? (
                        <span className="font-semibold text-purple-300">
                          Class {member.schoolClass.standard}-{member.schoolClass.section}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">General Faculty</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {member.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                          Inactive
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenProfile(member.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-400" />
                          <span>View</span>
                        </button>

                        {canManage && (
                          <button
                            onClick={() => handleToggleStatus(member.id)}
                            className={`p-1.5 rounded-lg border transition-all ${
                              member.isActive
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/25'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/25'
                            }`}
                            title={member.isActive ? 'Deactivate Staff' : 'Activate Staff'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <div
              key={member.id}
              className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {member.role.replace(/_/g, ' ')}
                  </span>
                  {member.isActive ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                  )}
                </div>

                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {member.fullName}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{member.email}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                  {isCollege ? (
                    <p>
                      <span className="text-slate-500">Department: </span>
                      <span className="text-slate-200 font-semibold">
                        {member.department ? member.department.name : 'All Departments'}
                      </span>
                    </p>
                  ) : (
                    <p>
                      <span className="text-slate-500">Assigned Class: </span>
                      <span className="text-slate-200 font-semibold">
                        {member.schoolClass ? `Class ${member.schoolClass.standard}-${member.schoolClass.section}` : 'General'}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => handleOpenProfile(member.id)}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <span>View Full Profile</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {canManage && (
                  <button
                    onClick={() => handleToggleStatus(member.id)}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border ${
                      member.isActive
                        ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                        : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                    }`}
                  >
                    {member.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Staff Profile Drawer / Modal */}
      <AnimatePresence>
        {selectedStaffId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 font-bold text-base">
                    {profileDetail?.fullName?.slice(0, 2)?.toUpperCase() || 'ST'}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{profileDetail?.fullName}</h3>
                    <p className="text-xs text-slate-400">{profileDetail?.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStaffId(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingProfile ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">Loading profile data...</p>
                </div>
              ) : profileDetail ? (
                <div className="space-y-5 text-xs">
                  {/* Scope Badges */}
                  <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                        Assigned Role
                      </span>
                      <span className="text-sm font-bold text-indigo-400">
                        {profileDetail.role.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider block">
                        Account Status
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          profileDetail.isActive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {profileDetail.isActive ? 'Active Member' : 'Deactivated'}
                      </span>
                    </div>
                  </div>

                  {/* Academic Scope */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Academic Scope & Affiliation
                    </h4>
                    <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
                      <p className="flex justify-between">
                        <span className="text-slate-500">Institution:</span>
                        <span className="text-white font-semibold">
                          {profileDetail.institution?.name}
                        </span>
                      </p>
                      {isCollege && (
                        <p className="flex justify-between">
                          <span className="text-slate-500">Department:</span>
                          <span className="text-indigo-300 font-semibold">
                            {profileDetail.department
                              ? `${profileDetail.department.code} - ${profileDetail.department.name}`
                              : 'Institution Wide'}
                          </span>
                        </p>
                      )}
                      {!isCollege && (
                        <p className="flex justify-between">
                          <span className="text-slate-500">Class Section:</span>
                          <span className="text-purple-300 font-semibold">
                            {profileDetail.schoolClass
                              ? `Class ${profileDetail.schoolClass.standard}-${profileDetail.schoolClass.section}`
                              : 'General Teaching Staff'}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Timetable Assignments */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Assigned Teaching Slots & Subjects ({profileDetail.assignments?.length || 0})
                    </h4>
                    {profileDetail.assignments && profileDetail.assignments.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                        {profileDetail.assignments.map((slot) => (
                          <div
                            key={slot.id}
                            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-white block">
                                {slot.subjectName}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Slot {slot.slotNumber} • {slot.startTime} - {slot.endTime}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {slot.roomNumber || 'LH-101'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 italic p-3 rounded-xl bg-slate-950/40 border border-slate-800">
                        No timetable slots currently mapped to this educator.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  onClick={() => setSelectedStaffId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Invite Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-white">
                    {isCollege ? 'Register New Faculty Member' : 'Register New School Teacher'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. K. Meenakshi"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="faculty@apollo.edu"
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98400 12345"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">Role *</label>
                    <select
                      value={addForm.role}
                      onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {isCollege ? (
                        <>
                          <option value="FACULTY">Faculty / Professor</option>
                          <option value="HOD">Head of Department (HOD)</option>
                          <option value="CLASS_ADVISOR">Class Advisor</option>
                          <option value="INSTITUTION_ADMIN">Institution Admin</option>
                        </>
                      ) : (
                        <>
                          <option value="CLASS_TEACHER">Class Teacher</option>
                          <option value="FACULTY">Subject Teacher</option>
                          <option value="INSTITUTION_ADMIN">School Principal / Admin</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">
                      {isCollege ? 'Department' : 'Assigned Class'}
                    </label>
                    {isCollege ? (
                      <select
                        value={addForm.deptId}
                        onChange={(e) => setAddForm({ ...addForm, deptId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">Institution-Wide / General</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.code} - {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={addForm.classId}
                        onChange={(e) => setAddForm({ ...addForm, classId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">General Teaching Pool</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            Class {c.standard}-{c.section}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {submittingAdd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirm & Invite Staff</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
