import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Shield,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  Activity,
  User,
  Calendar,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

interface InstitutionSettingData {
  attendanceThreshold: number;
  workingDaysPerWeek: number;
  periodsPerDay: number;
  passingMarksPercent: number;
  academicAlertEmail?: string;
  enableParentPortal: boolean;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  createdAt: string;
  user?: { id: string; fullName: string; email: string };
}

export const InstitutionSettingsPage: React.FC = () => {
  const { activeInstitution } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'policy' | 'audit'>('policy');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [settings, setSettings] = useState<InstitutionSettingData>({
    attendanceThreshold: 75.0,
    workingDaysPerWeek: 6,
    periodsPerDay: 8,
    passingMarksPercent: 50.0,
    academicAlertEmail: '',
    enableParentPortal: true,
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  useEffect(() => {
    loadSettings();
    if (activeTab === 'audit') {
      loadAuditLogs();
    }
  }, [activeInstitution?.id, activeTab]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/settings');
      if (res.data.data.settings) {
        setSettings(res.data.data.settings);
      }
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const res = await apiClient.get('/settings/audit-trail?limit=50');
      setAuditLogs(res.data.data.auditLogs || []);
    } catch (err: any) {
      console.error('Failed to load audit trail:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiClient.patch('/settings', settings);
      setSettings(res.data.data.settings);
      setFeedback({ type: 'success', message: 'Institution policies updated and audit log recorded.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update institution settings.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Institution Governance & Policy
            </span>
            <span className="text-xs text-slate-400">• {activeInstitution?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Academic Rules & Audit Trail</h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure institutional compliance thresholds, timetable periods, and inspect immutable system audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('policy')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              activeTab === 'policy'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Rules & Policies
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              activeTab === 'audit'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
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

      {/* ── TAB 1: POLICIES & THRESHOLDS ── */}
      {activeTab === 'policy' && (
        <form onSubmit={handleSaveSettings} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Attendance Threshold */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Mandatory Attendance Threshold
                </label>
                <span className="text-base font-mono font-bold text-emerald-400">
                  {settings.attendanceThreshold}%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Students below this percentage are automatically flagged in early warning radars and issued automated warning notices.
              </p>
              <input
                type="range"
                min="50"
                max="90"
                step="0.5"
                value={settings.attendanceThreshold}
                onChange={(e) => setSettings({ ...settings, attendanceThreshold: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>50% (Lenient)</span>
                <span>75% (Anna Univ Standard)</span>
                <span>90% (Strict)</span>
              </div>
            </div>

            {/* Passing Marks */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  Passing Marks Percentage
                </label>
                <span className="text-base font-mono font-bold text-sky-400">
                  {settings.passingMarksPercent}%
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Minimum overall percentage required to achieve PASS grade (vs RA / Re-Appear).
              </p>
              <input
                type="range"
                min="35"
                max="60"
                step="1"
                value={settings.passingMarksPercent}
                onChange={(e) => setSettings({ ...settings, passingMarksPercent: parseFloat(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                <span>35% (CBSE)</span>
                <span>50% (Anna Univ / Higher Ed)</span>
                <span>60% (Distinction)</span>
              </div>
            </div>

            {/* Timetable Schedule */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                Timetable Grid Configuration
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Working Days / Week</span>
                  <select
                    value={settings.workingDaysPerWeek}
                    onChange={(e) => setSettings({ ...settings, workingDaysPerWeek: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value={5}>5 Days (Mon - Fri)</option>
                    <option value={6}>6 Days (Mon - Sat)</option>
                  </select>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block mb-1">Hours / Periods Daily</span>
                  <select
                    value={settings.periodsPerDay}
                    onChange={(e) => setSettings({ ...settings, periodsPerDay: parseInt(e.target.value, 10) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                  >
                    <option value={6}>6 Periods</option>
                    <option value={7}>7 Periods</option>
                    <option value={8}>8 Periods (Standard)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Parent Portal & Emergency Email */}
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-3">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                Community & Alert Integrations
              </label>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Academic Defaulter Alert Email</span>
                <input
                  type="email"
                  placeholder="academics@institution.edu"
                  value={settings.academicAlertEmail || ''}
                  onChange={(e) => setSettings({ ...settings, academicAlertEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm text-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="enableParent"
                  checked={settings.enableParentPortal}
                  onChange={(e) => setSettings({ ...settings, enableParentPortal: e.target.checked })}
                  className="rounded border-slate-700 accent-emerald-500"
                />
                <label htmlFor="enableParent" className="text-xs text-slate-300 font-medium">
                  Enable Parent Portal & Multi-Child Academic Tracking
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Policies...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 2: AUDIT TRAIL ── */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Target Entity</th>
                  <th className="px-5 py-3.5">Triggered By</th>
                  <th className="px-5 py-3.5">Details</th>
                  <th className="px-5 py-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-300">
                      {log.entityType} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-300">
                      {log.user ? (
                        <div>
                          <span className="font-medium text-white block">{log.user.fullName}</span>
                          <span className="text-[11px] text-slate-500">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500">System Automation</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-slate-400 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 text-xs italic">
                      No audit events recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default InstitutionSettingsPage;
