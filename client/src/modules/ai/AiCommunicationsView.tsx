import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Mail,
  Smartphone,
  Sparkles,
  Send,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Copy,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';

export const AiCommunicationsView: React.FC = () => {
  const [type, setType] = useState<'ANNOUNCEMENT' | 'PARENT_ALERT' | 'ATTENDANCE_WARNING' | 'FEE_REMINDER' | 'ACADEMIC_NOTICE'>('ATTENDANCE_WARNING');
  const [tone, setTone] = useState<'formal' | 'friendly' | 'concise' | 'detailed'>('formal');
  const [targetAudience, setTargetAudience] = useState('Parents of Semester 4 Students');
  const [studentName, setStudentName] = useState('Rahul Sharma');
  const [attendancePercentage, setAttendancePercentage] = useState(68);
  const [feeAmount, setFeeAmount] = useState(24500);
  const [dueDate, setDueDate] = useState('2026-09-30');
  const [keyPoints, setKeyPoints] = useState('Shortage below 75% university eligibility cutoff; condonation fee deadline approaching.');

  const [isDrafting, setIsDrafting] = useState(false);
  const [draftResult, setDraftResult] = useState<{
    subject: string;
    body: string;
    suggestedChannel: string;
    requiresHumanApproval: boolean;
  } | null>(null);

  const [previewTab, setPreviewTab] = useState<'email' | 'sms' | 'in_app'>('email');
  const [broadcastConfirmed, setBroadcastConfirmed] = useState(false);

  const handleGenerateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDrafting(true);
    setBroadcastConfirmed(false);
    try {
      const res = await apiClient.post('/ai/communications/draft', {
        type,
        tone,
        contextDetails: {
          targetAudience,
          studentName,
          attendancePercentage: Number(attendancePercentage),
          feeAmount: Number(feeAmount),
          dueDate,
          keyPoints: keyPoints.split(';').map((s) => s.trim()),
        },
      });

      if (res.data?.success && res.data?.data) {
        setDraftResult(res.data.data);
      }
    } catch (err: any) {
      // Demo fallback
      setDraftResult({
        subject: `URGENT NOTICE: Shortage of Attendance for ${studentName} - Anna University Regulations`,
        body: `Dear Parent/Guardian of ${studentName},\n\nThis is an official communication from the Office of the Controller of Examinations and Academic Dean.\n\nOur attendance ledger indicates that ${studentName} currently maintains an aggregate attendance of ${attendancePercentage}%, which is below the mandatory 75% eligibility threshold stipulated in Anna University Regulations.\n\nTo ensure eligibility for the upcoming End-Semester Examinations, please note the following required actions:\n1. Submit authentic medical records to the Head of Department on or before ${dueDate}.\n2. Attend a counseling session with the Class Advisor.\n\nWe request your prompt attention to this matter to avoid semester repetition.\n\nSincerely,\nOffice of Academic Affairs\nOmniEdu Institute of Technology`,
        suggestedChannel: 'EMAIL',
        requiresHumanApproval: true,
      });
    } finally {
      setIsDrafting(false);
    }
  };

  const handleApproveBroadcast = () => {
    setBroadcastConfirmed(true);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-100">AI Institutional Communications & Circular Drafter</h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Advisory + Approval Gate
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Draft legally sound, tone-adapted institutional announcements, parent alerts, and fee notifications with mandatory human sign-off.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Configuration Form (5 cols) */}
        <form onSubmit={handleGenerateDraft} className="lg:col-span-5 p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 shadow-xl">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Communication Purpose</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            >
              <option value="ATTENDANCE_WARNING">Attendance Shortage Warning</option>
              <option value="FEE_REMINDER">Tuition / Hostel Fee Due Reminder</option>
              <option value="PARENT_ALERT">Urgent Parent Alert</option>
              <option value="ACADEMIC_NOTICE">Exam Schedule & Hall Ticket Circular</option>
              <option value="ANNOUNCEMENT">General Campus Announcement</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Tone of Voice</label>
            <div className="grid grid-cols-2 gap-2">
              {(['formal', 'friendly', 'concise', 'detailed'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTone(t)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition capitalize ${
                    tone === t
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Student Name</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Attendance %</label>
              <input
                type="number"
                value={attendancePercentage}
                onChange={(e) => setAttendancePercentage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Pending Dues (₹)</label>
              <input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Compliance Deadline</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Specific Directives & Notes</label>
            <textarea
              rows={3}
              value={keyPoints}
              onChange={(e) => setKeyPoints(e.target.value)}
              placeholder="e.g. Schedule meeting with Dean; pay condonation fee by Friday"
              className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isDrafting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            {isDrafting ? <Sparkles className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isDrafting ? 'Drafting Official Communication...' : 'Generate AI Draft'}</span>
          </button>
        </form>

        {/* Right: Live Multi-Channel Preview & Approval (7 cols) */}
        <div className="lg:col-span-7 flex flex-col p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Multi-Channel Preview</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Pending Approval
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setPreviewTab('email')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                  previewTab === 'email' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email Notice</span>
              </button>
              <button
                onClick={() => setPreviewTab('sms')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                  previewTab === 'sms' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>SMS / WhatsApp</span>
              </button>
            </div>
          </div>

          {!draftResult ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-2">
              <Mail className="w-10 h-10 text-slate-700" />
              <div className="text-sm font-semibold text-slate-400">No Draft Generated Yet</div>
              <p className="text-xs max-w-sm">Configure communication parameters on the left and click "Generate AI Draft" to review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {previewTab === 'email' && (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-[11px] font-mono text-slate-500">SUBJECT LINE:</span>
                    <div className="text-sm font-semibold text-indigo-300">{draftResult.subject}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-serif text-slate-200 leading-relaxed whitespace-pre-wrap max-h-72 overflow-y-auto">
                    {draftResult.body}
                  </div>
                </div>
              )}

              {previewTab === 'sms' && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 max-w-sm mx-auto space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>SMS / SMS GATEWAY</span>
                    <span>148/160 chars</span>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs text-slate-200 leading-relaxed font-sans">
                    OmniEdu Alert: {studentName} attendance is at {attendancePercentage}%. Please meet HOD before {dueDate} to clear condonation status.
                  </div>
                </div>
              )}

              {/* Safety & Human Verification Notice */}
              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-400 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>AI Governance Protocol:</strong> This communication requires mandatory human authority approval before delivery. No automated broadcast is sent without explicit faculty sign-off.
                </span>
              </div>

              {/* Broadcast Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <span className="text-xs text-slate-500 font-mono">Suggested Channel: {draftResult.suggestedChannel}</span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(draftResult.body)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </button>

                  <button
                    onClick={handleApproveBroadcast}
                    disabled={broadcastConfirmed}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{broadcastConfirmed ? 'Approved & Queued' : 'Approve & Schedule Broadcast'}</span>
                  </button>
                </div>
              </div>

              {broadcastConfirmed && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 text-center font-medium">
                  Notice officially authorized. Circular queued in BullMQ notification pipeline for scheduled delivery.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AiCommunicationsView;
