import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Plus, Filter, MessageSquare, CheckCircle2,
  Clock, AlertTriangle, UserCheck, RefreshCw, X
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Card, CardHeader, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { AlertBanner } from '../../components/design-system/AlertBanner';

interface Intervention {
  id: string;
  title: string;
  description: string;
  status: 'DETECTED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  studentId: string;
  student?: {
    id: string;
    fullName: string;
    rollNumber?: string;
    regNumber?: string;
    department?: { name: string };
  };
  assignedToUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  notes?: { id: string; content: string; authorName: string; createdAt: string }[];
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
  DETECTED: 'warning',
  ASSIGNED: 'info',
  IN_PROGRESS: 'default',
  RESOLVED: 'success',
  REOPENED: 'danger',
};

export const InterventionCenter: React.FC = () => {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStudentId, setNewStudentId] = useState('');
  const [newRiskLevel, setNewRiskLevel] = useState('HIGH');
  const [creating, setCreating] = useState(false);

  const fetchInterventions = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== 'ALL'
        ? `/interventions?status=${statusFilter}`
        : '/interventions';
      const res = await apiClient.get(url);
      setInterventions(res.data.data?.interventions || []);
    } catch {
      setInterventions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, [statusFilter]);

  const handleAdvanceStatus = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/interventions/${id}/status`, { newStatus });
      setBannerMessage(`Intervention moved to ${newStatus}`);
      if (selectedIntervention?.id === id) {
        setSelectedIntervention((prev) => prev ? { ...prev, status: newStatus as any } : null);
      }
      fetchInterventions();
    } catch {
      setBannerMessage('Failed to update intervention status.');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIntervention || !newNoteContent.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await apiClient.post(`/interventions/${selectedIntervention.id}/notes`, {
        content: newNoteContent.trim(),
      });
      const createdNote = res.data.data?.note;
      setSelectedIntervention((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          notes: [createdNote, ...(prev.notes || [])],
        };
      });
      setNewNoteContent('');
      setBannerMessage('Note logged successfully.');
    } catch {
      setBannerMessage('Failed to save note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleCreateIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim() || !newStudentId.trim()) return;

    setCreating(true);
    try {
      await apiClient.post('/interventions', {
        title: newTitle.trim(),
        description: newDesc.trim(),
        studentId: newStudentId.trim(),
        riskLevel: newRiskLevel,
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewStudentId('');
      setBannerMessage('New intervention workflow initiated.');
      fetchInterventions();
    } catch {
      setBannerMessage('Failed to create intervention.');
    } finally {
      setCreating(false);
    }
  };

  const stats = {
    total: interventions.length,
    detected: interventions.filter((i) => i.status === 'DETECTED').length,
    assigned: interventions.filter((i) => i.status === 'ASSIGNED').length,
    inProgress: interventions.filter((i) => i.status === 'IN_PROGRESS').length,
    resolved: interventions.filter((i) => i.status === 'RESOLVED').length,
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Intervention Center</h1>
            <Badge variant="purple" size="sm">Phase H</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Enterprise at-risk student remediation, mentoring workflows, and outcome tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchInterventions} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Create Intervention
          </Button>
        </div>
      </div>

      {bannerMessage && (
        <AlertBanner
          type="info"
          message={bannerMessage}
          onClose={() => setBannerMessage(null)}
        />
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card padding="sm" className="bg-slate-900/50">
          <div className="text-xs text-slate-400">Total Logged</div>
          <div className="text-xl font-bold text-slate-100 mt-1">{stats.total}</div>
        </Card>
        <Card padding="sm" className="bg-amber-950/20 border-amber-800/40">
          <div className="text-xs text-amber-400 font-medium">Detected</div>
          <div className="text-xl font-bold text-amber-300 mt-1">{stats.detected}</div>
        </Card>
        <Card padding="sm" className="bg-sky-950/20 border-sky-800/40">
          <div className="text-xs text-sky-400 font-medium">Assigned</div>
          <div className="text-xl font-bold text-sky-300 mt-1">{stats.assigned}</div>
        </Card>
        <Card padding="sm" className="bg-indigo-950/20 border-indigo-800/40">
          <div className="text-xs text-indigo-400 font-medium">In Progress</div>
          <div className="text-xl font-bold text-indigo-300 mt-1">{stats.inProgress}</div>
        </Card>
        <Card padding="sm" className="bg-emerald-950/20 border-emerald-800/40">
          <div className="text-xs text-emerald-400 font-medium">Resolved</div>
          <div className="text-xl font-bold text-emerald-300 mt-1">{stats.resolved}</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        <Filter className="w-4 h-4 text-slate-500 shrink-0" />
        {['ALL', 'DETECTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REOPENED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              statusFilter === st
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Main List & Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={selectedIntervention ? 'lg:col-span-7 space-y-3' : 'lg:col-span-12 space-y-3'}>
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Loading active interventions...
            </div>
          ) : interventions.length === 0 ? (
            <Card className="py-12 text-center text-slate-500 text-sm border-dashed">
              No interventions found matching this filter.
            </Card>
          ) : (
            interventions.map((inv) => (
              <Card
                key={inv.id}
                hoverEffect
                padding="md"
                onClick={() => setSelectedIntervention(inv)}
                className={`transition-all ${
                  selectedIntervention?.id === inv.id ? 'border-brand-500/60 ring-1 ring-brand-500/20 bg-slate-850/60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[inv.status]} size="sm">
                        {inv.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={inv.riskLevel === 'CRITICAL' ? 'danger' : 'warning'} size="sm">
                        {inv.riskLevel} RISK
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-sm">{inv.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">{inv.description}</p>
                  </div>
                  <div className="text-right shrink-0 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {inv.notes?.length || 0} notes
                    </span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail Panel */}
        {selectedIntervention && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 space-y-4"
          >
            <Card padding="lg" className="sticky top-6">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={statusColors[selectedIntervention.status]}>
                      {selectedIntervention.status}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      ID: {selectedIntervention.id.slice(0, 8)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-100">
                    {selectedIntervention.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedIntervention(null)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 pt-4 text-xs text-slate-300">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Description & Plan
                  </label>
                  <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {selectedIntervention.description}
                  </p>
                </div>

                {/* Status Transitions */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Advance Lifecycle State
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedIntervention.status === 'DETECTED' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedIntervention.id, 'ASSIGNED')}
                      >
                        Assign Mentor
                      </Button>
                    )}
                    {(selectedIntervention.status === 'DETECTED' || selectedIntervention.status === 'ASSIGNED') && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedIntervention.id, 'IN_PROGRESS')}
                      >
                        Start Remediation
                      </Button>
                    )}
                    {selectedIntervention.status === 'IN_PROGRESS' && (
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedIntervention.id, 'RESOLVED')}
                      >
                        Mark Resolved
                      </Button>
                    )}
                    {selectedIntervention.status === 'RESOLVED' && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleAdvanceStatus(selectedIntervention.id, 'REOPENED')}
                      >
                        Reopen Case
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notes Thread */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Mentoring Notes ({selectedIntervention.notes?.length || 0})
                  </label>

                  <form onSubmit={handleAddNote} className="space-y-2 mb-3">
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      placeholder="Add an update on student progress, parent check-in, or remedial test results..."
                      rows={2}
                      className="w-full text-xs rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 resize-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={submittingNote}
                        disabled={!newNoteContent.trim()}
                        leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
                      >
                        Post Note
                      </Button>
                    </div>
                  </form>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedIntervention.notes?.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-xl bg-slate-950/30 border border-slate-800/40 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-300">{n.authorName}</span>
                          <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-slate-300">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 z-10 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-semibold text-slate-100 text-base">New Student Intervention</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateIntervention} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Student ID / UUID *</label>
                  <input
                    type="text"
                    required
                    value={newStudentId}
                    onChange={(e) => setNewStudentId(e.target.value)}
                    placeholder="e.g. 3394073f-2669-4e7b-830d-5ab790e5414e"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Intervention Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Low Internal Assessment Marks & Backlog Support"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Risk Severity *</label>
                  <select
                    value={newRiskLevel}
                    onChange={(e) => setNewRiskLevel(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Action Plan & Recommendations *</label>
                  <textarea
                    required
                    rows={3}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Detail specific remedial measures, study hours, or mentoring schedules..."
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" isLoading={creating}>
                    Create Intervention
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
