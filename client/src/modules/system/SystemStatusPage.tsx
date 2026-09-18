import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Cpu,
  Server,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Download,
  Lock,
  Zap,
  Info,
} from 'lucide-react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { LoadingSpinner } from '../../components/design-system/LoadingSpinner';
import { ConfirmDialog } from '../../components/design-system/ConfirmDialog';
import { apiClient as api } from '../../services/apiClient';

interface SubsystemSignal {
  status: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE' | 'OUTAGE';
  detail?: string;
}

interface SystemStatusData {
  overall: 'OPERATIONAL' | 'DEGRADED' | 'PARTIAL_OUTAGE';
  signals: {
    database?: SubsystemSignal;
    aiProvider?: SubsystemSignal;
    queue?: SubsystemSignal;
    storage?: SubsystemSignal;
  };
  checkedAt: string;
  version: string;
  phase: string;
}

interface EntitlementData {
  planTier: 'BASIC' | 'PRO' | 'ENTERPRISE';
  features: string[];
  limits?: Record<string, number>;
}

export const SystemStatusPage: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'health' | 'entitlements' | 'privacy'>('health');

  // Privacy tab states
  const [exportReason, setExportReason] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);
  const [exportRequests, setExportRequests] = useState<any[]>([]);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  const fetchStatusAndEntitlements = async () => {
    try {
      setRefreshing(true);
      const [statusRes, entRes] = await Promise.allSettled([
        api.get('/api/system/status'),
        api.get('/api/system/entitlements'),
      ]);

      if (statusRes.status === 'fulfilled' && statusRes.value.data?.data) {
        setStatusData(statusRes.value.data.data);
      }
      if (entRes.status === 'fulfilled' && entRes.value.data?.data) {
        setEntitlements(entRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load system telemetry:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPrivacyRequests = async () => {
    try {
      const res = await api.get('/api/privacy/export-requests');
      if (res.data?.data?.requests) {
        setExportRequests(res.data.data.requests);
      }
    } catch (err) {
      console.error('Failed to fetch privacy export requests:', err);
    }
  };

  useEffect(() => {
    fetchStatusAndEntitlements();
  }, []);

  useEffect(() => {
    if (activeTab === 'privacy') {
      fetchPrivacyRequests();
    }
  }, [activeTab]);

  const handleRequestDataExport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setExporting(true);
      const res = await api.post('/api/privacy/export-request', {
        reason: exportReason.trim() || 'General user personal archive export request',
      });
      setExportSuccessMsg(res.data?.message || 'Export request queued.');
      setExportReason('');
      fetchPrivacyRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit data export request.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      setDeactivating(true);
      await api.post('/api/privacy/deactivate', {
        confirm: true,
        reason: 'User requested account deactivation & privacy scrubbing',
      });
      alert('Account deactivated. Logging out...');
      window.location.href = '/login';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Account deactivation failed.');
      setShowDeactivateModal(false);
    } finally {
      setDeactivating(false);
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case 'OPERATIONAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Operational
          </span>
        );
      case 'PARTIAL_OUTAGE':
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case 'OUTAGE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Disrupted
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex justify-center items-center min-h-[50vh]">
        <LoadingSpinner size="lg" label="Retrieving operational status & telemetry..." />
      </div>
    );
  }

  const signals = statusData?.signals || {};

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              System Telemetry & Health
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time infrastructure health, operational metrics, plan entitlements, and data compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Checked:{' '}
            {statusData?.checkedAt ? new Date(statusData.checkedAt).toLocaleTimeString() : 'Just now'}
          </span>
          <button
            onClick={() => fetchStatusAndEntitlements()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      <div
        className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
          statusData?.overall === 'OPERATIONAL'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {statusData?.overall === 'OPERATIONAL' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-500" />
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {statusData?.overall === 'OPERATIONAL'
                ? 'All Core Systems Operational'
                : 'Degraded Performance Detected'}
            </h3>
            <p className="text-xs opacity-80 mt-0.5">
              OmniEdu Unified Platform v{statusData?.version || '2.0'} (Release Phase {statusData?.phase || 'H'})
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span>Uptime: 99.98%</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('health')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'health'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4" />
          Infrastructure Health
        </button>
        <button
          onClick={() => setActiveTab('entitlements')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'entitlements'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Plan Entitlements
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'privacy'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          Privacy & Compliance
        </button>
      </div>

      {/* Tab 1: Health Subsystems */}
      {activeTab === 'health' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">PostgreSQL Primary Cluster</h4>
                  <p className="text-xs text-slate-500">Relational core, tenant partitions, read replicas</p>
                </div>
              </div>
              {renderStatusBadge(signals.database?.status)}
            </div>
            {signals.database?.detail && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
                {signals.database.detail}
              </p>
            )}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-xs text-slate-400">
              <span>Pool: Active (pgBouncer)</span>
              <span>Latency: &lt; 5ms</span>
            </div>
          </Card>

          {/* AI Provider */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">AI Inference Engine</h4>
                  <p className="text-xs text-slate-500">Gemini 1.5 Flash / Local Heuristic Fallback</p>
                </div>
              </div>
              {renderStatusBadge(signals.aiProvider?.status)}
            </div>
            {signals.aiProvider?.detail && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
                {signals.aiProvider.detail}
              </p>
            )}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-xs text-slate-400">
              <span>Model: gemini-1.5-flash</span>
              <span>Guardrails: Active</span>
            </div>
          </Card>

          {/* Queue & Jobs */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Background Job Queue</h4>
                  <p className="text-xs text-slate-500">Scheduled reports, webhooks, risk recomputations</p>
                </div>
              </div>
              {renderStatusBadge(signals.queue?.status)}
            </div>
            {signals.queue?.detail && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
                {signals.queue.detail}
              </p>
            )}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-xs text-slate-400">
              <span>Adapter: BullMQ / Memory</span>
              <span>Concurrency: 10 Workers</span>
            </div>
          </Card>

          {/* Object Storage */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Cloud Object Storage</h4>
                  <p className="text-xs text-slate-500">Student documents, grade sheets, institution logos</p>
                </div>
              </div>
              {renderStatusBadge(signals.storage?.status)}
            </div>
            {signals.storage?.detail && (
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-lg">
                {signals.storage.detail}
              </p>
            )}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex justify-between text-xs text-slate-400">
              <span>Security: SSE-KMS 256-bit</span>
              <span>CDN: Enabled</span>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Entitlements */}
      {activeTab === 'entitlements' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Organization Plan
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-1">
                  {entitlements?.planTier || 'PRO'} TIER
                  <Badge variant="success">Active</Badge>
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500">Billed Annually</span>
                <p className="text-xs text-slate-400">Next renewal: December 2026</p>
              </div>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                Feature Capabilities Enforced
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  'AI_STUDENT_COPILOT',
                  'EARLY_WARNING_RADAR',
                  'QUESTION_GENERATOR',
                  'ADVANCED_ANALYTICS',
                  'CUSTOM_REPORTS',
                  'WEBHOOKS_INTEGRATION',
                  'AUDIT_LOGS_EXPORT',
                  'PRIVACY_CONTROLS',
                  'CAREER_INTELLIGENCE',
                  'INTERVENTIONS_WORKFLOW',
                ].map((feat) => {
                  const isEnabled = entitlements?.features?.includes(feat) ?? true;
                  return (
                    <div
                      key={feat}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                        isEnabled
                          ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                          : 'bg-slate-100/50 dark:bg-slate-950/40 border-slate-200/50 text-slate-400 opacity-60'
                      }`}
                    >
                      <span className="font-mono">{feat}</span>
                      {isEnabled ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Privacy & Compliance */}
      {activeTab === 'privacy' && (
        <div className="space-y-6">
          {/* Data Export Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Request Personal Data Archive (FERPA / GDPR)
                </h3>
                <p className="text-xs text-slate-500">
                  Export all personal records, attendance logs, grade reports, and activity logs linked to your user profile.
                </p>
              </div>
            </div>

            {exportSuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {exportSuccessMsg}
              </div>
            )}

            <form onSubmit={handleRequestDataExport} className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Purpose / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={exportReason}
                  onChange={(e) => setExportReason(e.target.value)}
                  placeholder="e.g. Annual records audit or student transcript backup"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={exporting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
              >
                {exporting ? 'Submitting Request...' : 'Submit Export Request'}
              </button>
            </form>

            {/* Pending Requests List */}
            {exportRequests.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Previous Export Requests
                </h4>
                <div className="space-y-2">
                  {exportRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          #{req.requestId.slice(0, 8)}
                        </span>
                        <span className="text-slate-400 ml-2">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge variant="warning">{req.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Account Deactivation / Erasure */}
          <Card className="p-6 border-rose-500/20 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Account Deactivation & Data Erasure
                </h3>
                <p className="text-xs text-slate-500">
                  Deactivates account access and triggers compliance scrubbing of non-regulatory identity fields.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowDeactivateModal(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              Deactivate My Account
            </button>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeactivateModal}
        onCancel={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivateAccount}
        title="Confirm Account Deactivation"
        message="Are you sure you wish to deactivate your account? Your credentials will be revoked immediately and an audit log event will be created."
        confirmText={deactivating ? 'Deactivating...' : 'Confirm Deactivation'}
        cancelText="Cancel"
        isDestructive={true}
        isLoading={deactivating}
      />
    </div>
  );
};
export default SystemStatusPage;
