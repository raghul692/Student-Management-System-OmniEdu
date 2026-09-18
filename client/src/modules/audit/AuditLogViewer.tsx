import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  RefreshCw,
  Eye,
  User,
  Activity,
  Layers,
} from 'lucide-react';
import { Card } from '../../components/design-system/Card';
import { Badge } from '../../components/design-system/Badge';
import { DataTable } from '../../components/design-system/DataTable';
import { LoadingSpinner } from '../../components/design-system/LoadingSpinner';
import { EmptyState } from '../../components/design-system/EmptyState';
import { apiClient as api } from '../../services/apiClient';

interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  details?: any;
  createdAt: string;
  user?: {
    email: string;
  };
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      const params: any = { page, limit };
      if (actionFilter.trim()) params.action = actionFilter.trim();
      if (entityFilter.trim()) params.entityType = entityFilter.trim();
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await api.get('/api/audit-logs', { params });
      if (res.data?.data) {
        setLogs(res.data.data.logs || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err: any) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter, fromDate, toDate]);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      setExportError(null);
      const params: any = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const res = await api.get('/api/audit-logs/export', {
        params,
        responseType: 'blob',
      });

      const blob = new Blob([res.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit-log-export-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to export audit logs (Enterprise plan required).';
      setExportError(msg);
    } finally {
      setExportLoading(false);
    }
  };

  const getActionBadgeVariant = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('DELETE') || act.includes('REVOKE') || act.includes('DROP')) return 'danger';
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('ENROLL')) return 'success';
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY')) return 'warning';
    return 'default';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-indigo-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Security & Audit Trail
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable system logs, security events, authentication attempts, and regulatory compliance changes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchLogs()}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-500' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportLoading ? 'Exporting...' : 'Export Logs'}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-600 dark:text-amber-400 flex items-center justify-between">
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} className="font-bold underline ml-2">Dismiss</button>
        </div>
      )}

      {/* Filters Card */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Action Search
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. USER_LOGIN, CREATE_..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              Entity Type
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="e.g. Student, MarkRecord..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              From Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
              To Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <LoadingSpinner size="lg" label="Querying audit records..." />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={<ShieldAlert className="w-8 h-8 text-indigo-400" />}
            title="No audit entries matched"
            description="Adjust your search filters or date range to view security events."
            actionLabel="Reset Filters"
            onAction={() => {
              setActionFilter('');
              setEntityFilter('');
              setFromDate('');
              setToDate('');
              setPage(1);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Timestamp</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Action</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">Entity</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">User / Actor</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400">IP Address</th>
                  <th className="py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/75 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900 dark:text-slate-100">{log.entityType}</span>
                      {log.entityId && (
                        <span className="ml-1 text-xs text-slate-400 font-mono">
                          #{log.entityId.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {log.user?.email || log.userId || (
                        <span className="italic text-slate-400">System</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {total > limit && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} records
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * limit >= total}
                className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal / Inspector Dialog */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white">Audit Entry Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block">Action</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Timestamp</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(selectedLog.createdAt).toISOString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Entity</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedLog.entityType} ({selectedLog.entityId || 'N/A'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Actor</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedLog.user?.email || selectedLog.userId || 'SYSTEM'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">IP Address</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {selectedLog.ipAddress || 'Internal'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Metadata / Payload
              </span>
              <pre className="p-3 bg-slate-950 text-slate-100 rounded-lg text-xs font-mono overflow-auto max-h-60">
                {JSON.stringify(selectedLog.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AuditLogViewer;
