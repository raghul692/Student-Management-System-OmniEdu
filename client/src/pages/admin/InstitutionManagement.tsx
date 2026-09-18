import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  School,
  GraduationCap,
  Plus,
  ArrowUpRight,
  RefreshCw,
  Power,
  Edit2,
  CheckCircle2,
  XCircle,
  X,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  Users,
  Palette,
  Globe,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { apiClient } from '../../services/apiClient';

export const InstitutionManagement: React.FC = () => {
  const { activeOrganization, selectInstitution } = useAuthStore();

  const [institutions, setInstitutions] = useState<any[]>(activeOrganization?.institutions || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    code: '',
    type: 'COLLEGE' as 'COLLEGE' | 'SCHOOL',
    affiliatedUniversity: 'Anna University',
    regulationYear: '2021',
    board: 'CBSE',
    standardFrom: 1,
    standardTo: 12,
    address: '',
    phone: '',
    email: '',
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Phase H: Multi-Campus Tab & Branding State
  const [activeTab, setActiveTab] = useState<'campuses' | 'branding' | 'entitlements'>('campuses');
  const [brandingForm, setBrandingForm] = useState({
    logoUrl: '',
    primaryColor: '#4F46E5',
    timezone: 'Asia/Kolkata',
    reportFooter: 'OmniEdu Unified ERP • Official Institutional Record',
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [entitlements, setEntitlements] = useState<any>(null);

  const fetchInstitutions = async () => {
    if (!activeOrganization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(`/organizations/${activeOrganization.id}`);
      if (res.data?.data?.institutions) {
        setInstitutions(res.data.data.institutions);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to refresh institutions');
    } finally {
      setLoading(false);
    }
  };

  const loadBranding = async () => {
    try {
      const res = await apiClient.get('/settings');
      if (res.data?.data?.settings) {
        const s = res.data.data.settings;
        setBrandingForm({
          logoUrl: s.logoUrl || '',
          primaryColor: s.primaryColor || '#4F46E5',
          timezone: s.timezone || 'Asia/Kolkata',
          reportFooter: s.reportFooter || 'OmniEdu Unified ERP • Official Institutional Record',
        });
      }
    } catch (err) {
      console.error('Failed to load branding settings:', err);
    }
  };

  const saveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    setError(null);
    try {
      await apiClient.patch('/settings', brandingForm);
      setSuccess('Branding & regional locale settings updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save branding settings.');
    } finally {
      setSavingBranding(false);
    }
  };

  const loadEntitlements = async () => {
    try {
      const res = await apiClient.get('/system/entitlements');
      if (res.data?.data) {
        setEntitlements(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load entitlements:', err);
    }
  };

  useEffect(() => {
    fetchInstitutions();
    if (activeTab === 'branding') loadBranding();
    if (activeTab === 'entitlements') loadEntitlements();
  }, [activeOrganization?.id, activeTab]);

  const handleToggleActive = async (instId: string) => {
    if (!activeOrganization?.id) return;
    try {
      await apiClient.patch(`/organizations/${activeOrganization.id}/institutions/${instId}/toggle-active`);
      setSuccess('Campus status updated');
      setTimeout(() => setSuccess(null), 3000);
      fetchInstitutions();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrganization?.id) return;
    setSubmittingAdd(true);
    setError(null);
    try {
      await apiClient.post(`/organizations/${activeOrganization.id}/institutions`, addForm);
      setSuccess(`Institution "${addForm.name}" created successfully with baseline academic structures!`);
      setTimeout(() => setSuccess(null), 4000);
      setShowAddModal(false);
      setAddForm({
        name: '',
        code: '',
        type: 'COLLEGE',
        affiliatedUniversity: 'Anna University',
        regulationYear: '2021',
        board: 'CBSE',
        standardFrom: 1,
        standardTo: 12,
        address: '',
        phone: '',
        email: '',
      });
      fetchInstitutions();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add institution');
    } finally {
      setSubmittingAdd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/60 border border-indigo-500/20 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Multi-Campus Governance
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Org: {activeOrganization?.slug}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Institutional Campuses & Facilities
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Provision and manage unlimited autonomous Colleges and Schools under {activeOrganization?.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInstitutions}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            title="Refresh Campuses"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Campus</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('campuses')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'campuses'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Campuses & Facilities ({institutions.length})
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'branding'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Palette className="w-4 h-4" />
          Branding & Regional Locale
        </button>
        <button
          onClick={() => setActiveTab('entitlements')}
          className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'entitlements'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Plan & Entitlements
        </button>
      </div>

      {/* Tab 1: Campuses Cards List */}
      {activeTab === 'campuses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {institutions.map((inst) => {
            const isCollege = inst.type === 'COLLEGE';
            return (
              <div
                key={inst.id}
                className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700/50">
                      {isCollege ? (
                        <GraduationCap className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <School className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isCollege
                            ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {inst.type}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          inst.isActive !== false ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                      {inst.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Code: {inst.code}</p>
                  </div>

                  <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
                    <p className="text-slate-300 font-medium">
                      {isCollege
                        ? `${inst.affiliatedUniversity || 'Anna University'} (R${inst.regulationYear || '2021'})`
                        : `${inst.board || 'CBSE Board'} (Standards ${inst.standardFrom || 1} to ${inst.standardTo || 12})`}
                    </p>
                    {inst.address && (
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span>{inst.address}</span>
                      </p>
                    )}
                    {inst.email && (
                      <p className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span>{inst.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleActive(inst.id)}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border transition-all ${
                      inst.isActive !== false
                        ? 'text-rose-400 border-rose-500/20 hover:bg-rose-500/10'
                        : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                    }`}
                    title="Toggle Active Status"
                  >
                    {inst.isActive !== false ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => selectInstitution(inst.id)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 flex items-center gap-1.5 transition-all"
                  >
                    <span>Switch Campus</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Branding & Locale Form */}
      {activeTab === 'branding' && (
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 max-w-2xl shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-indigo-400" />
              Campus Visual Branding & Regional Formatting
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Customize institution-specific primary colors, official logo emblems, report footers, and timezone localization.
            </p>
          </div>

          <form onSubmit={saveBranding} className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Institution Logo URL</label>
              <div className="flex gap-3 items-center">
                <input
                  type="url"
                  placeholder="https://example.edu/assets/logo.png"
                  value={brandingForm.logoUrl}
                  onChange={(e) => setBrandingForm({ ...brandingForm, logoUrl: e.target.value })}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                />
                {brandingForm.logoUrl && (
                  <div className="w-10 h-10 rounded-xl border border-slate-700 bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={brandingForm.logoUrl} alt="Logo" className="w-8 h-8 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Primary Theme Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={brandingForm.primaryColor}
                  onChange={(e) => setBrandingForm({ ...brandingForm, primaryColor: e.target.value })}
                  placeholder="#4F46E5"
                  className="w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500 uppercase"
                />
                <div className="flex gap-1.5">
                  {['#4F46E5', '#7C3AED', '#059669', '#2563EB', '#D97706'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setBrandingForm({ ...brandingForm, primaryColor: hex })}
                      className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-110"
                      style={{ backgroundColor: hex }}
                      title={hex}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Academic & Telemetry Timezone</label>
              <select
                value={brandingForm.timezone}
                onChange={(e) => setBrandingForm({ ...brandingForm, timezone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">PDF & Document Report Footer</label>
              <input
                type="text"
                value={brandingForm.reportFooter}
                onChange={(e) => setBrandingForm({ ...brandingForm, reportFooter: e.target.value })}
                placeholder="e.g. Official Anna University Affiliated Transcript • Confidential"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={savingBranding}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                {savingBranding && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Branding & Locale</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 3: Plan & Entitlements View */}
      {activeTab === 'entitlements' && (
        <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 max-w-3xl shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Subscription Tier</span>
              <h3 className="text-xl font-black text-white flex items-center gap-2 mt-0.5">
                {entitlements?.planTier || (activeOrganization as any)?.planTier || 'PRO'} TIER
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </h3>
            </div>
            <div className="text-right text-xs text-slate-400">
              <span>Managed via Trust Master Console</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Included Enterprise Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {[
                { name: 'INTERVENTIONS_WORKFLOW', desc: 'At-risk remedial actions & multi-faculty mentoring threads' },
                { name: 'WEBHOOKS_INTEGRATION', desc: 'HMAC-SHA256 signed event dispatchers to external SIS/LMS' },
                { name: 'AUDIT_LOGS_EXPORT', desc: 'Immutable compliance trail JSON export' },
                { name: 'PRIVACY_CONTROLS', desc: 'FERPA/GDPR data archive extraction & privacy scrubbing' },
                { name: 'EARLY_WARNING_RADAR', desc: 'Multi-signal predictive academic risk computation' },
                { name: 'CAREER_INTELLIGENCE', desc: 'Curriculum-to-industry skills gap analysis engine' },
              ].map((item) => (
                <div key={item.name} className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white font-mono block text-[11px]">{item.name}</span>
                    <span className="text-slate-400 text-[10px]">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add New Campus Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-black text-white">Provision Additional Campus</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateInstitution} className="space-y-4 text-xs">
                {/* Institution Type Selector */}
                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Campus Type *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, type: 'COLLEGE' })}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        addForm.type === 'COLLEGE'
                          ? 'bg-indigo-600/10 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <GraduationCap className="w-5 h-5 text-indigo-400" />
                      <div>
                        <span className="font-bold block">College</span>
                        <span className="text-[10px] text-slate-500">Degree & Engineering</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, type: 'SCHOOL' })}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        addForm.type === 'SCHOOL'
                          ? 'bg-purple-600/10 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <School className="w-5 h-5 text-purple-400" />
                      <div>
                        <span className="font-bold block">School</span>
                        <span className="text-[10px] text-slate-500">K-12 Matriculation</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 font-semibold mb-1 block">Campus Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apollo Arts & Science College"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">Campus Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AASC-002"
                      value={addForm.code}
                      onChange={(e) => setAddForm({ ...addForm, code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold mb-1 block">
                      {addForm.type === 'COLLEGE' ? 'Affiliated University' : 'Board / Syllabus'}
                    </label>
                    <input
                      type="text"
                      placeholder={addForm.type === 'COLLEGE' ? 'Anna University' : 'CBSE'}
                      value={addForm.type === 'COLLEGE' ? addForm.affiliatedUniversity : addForm.board}
                      onChange={(e) =>
                        addForm.type === 'COLLEGE'
                          ? setAddForm({ ...addForm, affiliatedUniversity: e.target.value })
                          : setAddForm({ ...addForm, board: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdd}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30 flex items-center gap-2"
                  >
                    {submittingAdd && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Provision Campus</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
