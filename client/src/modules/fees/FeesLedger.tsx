import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  DollarSign,
  Users,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Search,
  ChevronDown,
  Loader2,
  BarChart3,
  TrendingUp,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { usePermissionStore } from '../../store/usePermissionStore';
import { Button } from '../../components/ui/Button';

interface FeeStructure {
  id: string;
  name: string;
  amount: number;
  category: string;
  academicYear: string;
  dueDate?: string;
}

interface FeeAssignment {
  id: string;
  student: { id: string; rollNo: string; name: string };
  feeStructure: FeeStructure;
  amount: number;
  paid: number;
  outstanding: number;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
}

interface FeeSummary {
  totalCollected: number;
  totalOutstanding: number;
  collectionRate: number;
  totalStudents: number;
}

interface Toast {
  type: 'success' | 'error';
  text: string;
}

export const FeesLedger: React.FC = () => {
  const { activeCampus } = useAuthStore();
  const { institutionRole } = usePermissionStore();
  const isAdmin = institutionRole === 'INSTITUTION_ADMIN';

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  // Student ledger state
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [ledger, setLedger] = useState<FeeAssignment[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Create structure modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newStructure, setNewStructure] = useState({
    name: '',
    amount: '',
    category: 'TUITION',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    dueDate: '',
  });
  const [creating, setCreating] = useState(false);

  // Record payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    studentId: '',
    feeStructureId: '',
    amount: '',
    paymentMode: 'CASH',
    referenceNo: '',
  });
  const [paying, setPaying] = useState(false);

  const showToast = (type: Toast['type'], text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSummary = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await apiClient.get('/fees/summary');
      setSummary(res.data.data.summary);
    } catch {
      // Non-admin users won't have access — silently skip
    }
  }, [isAdmin]);

  const loadStructures = useCallback(async () => {
    try {
      const res = await apiClient.get('/fees/structures');
      setStructures(res.data.data.structures || []);
    } catch (err) {
      console.error('Failed to load fee structures:', err);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([loadStructures(), loadSummary()]);
      setLoading(false);
    }
    init();
  }, [activeCampus?.id, loadStructures, loadSummary]);

  const loadStudentLedger = async (studentId: string) => {
    if (!studentId) return;
    setLedgerLoading(true);
    try {
      const res = await apiClient.get(`/fees/students/${studentId}`);
      setLedger(res.data.data.assignments || []);
    } catch {
      showToast('error', 'Failed to load student ledger');
    } finally {
      setLedgerLoading(false);
    }
  };

  const handleCreateStructure = async () => {
    if (!newStructure.name || !newStructure.amount) {
      showToast('error', 'Name and amount are required');
      return;
    }
    setCreating(true);
    try {
      await apiClient.post('/fees/structures', {
        ...newStructure,
        amount: parseFloat(newStructure.amount),
      });
      showToast('success', 'Fee structure created successfully');
      setShowCreateModal(false);
      setNewStructure({ name: '', amount: '', category: 'TUITION', academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, dueDate: '' });
      loadStructures();
    } catch {
      showToast('error', 'Failed to create fee structure');
    } finally {
      setCreating(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.studentId || !paymentForm.feeStructureId || !paymentForm.amount) {
      showToast('error', 'Student, fee structure, and amount are required');
      return;
    }
    setPaying(true);
    try {
      await apiClient.post('/fees/payments', {
        ...paymentForm,
        amount: parseFloat(paymentForm.amount),
      });
      showToast('success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentForm({ studentId: '', feeStructureId: '', amount: '', paymentMode: 'CASH', referenceNo: '' });
      if (paymentForm.studentId === selectedStudentId) {
        loadStudentLedger(selectedStudentId);
      }
      loadSummary();
    } catch {
      showToast('error', 'Failed to record payment');
    } finally {
      setPaying(false);
    }
  };

  const statusColor = (status: FeeAssignment['status']) => {
    switch (status) {
      case 'PAID': return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25';
      case 'PARTIAL': return 'bg-amber-500/15 text-amber-400 border-amber-500/25';
      case 'OVERDUE': return 'bg-rose-500/15 text-rose-400 border-rose-500/25';
      default: return 'bg-slate-500/15 text-slate-400 border-slate-500/25';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
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
            <CreditCard className="w-6 h-6 text-brand-400" />
            Fee Management
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage fee structures, assignments & payments</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setShowCreateModal(true)}>
              Fee Structure
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Receipt className="w-3.5 h-3.5" />} onClick={() => setShowPaymentModal(true)}>
              Record Payment
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards (Admin only) */}
      {isAdmin && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Collected', value: `₹${(summary.totalCollected / 100000).toFixed(1)}L`, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400' },
            { label: 'Outstanding', value: `₹${(summary.totalOutstanding / 100000).toFixed(1)}L`, icon: <AlertTriangle className="w-5 h-5" />, color: 'text-amber-400' },
            { label: 'Collection Rate', value: `${summary.collectionRate.toFixed(1)}%`, icon: <BarChart3 className="w-5 h-5" />, color: 'text-brand-400' },
            { label: 'Total Students', value: summary.totalStudents.toString(), icon: <Users className="w-5 h-5" />, color: 'text-indigo-400' },
          ].map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-obsidian-card border border-white/[0.07] rounded-2xl p-4"
            >
              <div className={`${card.color} mb-2`}>{card.icon}</div>
              <div className="text-xl font-bold text-slate-100">{card.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{card.label}</div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fee Structures */}
        <div className="lg:col-span-1">
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-200">Fee Structures</h2>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {structures.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No fee structures yet</div>
              ) : (
                structures.map((s) => (
                  <div key={s.id} className="px-4 py-3 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-200 truncate">{s.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.category} · {s.academicYear}</div>
                      </div>
                      <div className="text-sm font-semibold text-emerald-400 shrink-0">₹{s.amount.toLocaleString()}</div>
                    </div>
                    {s.dueDate && (
                      <div className="text-xs text-amber-400/80 mt-1">
                        Due: {new Date(s.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Student Ledger */}
        <div className="lg:col-span-2">
          <div className="bg-obsidian-card border border-white/[0.07] rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07]">
              <h2 className="text-sm font-semibold text-slate-200 mb-2">Student Fee Ledger</h2>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Enter student ID..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setSelectedStudentId(studentSearch);
                        loadStudentLedger(studentSearch);
                      }
                    }}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedStudentId(studentSearch);
                    loadStudentLedger(studentSearch);
                  }}
                >
                  Load
                </Button>
              </div>
            </div>

            <div className="min-h-[200px]">
              {ledgerLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
                </div>
              ) : !selectedStudentId ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                  <Users className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Enter a student ID and press Load</p>
                </div>
              ) : ledger.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-600 gap-2">
                  <Receipt className="w-8 h-8 opacity-40" />
                  <p className="text-sm">No fee assignments found</p>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {ledger.map((assignment) => (
                    <div key={assignment.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">{assignment.feeStructure.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor(assignment.status)}`}>
                              {assignment.status}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">{assignment.feeStructure.academicYear}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-slate-200">₹{assignment.amount.toLocaleString()}</div>
                          <div className="text-xs text-emerald-400">Paid: ₹{assignment.paid.toLocaleString()}</div>
                          {assignment.outstanding > 0 && (
                            <div className="text-xs text-rose-400">Due: ₹{assignment.outstanding.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (assignment.paid / assignment.amount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Fee Structure Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-obsidian-card border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-100">Create Fee Structure</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Name *</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="e.g. Semester I Tuition Fee"
                    value={newStructure.name}
                    onChange={(e) => setNewStructure({ ...newStructure, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Amount (₹) *</label>
                    <input
                      type="number"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                      placeholder="45000"
                      value={newStructure.amount}
                      onChange={(e) => setNewStructure({ ...newStructure, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Category</label>
                    <select
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newStructure.category}
                      onChange={(e) => setNewStructure({ ...newStructure, category: e.target.value })}
                    >
                      <option value="TUITION">Tuition</option>
                      <option value="HOSTEL">Hostel</option>
                      <option value="TRANSPORT">Transport</option>
                      <option value="EXAM">Exam</option>
                      <option value="MISC">Miscellaneous</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Academic Year</label>
                    <input
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      placeholder="2024-2025"
                      value={newStructure.academicYear}
                      onChange={(e) => setNewStructure({ ...newStructure, academicYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Due Date</label>
                    <input
                      type="date"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={newStructure.dueDate}
                      onChange={(e) => setNewStructure({ ...newStructure, dueDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" isLoading={creating} onClick={handleCreateStructure}>
                  Create Structure
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPaymentModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-obsidian-card border border-white/[0.1] rounded-2xl w-full max-w-md p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-slate-100">Record Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Student ID *</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Student ID"
                    value={paymentForm.studentId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Fee Structure *</label>
                  <select
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                    value={paymentForm.feeStructureId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, feeStructureId: e.target.value })}
                  >
                    <option value="">Select structure...</option>
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} — ₹{s.amount.toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Amount (₹) *</label>
                    <input
                      type="number"
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                      placeholder="45000"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1.5">Payment Mode</label>
                    <select
                      className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                      value={paymentForm.paymentMode}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    >
                      <option value="CASH">Cash</option>
                      <option value="ONLINE">Online Transfer</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="DD">Demand Draft</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1.5">Reference No.</label>
                  <input
                    className="w-full bg-obsidian-surface border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                    placeholder="Transaction / Cheque no."
                    value={paymentForm.referenceNo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1" isLoading={paying} onClick={handleRecordPayment}>
                  Record Payment
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FeesLedger;
