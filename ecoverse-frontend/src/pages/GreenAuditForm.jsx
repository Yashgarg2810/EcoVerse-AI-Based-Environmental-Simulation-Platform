import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ─── Progress Stepper ─────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Institution', icon: 'account_balance' },
  { id: 2, label: 'Campus', icon: 'domain' },
  { id: 3, label: 'Energy', icon: 'bolt' },
  { id: 4, label: 'Water', icon: 'water_drop' },
  { id: 5, label: 'Waste', icon: 'delete_outline' },
  { id: 6, label: 'Green Infra', icon: 'park' },
  { id: 7, label: 'Initiatives', icon: 'verified' },
  { id: 8, label: 'Generate', icon: 'auto_awesome' },
];

const ACADEMIC_YEARS = ['2024 - 2025', '2023 - 2024', '2022 - 2023', '2021 - 2022'];

const INITIATIVES_LIST = [
  'Plastic Free Campus',
  '100% LED Lighting',
  'Solar Street Lights',
  'EV Charging Stations',
  'Organic Composting',
  'Biodiversity Garden',
  'Awareness Programs',
];

/* ─── Shared Input Styles ──────────────────────────────────────────────────── */
const inputCls =
  'w-full bg-surface-container-low border border-outline-variant rounded-xl px-4 py-3 text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 text-sm';

const labelCls = 'block text-xs font-bold uppercase tracking-wider text-outline mb-1.5';

const FieldInput = ({ label, ...props }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <input className={inputCls} {...props} />
  </div>
);

const FieldSelect = ({ label, options, ...props }) => (
  <div>
    <label className={labelCls}>{label}</label>
    <select className={inputCls} {...props}>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  </div>
);

const ToggleCard = ({ label, sub, checked, onChange }) => (
  <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
    <div>
      <p className="font-semibold text-primary text-sm">{label}</p>
      <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>
    </div>
    <div
      onClick={onChange}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
        checked ? 'bg-primary' : 'bg-outline-variant'
      }`}
    >
      <span
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
          checked ? 'translate-x-7' : 'translate-x-1'
        }`}
      />
    </div>
  </label>
);

