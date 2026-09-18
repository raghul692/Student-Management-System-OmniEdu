import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Calendar,
  Pin,
  Trash2,
  Building2,
  Users,
  BookOpen,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';
import { Button } from '../../components/ui/Button';

interface Announcement {
  id: string;
  title: string;
  body: string;
  scope: 'INSTITUTION' | 'DEPARTMENT' | 'CLASS';
  priority: 'NORMAL' | 'IMPORTANT' | 'URGENT';
  isPinned: boolean;
  createdAt: string;
  creator: { name: string; institutionRole?: string };
  department?: { name: string };
  schoolClass?: { name: string };
}

interface Toast {
  type: 'success' | 'error';
  text: string;
}

const PRIORITY_STYLES: Record<Announcement['priority'], string> = {
  URGENT: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  IMPORTANT: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  NORMAL: 'bg-slate-500/15 text-slate-400 border-slate-500/25',
};

const SCOPE_ICONS: Record<Announcement['scope'], React.ReactNode> = {
  INSTITUTION: <Building2 className="w-3 h-3" />,
  DEPARTMENT: <BookOpen className="w-3 h-3" />,
  CLASS: <Users className="w-3 h-3" />,
};

export const AnnouncementsBoard: React.FC = () => {
  const { activeCampus } = useAuthStore();
  const { institutionRole } = usePermissionStore();
  const canPost = ['FACULTY', 'CLASS_TEACHER', 'HOD', 'INSTITUTION_ADMIN'].includes(institutionRole || '');
  const canDelete = ['HOD', 'INSTITUTION_ADMIN'].includes(institutionRole || '');

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    body: '',
    scope: 'INSTITUTION' as Announcement['scope'],
    priority: 'NORMAL' as Announcement['priority'],
    isPinned: false,
  });

  const showToast = (type: Toast['type'], text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/announcements');
      setAnnouncements(res.data.data.announcements || []);
    } catch {
      console.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [activeCampus?.id, loadAnnouncements]);

  const handleCreate = async () => {
    if (!newAnnouncement.title || !newAnnouncement.body) {
      showToast('error', 'Title and body are required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/announcements', newAnnouncement);
      showToast('success', 'Announcement published successfully');
      setShowCreate(false);
      setNewAnnouncement({ title: '', body: '', scope: 'INSTITUTION', priority: 'NORMAL', isPinned: false });
      loadAnnouncements();
    } catch {
      showToast('error', 'Failed to publish announcement');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await apiClient.delete(`/announcements/${id}`);
      showToast('success', 'Announcement deleted');
      loadAnnouncements();
    } catch {
      showToast('error', 'Failed to delete announcement');
    }
  };

  const pinned = announcements.filter((a) => a.isPinned);
  const regular = announcements.filter((a) => !a.isPinned);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg flex items-center gap-2 ${
              toast.type === 'success'
                ? 'bg-emerald-900/80 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-900/80 border-rose-500/30 text-rose-300'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-brand-400" />
            Announcements
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Institution-wide broadcasts and notices</p>
        </div>
        {canPost && (
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreate(true)}>
            Post Announcement
          </Button>
        )}
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-600 gap-3">
          <Megaphone className="w-12 h-12 opacity-30" />
          <p className="text-sm">No announcements yet</p>
          {canPost && (
            <Button variant="outline" size="sm" onClick={() => setShowCreate(true)}>Post First Announcement</Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pinned Section */}
          {pinned.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Pinned</span>
              </div>
              <div className="space-y-3">
                {pinned.map((ann, idx) => (
                  <AnnouncementCard key={ann.id} ann={ann} idx={idx} canDelete={canDelete} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* Regular Section */}
          {regular.length > 0 && (
            <div>
              {pinned.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <Megaphone className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">All Announcements</span>
                </div>
              )}
              <div className="space-y-3">
                {regular.map((ann, idx) => (
                  <AnnouncementCard key={ann.id} ann={ann} idx={idx} canDelete={canDelete} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Announcement Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-obsidian-card border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-100">New Announcement</h3>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Title *</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Announcement title"
                    value={newAnnouncement.title}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Content *</label>
                  <textarea
                    rows={4}
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
                    placeholder="Announcement details..."
                    value={newAnnouncement.body}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, body: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Scope</label>
                    <select
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newAnnouncement.scope}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, scope: e.target.value as Announcement['scope'] })}
                    >
                      <option value="INSTITUTION">Institution-wide</option>
                      <option value="DEPARTMENT">Department</option>
                      <option value="CLASS">Class</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Priority</label>
                    <select
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newAnnouncement.priority}
                      onChange={(e) => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value as Announcement['priority'] })}
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="IMPORTANT">Important</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-white/20 bg-obsidian-surface accent-brand-500"
                    checked={newAnnouncement.isPinned}
                    onChange={(e) => setNewAnnouncement({ ...newAnnouncement, isPinned: e.target.checked })}
                  />
                  <span className="text-sm text-slate-300">Pin this announcement</span>
                </label>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" isLoading={creating} onClick={handleCreate}>
                  Publish
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface AnnouncementCardProps {
  ann: Announcement;
  idx: number;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

const SCOPE_LABELS: Record<string, string> = {
  INSTITUTION: 'Institution',
  DEPARTMENT: 'Department',
  CLASS: 'Class',
};

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ ann, idx, canDelete, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className={`bg-obsidian-card border rounded-2xl overflow-hidden ${
        ann.isPinned ? 'border-amber-500/20' : 'border-white/[0.07]'
      }`}
    >
      <div
        className="px-4 py-3.5 flex items-start gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-100">{ann.title}</span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${PRIORITY_STYLES[ann.priority]}`}>
              {ann.priority}
            </span>
            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
              {SCOPE_LABELS[ann.scope]}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {ann.creator.name} · {new Date(ann.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
        {canDelete && (
          <button
            className="text-slate-600 hover:text-rose-400 transition-colors p-1 shrink-0"
            onClick={(e) => { e.stopPropagation(); onDelete(ann.id); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm text-slate-300 border-t border-white/[0.05] pt-3 leading-relaxed">
              {ann.body}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnnouncementsBoard;
