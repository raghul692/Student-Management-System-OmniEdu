import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { useAuthStore } from '../store/useAuthStore';
import {
  Building2,
  School,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Building,
} from 'lucide-react';
import { OrgType } from '../types';
import { SEOHead } from '../components/seo/SEOHead';

export const OnboardingWizard: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [orgData, setOrgData] = useState({
    name: 'Karpagam Educational Trust',
    slug: 'karpagam-trust',
    type: 'SCHOOL_AND_COLLEGE' as OrgType,
    address: 'Pollachi Main Road, Eachanari, Coimbatore, Tamil Nadu',
    phone: '+91 422 261 1146',
    email: 'contact@karpagam.edu',
  });

  const [collegeData, setCollegeData] = useState({
    name: 'Karpagam College of Engineering',
    code: 'KCE-CBE',
    affiliatedUniversity: 'Anna University, Chennai',
    regulationYear: '2021',
  });

  const [schoolData, setSchoolData] = useState({
    name: 'Karpagam Matriculation Higher Secondary School',
    code: 'KMHSS-CBE',
    board: 'State Board',
    standardFrom: 1,
    standardTo: 12,
  });

  const [adminData, setAdminData] = useState({
    fullName: 'Dr. R. Vasanthakumar',
    email: 'admin@karpagam.edu',
    password: 'Karpagam@2026',
    phone: '+91 98422 12345',
  });

  const handleNext = () => {
    setError(null);
    if (step === 1 && (!orgData.name || !orgData.slug)) {
      setError('Please provide an organization name and URL slug.');
      return;
    }
    if (step === 2) {
      if (orgData.type === 'COLLEGE' || orgData.type === 'SCHOOL_AND_COLLEGE') {
        if (!collegeData.name || !collegeData.code) {
          setError('Please provide College name and unique campus code.');
          return;
        }
      }
      if (orgData.type === 'SCHOOL' || orgData.type === 'SCHOOL_AND_COLLEGE') {
        if (!schoolData.name || !schoolData.code) {
          setError('Please provide School name and unique school code.');
          return;
        }
      }
    }
    if (step === 3 && (!adminData.fullName || !adminData.email || !adminData.password)) {
      setError('Please provide all admin account details.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const institutions: Array<{
      name: string;
      code: string;
      type: 'COLLEGE' | 'SCHOOL';
      address?: string;
      phone?: string;
      email?: string;
      affiliatedUniversity?: string;
      regulationYear?: string;
      board?: string;
      standardFrom?: number;
      standardTo?: number;
    }> = [];

    if (orgData.type === 'COLLEGE' || orgData.type === 'SCHOOL_AND_COLLEGE') {
      institutions.push({
        name: collegeData.name,
        code: collegeData.code,
        type: 'COLLEGE',
        address: orgData.address,
        phone: orgData.phone,
        email: orgData.email,
        affiliatedUniversity: collegeData.affiliatedUniversity,
        regulationYear: collegeData.regulationYear,
      });
    }
    if (orgData.type === 'SCHOOL' || orgData.type === 'SCHOOL_AND_COLLEGE') {
      institutions.push({
        name: schoolData.name,
        code: schoolData.code,
        type: 'SCHOOL',
        address: orgData.address,
        phone: orgData.phone,
        email: orgData.email,
        board: schoolData.board,
        standardFrom: schoolData.standardFrom,
        standardTo: schoolData.standardTo,
      });
    }

    const payload = {
      orgName: orgData.name,
      orgSlug: orgData.slug,
      orgType: orgData.type,
      institutions,
      adminFullName: adminData.fullName,
      adminEmail: adminData.email,
      adminPassword: adminData.password,
      adminPhone: adminData.phone,
    };

    try {
      await apiClient.post('/onboard', payload);
      // Auto login as the newly minted admin
      await login(adminData.email, adminData.password, orgData.slug);
      navigate('/app/dashboard');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to create organization. Please check details.';
      setError(errorMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      <SEOHead
        title="Register Institution & Trust — OmniEdu Multi-Tenant ERP"
        description="Onboard your educational trust, engineering college, or K-12 school onto OmniEdu in minutes. Configure multi-campus tenancy and super admin access."
        canonicalUrl="https://omniedu-drab.vercel.app/onboard"
      />
      {/* Glow Backdrops */}
      <div className="absolute top-10 -left-40 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-40 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Instant Multi-Tenant Institution Onboarding</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white font-display">
            Set Up Your Educational Institution
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Configure your organization, register engineering colleges or schools, and initialize your tenant database in 4 steps.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { num: 1, label: 'Organization' },
            { num: 2, label: 'Campus Setup' },
            { num: 3, label: 'Super Admin' },
            { num: 4, label: 'Launch' },
          ].map((s) => (
            <div
              key={s.num}
              className={`p-3 rounded-2xl border transition-all text-center ${
                step === s.num
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                  : step > s.num
                  ? 'bg-slate-900/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                {step > s.num ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <span>{s.num}.</span>
                )}
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Wizard Form Frame */}
        <div className="rounded-3xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6">
          {/* STEP 1: Organization Details */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">Step 1: Trust / Organization Profile</h2>
                <p className="text-xs text-slate-400">Specify the parent educational trust or group name.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Organization / Trust Name *
                </label>
                <input
                  type="text"
                  value={orgData.name}
                  onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                  placeholder="e.g. Apollo Educational Trust"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    URL Slug (Identifier) *
                  </label>
                  <input
                    type="text"
                    value={orgData.slug}
                    onChange={(e) => setOrgData({ ...orgData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="apollo-trust"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:border-indigo-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Used for tenant scoping: {orgData.slug || 'slug'}.omniedu.com</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Institution Model *
                  </label>
                  <select
                    value={orgData.type}
                    onChange={(e) => setOrgData({ ...orgData, type: e.target.value as OrgType })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none"
                  >
                    <option value="SCHOOL_AND_COLLEGE">Trust Managing Both (School + College)</option>
                    <option value="COLLEGE">Engineering / Arts College Only</option>
                    <option value="SCHOOL">K-12 School Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Headquarters Address</label>
                <input
                  type="text"
                  value={orgData.address}
                  onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                  placeholder="City, State, Country"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Institution Setup */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">Step 2: Campus & Academic Configuration</h2>
                <p className="text-xs text-slate-400">Configure the colleges and schools under this organization.</p>
              </div>

              {(orgData.type === 'COLLEGE' || orgData.type === 'SCHOOL_AND_COLLEGE') && (
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      College Campus Configuration
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">College Name *</label>
                      <input
                        type="text"
                        value={collegeData.name}
                        onChange={(e) => setCollegeData({ ...collegeData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Campus Code *</label>
                      <input
                        type="text"
                        value={collegeData.code}
                        onChange={(e) => setCollegeData({ ...collegeData, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Affiliated University</label>
                      <input
                        type="text"
                        value={collegeData.affiliatedUniversity}
                        onChange={(e) => setCollegeData({ ...collegeData, affiliatedUniversity: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Regulation</label>
                      <select
                        value={collegeData.regulationYear}
                        onChange={(e) => setCollegeData({ ...collegeData, regulationYear: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                      >
                        <option value="2021">Anna Univ R2021 (10-Point Scale)</option>
                        <option value="2024">Anna Univ R2024</option>
                        <option value="Autonomous">Autonomous Autonomous Grading</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {(orgData.type === 'SCHOOL' || orgData.type === 'SCHOOL_AND_COLLEGE') && (
                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <School className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      School Campus Configuration
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">School Name *</label>
                      <input
                        type="text"
                        value={schoolData.name}
                        onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">School Code *</label>
                      <input
                        type="text"
                        value={schoolData.code}
                        onChange={(e) => setSchoolData({ ...schoolData, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Educational Board</label>
                      <select
                        value={schoolData.board}
                        onChange={(e) => setSchoolData({ ...schoolData, board: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                      >
                        <option value="CBSE">CBSE (Central Board)</option>
                        <option value="State Board">State Board (Matriculation)</option>
                        <option value="ICSE">ICSE</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">Standards</label>
                      <div className="flex items-center gap-2 text-xs text-slate-300">
                        <span>Class 1 to 12</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Admin Account */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">Step 3: Master Admin Account</h2>
                <p className="text-xs text-slate-400">This account will have Organization Owner (ORG_ADMIN) privileges.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Admin Full Name *</label>
                <input
                  type="text"
                  value={adminData.fullName}
                  onChange={(e) => setAdminData({ ...adminData, fullName: e.target.value })}
                  placeholder="e.g. Dr. K. Rajagopal"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Admin Email *</label>
                  <input
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    placeholder="admin@institution.edu"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Secure Password *</label>
                  <input
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={adminData.phone}
                  onChange={(e) => setAdminData({ ...adminData, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Summary Review & Provisioning */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white">Step 4: Review & Initialize Tenant</h2>
                <p className="text-xs text-slate-400">Review your institutional parameters before creating database records.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block">Organization</span>
                    <span className="font-bold text-white text-sm">{orgData.name}</span>
                    <span className="text-[10px] text-indigo-400 block font-mono">slug: {orgData.slug}</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                    {orgData.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(orgData.type === 'COLLEGE' || orgData.type === 'SCHOOL_AND_COLLEGE') && (
                    <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
                      <span className="text-indigo-400 font-semibold block">College Campus</span>
                      <p className="font-bold text-white mt-1">{collegeData.name}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{collegeData.affiliatedUniversity}</p>
                    </div>
                  )}
                  {(orgData.type === 'SCHOOL' || orgData.type === 'SCHOOL_AND_COLLEGE') && (
                    <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20">
                      <span className="text-purple-400 font-semibold block">School Campus</span>
                      <p className="font-bold text-white mt-1">{schoolData.name}</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">{schoolData.board} • Standards 1-12</p>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400 block">Organization Super Admin</span>
                  <p className="font-bold text-white mt-0.5">{adminData.fullName} ({adminData.email})</p>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Full ORG_ADMIN Privileges
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel and return to Login
              </Link>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/20"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isSubmitting ? 'Provisioning Tenant...' : 'Initialize & Launch Campus'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
