import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/* ─── Status Badge ──────────────────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    'Excellent':         'bg-impact-positive/10 text-impact-positive',
    'Good':              'bg-secondary-fixed text-secondary',
    'Needs Improvement': 'bg-impact-warning/10 text-impact-warning',
  };
  const icons = {
    'Excellent': 'emoji_events',
    'Good': 'thumb_up',
    'Needs Improvement': 'warning',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${map[status] || 'bg-surface-container text-on-surface-variant'}`}>
      <span className="material-symbols-outlined text-sm active-icon">{icons[status] || 'info'}</span>
      {status}
    </span>
  );
};

/* ─── Priority Badge ─────────────────────────────────────────────────────────  */
const PriorityBadge = ({ priority }) => {
  const map = {
    High:   'bg-impact-negative/10 text-impact-negative',
    Medium: 'bg-impact-warning/10 text-impact-warning',
    Low:    'bg-impact-positive/10 text-impact-positive',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${map[priority] || ''}`}>{priority}</span>
  );
};

/* ─── Section Card ───────────────────────────────────────────────────────────  */
const ReportSection = ({ icon, title, children, accent = false }) => (
  <div className={`rounded-2xl border ${accent ? 'border-primary/30 bg-primary/5' : 'border-outline-variant bg-surface'} p-6 shadow-soft`}>
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary'}`}>
        <span className="material-symbols-outlined text-base active-icon">{icon}</span>
      </div>
      <h2 className="font-card-h3 text-card-h3 text-on-surface">{title}</h2>
    </div>
    {children}
  </div>
);

/* ─── Analysis Card ─────────────────────────────────────────────────────────── */
const AnalysisCard = ({ icon, title, data }) => {
  if (!data) return null;
  return (
    <ReportSection icon={icon} title={title}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <StatusBadge status={data.status} />
          {data.co2Footprint && (
            <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
              CO₂: {data.co2Footprint}
            </span>
          )}
          {data.co2Absorbed && (
            <span className="text-xs font-mono text-impact-positive bg-impact-positive/10 px-2 py-1 rounded-lg">
              Absorbed: {data.co2Absorbed}
            </span>
          )}
          {data.totalMonthlyWaste && (
            <span className="text-xs font-mono text-on-surface-variant bg-surface-container px-2 py-1 rounded-lg">
              Total: {data.totalMonthlyWaste}
            </span>
          )}
        </div>
        <p className="text-on-surface-variant text-sm leading-relaxed">{data.summary}</p>
        {data.recommendations?.length > 0 && (
          <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-outline mb-2">Quick Wins</p>
            {data.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-on-surface">
                <span className="material-symbols-outlined text-primary text-base mt-0.5 flex-shrink-0 active-icon">arrow_forward</span>
                {r}
              </div>
            ))}
          </div>
        )}
      </div>
    </ReportSection>
  );
};

