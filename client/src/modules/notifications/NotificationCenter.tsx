import React, { useState, useEffect } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  Info,
  AlertCircle,
  Calendar,
  Award,
  Settings,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'ATTENDANCE' | 'EXAM' | 'RESULT' | 'ACADEMIC' | 'SYSTEM' | 'GENERAL';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    loadNotifications();
  }, [selectedCategory]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const categoryParam = selectedCategory !== 'ALL' ? `?category=${selectedCategory}` : '';
      const res = await apiClient.get(`/notifications${categoryParam}`);
      setNotifications(res.data.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ATTENDANCE':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'EXAM':
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case 'RESULT':
        return <Award className="w-4 h-4 text-emerald-400" />;
      case 'ACADEMIC':
        return <Info className="w-4 h-4 text-indigo-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Notification Center</h1>
            <p className="text-sm text-slate-400">
              Threshold warnings, attendance alerts, exam schedules, and system broadcasts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              Mark All as Read
            </button>
          )}
          <button
            onClick={() => navigate('/app/settings/notifications')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <Settings className="w-3.5 h-3.5" />
            Preferences
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {['ALL', 'ATTENDANCE', 'EXAM', 'RESULT', 'ACADEMIC', 'SYSTEM', 'GENERAL'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === cat
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
              !n.isRead
                ? 'bg-slate-900/90 border-slate-700/80 shadow-sm'
                : 'bg-slate-900/30 border-slate-800/60 opacity-85'
            }`}
          >
            <div className="flex items-start gap-3.5 flex-1">
              <div className="mt-0.5 p-2 rounded-xl bg-slate-800 border border-slate-700">
                {getCategoryIcon(n.category)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    {n.category}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                      n.severity === 'CRITICAL'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : n.severity === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {n.severity}
                  </span>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <h3 className="text-base font-bold text-white">{n.title}</h3>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                  <span>{new Date(n.createdAt).toLocaleString()}</span>
                  {n.actionUrl && (
                    <button
                      onClick={() => navigate(n.actionUrl!)}
                      className="text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      View details <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!n.isRead && (
              <button
                onClick={() => handleMarkAsRead(n.id)}
                className="self-end sm:self-start flex items-center gap-1 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              >
                <Check className="w-3 h-3" />
                Mark read
              </button>
            )}
          </div>
        ))}

        {notifications.length === 0 && !loading && (
          <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
            <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No notifications</h3>
            <p className="text-xs text-slate-400 mt-1">You are all caught up!</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default NotificationCenter;