/* ─── Section Wrapper ──────────────────────────────────────────────────────── */
const Section = ({ icon, title, children }) => (
  <div className="bg-surface rounded-2xl shadow-soft border border-outline-variant/30 p-8 fade-in-up">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary active-icon text-xl">{icon}</span>
      </div>
      <h2 className="text-card-h3 font-card-h3 text-on-surface">{title}</h2>
    </div>
    {children}
  </div>
);

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function GreenAuditForm() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [loading,       setLoading]       = useState(false);
  const [draftSaved,    setDraftSaved]    = useState(false);
  const [draftError,    setDraftError]    = useState('');   // shown when save fails
  const [draftLoading,  setDraftLoading]  = useState(true);
  const [draftRestored, setDraftRestored] = useState(false);
  const [error,        setError]        = useState('');

  const [form, setForm] = useState({
    // Step 1
    institution: '',
    campus: '',
    academicYear: '2024 - 2025',
    preparedBy: '',
    committee: '',
    // Step 2
    totalArea: '',
    builtUpArea: '',
    greenArea: '',
    students: '',
    faculty: '',
    staff: '',
    // Step 3
    electricity: '',
    hasSolar: false,
    solarCapacity: '',
    hasDiesel: false,
    dieselUsage: '',
    // Step 4
    waterConsumption: '',
    rainwaterPoints: '',
    hasSTP: false,
    recycledWater: '',
    // Step 5
    organicWaste: '',
    plasticWaste: '',
    paperWaste: '',
    eWaste: '',
    wasteDiversion: '',
    // Step 6
    existingTrees: '',
    newTrees: '',
    greenCover: '',
    plantationDrives: '',
    // Step 7
    initiatives: [],
  });

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const toggleInitiative = (item) =>
    setForm((prev) => ({
      ...prev,
      initiatives: prev.initiatives.includes(item)
        ? prev.initiatives.filter((i) => i !== item)
        : [...prev.initiatives, item],
    }));

  /* ── Load saved draft from DB on mount ── */
  useEffect(() => {
    async function loadDraft() {
      setDraftLoading(true);
      let restored = false;
      try {
        const res  = await authFetch('/api/audit/draft');
        const data = await res.json();
        if (res.ok && data.draft && Object.keys(data.draft).length > 0) {
          setForm(prev => ({ ...prev, ...data.draft }));
          restored = true;
        }
      } catch {
        // Network/auth error — fall through to localStorage
      }

      // Fallback: restore from localStorage if DB had nothing
      if (!restored) {
        try {
          const backup = localStorage.getItem('ecoverse_audit_backup');
          if (backup) {
            const parsed = JSON.parse(backup);
            // Only restore if user had actually filled something in
            if (parsed.institution || parsed.campus || parsed.preparedBy) {
              setForm(prev => ({ ...prev, ...parsed }));
              restored = true;
            }
          }
        } catch { /* corrupt localStorage — ignore */ }
      }

      if (restored) {
        setDraftRestored(true);
        setTimeout(() => setDraftRestored(false), 4000);
      }

      setDraftLoading(false);
    }
    loadDraft();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-backup form to localStorage on every change ── */
  useEffect(() => {
    if (!draftLoading) {
      localStorage.setItem('ecoverse_audit_backup', JSON.stringify(form));
    }
  }, [form, draftLoading]);

  /* ── Save Draft ── */
  const handleSaveDraft = async () => {
    setDraftError('');
    // Always save to localStorage immediately (instant, offline-safe)
    localStorage.setItem('ecoverse_audit_backup', JSON.stringify(form));
    try {
      const res  = await authFetch('/api/audit/save-draft', {
        method: 'POST',
        body: JSON.stringify({ formData: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Draft save failed.');
      // DB save succeeded
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 3000);
    } catch (err) {
      // DB failed but localStorage succeeded — tell the user honestly
      setDraftError('Saved locally (could not reach server).');
      setTimeout(() => setDraftError(''), 4000);
    }
  };

  /* ── Generate Report ── */
  const handleGenerate = async () => {
    if (!form.institution || !form.campus || !form.preparedBy) {
      setError('Please fill in at least Institution Name, Campus Name, and Prepared By before generating.');
      setTimeout(() => setError(''), 4000);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await authFetch('/api/audit/generate', {
        method: 'POST',
        body: JSON.stringify({ formData: form }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Report generation failed.');
      }

      // Navigate to the DB-persisted report page
      navigate(`/reports/${data.reportId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please check if the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Draft Loading Skeleton ── */}
      {draftLoading && (
        <div className="fixed inset-0 z-[998] bg-background flex flex-col items-center justify-center gap-4">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            <span className="material-symbols-outlined text-primary text-2xl active-icon absolute inset-0 flex items-center justify-center m-auto">eco</span>
          </div>
          <p className="text-on-surface-variant text-sm">Restoring your saved draft…</p>
        </div>
      )}

      {/* ── Generating Report Overlay ── */}
      {loading && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
          <div className="bg-surface rounded-2xl p-10 flex flex-col items-center gap-5 shadow-2xl max-w-sm mx-4 text-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
              <span className="material-symbols-outlined text-primary text-3xl active-icon absolute inset-0 flex items-center justify-center m-auto">eco</span>
            </div>
            <div>
              <h3 className="font-card-h3 text-card-h3 text-on-surface mb-1">Generating Your Report</h3>
              <p className="text-on-surface-variant text-sm">EcoVerse AI is analyzing your audit data and crafting a professional sustainability report…</p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="bg-surface border-b border-outline-variant">
        <div className="max-w-5xl mx-auto px-6 md:px-16 py-10">
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-primary active-icon text-2xl">eco</span>
            <span className="text-xs font-bold uppercase tracking-wider text-outline">EcoVerse</span>
          </div>
          <h1 className="text-section-h2 font-section-h2 text-primary mb-2">Internal Green Audit</h1>
          <p className="text-on-surface-variant text-body-main max-w-2xl">
            Complete the comprehensive environmental performance assessment for your institution. Fill in all 7 sections, then click <strong>Generate</strong> to receive your AI-powered sustainability report.
          </p>

          {/* Draft Restored Banner */}
          {draftRestored && (
            <div className="mt-4 flex items-center gap-3 bg-impact-positive/10 text-impact-positive border border-impact-positive/20 px-4 py-3 rounded-xl text-sm font-medium fade-in-up">
              <span className="material-symbols-outlined text-base active-icon">restore</span>
              Your previously saved draft has been restored automatically.
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mt-4 flex items-center gap-3 bg-error-container text-on-error-container px-4 py-3 rounded-xl text-sm font-medium">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="bg-surface border-b border-outline-variant sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-6 md:px-16 py-3 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    step.id === 8
                      ? 'bg-gradient-to-br from-primary to-primary-container text-on-primary shadow-md'
                      : 'bg-surface-container text-on-surface-variant'
                  }`}>
                    <span className="material-symbols-outlined text-sm">{step.icon}</span>
                  </div>
                  <span className={`text-[10px] font-semibold whitespace-nowrap ${
                    step.id === 8 ? 'text-primary' : 'text-on-surface-variant'
                  }`}>{step.label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="h-px w-6 bg-outline-variant flex-shrink-0 mb-4" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* ── Form Content ── */}
      <div className="max-w-5xl mx-auto px-6 md:px-16 py-10 space-y-8">

        {/* Step 1 — Institution Details */}
        <Section icon="account_balance" title="Step 1 — Institution Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldInput label="Institution Name" placeholder="e.g. Green Valley University" value={form.institution} onChange={e => set('institution', e.target.value)} />
            <FieldInput label="Campus Name" placeholder="e.g. Main Campus, North Wing" value={form.campus} onChange={e => set('campus', e.target.value)} />
            <FieldInput label="Academic Year" placeholder="e.g. 2023 - 2024" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} />
            <FieldInput label="Prepared By" placeholder="Full Name" value={form.preparedBy} onChange={e => set('preparedBy', e.target.value)} />
            <div className="md:col-span-2">
              <label className={labelCls}>Department / Committee Members</label>
              <textarea
                className={inputCls + ' h-24 resize-none'}
                placeholder="List names or departments separated by commas"
                value={form.committee}
                onChange={e => set('committee', e.target.value)}
              />
            </div>
          </div>
        </Section>

        {/* Step 2 — Campus Information */}
        <Section icon="domain" title="Step 2 — Campus Information">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <FieldInput label="Total Campus Area (Acres)" placeholder="0.00" type="number" value={form.totalArea} onChange={e => set('totalArea', e.target.value)} />
            <FieldInput label="Built-up Area (sq. ft.)" placeholder="0.00" type="number" value={form.builtUpArea} onChange={e => set('builtUpArea', e.target.value)} />
            <FieldInput label="Green Area / Cover (%)" placeholder="0" type="number" value={form.greenArea} onChange={e => set('greenArea', e.target.value)} />
            <FieldInput label="Number of Students" placeholder="0" type="number" value={form.students} onChange={e => set('students', e.target.value)} />
            <FieldInput label="Faculty Strength" placeholder="0" type="number" value={form.faculty} onChange={e => set('faculty', e.target.value)} />
            <FieldInput label="Staff Count" placeholder="0" type="number" value={form.staff} onChange={e => set('staff', e.target.value)} />
          </div>
        </Section>

        {/* Step 3 — Energy */}
        <Section icon="bolt" title="Step 3 — Energy">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-4">
              <FieldInput label="Annual Electricity Consumption (kWh)" placeholder="0.00" type="number" value={form.electricity} onChange={e => set('electricity', e.target.value)} />
              <ToggleCard label="Solar Power Plant" sub="Installed on campus premises" checked={form.hasSolar} onChange={() => set('hasSolar', !form.hasSolar)} />
              {form.hasSolar && (
                <FieldInput label="Solar Capacity (kWp)" placeholder="0.00" type="number" value={form.solarCapacity} onChange={e => set('solarCapacity', e.target.value)} />
              )}
            </div>
            <div className="space-y-4">
              <ToggleCard label="Diesel Generator" sub="Used for backup power" checked={form.hasDiesel} onChange={() => set('hasDiesel', !form.hasDiesel)} />
              {form.hasDiesel && (
                <FieldInput label="Annual Diesel Usage (Litres)" placeholder="0.00" type="number" value={form.dieselUsage} onChange={e => set('dieselUsage', e.target.value)} />
              )}
            </div>
          </div>
        </Section>

        {/* Step 4 — Water */}
        <Section icon="water_drop" title="Step 4 — Water">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldInput label="Annual Water Consumption (Litres/Day)" placeholder="0.00" type="number" value={form.waterConsumption} onChange={e => set('waterConsumption', e.target.value)} />
            <FieldInput label="Rainwater Harvesting Points" placeholder="0" type="number" value={form.rainwaterPoints} onChange={e => set('rainwaterPoints', e.target.value)} />
            <ToggleCard label="STP / ETP Facility Available" sub="Sewage Treatment Plant on campus" checked={form.hasSTP} onChange={() => set('hasSTP', !form.hasSTP)} />
            <FieldInput label="Recycled Water (%)" placeholder="0" type="number" value={form.recycledWater} onChange={e => set('recycledWater', e.target.value)} />
          </div>
        </Section>

        {/* Step 5 — Waste */}
        <Section icon="delete_outline" title="Step 5 — Waste">
          <p className={labelCls + ' mb-4'}>Monthly Waste Generation (Kilograms)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-5">
            {[
              { label: 'Organic Waste', key: 'organicWaste', icon: '🌿' },
              { label: 'Plastic Waste', key: 'plasticWaste', icon: '♻️' },
              { label: 'Paper Waste', key: 'paperWaste', icon: '📄' },
              { label: 'E-Waste', key: 'eWaste', icon: '💻' },
            ].map(({ label, key, icon }) => (
              <div key={key} className="bg-surface-container-low rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{icon}</div>
                <label className="block text-xs font-bold text-on-surface-variant mb-2">{label}</label>
                <input
                  className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-center text-sm font-mono focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="0"
                  type="number"
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="md:w-1/3">
            <FieldInput label="Waste Diversion / Recycling (%)" placeholder="0" type="number" value={form.wasteDiversion} onChange={e => set('wasteDiversion', e.target.value)} />
          </div>
        </Section>

        {/* Step 6 — Green Infrastructure */}
        <Section icon="park" title="Step 6 — Green Infrastructure">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldInput label="Existing Mature Trees" placeholder="Count" type="number" value={form.existingTrees} onChange={e => set('existingTrees', e.target.value)} />
            <FieldInput label="New Saplings Planted This Year" placeholder="Count" type="number" value={form.newTrees} onChange={e => set('newTrees', e.target.value)} />
            <FieldInput label="Green Cover / Landscaping Area (sq.ft.)" placeholder="e.g. 15000" type="number" value={form.greenCover} onChange={e => set('greenCover', e.target.value)} />
            <FieldInput label="Annual Plantation Drives (Events/Year)" placeholder="0" type="number" value={form.plantationDrives} onChange={e => set('plantationDrives', e.target.value)} />
          </div>
        </Section>

        {/* Step 7 — Additional Initiatives */}
        <Section icon="verified" title="Step 7 — Additional Environmental Initiatives">
          <p className="text-on-surface-variant text-sm mb-5">Select all sustainability initiatives active on your campus:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {INITIATIVES_LIST.map((item) => {
              const active = form.initiatives.includes(item);
              return (
                <label
                  key={item}
                  onClick={() => toggleInitiative(item)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 select-none ${
                    active
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-outline-variant bg-surface-container-low text-on-surface hover:border-primary/40'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                    active ? 'bg-primary border-primary' : 'border-outline'
                  }`}>
                    {active && <span className="material-symbols-outlined text-on-primary text-xs active-icon">check</span>}
                  </div>
                  <span className="text-sm font-medium">{item}</span>
                </label>
              );
            })}
          </div>
        </Section>

        {/* Step 8 — Generate */}
        <div className="bg-gradient-to-br from-primary/5 via-surface to-primary/5 rounded-2xl border-2 border-primary/20 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-primary text-3xl active-icon">auto_awesome</span>
          </div>
          <h2 className="text-card-h3 font-card-h3 text-on-surface mb-2">Step 8 — Generate AI Report</h2>
          <p className="text-on-surface-variant text-sm mb-6 max-w-lg mx-auto">
            Click the button below to send your audit data to <strong>EcoVerse AI</strong>. A professional green audit report will be generated with Executive Summary, Analysis, Strengths, Weaknesses, and actionable AI Recommendations.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={handleSaveDraft}
              className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 font-semibold transition-all duration-200 hover:-translate-y-0.5 ${
                draftSaved
                  ? 'border-impact-positive text-impact-positive bg-impact-positive/5'
                  : draftError
                  ? 'border-impact-warning text-impact-warning bg-impact-warning/5'
                  : 'border-primary text-primary hover:bg-primary/5'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {draftSaved ? 'cloud_done' : draftError ? 'save' : 'save'}
              </span>
              {draftSaved ? '✓ Saved to Cloud!' : draftError ? '⚠ Saved Locally' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="flex items-center gap-3 px-10 py-3.5 rounded-full bg-primary text-on-primary font-bold text-base shadow-lg hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined active-icon">description</span>
              Generate Internal Green Audit
            </button>
          </div>
          {/* Draft status message below buttons */}
          {draftSaved && (
            <p className="mt-3 text-xs text-impact-positive font-medium fade-in-up">
              ✓ Draft saved to your account — it will be restored automatically next time you open this form.
            </p>
          )}
          {draftError && (
            <p className="mt-3 text-xs text-impact-warning font-medium fade-in-up">
              ⚠ {draftError} Your data is safe in this browser.
            </p>
          )}

        </div>

      </div>

      {/* ── Bottom Padding ── */}
      <div className="h-12" />
    </div>
  );
}
