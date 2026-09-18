import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { usePermissionStore } from '../store/usePermissionStore';
import { ExecutiveDashboard } from '../components/dashboard/ExecutiveDashboard';
import { OrgAdminDashboard } from './OrgAdminDashboard';
import { StudentDashboard } from '../components/dashboard/StudentDashboard';
import { FacultyDashboard } from '../components/dashboard/FacultyDashboard';
import { HodDashboard } from '../components/dashboard/HodDashboard';
import { ParentDashboard } from '../components/dashboard/ParentDashboard';
import { TabKey } from '../components/layout/DynamicSidebar';
import { Shield, Building2, LayoutDashboard } from 'lucide-react';

interface RoleDashboardProps {
  onNavigate?: (tab: TabKey) => void;
}

export const RoleDashboard: React.FC<RoleDashboardProps> = ({ onNavigate }) => {
  const { user, institutionRole } = useAuthStore();
  const { systemRole } = usePermissionStore();
  const [viewMode, setViewMode] = useState<'ORG' | 'CAMPUS'>('CAMPUS');

  const isOrgAdmin =
    user?.systemRole === 'ORG_ADMIN' ||
    user?.systemRole === 'PLATFORM_ADMIN' ||
    systemRole === 'ORG_ADMIN' ||
    systemRole === 'PLATFORM_ADMIN';

  const effectiveRole = institutionRole || (user?.role as string) || '';

  return (
    <div className="space-y-4">
      {/* If Org Admin, provide quick switcher toggle between Campus and Trust level */}
      {isOrgAdmin && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">
              Logged in as Organization Super Admin
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('CAMPUS')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'CAMPUS'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Campus Telemetry</span>
            </button>
            <button
              onClick={() => setViewMode('ORG')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === 'ORG'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Trust Console</span>
            </button>
          </div>
        </div>
      )}

      {/* Render role-tailored dashboard foundation */}
      {isOrgAdmin && viewMode === 'ORG' ? (
        <OrgAdminDashboard />
      ) : effectiveRole === 'STUDENT' ? (
        <StudentDashboard onNavigate={onNavigate} />
      ) : effectiveRole === 'PARENT' ? (
        <ParentDashboard onNavigate={onNavigate} />
      ) : effectiveRole === 'HOD' ? (
        <HodDashboard onNavigate={onNavigate} />
      ) : effectiveRole === 'FACULTY' || effectiveRole === 'TEACHER' ? (
        <FacultyDashboard onNavigate={onNavigate} />
      ) : (
        <ExecutiveDashboard onNavigate={onNavigate} />
      )}
    </div>
  );
};
