import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Analytics() {
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch API data on mount
  useEffect(() => {
    authFetch('/api/recommendations')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch recommendations');
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [authFetch]);

  // Split recommendations text into array of items for cleaner rendering
  const parseRecommendations = (text) => {
    if (!text) return [];
    return text
      .split(/\d+\.\s+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  const adviceItems = parseRecommendations(data?.recommendation);

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <main className="max-w-max-width mx-auto px-margin-desktop py-12">
      {/* Header Section */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-section-h2 text-section-h2 text-on-surface mb-2 font-semibold">
              Environmental Impact Analytics
            </h1>
            <p className="text-on-surface-variant max-w-2xl font-body-main text-sm">
              Real-time ecological audit summaries and AI-powered recommendations compiled dynamically from your campus mapping zones.
            </p>
          </div>
          <div className="flex gap-3 no-print">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-xs shadow-sm hover:bg-primary/95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] font-bold">download</span>
              Export PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Backend Totals Dashboard Row */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-surface p-4 rounded-xl shadow-soft border border-outline-variant/10 animate-pulse h-24"></div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-error-container text-on-error-container p-4 rounded-xl border border-error/20 mb-8 font-body-main text-center text-xs font-semibold">
          Error loading campus recommendations. Please ensure you have configured sustainability assets on the map.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10 animate-fade-in">
          {/* Card 1: Trees */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-impact-positive">
              <span className="material-symbols-outlined text-sm font-bold">park</span>
              Simulated Trees
            </div>
            <div className="text-2xl font-bold text-on-surface font-mono-data">
              {data?.summary?.totalTrees?.toLocaleString() || 0} <span className="text-[10px] font-normal text-on-surface-variant">saplings</span>
            </div>
          </div>

          {/* Card 2: CO2 Sequestration */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-impact-positive">
              <span className="material-symbols-outlined text-sm font-bold">co2</span>
              CO₂ Sequestration
            </div>
            <div className="text-2xl font-bold text-impact-positive font-mono-data">
              {data?.summary?.totalCO2AbsorptionTons?.toFixed(1) || '0.0'} <span className="text-[10px] font-bold text-on-surface-variant">t/yr</span>
            </div>
          </div>

          {/* Card 3: Solar Panels */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-impact-warning">
              <span className="material-symbols-outlined text-sm font-bold">wb_sunny</span>
              Solar Panels
            </div>
            <div className="text-2xl font-bold text-on-surface font-mono-data">
              {data?.summary?.totalPanels?.toLocaleString() || 0} <span className="text-[10px] font-normal text-on-surface-variant">units</span>
            </div>
          </div>

          {/* Card 4: Energy Yield */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-impact-warning">
              <span className="material-symbols-outlined text-sm font-bold">electric_bolt</span>
              Energy Yield
            </div>
            <div className="text-2xl font-bold text-impact-warning font-mono-data">
              {data?.summary?.totalEnergyKwh ? Math.round(data.summary.totalEnergyKwh).toLocaleString() : 0} <span className="text-[10px] font-bold text-on-surface-variant">kWh/yr</span>
            </div>
          </div>

          {/* Card 5: Diverted Waste */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-sm font-bold">recycling</span>
              Diverted Waste
            </div>
            <div className="text-2xl font-bold text-on-surface font-mono-data">
              {data?.summary?.divertedWasteKg ? (data.summary.divertedWasteKg / 1000).toFixed(1) : '0.0'} <span className="text-[10px] font-normal text-on-surface-variant">t/yr</span>
            </div>
          </div>

          {/* Card 6: Rainwater Harvested */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-sm font-bold">water_drop</span>
              Water Harvested
            </div>
            <div className="text-2xl font-bold text-secondary font-mono-data">
              {data?.summary?.totalWaterHarvested?.toLocaleString() || 0} <span className="text-[10px] font-bold text-on-surface-variant">L/yr</span>
            </div>
          </div>

          {/* Card 7: Setup Cost */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-tertiary">
              <span className="material-symbols-outlined text-sm font-bold">payments</span>
              Initial Setup Cost
            </div>
            <div className="text-xl font-bold text-tertiary font-mono-data">
              ₹{((data?.summary?.plantationCost || 0) + (data?.summary?.solarCost || 0)).toLocaleString('en-IN')}
            </div>
          </div>

          {/* Card 8: Financial Savings */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-sm font-bold">savings</span>
              Annual Savings
            </div>
            <div className="text-xl font-bold text-primary font-mono-data">
              ₹{(data?.summary?.solarSavings || 0).toLocaleString('en-IN')}<span className="text-[10px] font-normal text-on-surface-variant">/yr</span>
            </div>
          </div>

          {/* Card 9: Sustainability Score (Centered/Spanned on large screens if desired, but fits nicely in grid) */}
          <div className="bg-surface p-5 rounded-xl shadow-soft border border-outline-variant/10 flex flex-col justify-between h-28 col-span-2 md:col-span-1 lg:col-span-4">
            <div className="text-on-surface-variant font-label-caps text-[10px] uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-sm font-bold">grade</span>
              Campus Sustainability Score
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-primary font-mono-data">
                {data?.summary?.sustainabilityScore || 30}<span className="text-sm font-normal text-on-surface-variant">/100</span>
              </div>
              <div className="flex-1 h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: `${data?.summary?.sustainabilityScore || 30}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations Panel */}
      {!loading && !error && adviceItems.length > 0 && (
        <div className="bg-gradient-to-r from-primary-container/10 via-background to-secondary-container/10 border border-primary/20 rounded-2xl p-8 mb-12 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl active-icon">psychology</span>
            </div>
            <div>
              <h3 className="font-card-h3 text-card-h3 font-semibold text-on-surface">EcoVerse AI Advisor Insights</h3>
              <p className="text-xs text-on-surface-variant font-body-main mt-0.5">Custom ecological strategies compiled from real-time campus data</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {adviceItems.map((item, idx) => (
              <div key={idx} className="bg-surface/60 backdrop-blur-md p-5 rounded-xl border border-white/50 flex gap-4 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex-shrink-0 flex items-center justify-center font-mono-data text-xs font-bold">
                  {idx + 1}
                </div>
                <p className="text-on-surface text-sm leading-relaxed font-body-main">
                  {item}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

export default Analytics;