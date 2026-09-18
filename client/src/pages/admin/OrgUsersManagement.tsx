import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Building2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/apiClient';

export const OrgUsersManagement: React.FC = () => {
  const { activeOrganization } = useAuthStore();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchUsers = async () => {
    if (!activeOrganization?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/organizations/${activeOrganization.id}/users`);
      setMembers(res.data?.data?.users || []);
    } catch (e) {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [activeOrganization?.id]);

  const filtered = members.filter((m) =>
    m.user?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Shield className="w-3 h-3" /> Identity & Governance
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {activeOrganization?.slug}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Organization Personnel & Identity
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cross-campus user registry showing institutional memberships and assigned privileges.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search personnel by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">Total Users: {filtered.length}</span>
      </div>

      {/* Users Table */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Org Role</th>
                <th className="py-3.5 px-4">Campus Memberships & Scopes</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filtered.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div>
                      <span className="font-bold text-white text-sm block">{item.user.fullName}</span>
                      <span className="text-[11px] text-slate-400 font-mono block">{item.user.email}</span>
                      {item.user.phone && (
                        <span className="text-[10px] text-slate-500 font-mono block">{item.user.phone}</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.orgRole === 'ORG_ADMIN'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.orgRole}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1.5 max-w-md">
                      {item.user.institutionMemberships?.map((im: any) => (
                        <div
                          key={im.id}
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-0.5"
                        >
                          <span className="font-semibold text-indigo-300 block">
                            {im.institution?.name}
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {im.role.replace(/_/g, ' ')} {im.department ? `• ${im.department.code}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {item.user.isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                        Suspended
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
