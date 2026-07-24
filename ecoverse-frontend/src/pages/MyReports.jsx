import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SCORE_COLOR = (score) => {
  if (score >= 80) return 'text-impact-positive bg-impact-positive/10';
  if (score >= 60) return 'text-secondary bg-secondary/10';
  return 'text-impact-warning bg-impact-warning/10';
};

function ReportCard({ report, onView, onDelete }) {
  const date = new Date(report.createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  return (
    <div className="bg-surface rounded-[20px] p-6 shadow-soft border border-outline-variant flex flex-col hover:border-primary/40 transition-all duration-200 group">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-impact-positive/10 text-impact-positive px-3 py-1 rounded-full text-xs font-bold font-label-caps">
          COMPLETED
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${SCORE_COLOR(report.overallScore)}`}>
          <span className="font-bold text-sm">{report.overallScore}</span>
          <span className="text-[10px] opacity-70">/100</span>
        </div>
      </div>
      <h3 className="font-card-h3 text-card-h3 text-on-surface mb-1 group-hover:text-primary transition-colors line-clamp-2">
        Green Audit — {report.academicYear}
      </h3>
      <p className="text-on-surface-variant text-sm mb-6">{report.institution} · {report.campus}</p>
      <div className="mt-auto space-y-2">
        <div className="flex items-center justify-between text-xs font-label-caps text-on-surface-variant">
          <span>ACADEMIC YEAR</span>
          <span className="text-on-surface">{report.academicYear}</span>
        </div>
        <div className="flex items-center justify-between text-xs font-label-caps text-on-surface-variant">
          <span>GENERATED</span>
          <span className="text-on-surface">{date}</span>
        </div>
        <div className="pt-4 flex items-center gap-2 border-t border-outline-variant">
          <button
            onClick={() => onView(report.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-surface-container hover:bg-primary-fixed/40 transition-colors text-on-surface text-sm font-semibold relative overflow-hidden"
          >
            <span className="material-symbols-outlined text-[18px]">visibility</span>
            View
          </button>
          <button
            onClick={() => onDelete(report.id)}
            className="p-2 rounded-lg bg-surface-container hover:bg-error-container transition-colors text-error"
            title="Delete report"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MyReports() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();

  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [search, setSearch]       = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await authFetch('/api/audit/reports');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load reports.');
      setReports(data.reports);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report permanently?')) return;
    try {
      const res  = await authFetch(`/api/audit/reports/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Derive stats
  const totalReports  = reports.length;
  const avgScore      = totalReports > 0 ? Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / totalReports) : 0;
  const latestDate    = totalReports > 0
    ? new Date(Math.max(...reports.map(r => new Date(r.createdAt)))).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  // Unique years for filter
  const years = [...new Set(reports.map(r => r.academicYear))].filter(Boolean);

  const filtered = reports.filter(r => {
    const term = search.toLowerCase();
    const matchText = (r.institution + r.campus + r.academicYear).toLowerCase().includes(term);
    const matchYear = !yearFilter || r.academicYear === yearFilter;
    return matchText && matchYear;
  });

  return (
    <div className="min-h-screen bg-background font-body-main">
      <main className="max-w-[1280px] mx-auto px-margin-desktop py-12 w-full">

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-section-h2 text-section-h2 text-on-surface mb-2">My Reports</h1>
          <p className="font-body-main text-body-main text-on-surface-variant max-w-2xl">
            View and manage all previously generated Internal Green Audit reports to monitor your sustainability progress.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-10">
          {[
            { icon: 'description',    bg: 'bg-primary-fixed',    label: 'TOTAL REPORTS', value: totalReports,   text: 'text-primary' },
            { icon: 'check_circle',   bg: 'bg-secondary-fixed',  label: 'COMPLETED',     value: totalReports,   text: 'text-secondary' },
            { icon: 'star_rate',      bg: 'bg-impact-positive/10', label: 'AVG SCORE',   value: totalReports > 0 ? `${avgScore}/100` : '—', text: 'text-impact-positive' },
            { icon: 'calendar_today', bg: 'bg-surface-container-high', label: 'LATEST REPORT', value: latestDate, text: 'text-on-surface', isDate: true },
          ].map(({ icon, bg, label, value, text, isDate }) => (
            <div key={label} className="bg-surface p-6 rounded-[20px] shadow-soft border border-outline-variant hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 ${bg} rounded-xl ${text}`}>
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <span className="font-label-caps text-label-caps text-on-surface-variant">{label}</span>
              </div>
              <div className={`font-hero-h1 ${isDate ? 'text-2xl' : 'text-4xl'} text-on-surface`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search + Filters + CTA */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
          <div className="relative w-full md:w-96">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:outline-none font-body-main placeholder:text-on-surface-variant/50"
            />
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              className="bg-surface-container-low border-none rounded-xl px-4 py-3 font-body-main focus:ring-2 focus:ring-primary/20 focus:outline-none cursor-pointer"
            >
              <option value="">Academic Year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={() => navigate('/audit')}
            className="md:ml-auto flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-semibold hover:bg-primary-container transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Generate New Report
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex items-center gap-3 p-4 mb-6 bg-error-container rounded-xl text-on-error-container text-sm">
            <span className="material-symbols-outlined text-base active-icon">error</span>
            {error}
            <button onClick={fetchReports} className="ml-auto underline font-semibold">Retry</button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-surface rounded-[20px] p-6 border border-outline-variant animate-pulse h-52">
                <div className="flex justify-between mb-4">
                  <div className="h-6 w-24 bg-surface-container rounded-full" />
                  <div className="h-6 w-16 bg-surface-container rounded-full" />
                </div>
                <div className="h-5 w-3/4 bg-surface-container rounded mb-2" />
                <div className="h-4 w-1/2 bg-surface-container rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Report grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                onView={(id) => navigate(`/reports/${id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 text-center fade-in-up">
            <div className="w-24 h-24 bg-surface-container rounded-full flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">folder_off</span>
            </div>
            <h2 className="font-card-h3 text-card-h3 text-on-surface mb-2">
              {search || yearFilter ? 'No matching reports' : 'No reports yet'}
            </h2>
            <p className="text-on-surface-variant mb-8 max-w-sm">
              {search || yearFilter
                ? 'Try adjusting your search or filters.'
                : 'Generate your first Internal Green Audit report to start tracking your sustainability goals.'}
            </p>
            {!search && !yearFilter && (
              <button
                onClick={() => navigate('/audit')}
                className="flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-full font-semibold hover:bg-primary-container transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">add</span>
                Generate New Report
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