/* ─── Score Ring ─────────────────────────────────────────────────────────────  */
const ScoreRing = ({ score }) => {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#16A34A' : score >= 50 ? '#D97706' : '#DC2626';

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#e0e3e5" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-on-surface-variant font-semibold">/100</span>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────────  */
export default function GreenAuditReport() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { id }    = useParams();   // present when accessed via /reports/:id
  const { authFetch } = useAuth();
  const printRef  = useRef();

  // State for DB-fetched report (when navigating via /reports/:id)
  const [fetchedReport,   setFetchedReport]   = useState(null);
  const [fetchedFormData, setFetchedFormData] = useState(null);
  const [fetchLoading,    setFetchLoading]    = useState(false);
  const [fetchError,      setFetchError]      = useState('');

  // If navigated from state (old path — kept for backward compat)
  const stateReport   = location.state?.report;
  const stateFormData = location.state?.formData;

  // Fetch from DB when accessed via /reports/:id
  useEffect(() => {
    if (!id) return; // no id param → use state
    setFetchLoading(true);
    authFetch(`/api/audit/reports/${id}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Report not found.');
        setFetchedReport(data.report.reportData);
        setFetchedFormData(data.report.formData);
      })
      .catch(err => setFetchError(err.message))
      .finally(() => setFetchLoading(false));
  }, [id, authFetch]);

  // Resolve which data to use
  const report   = fetchedReport   ?? stateReport;
  const formData = fetchedFormData ?? stateFormData;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          <span className="material-symbols-outlined text-primary text-2xl active-icon absolute inset-0 flex items-center justify-center m-auto">eco</span>
        </div>
        <p className="text-on-surface-variant font-body-main">Loading report…</p>
      </div>
    );
  }

  // ── Error / Not found state ────────────────────────────────────────────────
  if (fetchError || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-5 text-center px-6">
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">report_off</span>
        </div>
        <h2 className="text-card-h3 font-card-h3 text-on-surface">
          {fetchError || 'No Report Found'}
        </h2>
        <p className="text-on-surface-variant text-sm max-w-sm">
          {fetchError
            ? 'There was an error loading this report. Please try again.'
            : 'Please fill out the Internal Green Audit form and click "Generate" to produce a report.'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="px-6 py-3 border-2 border-primary text-primary rounded-full font-semibold hover:bg-primary/5 transition-all"
          >
            My Reports
          </button>
          <button
            onClick={() => navigate('/audit')}
            className="px-8 py-3 bg-primary text-on-primary rounded-full font-semibold hover:brightness-110 transition-all"
          >
            Go to Audit Form
          </button>
        </div>
      </div>
    );
  }

  const handlePrint = () => window.print();

  const strengthIcons = ['star', 'verified', 'emoji_events', 'thumb_up', 'eco'];
  const weaknessIcons = ['warning', 'error_outline', 'trending_down', 'block', 'priority_high'];

  return (
    <div className="min-h-screen bg-background">

      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color-adjust: exact !important; 
          }
          /* Ensure all background colors, text colors, gradients, and ring SVGs print in full color */
          .rounded-2xl,
          .bg-gradient-to-br,
          div, span, p, h1, h2, h3, circle {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Prevent cards from breaking across pages */
          .rounded-2xl,
          .page-break-inside-avoid,
          .break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-break { page-break-before: always !important; }
        }
      `}</style>

      {/* ── Header / Controls ── */}
      <div className="bg-surface border-b border-outline-variant no-print sticky top-16 z-40">
        <div className="max-w-5xl mx-auto px-6 md:px-16 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Back to My Reports (when accessed via /reports/:id) or Back to Audit Form */}
            <button
              onClick={() => id ? navigate('/reports') : navigate('/audit')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              {id ? 'My Reports' : 'Back to Audit Form'}
            </button>
            <span className="text-outline-variant">|</span>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base active-icon">eco</span>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Report Preview</span>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-on-primary rounded-full font-semibold text-sm hover:brightness-110 hover:-translate-y-0.5 transition-all duration-200 shadow-md"
          >
            <span className="material-symbols-outlined text-base">download</span>
            Download PDF
          </button>
        </div>
      </div>

      {/* ── Report Body ── */}
      <div ref={printRef} className="max-w-5xl mx-auto px-6 md:px-16 py-10 space-y-8">

        {/* ── Report Header ── */}
        <div className="bg-gradient-to-br from-primary via-primary-container to-primary text-on-primary rounded-2xl p-8 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3 opacity-80">
                <span className="material-symbols-outlined active-icon">eco</span>
                <span className="text-xs font-bold uppercase tracking-widest">EcoVerse • Internal Green Audit Report</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                {formData?.institution || 'Institution'} — {formData?.campus || 'Campus'}
              </h1>
              <p className="opacity-80 text-sm">Academic Year: {formData?.academicYear || '—'} &nbsp;|&nbsp; Prepared by: {formData?.preparedBy || '—'}</p>
              <p className="opacity-70 text-xs mt-1">Generated via EcoVerse AI</p>
            </div>
            <div className="text-center">
              <ScoreRing score={report.overallScore || 0} />
              <p className="text-xs font-bold mt-2 opacity-80 uppercase tracking-wider">Green Score</p>
            </div>
          </div>
        </div>

        {/* ── Executive Summary ── */}
        <ReportSection icon="summarize" title="Executive Summary" accent>
          <p className="text-on-surface leading-relaxed">{report.executiveSummary}</p>
        </ReportSection>

        {/* ── Campus Profile ── */}
        <ReportSection icon="location_city" title="Campus Profile">
          <p className="text-on-surface-variant leading-relaxed">{report.campusProfile}</p>
          {formData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {[
                { label: 'Students',    val: formData.students   || '—', icon: 'people' },
                { label: 'Faculty',     val: formData.faculty    || '—', icon: 'school' },
                { label: 'Staff',       val: formData.staff      || '—', icon: 'badge' },
                { label: 'Campus Area', val: `${formData.totalArea || '—'} acres`, icon: 'map' },
              ].map(({ label, val, icon }) => (
                <div key={label} className="bg-surface-container-low rounded-xl p-3 text-center">
                  <span className="material-symbols-outlined text-primary text-lg active-icon block mb-1">{icon}</span>
                  <p className="font-mono font-bold text-lg text-on-surface">{val}</p>
                  <p className="text-xs text-on-surface-variant">{label}</p>
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* ── Analysis Sections (2-col on desktop) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnalysisCard icon="bolt"          title="Energy Analysis"     data={report.energyAnalysis} />
          <AnalysisCard icon="water_drop"    title="Water Analysis"      data={report.waterAnalysis} />
          <AnalysisCard icon="delete_outline" title="Waste Analysis"     data={report.wasteAnalysis} />
          <AnalysisCard icon="park"          title="Green Cover Analysis" data={report.greenCoverAnalysis} />
        </div>

        {/* ── Strengths & Weaknesses ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportSection icon="star" title="Strengths">
            <div className="space-y-2.5">
              {(report.strengths || []).map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-impact-positive/5 border border-impact-positive/20">
                  <span className="material-symbols-outlined text-impact-positive text-base mt-0.5 flex-shrink-0 active-icon">{strengthIcons[i] || 'check_circle'}</span>
                  <p className="text-sm text-on-surface">{s}</p>
                </div>
              ))}
            </div>
          </ReportSection>

          <ReportSection icon="warning" title="Weaknesses">
            <div className="space-y-2.5">
              {(report.weaknesses || []).map((w, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-impact-warning/5 border border-impact-warning/20">
                  <span className="material-symbols-outlined text-impact-warning text-base mt-0.5 flex-shrink-0 active-icon">{weaknessIcons[i] || 'warning'}</span>
                  <p className="text-sm text-on-surface">{w}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        </div>

        {/* ── AI Recommendations ── */}
        <ReportSection icon="auto_awesome" title="AI Recommendations" accent>
          <p className="text-sm text-primary/80 mb-4 font-medium">Powered by EcoVerse AI • Tailored for {formData?.institution || 'your institution'}</p>
          <div className="space-y-4">
            {(report.aiRecommendations || []).map((rec, i) => (
              <div key={i} className="bg-surface rounded-xl border border-outline-variant p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <h3 className="font-semibold text-on-surface text-sm">{rec.title}</h3>
                  </div>
                  <PriorityBadge priority={rec.priority} />
                </div>
                <p className="text-on-surface-variant text-sm leading-relaxed pl-11">{rec.description}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* ── Conclusion ── */}
        <ReportSection icon="flag" title="Conclusion">
          <p className="text-on-surface leading-relaxed">{report.conclusion}</p>
          <div className="mt-4 pt-4 border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
            <span>Report generated by EcoVerse via EcoVerse AI</span>
          </div>
        </ReportSection>

        {/* ── Bottom CTA ── */}
        <div className="no-print text-center py-6 border-t border-outline-variant">
          <p className="text-on-surface-variant text-sm mb-4">Ready to share this report?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined text-base">description</span>
              All My Reports
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-on-primary font-bold shadow-md hover:brightness-110 hover:-translate-y-0.5 transition-all"
            >
              <span className="material-symbols-outlined active-icon text-base">download</span>
              Download as PDF
            </button>
          </div>
        </div>

      </div>

      <div className="h-12" />
    </div>
  );
}
