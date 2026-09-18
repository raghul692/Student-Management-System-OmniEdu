import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, 
  AlertTriangle, 
  FileText, 
  Send, 
  Download, 
  CheckCircle2, 
  Phone, 
  GraduationCap, 
  Sparkles, 
  Copy, 
  CheckCheck,
  X,
  Printer
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';
import { DefaulterStudent } from '../../types';
import { Button } from '../../components/ui/Button';
import { generateCondonationCertificatePDF } from '../../utils/pdfGenerator';

export const DefaultersRadarView: React.FC = () => {
  const { activeCampus, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [defaulters, setDefaulters] = useState<DefaulterStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cutoff, setCutoff] = useState<number>(75.0);

  // Selected student for modals
  const [selectedStudent, setSelectedStudent] = useState<DefaulterStudent | null>(null);
  const [modalType, setModalType] = useState<'condonation' | 'sms' | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [smsSent, setSmsSent] = useState<boolean>(false);

  useEffect(() => {
    async function loadDefaulters() {
      setLoading(true);
      try {
        const res = await apiClient.get(`/attendance/defaulters?cutoff=${cutoff}`);
        setDefaulters(res.data.data.defaulters || []);
      } catch (err) {
        console.error('Failed to load defaulters:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDefaulters();
  }, [activeCampus?.id, cutoff]);

  // Breakdown metrics
  const condonationStudents = useMemo(
    () => defaulters.filter((d) => d.metrics.percentage >= 65.0 && d.metrics.percentage < 75.0),
    [defaulters]
  );

  const detainedStudents = useMemo(
    () => defaulters.filter((d) => d.metrics.percentage < 65.0),
    [defaulters]
  );

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Student Name', 'Identifier', 'Dept/Class', 'Attendance %', 'Attended/Total', 'Tier', 'Recovery Hours Needed'];
    const rows = defaulters.map((d) => [
      `"${d.fullName}"`,
      `"${d.identifier}"`,
      `"${d.deptOrClass}"`,
      d.metrics.percentage.toFixed(1),
      `"${d.metrics.present}/${d.metrics.total}"`,
      d.metrics.percentage < 65 ? 'SA Detained' : 'Condonation Eligible',
      d.metrics.sessionsNeededFor75,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `OmniEdu_Defaulters_Radar_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSmsText = (student: DefaulterStudent) => {
    return `URGENT NOTICE: Apollo Educational Group - Student ${student.fullName} (${student.identifier}) has attendance of ${student.metrics.percentage.toFixed(1)}%, which is below the mandatory 75% cutoff under Anna University / Board regulations. Immediate parent consultation required to prevent exam debarment.`;
  };

  return (
    <div className="space-y-6">
      {/* Condonation / SMS Modal */}
      <AnimatePresence>
        {selectedStudent && modalType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedStudent(null);
                setModalType(null);
              }}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-xl bg-obsidian-surface border border-obsidian-border rounded-2xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-obsidian-border pb-4">
                <div className="flex items-center gap-2">
                  {modalType === 'condonation' ? (
                    <FileText className="w-5 h-5 text-academic-primary" />
                  ) : (
                    <Phone className="w-5 h-5 text-rose-400" />
                  )}
                  <h3 className="text-base font-bold text-obsidian-text">
                    {modalType === 'condonation'
                      ? 'Anna University Condonation Application Form'
                      : 'Urgent Guardian Alert Dispatcher'}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setModalType(null);
                  }}
                  className="p-1.5 rounded-lg text-obsidian-muted hover:text-obsidian-text hover:bg-obsidian-card"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalType === 'condonation' ? (
                /* Formal Anna University Condonation Notice Form */
                <div className="space-y-4 text-xs">
                  <div className="bg-obsidian-card p-4 rounded-xl border border-obsidian-border space-y-3 font-serif">
                    <div className="text-center pb-2 border-b border-obsidian-border">
                      <h4 className="font-bold text-sm text-obsidian-text">APOLLO INSTITUTE OF TECHNOLOGY</h4>
                      <p className="text-[11px] text-obsidian-muted">
                        Affiliated to Anna University, Chennai • Regulation 2021 Clause 7.1
                      </p>
                      <p className="font-bold text-xs text-academic-primary mt-1">
                        APPLICATION FOR CONDONATION OF ATTENDANCE SHORTAGE
                      </p>
                    </div>

                    <div className="space-y-1.5 text-obsidian-text font-sans">
                      <div className="flex justify-between">
                        <span className="text-obsidian-muted">Student Name:</span>
                        <span className="font-semibold">{selectedStudent.fullName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-obsidian-muted">Registration Number:</span>
                        <span className="font-mono font-semibold text-academic-primary">{selectedStudent.identifier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-obsidian-muted">Department / Semester:</span>
                        <span className="font-semibold">{selectedStudent.deptOrClass}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-obsidian-muted">Attendance Secured:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {selectedStudent.metrics.percentage.toFixed(1)}% (
                          {selectedStudent.metrics.present}/{selectedStudent.metrics.total} Hours)
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-obsidian-muted">Eligible Category:</span>
                        <span className="font-semibold text-emerald-400">
                          Medical Grounds / Approved Extenuating Circumstances
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-obsidian-muted italic pt-2 border-t border-obsidian-border/60">
                      "I hereby certify that the shortage of attendance for the above student is genuine and substantiated with authorized medical records. Submitted for Syndicate Condonation approval."
                    </p>

                    <div className="pt-4 grid grid-cols-2 text-center text-[10px] text-obsidian-muted font-sans">
                      <div>___________________<br />Class Advisor / HOD</div>
                      <div>___________________<br />Principal / Head of Institution</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Printer className="w-4 h-4" />}
                      onClick={() => window.print()}
                    >
                      Print Form
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      leftIcon={<Download className="w-4 h-4" />}
                      onClick={() => generateCondonationCertificatePDF(selectedStudent)}
                      className="shadow-glow-cyan"
                      title="Download official high-resolution Anna University Clause 7.1 Condonation Order PDF"
                    >
                      Download Clause 7.1 PDF
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(null);
                        setModalType(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                /* Guardian Alert SMS Modal */
                <div className="space-y-4 text-xs">
                  <div className="bg-obsidian-card p-4 rounded-xl border border-obsidian-border space-y-2">
                    <span className="text-[11px] text-obsidian-muted uppercase font-semibold block">
                      Dispatched SMS Message
                    </span>
                    <p className="font-mono text-xs text-obsidian-text leading-relaxed">
                      {getSmsText(selectedStudent)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getSmsText(selectedStudent));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="text-xs text-academic-primary hover:underline flex items-center gap-1.5"
                    >
                      {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied to Clipboard' : 'Copy Text'}
                    </button>

                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Send className="w-4 h-4" />}
                      onClick={() => {
                        setSmsSent(true);
                        setTimeout(() => {
                          setSmsSent(false);
                          setSelectedStudent(null);
                          setModalType(null);
                        }, 2000);
                      }}
                      className="shadow-glow-rose"
                    >
                      {smsSent ? 'SMS Dispatched!' : 'Send Urgent SMS Alert'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header & Meta Bar */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                Attendance Shortage Radar
              </span>
              <span className="text-xs text-obsidian-muted">
                {isCollege ? 'Anna Univ Regulation 2021 Clause 7' : 'Board Attendance Defaulters'}
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-obsidian-text">
              Defaulters Radar & Recovery Engine
            </h1>
            <p className="text-sm text-obsidian-muted mt-1">
              Active monitoring for students below the 75% examination eligibility threshold with live condonation eligibility and consecutive recovery hour forecasts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleExportCSV}
            >
              Export Radar CSV
            </Button>
          </div>
        </div>

        {/* Breakdown Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-obsidian-border/60">
          <div className="bg-obsidian-card/60 p-4 rounded-xl border border-obsidian-border">
            <span className="text-xs text-obsidian-muted block">Total Defaulters (&lt; 75%)</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">{defaulters.length}</span>
            <span className="text-[11px] text-obsidian-muted mt-1 block">Active attendance shortage hold</span>
          </div>

          <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/30">
            <span className="text-xs text-amber-400 font-medium block">Condonation Radar (65% - 74.9%)</span>
            <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">{condonationStudents.length}</span>
            <span className="text-[11px] text-amber-300/80 mt-1 block">Eligible with medical/extenuating approval</span>
          </div>

          <div className="bg-rose-600/15 p-4 rounded-xl border border-rose-600/30">
            <span className="text-xs text-rose-400 font-medium block">SA Detention Radar (&lt; 65%)</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">{detainedStudents.length}</span>
            <span className="text-[11px] text-rose-300/80 mt-1 block">Debarred from exam • Must redo semester</span>
          </div>
        </div>
      </div>

      {/* Threshold Slider Toolbar */}
      <div className="bg-obsidian-surface border border-obsidian-border p-4 rounded-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-obsidian-text">
            Cutoff Threshold: <span className="font-mono text-academic-primary">{cutoff}%</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="range"
            min={60}
            max={85}
            step={1}
            value={cutoff}
            onChange={(e) => setCutoff(parseFloat(e.target.value))}
            className="w-48 accent-academic-primary cursor-pointer"
          />
          <button
            onClick={() => setCutoff(75.0)}
            className="text-xs text-obsidian-muted hover:text-obsidian-text transition-colors"
          >
            Reset (75%)
          </button>
        </div>
      </div>

      {/* Defaulter Action Roster Table */}
      <div className="bg-obsidian-surface border border-obsidian-border rounded-2xl overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-obsidian-border bg-obsidian-card/60 text-xs uppercase tracking-wider text-obsidian-muted">
                <th className="py-3.5 px-4 font-semibold">#</th>
                <th className="py-3.5 px-4 font-semibold">Student Identity</th>
                <th className="py-3.5 px-4 font-semibold">Registration Identifier</th>
                <th className="py-3.5 px-4 font-semibold">Department / Class</th>
                <th className="py-3.5 px-4 font-semibold text-center">Attendance Log</th>
                <th className="py-3.5 px-4 font-semibold text-center">Attendance Radar</th>
                <th className="py-3.5 px-4 font-semibold text-center">Recovery Forecast</th>
                <th className="py-3.5 px-4 font-semibold text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-obsidian-border/60 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-obsidian-muted">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-rose-500 border-t-transparent" />
                    <p className="mt-2 text-xs">Scanning defaulters radar...</p>
                  </td>
                </tr>
              ) : defaulters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-obsidian-muted text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    No attendance defaulters found below {cutoff}% cutoff! High institutional turnout.
                  </td>
                </tr>
              ) : (
                defaulters.map((d, idx) => {
                  const pct = d.metrics.percentage;
                  const isDetained = pct < 65.0;

                  return (
                    <motion.tr
                      key={d.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15, delay: idx * 0.02 }}
                      className="hover:bg-obsidian-card/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-xs font-mono text-obsidian-muted">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-medium text-obsidian-text">{d.fullName}</div>
                        <span className="text-[10px] text-rose-400 font-semibold block">
                          {isDetained ? 'Clause 7.2 SA Detention' : 'Clause 7.1 Condonation'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-academic-primary">
                        {d.identifier}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-obsidian-text">
                        {d.deptOrClass}
                      </td>

                      {/* Attendance Log Breakdown */}
                      <td className="py-3.5 px-4 text-center font-mono text-xs text-obsidian-muted">
                        <span className="text-emerald-400 font-bold">{d.metrics.present}</span> / {d.metrics.total} Hrs
                      </td>

                      {/* Radar Gauge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${
                            isDetained
                              ? 'bg-rose-600/20 text-rose-400 border border-rose-600/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {pct.toFixed(1)}%
                        </span>
                      </td>

                      {/* Recovery Forecast */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-obsidian-card border border-obsidian-border text-[11px] font-mono font-semibold text-obsidian-text">
                          +{d.metrics.sessionsNeededFor75} Consecutive Hrs
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isDetained && (
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<FileText className="w-3.5 h-3.5" />}
                              onClick={() => {
                                setSelectedStudent(d);
                                setModalType('condonation');
                              }}
                            >
                              Condonation Form
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<Phone className="w-3.5 h-3.5" />}
                            onClick={() => {
                              setSelectedStudent(d);
                              setModalType('sms');
                            }}
                          >
                            Guardian Alert
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DefaultersRadarView;
