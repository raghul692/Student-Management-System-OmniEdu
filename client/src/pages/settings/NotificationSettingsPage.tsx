import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  AlertTriangle,
  Calendar,
  Award,
  Radio,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface PreferencesData {
  emailAlerts: boolean;
  attendanceThreshold: boolean;
  examSchedule: boolean;
  gradeReports: boolean;
  announcements: boolean;
}

export const NotificationSettingsPage: React.FC = () => {
  const [prefs, setPrefs] = useState<PreferencesData>({
    emailAlerts: true,
    attendanceThreshold: true,
    examSchedule: true,
    gradeReports: true,
    announcements: true,
  });

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const res = await apiClient.get('/notifications/preferences');
      if (res.data.data.preferences) {
        setPrefs(res.data.data.preferences);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await apiClient.patch('/notifications/preferences', prefs);
      setPrefs(res.data.data.preferences);
      setFeedback({ type: 'success', message: 'Notification preferences updated successfully.' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update preferences.',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof PreferencesData) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Notification & Alert Preferences</h1>
            <p className="text-sm text-slate-400 mt-1">
              Choose which channels and educational triggers deliver alerts to your desktop and email.
            </p>
          </div>
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

      <form onSubmit={handleSave} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="divide-y divide-slate-800">
          {/* Email Channel */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3.5">
              <Mail className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Email Digest & Instant Alerts</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Receive high-priority warnings and term updates via your registered email address.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('emailAlerts')}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                prefs.emailAlerts ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Attendance Threshold Alerts */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Attendance Defaulter Warnings</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Immediate alerts when attendance drops below the required 75.0% threshold.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('attendanceThreshold')}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                prefs.attendanceThreshold ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Exam Schedules */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3.5">
              <Calendar className="w-5 h-5 text-sky-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Examination Timetable & Hall Ticket Releases</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Notifications when internal assessment schedules and hall tickets are finalized.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('examSchedule')}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                prefs.examSchedule ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Grade Reports */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3.5">
              <Award className="w-5 h-5 text-indigo-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Academic Performance & Grade Sheets</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Instant notice when assessment marks, semester grades, and CGPA cards are released.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('gradeReports')}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                prefs.gradeReports ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Announcements */}
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-start gap-3.5">
              <Radio className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-white">Institutional Broadcasts & Circulars</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Official notices, holiday schedules, and principal announcements.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle('announcements')}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                prefs.announcements ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
};
export default NotificationSettingsPage;
