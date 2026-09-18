import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ArrowRight,
  RefreshCw,
  Download,
  AlertCircle,
  Database,
  Layers,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useAuthStore } from '../../store/useAuthStore';

type EntityType = 'STUDENTS' | 'FACULTY' | 'COURSES' | 'CLASSES' | 'SUBJECTS';

interface ImportJob {
  id: string;
  entityType: string;
  status: 'PENDING' | 'VALIDATING' | 'READY' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'ROLLED_BACK';
  totalRows: number;
  processedRows: number;
  successCount: number;
  failureCount: number;
  fileName?: string;
  createdAt: string;
  committedAt?: string;
  dryRunErrors?: any[];
}

export const ImportWizard: React.FC = () => {
  const { activeInstitution, getActiveTenantType } = useAuthStore();
  const isCollege = getActiveTenantType() === 'COLLEGE';

  const [activeTab, setActiveTab] = useState<'wizard' | 'history'>('wizard');
  const [step, setStep] = useState<number>(1);
  const [entityType, setEntityType] = useState<EntityType>('STUDENTS');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('import.csv');
  const [fileSize, setFileSize] = useState<number>(0);

  const [loading, setLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [commitResult, setCommitResult] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [historyJobs, setHistoryJobs] = useState<ImportJob[]>([]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, activeInstitution?.id]);

  const loadHistory = async () => {
    try {
      const res = await apiClient.get('/imports/history');
      setHistoryJobs(res.data.data.jobs || []);
    } catch (err: any) {
      console.error('Failed to load history:', err);
    }
  };

  const getTemplateCSV = (type: EntityType) => {
    if (type === 'STUDENTS') {
      return isCollege
        ? `Full Name,Register Number,Gender,Department,Semester,Email,Phone,Batch Year
Priya Sharma,910022104001,FEMALE,CSE,5,priya.s@apollo.edu,9876543210,2022-2026
Karthik Raja,910022104002,MALE,CSE,5,karthik.r@apollo.edu,9876543211,2022-2026`
        : `Full Name,Roll Number,Gender,Standard,Section,Email,Phone,Batch Year
Priya Sharma,10-A-01,FEMALE,10,A,priya.s@school.edu,9876543210,2025-2026
Karthik Raja,10-A-02,MALE,10,A,karthik.r@school.edu,9876543211,2025-2026`;
    }
    if (type === 'FACULTY') {
      return `Full Name,Email,Phone,Role,Department
Dr. S. Raman,dr.raman@apollo.edu,9876543212,FACULTY,CSE
Prof. Ananya Sen,ananya.sen@apollo.edu,9876543213,HOD,CSE`;
    }
    if (type === 'COURSES') {
      return `Course Code,Title,Semester,Credits,Is Lab,Department,Regulation
CS8501,Theory of Computation,5,3,false,CSE,R2021
CS8511,Microprocessors Laboratory,5,2,true,CSE,R2021`;
    }
    if (type === 'CLASSES') {
      return `Standard,Section,Class Teacher
10,A,Mrs. M. Vasanthi
10,B,Mr. R. Kumar`;
    }
    if (type === 'SUBJECTS') {
      return `Standard,Section,Subject Name,Subject Code,Weekly Periods,Teacher Name
10,A,Mathematics,MATH-10,5,Mr. Rajesh
10,A,Science,SCI-10,4,Mrs. Priya`;
    }
    return '';
  };

  const handleDownloadTemplate = () => {
    const csv = getTemplateCSV(entityType);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${entityType.toLowerCase()}_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleDryRunPreview = async () => {
    if (!csvContent.trim()) {
      setFeedback({ type: 'error', message: 'Please provide CSV content or upload a file.' });
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post('/imports/preview', {
        entityType,
        csvContent,
        fileName,
        fileSize,
      });
      setPreviewData(res.data.data);
      setStep(2);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'CSV Preview and validation failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewData?.jobId) return;

    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiClient.post(`/imports/${previewData.jobId}/commit`);
      setCommitResult(res.data.data.job);
      setStep(3);
      setFeedback({
        type: 'success',
        message: `Successfully committed ${res.data.data.job.successCount} ${entityType.toLowerCase()} into database.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Transactional commit failed and was rolled back.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setCsvContent('');
    setPreviewData(null);
    setCommitResult(null);
    setFeedback(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              CSV Bulk Ingestion Engine
            </span>
            <span className="text-xs text-slate-400">• {activeInstitution?.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Data Ingestion & Migration Hub</h1>
          <p className="text-sm text-slate-400 mt-1">
            Bulk onboard students, faculty, courses, and classes with automated column mapping, dry-run validation, and rollback safety.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              activeTab === 'wizard'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Import Wizard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Audit History
          </button>
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

      {/* ── TAB 1: IMPORT WIZARD ── */}
      {activeTab === 'wizard' && (
        <div className="space-y-6">
          {/* Wizard Stepper */}
          <div className="flex items-center justify-between max-w-2xl mx-auto px-4 py-2 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 1 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800'}`}>
                1
              </div>
              <span>Upload & Target</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 2 ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 2 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800'}`}>
                2
              </div>
              <span>Dry-Run Validation</span>
            </div>
            <div className={`h-0.5 flex-1 mx-3 ${step >= 3 ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
            <div className={`flex items-center gap-2 text-xs font-semibold ${step >= 3 ? 'text-emerald-400' : 'text-slate-500'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800'}`}>
                3
              </div>
              <span>Commit & Complete</span>
            </div>
          </div>

          {/* STEP 1: Select Entity & Upload */}
          {step === 1 && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                  Select Ingestion Entity Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {(['STUDENTS', 'FACULTY', 'COURSES', 'CLASSES', 'SUBJECTS'] as EntityType[]).map((type) => {
                    // Filter entity options for School / College relevance
                    if (isCollege && (type === 'CLASSES' || type === 'SUBJECTS')) return null;
                    if (!isCollege && (type === 'COURSES')) return null;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setEntityType(type);
                          setCsvContent(getTemplateCSV(type));
                        }}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          entityType === type
                            ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                            : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="font-bold text-sm block mb-1">{type}</span>
                        <span className="text-[11px] text-slate-400">
                          {type === 'STUDENTS' ? 'Profile & enrollments' : type === 'FACULTY' ? 'Teachers & HODs' : type === 'COURSES' ? 'Degree courses' : 'Class & Sections'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Upload or Paste */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CSV Data Source</span>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:underline font-medium"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Sample Template
                  </button>
                </div>

                <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-6 text-center bg-slate-800/20 transition">
                  <UploadCloud className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-200">
                    Drag and drop your <span className="text-emerald-400 font-mono font-bold">.csv</span> file here, or browse
                  </p>
                  <p className="text-xs text-slate-500 mt-1">UTF-8 encoded CSV, max 10MB per batch</p>
                  <label className="mt-3 inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer border border-slate-700 transition">
                    Browse File
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-400">Or inspect and edit CSV directly:</span>
                    {fileName && <span className="text-xs text-slate-500 font-mono">{fileName}</span>}
                  </div>
                  <textarea
                    rows={8}
                    value={csvContent}
                    onChange={(e) => setCsvContent(e.target.value)}
                    placeholder="Full Name,Register Number,Gender,Department,Semester..."
                    className="w-full bg-slate-950 font-mono text-xs text-slate-200 p-4 rounded-xl border border-slate-800 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  disabled={loading || !csvContent.trim()}
                  onClick={handleDryRunPreview}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Validate & Preview Data
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Dry-Run Preview & Error Diagnostics */}
          {step === 2 && previewData && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
                <div>
                  <h3 className="text-base font-bold text-white">Pre-Flight Validation Diagnostics</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Inspected {previewData.totalRows} raw rows. Evaluated foreign keys, data formats, and unique indexes.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-xs text-emerald-400 font-bold block">{previewData.validCount} Valid</span>
                    <span className="text-[10px] text-slate-400">Ready to commit</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-xs text-rose-400 font-bold block">{previewData.invalidCount} Errors</span>
                    <span className="text-[10px] text-slate-400">Will be rejected</span>
                  </div>
                </div>
              </div>

              {/* Error Table if any */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Row Validation Failures ({previewData.errors.length}):
                  </h4>
                  <div className="overflow-hidden border border-rose-900/40 rounded-xl bg-rose-950/20">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-950/40 text-rose-300 font-semibold uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Row</th>
                          <th className="px-4 py-2.5">Field</th>
                          <th className="px-4 py-2.5">Error Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-900/30 text-slate-300">
                        {previewData.errors.map((err: any, idx: number) => (
                          <tr key={idx} className="hover:bg-rose-900/10">
                            <td className="px-4 py-2 font-mono font-bold text-rose-400">Line {err.row}</td>
                            <td className="px-4 py-2 font-mono text-slate-400">{err.column}</td>
                            <td className="px-4 py-2 text-rose-300">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sample Valid Rows */}
              {previewData.sampleValid && previewData.sampleValid.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Preview Valid Records Sample ({previewData.sampleValid.length} rows):
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                    <pre className="p-4 text-xs font-mono text-emerald-300/90 leading-relaxed">
                      {JSON.stringify(previewData.sampleValid, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Back to Editor
                </button>
                <button
                  type="button"
                  disabled={loading || previewData.validCount === 0}
                  onClick={handleCommitImport}
                  className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Commit {previewData.validCount} Records to Database
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Complete / Summary */}
          {step === 3 && commitResult && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-4 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white">Import Committed Successfully</h3>
              <p className="text-xs text-slate-400">
                The transactional commit completed with zero rollbacks. Added {commitResult.successCount} verified records into {activeInstitution?.name}.
              </p>

              <div className="p-4 bg-slate-800/40 rounded-xl text-xs text-left space-y-2 border border-slate-800 font-mono text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Job ID:</span>
                  <span>{commitResult.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Entity:</span>
                  <span>{commitResult.entityType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Committed Count:</span>
                  <span className="text-emerald-400 font-bold">{commitResult.successCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Committed At:</span>
                  <span>{new Date(commitResult.committedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition"
                >
                  Import Another Batch
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AUDIT HISTORY ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Historical Ingestion Audit Log</h3>
            <button
              onClick={loadHistory}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>

          <div className="overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/40">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Entity</th>
                  <th className="px-5 py-3.5">File Name</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Rows</th>
                  <th className="px-5 py-3.5">Success</th>
                  <th className="px-5 py-3.5">Errors</th>
                  <th className="px-5 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {historyJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-3 font-semibold text-white">{job.entityType}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-400">{job.fileName || '-'}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : job.status === 'FAILED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">{job.totalRows}</td>
                    <td className="px-5 py-3 text-emerald-400 font-semibold">{job.successCount}</td>
                    <td className="px-5 py-3 text-rose-400">{job.failureCount}</td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {historyJobs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500 text-xs italic">
                      No import history recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default ImportWizard;
