import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Webhook, Plus, RefreshCw, Trash2, Send, CheckCircle2,
  AlertTriangle, Copy, Check, Clock, X, ShieldAlert, Activity
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { Card, CardHeader, CardContent } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { Button } from '../../components/design-system/Button';
import { AlertBanner } from '../../components/design-system/AlertBanner';
import { ConfirmDialog } from '../../components/design-system/ConfirmDialog';

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  description?: string;
  isActive: boolean;
  failureCount: number;
  createdAt: string;
}

interface Delivery {
  id: string;
  eventType: string;
  status: 'PENDING' | 'DELIVERED' | 'RETRYING' | 'FAILED';
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  lastAttemptAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  'STUDENT_CREATED', 'STUDENT_UPDATED',
  'ATTENDANCE_UPDATED', 'EXAM_PUBLISHED',
  'FEE_UPDATED', 'RISK_CREATED',
  'INTERVENTION_UPDATED', 'SUBSCRIPTION_UPDATED',
  'ANNOUNCEMENT_CREATED',
];

export const WebhookManager: React.FC = () => {
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Form states
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['STUDENT_CREATED', 'ATTENDANCE_UPDATED']);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Deliveries log drawer
  const [selectedEndpoint, setSelectedEndpoint] = useState<WebhookEndpoint | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  // Delete dialog
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEndpoints = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/webhooks');
      setEndpoints(res.data.data?.endpoints || []);
    } catch {
      setEndpoints([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEndpoints();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim() || !selectedEvents.length) return;

    setCreating(true);
    try {
      const res = await apiClient.post('/webhooks', {
        url: newUrl.trim(),
        events: selectedEvents,
        description: newDesc.trim() || undefined,
      });
      setCreatedSecret(res.data.data?.secret);
      setNewUrl('');
      setNewDesc('');
      fetchEndpoints();
    } catch (err: any) {
      setBannerMessage(err.response?.data?.message || 'Failed to register webhook endpoint.');
    } finally {
      setCreating(false);
    }
  };

  const handleSendTest = async (id: string) => {
    try {
      await apiClient.post(`/webhooks/${id}/test`);
      setBannerMessage('Test webhook dispatched. Check delivery logs.');
      if (selectedEndpoint?.id === id) {
        fetchDeliveries(id);
      }
    } catch {
      setBannerMessage('Failed to trigger test event.');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/webhooks/${deletingId}`);
      setBannerMessage('Webhook endpoint deleted.');
      setDeletingId(null);
      if (selectedEndpoint?.id === deletingId) setSelectedEndpoint(null);
      fetchEndpoints();
    } catch {
      setBannerMessage('Failed to delete webhook.');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchDeliveries = async (endpointId: string) => {
    setLoadingDeliveries(true);
    try {
      const res = await apiClient.get(`/webhooks/${endpointId}/deliveries`);
      setDeliveries(res.data.data?.deliveries || []);
    } catch {
      setDeliveries([]);
    } finally {
      setLoadingDeliveries(false);
    }
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Webhook className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Webhook System</h1>
            <Badge variant="purple" size="sm">ENTERPRISE</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            HMAC-SHA256 cryptographically signed event streaming for external integrations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchEndpoints} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Register Endpoint
          </Button>
        </div>
      </div>

      {bannerMessage && (
        <AlertBanner type="info" message={bannerMessage} onClose={() => setBannerMessage(null)} />
      )}

      {/* Secret Display Banner (Shown right after registration) */}
      {createdSecret && (
        <AlertBanner
          type="warning"
          title="Webhook Secret Generated — Copy Immediately!"
          message={
            <div className="space-y-2 mt-1">
              <p>
                This secret is used to sign all incoming HTTP payloads via <code className="text-amber-200">X-OmniEdu-Signature-256</code>.
                It will <strong>never be shown again</strong>.
              </p>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950 border border-amber-500/30 text-xs font-mono text-amber-300">
                <span className="flex-1 truncate">{createdSecret}</span>
                <button
                  onClick={() => copyToClipboard(createdSecret)}
                  className="p-1 rounded hover:bg-white/10 text-slate-300"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          }
          onClose={() => setCreatedSecret(null)}
        />
      )}

      {/* Main Endpoints Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={selectedEndpoint ? 'lg:col-span-7 space-y-4' : 'lg:col-span-12 space-y-4'}>
          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">
              Loading webhook configurations...
            </div>
          ) : endpoints.length === 0 ? (
            <Card padding="lg" className="text-center py-16 border-dashed">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                <Webhook className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm">No Webhook Endpoints</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Register an endpoint to stream real-time events (attendance, grade publishes, student enrollments) to your external systems.
              </p>
              <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)}>
                Add Endpoint
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {endpoints.map((ep) => (
                <Card
                  key={ep.id}
                  padding="md"
                  className={`transition-all ${
                    selectedEndpoint?.id === ep.id ? 'border-brand-500/60 ring-1 ring-brand-500/20 bg-slate-850/60' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={ep.isActive ? 'success' : 'neutral'} size="sm">
                          {ep.isActive ? 'ACTIVE' : 'DISABLED'}
                        </Badge>
                        {ep.failureCount > 0 && (
                          <Badge variant="danger" size="sm">
                            {ep.failureCount} Failures
                          </Badge>
                        )}
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {ep.id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-200 truncate max-w-md">
                        {ep.url}
                      </div>
                      {ep.description && (
                        <p className="text-xs text-slate-400">{ep.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ep.events.map((ev) => (
                          <span key={ev} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedEndpoint(ep);
                          fetchDeliveries(ep.id);
                        }}
                        leftIcon={<Activity className="w-3.5 h-3.5" />}
                      >
                        Logs
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSendTest(ep.id)}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                      >
                        Test
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeletingId(ep.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Deliveries Sidebar Panel */}
        {selectedEndpoint && (
          <div className="lg:col-span-5 space-y-4">
            <Card padding="md" className="sticky top-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-semibold text-slate-100 text-sm">Delivery Logs</h3>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-xs">{selectedEndpoint.url}</p>
                </div>
                <button onClick={() => setSelectedEndpoint(null)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {loadingDeliveries ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Loading deliveries...
                </div>
              ) : deliveries.length === 0 ? (
                <p className="py-12 text-center text-slate-500 text-xs">
                  No delivery attempts recorded yet. Use "Test" to send a sample event.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 pt-3">
                  {deliveries.map((del) => (
                    <div
                      key={del.id}
                      className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={del.status === 'DELIVERED' ? 'success' : del.status === 'RETRYING' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {del.status}
                        </Badge>
                        <span className="text-[10px] text-slate-500">
                          {new Date(del.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="font-mono text-slate-300 text-[11px]">{del.eventType}</div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>HTTP {del.responseCode || '—'}</span>
                        <span>{del.attemptCount} attempt(s)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* Register Endpoint Modal */}
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
                <h3 className="font-semibold text-slate-100 text-base">Register Webhook Endpoint</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRegister} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-300 font-medium block mb-1">Payload URL (HTTPS required) *</label>
                  <input
                    type="url"
                    required
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://api.yourcompany.com/webhooks/omniedu"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-brand-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-1">Description</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. ERP Student Sync Endpoint"
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-800 p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-medium block mb-2">Subscribed Event Triggers *</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {AVAILABLE_EVENTS.map((ev) => (
                      <label
                        key={ev}
                        className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                          selectedEvents.includes(ev)
                            ? 'bg-brand-600/10 border-brand-500/40 text-brand-300'
                            : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(ev)}
                          onChange={() => toggleEvent(ev)}
                          className="rounded border-slate-700 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="font-mono text-[11px] truncate">{ev}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" size="sm" type="button" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit" isLoading={creating}>
                    Register Endpoint
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Webhook Endpoint"
        message="Are you sure you want to delete this endpoint? Event deliveries to this destination will stop immediately."
        confirmText="Delete Endpoint"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
};
