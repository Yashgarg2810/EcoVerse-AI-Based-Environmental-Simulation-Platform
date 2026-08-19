import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

function Simulate() {
  // Authentication Context
  const { token, isAuthenticated } = useAuth();
  const [historyList, setHistoryList] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'success', 'error'
  const [saveMessage, setSaveMessage] = useState('');

  // Available species and panels fetched from database (with local fallbacks)
  const [speciesList, setSpeciesList] = useState([]);
  const [panelsList, setPanelsList] = useState([]);
  const [selectedSpecies, setSelectedSpecies] = useState('Neem');
  const [selectedPanel, setSelectedPanel] = useState('Monocrystalline');

  // Inputs: Area-based
  const [plantationArea, setPlantationArea] = useState(5000);
  const [rooftopArea, setRooftopArea] = useState(1000);
  const [waste, setWaste] = useState(60);

  const [hasRun, setHasRun] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [score, setScore] = useState(0);
  const [dashOffset, setDashOffset] = useState(552.92);

  // Simulation results storage
  const [simResults, setSimResults] = useState(null);
  
  // Interactive UI Tabs
  const [comparisonTab, setComparisonTab] = useState('trees');
  const [chartTab, setChartTab] = useState('carbon');

  // Fetch simulation options on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/simulation-data`)
      .then((res) => res.json())
      .then((data) => {
        setSpeciesList(data.treeSpecies || []);
        setPanelsList(data.solarPanels || []);
      })
      .catch((err) => {
        console.error('Error fetching simulation options:', err);
      });
  }, []);

  // Fetch history function
  const fetchHistory = () => {
    if (!isAuthenticated || !token) return;
    fetch(`${API_BASE}/api/simulate/history`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHistoryList(data);
        }
      })
      .catch((err) => console.error('Error fetching simulation history:', err));
  };

  // Fetch history on auth status change
  useEffect(() => {
    fetchHistory();
  }, [isAuthenticated, token]);

  // Debounced simulation API call
  useEffect(() => {
    const timer = setTimeout(() => {
      fetch(`${API_BASE}/api/simulate?plantationArea=${plantationArea}&rooftopArea=${rooftopArea}&wastePercent=${waste}&treeSpecies=${selectedSpecies}&solarPanelType=${selectedPanel}`)
        .then((res) => res.json())
        .then((data) => setSimResults(data))
        .catch((err) => console.error('Simulate fetch error:', err));
    }, 500);

    return () => clearTimeout(timer);
  }, [plantationArea, rooftopArea, waste, selectedSpecies, selectedPanel]);

  // Handle active species and panel detail objects
  const activeSpeciesObj = speciesList.find(s => s.name === selectedSpecies) || {
    name: "Neem", co2Absorption: 20.0, avgLifespan: 150, saplingCost: 50.0, annualMaintenanceCost: 100.0, spacingRequirement: 3.0
  };
  const activePanelObj = panelsList.find(p => p.name === selectedPanel) || {
    name: "Monocrystalline", efficiency: 0.20, wattage: 400, areaRequired: 2.0, averageMarketCost: 15000.0
  };

  // derived intermediate calculations (live under sliders)
  const spacing = activeSpeciesObj.spacingRequirement || 3;
  const liveEstTrees = Math.floor(plantationArea / (spacing * spacing));
  const liveEstCO2 = ((liveEstTrees * activeSpeciesObj.co2Absorption) / 1000).toFixed(1);

  const panelArea = activePanelObj.areaRequired || 2.0;
  const liveEstPanels = Math.floor(rooftopArea / panelArea);
  const liveEstEnergy = Math.round(liveEstPanels * (activePanelObj.wattage / 1000) * 4.5 * 365); // kWh
  
  const wasteImpactEst = waste > 70 ? 'Critical' : waste > 40 ? 'High' : 'Moderate';

  // Result metrics
  const co2Reduced = simResults
    ? (simResults.plantation.estimated_co2_absorption_tons + 
       simResults.solar.co2_reduction_tons + 
       simResults.waste.estimated_co2_avoided_tons).toFixed(1)
    : '...';
  const energySaved = simResults ? Math.round(simResults.solar.estimated_energy_output_kwh).toLocaleString() : '...';
  const totalTreesPlanted = simResults ? simResults.plantation.estimated_trees : '...';
  const wasteDivertedDisplay = simResults ? (simResults.waste.estimated_diverted_waste_kg / 1000).toFixed(1) : '...';

  // Run simulation calculation
  const handleRunSimulation = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setHasRun(true);

      // Multi-variable scoring
      const plantationUtilization = Math.min(plantationArea / 10000, 1.0);
      const solarUtilization = Math.min(rooftopArea / 2000, 1.0);
      const wasteDiversion = waste / 100;

      // Adjust weight based on quality of selections (higher efficiency / carbon absorption = higher score)
      const speciesQualityBonus = activeSpeciesObj.co2Absorption / 30.0; // scales up to 1.0
      const solarQualityBonus = activePanelObj.efficiency / 0.22; // scales up to 1.0

      const computedScore = Math.round(
        40 +
        (plantationUtilization * 20 * (0.7 + speciesQualityBonus * 0.3)) +
        (solarUtilization * 20 * (0.7 + solarQualityBonus * 0.3)) +
        (wasteDiversion * 20)
      );
      setScore(Math.min(computedScore, 100));

      setTimeout(() => {
        const resultsEl = document.getElementById('results-state');
        if (resultsEl) {
          resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }, 800);
  };

  // Animate Circular Gauge
  useEffect(() => {
    if (hasRun && !isLoading) {
      const targetOffset = 552.92 - (552.92 * score) / 100;
      const timeout = setTimeout(() => {
        setDashOffset(targetOffset);
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [score, hasRun, isLoading]);

  const getStatusText = () => {
    if (score >= 85) return 'Exceptional';
    if (score >= 70) return 'Outstanding';
    if (score >= 55) return 'Good progress';
    return 'Basic';
  };

  // Save simulation config function
  const handleSaveSimulation = () => {
    if (!isAuthenticated || !token || !simResults) return;
    setSaveStatus('saving');
    setSaveMessage('');

    const payload = {
      treeSpecies: selectedSpecies,
      plantationArea: Number(plantationArea) || 0,
      solarPanelType: selectedPanel,
      rooftopArea: Number(rooftopArea) || 0,
      wastePercent: Number(waste) || 0,
      co2Reduced: Number(co2Reduced) || 0,
      energySaved: Number(energySaved) || 0,
      treesPlanted: Number(totalTreesPlanted) || 0,
      wasteDiverted: Number(wasteDivertedDisplay) || 0,
      sustainabilityScore: Number(score) || 0
    };

    fetch(`${API_BASE}/api/simulate/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to save simulation configuration.');
        return res.json();
      })
      .then(() => {
        setSaveStatus('success');
        setSaveMessage('Simulation saved successfully!');
        fetchHistory(); // refresh log list
        setTimeout(() => {
          setSaveStatus(null);
          setSaveMessage('');
        }, 3000);
      })
      .catch((err) => {
        console.error('Error saving simulation:', err);
        setSaveStatus('error');
        setSaveMessage(err.message || 'Error saving configuration.');
      });
  };

  // Load simulation config function
  const handleLoadSimulation = (record) => {
    setPlantationArea(record.plantationArea);
    setRooftopArea(record.rooftopArea);
    setWaste(record.wastePercent);
    setSelectedSpecies(record.treeSpecies);
    setSelectedPanel(record.solarPanelType);

    setHasRun(true);
    setScore(record.sustainabilityScore);

    setTimeout(() => {
      const resultsEl = document.getElementById('results-state');
      if (resultsEl) {
        resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Delete simulation history entry
  const handleDeleteSimulation = (id, e) => {
    e.stopPropagation();
    if (!isAuthenticated || !token) return;

    fetch(`${API_BASE}/api/simulate/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete simulation history.');
        fetchHistory(); // refresh logs list
      })
      .catch((err) => console.error('Error deleting simulation:', err));
  };

  // Dynamic calculations for ALL tree species comparison (based on slider value)
  const compareTrees = speciesList.map(s => {
    const sSpacing = s.spacingRequirement || 3.0;
    const sTrees = Math.floor(plantationArea / (sSpacing * sSpacing));
    const sCost = sTrees * s.saplingCost;
    const sMaint = sTrees * s.annualMaintenanceCost;
    const sCO2 = (sTrees * s.co2Absorption) / 1000; // tons/year
    const sOffset20 = sCO2 * 20;
    const costPerTon = sOffset20 > 0 ? (sCost + sMaint * 20) / sOffset20 : 0; // Total 20y cost / 20y offset

    return {
      ...s,
      trees: sTrees,
      cost: sCost,
      maintenance: sMaint,
      annualCO2: sCO2,
      offset20: sOffset20,
      costPerTon: costPerTon
    };
  });

  // Find badges for trees
  const minTreeCost = compareTrees.length > 0 ? Math.min(...compareTrees.map(t => t.cost)) : 0;
  const maxTreeOffset = compareTrees.length > 0 ? Math.max(...compareTrees.map(t => t.offset20)) : 0;
  const bestValueTree = compareTrees.length > 0 ? Math.min(...compareTrees.filter(t => t.offset20 > 0).map(t => t.costPerTon)) : 0;

  // Dynamic calculations for ALL solar types comparison (based on slider value)
  const compareSolar = panelsList.map(p => {
    const pPanels = Math.floor(rooftopArea / p.areaRequired);
    const pCost = pPanels * p.averageMarketCost;
    const pGen = pPanels * (p.wattage / 1000) * 4.5 * 365; // kWh/year
    const pSavings = pGen * 7.0; // ₹7 tariff
    const pCO2 = (pGen * 0.727) / 1000; // tons/year
    const pROI = pSavings > 0 ? (pCost / pSavings) : 0;

    return {
      ...p,
      panels: pPanels,
      cost: pCost,
      generation: pGen, // kWh/year
      savings: pSavings,
      co2: pCO2,
      roi: pROI
    };
  });

  // Find badges for solar
  const minSolarCost = compareSolar.length > 0 ? Math.min(...compareSolar.map(s => s.cost)) : 0;
  const maxSolarGen = compareSolar.length > 0 ? Math.max(...compareSolar.map(s => s.generation)) : 0;
  const minSolarROI = compareSolar.length > 0 ? Math.min(...compareSolar.filter(s => s.roi > 0).map(s => s.roi)) : 0;

  // ----------------------------------------------------
  // SVG Chart: 20-Year Carbon Offsets Projection
  // ----------------------------------------------------
  const renderCarbonChart = () => {
    if (!simResults) return null;
    const pCO2 = simResults.plantation.estimated_co2_absorption_tons;
    const sCO2 = simResults.solar.co2_reduction_tons;
    const wCO2 = simResults.waste.estimated_co2_avoided_tons;
    const annualTotal = pCO2 + sCO2 + wCO2;

    const years = [0, 5, 10, 15, 20];
    const dataPoints = years.map(yr => ({
      year: yr,
      plantation: yr * pCO2,
      solar: yr * sCO2,
      waste: yr * wCO2,
      total: yr * annualTotal
    }));

    const maxVal = Math.max(dataPoints[4].total, 10);
    const chartWidth = 500;
    const chartHeight = 200;
    const padding = { left: 45, right: 15, top: 15, bottom: 25 };

    const getX = (yr) => padding.left + (yr / 20) * (chartWidth - padding.left - padding.right);
    const getY = (val) => padding.top + (chartHeight - padding.top - padding.bottom) * (1 - val / maxVal);

    // Build SVG Path
    let totalPath = `M ${getX(0)} ${getY(0)}`;
    let plantationPath = `M ${getX(0)} ${getY(0)}`;
    let solarPath = `M ${getX(0)} ${getY(0)}`;
    
    dataPoints.forEach(pt => {
      totalPath += ` L ${getX(pt.year)} ${getY(pt.total)}`;
      plantationPath += ` L ${getX(pt.year)} ${getY(pt.plantation)}`;
      solarPath += ` L ${getX(pt.year)} ${getY(pt.solar)}`;
    });

    // Filled area path for total
    const fillPath = `${totalPath} L ${getX(20)} ${getY(0)} L ${getX(0)} ${getY(0)} Z`;

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-on-surface">Cumulative CO₂ Offsets (Tons)</h4>
          <span className="text-xs text-on-surface-variant font-mono">20-Year Horizon</span>
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
          <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
              const yVal = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
              const label = (maxVal * (1 - ratio)).toFixed(0);
              return (
                <g key={idx}>
                  <line x1={padding.left} y1={yVal} x2={chartWidth - padding.right} y2={yVal} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                  <text x={padding.left - 8} y={yVal + 4} fill="var(--color-on-surface-variant)" fontSize="9" textAnchor="end" className="font-mono-data font-semibold">{label}</text>
                </g>
              );
            })}
            
            {/* X Axis Labels */}
            {years.map((yr, idx) => (
              <text key={idx} x={getX(yr)} y={chartHeight - 8} fill="var(--color-on-surface-variant)" fontSize="9" textAnchor="middle" className="font-mono-data font-semibold">Yr {yr}</text>
            ))}

            {/* Filled Area for Total */}
            <path d={fillPath} fill="url(#greenGrad)" opacity="0.15" />

            {/* lines */}
            <path d={totalPath} stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={solarPath} stroke="var(--color-secondary)" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
            <path d={plantationPath} stroke="var(--color-data-teal)" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />

            {/* Interactive Dots at year 20 */}
            <circle cx={getX(20)} cy={getY(dataPoints[4].total)} r="4.5" fill="var(--color-primary)" stroke="white" strokeWidth="1.5" />
            <circle cx={getX(20)} cy={getY(dataPoints[4].solar)} r="3.5" fill="var(--color-secondary)" stroke="white" stroke="1" />
            <circle cx={getX(20)} cy={getY(dataPoints[4].plantation)} r="3.5" fill="var(--color-data-teal)" stroke="white" strokeWidth="1" />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 justify-center text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 text-on-surface">
            <span className="w-3 h-0.5 bg-primary inline-block"></span>
            Total Cumulative Offset
          </div>
          <div className="flex items-center gap-1.5 text-secondary">
            <span className="w-3 h-0.5 border-t border-dashed border-secondary inline-block"></span>
            Solar Offset
          </div>
          <div className="flex items-center gap-1.5 text-data-teal">
            <span className="w-3 h-0.5 border-t border-dashed border-data-teal inline-block"></span>
            Tree Offset
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // SVG Chart: 15-Year Financial Cash Flow
  // ----------------------------------------------------
  const renderFinancialChart = () => {
    if (!simResults) return null;
    const initialInvestment = simResults.plantation.total_plantation_cost + simResults.solar.installation_cost;
    const annualSavings = simResults.solar.annual_savings - simResults.plantation.annual_maintenance_cost;

    const years = Array.from({ length: 16 }, (_, i) => i);
    const cashFlow = years.map(yr => {
      return -initialInvestment + yr * annualSavings;
    });

    const maxAbs = Math.max(...cashFlow.map(Math.abs), 50000);
    const chartWidth = 500;
    const chartHeight = 200;
    const padding = { left: 55, right: 15, top: 15, bottom: 25 };

    const getX = (yr) => padding.left + (yr / 15) * (chartWidth - padding.left - padding.right);
    const getY = (val) => padding.top + (chartHeight - padding.top - padding.bottom) * (0.5 - (val / (2 * maxAbs)));

    // payback point
    const paybackYear = annualSavings > 0 ? initialInvestment / annualSavings : 999;

    return (
      <div className="w-full">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-sm font-semibold text-on-surface">Net Cumulative Cash Flow (INR)</h4>
          <span className="text-xs text-on-surface-variant font-mono">15-Year Project Cycle</span>
        </div>
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
          <svg className="w-full h-auto overflow-visible" viewBox={`0 0 ${chartWidth} ${chartHeight}`} fill="none">
            {/* Gridlines */}
            {[-1, -0.5, 0, 0.5, 1].map((ratio, idx) => {
              const yVal = padding.top + (idx / 4) * (chartHeight - padding.top - padding.bottom);
              const label = (maxAbs * -ratio).toLocaleString('en-IN', { maximumFractionDigits: 0 });
              return (
                <g key={idx}>
                  <line x1={padding.left} y1={yVal} x2={chartWidth - padding.right} y2={yVal} stroke="var(--color-outline-variant)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                  <text x={padding.left - 8} y={yVal + 3} fill="var(--color-on-surface-variant)" fontSize="8.5" textAnchor="end" className="font-mono-data font-semibold">{label}</text>
                </g>
              );
            })}

            {/* Zero Axis Line */}
            <line x1={padding.left} y1={getY(0)} x2={chartWidth - padding.right} y2={getY(0)} stroke="var(--color-outline)" strokeWidth="1" opacity="0.6" />

            {/* Year Labels */}
            {[0, 3, 6, 9, 12, 15].map((yr, idx) => (
              <text key={idx} x={getX(yr)} y={chartHeight - 8} fill="var(--color-on-surface-variant)" fontSize="9" textAnchor="middle" className="font-mono-data font-semibold">Yr {yr}</text>
            ))}

            {/* Cash Flow Bars */}
            {years.map((yr) => {
              const val = cashFlow[yr];
              const xPos = getX(yr) - 6;
              const yZero = getY(0);
              const yPos = getY(val);
              
              const barHeight = Math.abs(yZero - yPos);
              const barY = val >= 0 ? yPos : yZero;
              const color = val >= 0 ? "#16A34A" : "#DC2626";

              return (
                <rect
                  key={yr}
                  x={xPos}
                  y={barY}
                  width="12"
                  height={Math.max(barHeight, 1.5)}
                  fill={color}
                  rx="2"
                  opacity="0.8"
                  className="transition-all duration-300 hover:opacity-100 cursor-pointer"
                >
                  <title>Year {yr}: ₹{val.toLocaleString('en-IN')}</title>
                </rect>
              );
            })}

            {/* Break-even Indicator */}
            {paybackYear > 0 && paybackYear <= 15 && (
              <g>
                <line x1={getX(paybackYear)} y1={padding.top} x2={getX(paybackYear)} y2={chartHeight - padding.bottom} stroke="var(--color-tertiary)" strokeWidth="1" strokeDasharray="2 2" />
                <rect x={getX(paybackYear) - 40} y={padding.top} width="80" height="14" fill="var(--color-tertiary-container)" rx="4" />
                <text x={getX(paybackYear)} y={padding.top + 10} fill="var(--color-on-tertiary-container)" fontSize="7.5" fontWeight="bold" textAnchor="middle">Break-even: {paybackYear.toFixed(1)}y</text>
              </g>
            )}
          </svg>
        </div>
        <div className="flex gap-4 mt-3 justify-center text-[11px] font-semibold">
          <div className="flex items-center gap-1.5 text-impact-positive">
            <span className="w-3 h-3 bg-impact-positive inline-block rounded-sm"></span>
            Positive Balance (Profit)
          </div>
          <div className="flex items-center gap-1.5 text-impact-negative">
            <span className="w-3 h-3 bg-impact-negative inline-block rounded-sm"></span>
            Unrecovered Initial Investment
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="max-w-[1280px] mx-auto px-6 md:px-16 py-12 flex flex-col md:flex-row gap-8">
      {/* Left Panel: Configure Simulation */}
      <aside className="w-full md:w-[40%] flex flex-col gap-6 sticky top-28 self-start z-10">
        <div className="pl-4 border-l-4 border-primary">
          <h1 className="font-section-h2 text-section-h2 text-on-surface">EcoVerse Sim</h1>
          <p className="text-on-surface-variant mt-2 font-body-main">Real-time modular parameters for sustainable decision-making.</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Card 1: Plantation Area & Species */}
          <div className="bg-surface p-6 rounded-xl shadow-soft border border-surface-container flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined active-icon text-xl">forest</span>
                </div>
                <span className="font-card-h3 text-card-h3 font-bold text-on-surface">Plantation Area</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="numeric-input text-primary text-sm font-bold"
                  value={plantationArea}
                  step="50"
                  onChange={(e) => setPlantationArea(Number(e.target.value) || 0)}
                />
                <span className="font-mono-data text-mono-data text-primary font-bold">m²</span>
              </div>
            </div>

            {/* Tree Species Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Tree Species Selection</label>
              <select
                value={selectedSpecies}
                onChange={(e) => setSelectedSpecies(e.target.value)}
                className="w-full p-2.5 bg-surface-container rounded-lg border border-outline-variant/30 text-sm font-semibold text-on-surface focus:outline-none focus:border-primary transition"
              >
                {speciesList.length > 0 ? (
                  speciesList.map((s) => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name} (CO₂: {s.co2Absorption} kg/yr per tree)
                    </option>
                  ))
                ) : (
                  <option value="Neem">Neem</option>
                )}
              </select>
            </div>

            <input
              className="custom-slider mt-2"
              max="10000"
              min="0"
              step="100"
              type="range"
              value={plantationArea}
              onChange={(e) => setPlantationArea(parseInt(e.target.value))}
            />

            {/* Live Species Estimations */}
            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-1 text-xs border border-outline-variant/10 mt-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Max Trees:</span>
                <span className="font-bold text-primary">{liveEstTrees} saplings</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Annual CO₂ Sink:</span>
                <span className="font-bold text-primary">{liveEstCO2} Tons/Year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Spacing Required:</span>
                <span className="font-bold text-primary">{spacing}m × {spacing}m</span>
              </div>
            </div>
          </div>

          {/* Card 2: Rooftop Area & Solar Panels */}
          <div className="bg-surface p-6 rounded-xl shadow-soft border border-surface-container flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined active-icon text-xl">solar_power</span>
                </div>
                <span className="font-card-h3 text-card-h3 font-bold text-on-surface">Rooftop Solar</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="numeric-input text-secondary text-sm font-bold"
                  value={rooftopArea}
                  step="20"
                  onChange={(e) => setRooftopArea(Number(e.target.value) || 0)}
                />
                <span className="font-mono-data text-mono-data text-secondary font-bold">m²</span>
              </div>
            </div>

            {/* Solar Panel Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Panel Technology</label>
              <select
                value={selectedPanel}
                onChange={(e) => setSelectedPanel(e.target.value)}
                className="w-full p-2.5 bg-surface-container rounded-lg border border-outline-variant/30 text-sm font-semibold text-on-surface focus:outline-none focus:border-secondary transition"
              >
                {panelsList.length > 0 ? (
                  panelsList.map((p) => (
                    <option key={p.id || p.name} value={p.name}>
                      {p.name} ({p.wattage}W · {Math.round(p.efficiency * 100)}% Eff)
                    </option>
                  ))
                ) : (
                  <option value="Monocrystalline">Monocrystalline</option>
                )}
              </select>
            </div>

            <input
              className="custom-slider mt-2"
              max="2000"
              min="0"
              step="50"
              type="range"
              value={rooftopArea}
              onChange={(e) => setRooftopArea(parseInt(e.target.value))}
            />

            {/* Live Solar Estimations */}
            <div className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-1 text-xs border border-outline-variant/10 mt-1">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Panels Required:</span>
                <span className="font-bold text-secondary">{liveEstPanels} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Annual clean energy:</span>
                <span className="font-bold text-secondary">{liveEstEnergy.toLocaleString()} kWh/Year</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Average Cost:</span>
                <span className="font-bold text-secondary">₹{activePanelObj.averageMarketCost.toLocaleString('en-IN')}/panel</span>
              </div>
            </div>
          </div>

          {/* Card 3: Waste Diversion */}
          <div className="bg-surface p-6 rounded-xl shadow-soft border border-surface-container flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined active-icon text-xl">delete_sweep</span>
                </div>
                <span className="font-card-h3 text-card-h3 font-bold text-on-surface">Waste Diversion</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="numeric-input text-tertiary text-sm font-bold"
                  value={waste}
                  step="5"
                  onChange={(e) => setWaste(Number(e.target.value) || 0)}
                />
                <span className="font-mono-data text-mono-data text-tertiary font-bold">%</span>
              </div>
            </div>
            <input
              className="custom-slider mt-2"
              max="100"
              min="0"
              type="range"
              value={waste}
              onChange={(e) => setWaste(parseInt(e.target.value))}
            />
            <p className="text-label-caps font-label-caps text-on-surface-variant mt-2 uppercase tracking-wider text-xs">
              Diversion Impact: <span className="text-tertiary font-bold">{wasteImpactEst}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isLoading}
          className="w-full py-4.5 bg-primary text-on-primary rounded-xl font-bold text-card-h3 flex items-center justify-center gap-3 pulse-hover transition-all duration-300 shadow-md cursor-pointer disabled:opacity-85 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
              Computing Grid Impact...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">insights</span>
              Run Simulation
            </>
          )}
        </button>
      </aside>

      {/* Right Panel: Results View */}
      <section className="w-full md:w-[60%] min-h-[700px] flex flex-col gap-6 z-0">
        {!hasRun && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30">
            <div className="relative w-40 h-40 mb-6">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse"></div>
              <div className="absolute inset-4 bg-primary/10 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary/40 text-6xl">query_stats</span>
              </div>
            </div>
            <h2 className="font-card-h3 text-card-h3 text-on-surface mb-2 font-bold">Awaiting Parameters</h2>
            <p className="text-on-surface-variant max-w-sm mx-auto font-body-main text-sm">
              Adjust sliders on the left, choose specific species and technologies, then run the simulation to see visual, decision-oriented projections.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-surface-container-low rounded-3xl border border-outline-variant/30">
            <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            </div>
            <h2 className="font-card-h3 text-card-h3 text-on-surface mb-2 font-bold">Simulating Impact Matrix</h2>
            <p className="text-on-surface-variant max-w-sm mx-auto font-body-main text-sm">
              Processing data points, computing solar capacity, species-wise CO₂ rates, and financial ROI timelines...
            </p>
          </div>
        )}

        {hasRun && !isLoading && (
          <div className="flex flex-col gap-8 fade-in-up" id="results-state">
            
            {/* Top 4 Metrics Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: CO2 Reduced */}
              <div className="bg-surface p-5 rounded-2xl shadow-soft relative overflow-hidden group border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-bl-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-10 h-10 rounded-lg bg-primary-fixed flex items-center justify-center text-primary mb-3">
                  <span className="material-symbols-outlined text-lg font-bold">co2</span>
                </div>
                <div className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">CO₂ Offset</div>
                <div className="text-card-h3 font-bold text-on-surface text-xl">
                  {co2Reduced} <span className="text-[12px] font-normal text-on-surface-variant">Tons/Yr</span>
                </div>
              </div>

              {/* Metric 2: Energy Generated */}
              <div className="bg-surface p-5 rounded-2xl shadow-soft relative overflow-hidden group border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 rounded-bl-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-10 h-10 rounded-lg bg-secondary-fixed flex items-center justify-center text-secondary mb-3">
                  <span className="material-symbols-outlined text-lg font-bold">bolt</span>
                </div>
                <div className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Solar Gen</div>
                <div className="text-card-h3 font-bold text-on-surface text-xl">
                  {energySaved} <span className="text-[12px] font-normal text-on-surface-variant">kWh/Yr</span>
                </div>
              </div>

              {/* Metric 3: Trees Planted */}
              <div className="bg-surface p-5 rounded-2xl shadow-soft relative overflow-hidden group border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-data-teal/5 rounded-bl-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-10 h-10 rounded-lg bg-primary-fixed-dim flex items-center justify-center text-on-primary-fixed-variant mb-3">
                  <span className="material-symbols-outlined text-lg font-bold">nature</span>
                </div>
                <div className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Trees Planted</div>
                <div className="text-card-h3 font-bold text-on-surface text-xl">
                  {totalTreesPlanted} <span className="text-[12px] font-normal text-on-surface-variant">trees</span>
                </div>
              </div>

              {/* Metric 4: Waste Diverted */}
              <div className="bg-surface p-5 rounded-2xl shadow-soft relative overflow-hidden group border border-outline-variant/10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-impact-warning/5 rounded-bl-full group-hover:scale-110 transition-transform duration-500"></div>
                <div className="w-10 h-10 rounded-lg bg-tertiary-fixed flex items-center justify-center text-tertiary mb-3">
                  <span className="material-symbols-outlined text-lg font-bold">delete_sweep</span>
                </div>
                <div className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mb-1">Diverted</div>
                <div className="text-card-h3 font-bold text-on-surface text-xl">
                  {wasteDivertedDisplay} <span className="text-[12px] font-normal text-on-surface-variant">Tons/Yr</span>
                </div>
              </div>
            </div>

            {/* Sustainability Score Gauge & Status */}
            <div className="bg-surface p-6 rounded-3xl shadow-soft border border-surface-container flex flex-col sm:flex-row items-center gap-8">
              <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                <svg className="w-full h-full -rotate-90">
                  <circle className="text-surface-container" cx="80" cy="80" fill="transparent" r="70" stroke="currentColor" strokeWidth="10"></circle>
                  <circle
                    className="text-primary transition-all duration-1000 ease-out"
                    cx="80"
                    cy="80"
                    fill="transparent"
                    r="70"
                    stroke="currentColor"
                    strokeDasharray="439.82"
                    strokeDashoffset={439.82 - (439.82 * score) / 100}
                    strokeWidth="10"
                  ></circle>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold text-on-surface">{score}</span>
                  <span className="text-[10px] text-primary uppercase font-bold tracking-wider">Score</span>
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full mb-3">
                  <span className="material-symbols-outlined text-sm font-bold">verified</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Status: {getStatusText()}</span>
                </div>
                <h3 className="text-lg font-bold mb-2 text-on-surface">Integrated Eco-Grid Rating</h3>
                <p className="text-on-surface-variant text-sm font-body-main mb-3 leading-relaxed">
                  Your combination of <span className="font-semibold text-primary">{selectedSpecies}</span> trees and <span className="font-semibold text-secondary">{selectedPanel}</span> solar panels offsets approximately <span className="font-bold text-on-surface">{(Number(co2Reduced) - Number(wasteDivertedDisplay)).toFixed(1)} tons</span> of carbon annually (excluding waste diversion) and yields a payback cycle of <span className="font-bold text-on-surface">{simResults ? simResults.solar.roi_years : '...'} years</span> on solar installation.
                </p>
                <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-1 bg-surface-container rounded-md text-[10px] font-bold text-on-surface">#SustainableCampus</span>
                  <span className="px-2.5 py-1 bg-surface-container rounded-md text-[10px] font-bold text-on-surface">#NetZeroOffsets</span>
                </div>

                {/* Save Simulation Configuration to DB */}
                {isAuthenticated ? (
                  <div className="mt-4 flex flex-col gap-2 self-start">
                    <button
                      onClick={handleSaveSimulation}
                      disabled={saveStatus === 'saving'}
                      className="w-full sm:w-auto px-5 py-2.5 bg-secondary text-on-secondary rounded-lg font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition hover:bg-secondary/90 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">save</span>
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Configuration to History'}
                    </button>
                    {saveMessage && (
                      <p className={`text-xs font-semibold mt-1 ${saveStatus === 'success' ? 'text-impact-positive' : 'text-impact-negative'}`}>
                        {saveMessage}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 text-xs text-on-surface-variant bg-surface-container/50 p-3 rounded-lg border border-outline-variant/10">
                    <span className="font-semibold text-primary">Tip:</span> Log in to save your simulation configurations and view history.
                  </div>
                )}
              </div>
            </div>

            {/* Detailed Simulation Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plantation Details */}
              <div className="bg-surface p-6 rounded-2xl shadow-soft border border-surface-container">
                <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/10 pb-2">
                  <span className="material-symbols-outlined text-primary font-bold">forest</span>
                  <h3 className="text-base font-bold text-on-surface">Plantation Metrics</h3>
                </div>
                {simResults && (
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Selected Species:</span>
                      <span className="font-semibold text-on-surface">{selectedSpecies}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Sapling Spacing:</span>
                      <span className="font-semibold text-on-surface">{simResults.plantation.spacing_requirement}m × {simResults.plantation.spacing_requirement}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Maximum Trees:</span>
                      <span className="font-bold text-primary">{simResults.plantation.estimated_trees} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Total Sapling Cost:</span>
                      <span className="font-semibold text-on-surface">₹{simResults.plantation.total_plantation_cost.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Annual Maintenance:</span>
                      <span className="font-semibold text-on-surface">₹{simResults.plantation.annual_maintenance_cost.toLocaleString('en-IN')}/year</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-dashed border-outline-variant/10">
                      <span className="text-on-surface-variant">Annual CO₂ Offset:</span>
                      <span className="font-bold text-primary">{simResults.plantation.estimated_co2_absorption_tons.toFixed(1)} Tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">10-Year Cumulative Offset:</span>
                      <span className="font-bold text-primary">{simResults.plantation.co2_absorption_10y_tons.toFixed(1)} Tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">20-Year Cumulative Offset:</span>
                      <span className="font-bold text-primary">{simResults.plantation.co2_absorption_20y_tons.toFixed(1)} Tons</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Solar Details */}
              <div className="bg-surface p-6 rounded-2xl shadow-soft border border-surface-container">
                <div className="flex items-center gap-2 mb-4 border-b border-outline-variant/10 pb-2">
                  <span className="material-symbols-outlined text-secondary font-bold">solar_power</span>
                  <h3 className="text-base font-bold text-on-surface">Solar Grid Metrics</h3>
                </div>
                {simResults && (
                  <div className="flex flex-col gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Technology:</span>
                      <span className="font-semibold text-on-surface">{selectedPanel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Panel Wattage:</span>
                      <span className="font-semibold text-on-surface">{activePanelObj.wattage} Watts</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Panel Efficiency:</span>
                      <span className="font-semibold text-on-surface">{Math.round(activePanelObj.efficiency * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Panels Installed:</span>
                      <span className="font-bold text-secondary">{simResults.solar.estimated_panels} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Total Installation Cost:</span>
                      <span className="font-semibold text-on-surface">₹{simResults.solar.installation_cost.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Annual Electricity Gen:</span>
                      <span className="font-semibold text-on-surface">{Math.round(simResults.solar.estimated_energy_output_kwh).toLocaleString()} kWh</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-dashed border-outline-variant/10">
                      <span className="text-on-surface-variant">Annual Financial Savings:</span>
                      <span className="font-bold text-impact-positive">₹{simResults.solar.annual_savings.toLocaleString('en-IN')}/year</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Annual CO₂ Avoided:</span>
                      <span className="font-bold text-secondary">{simResults.solar.co2_reduction_tons.toFixed(1)} Tons</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant font-bold">ROI Payback Period:</span>
                      <span className="font-bold text-tertiary-container px-2 py-0.5 rounded bg-tertiary-container/10">{simResults.solar.roi_years} Years</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Visual Projections Section (SVG Charts) */}
            <div className="bg-surface p-6 rounded-2xl shadow-soft border border-surface-container flex flex-col gap-4">
              <div className="flex justify-between items-center border-b border-outline-variant/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary font-bold">analytics</span>
                  <h3 className="text-base font-bold text-on-surface">Visual Forecasts</h3>
                </div>
                <div className="flex p-0.5 bg-surface-container rounded-lg">
                  <button
                    onClick={() => setChartTab('carbon')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${chartTab === 'carbon' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Carbon Offset
                  </button>
                  <button
                    onClick={() => setChartTab('financial')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition ${chartTab === 'financial' ? 'bg-surface text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Cash Flow
                  </button>
                </div>
              </div>

              {chartTab === 'carbon' ? renderCarbonChart() : renderFinancialChart()}
            </div>

            {/* Comparison Feature Section */}
            <div className="bg-surface p-6 rounded-2xl shadow-soft border border-surface-container flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-outline-variant/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary font-bold">compare_arrows</span>
                  <h3 className="text-base font-bold text-on-surface">Decision Matrix Comparison</h3>
                </div>
                <div className="flex p-0.5 bg-surface-container rounded-lg self-start">
                  <button
                    onClick={() => setComparisonTab('trees')}
                    className={`px-3.5 py-1 text-xs font-bold rounded-md transition ${comparisonTab === 'trees' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Tree Species
                  </button>
                  <button
                    onClick={() => setComparisonTab('solar')}
                    className={`px-3.5 py-1 text-xs font-bold rounded-md transition ${comparisonTab === 'solar' ? 'bg-surface text-secondary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Solar Technology
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                {comparisonTab === 'trees' ? (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-on-surface-variant uppercase tracking-wider font-bold">
                        <th className="py-2.5 pr-2">Species</th>
                        <th className="py-2.5 px-2">Spacing</th>
                        <th className="py-2.5 px-2">Max Trees</th>
                        <th className="py-2.5 px-2">Sapling Cost</th>
                        <th className="py-2.5 px-2">Total Cost</th>
                        <th className="py-2.5 px-2">Maint./Yr</th>
                        <th className="py-2.5 px-2">CO₂/Yr/Tree</th>
                        <th className="py-2.5 px-2">20-Yr Offset</th>
                        <th className="py-2.5 pl-2 text-right">Value Metric</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-on-surface font-medium">
                      {compareTrees.map(t => {
                        const isCurrent = t.name === selectedSpecies;
                        return (
                          <tr key={t.id || t.name} className={`hover:bg-surface-container-low transition ${isCurrent ? 'bg-primary/5 font-semibold text-primary' : ''}`}>
                            <td className="py-3 pr-2 font-bold flex items-center gap-1.5">
                              {t.name}
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>}
                            </td>
                            <td className="py-3 px-2">{t.spacingRequirement}m</td>
                            <td className="py-3 px-2">{t.trees}</td>
                            <td className="py-3 px-2">₹{t.saplingCost}</td>
                            <td className="py-3 px-2">₹{t.cost.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-2">₹{t.maintenance.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-2 font-mono text-[11px]">{t.co2Absorption} kg</td>
                            <td className="py-3 px-2 text-primary font-bold">{t.offset20.toFixed(1)} T</td>
                            <td className="py-3 pl-2 text-right font-mono text-[11px]">
                              {t.offset20 > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-on-surface-variant">₹{(t.costPerTon).toFixed(0)}/Ton</span>
                                  {t.cost === minTreeCost && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-sans uppercase font-bold mt-0.5">Budget</span>}
                                  {t.offset20 === maxTreeOffset && <span className="text-[9px] bg-data-teal/10 text-data-teal px-1 rounded font-sans uppercase font-bold mt-0.5">Max Carbon</span>}
                                  {t.costPerTon === bestValueTree && <span className="text-[9px] bg-impact-positive/10 text-impact-positive px-1 rounded font-sans uppercase font-bold mt-0.5">Best ROI</span>}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/20 text-on-surface-variant uppercase tracking-wider font-bold">
                        <th className="py-2.5 pr-2">Technology</th>
                        <th className="py-2.5 px-2">Wattage</th>
                        <th className="py-2.5 px-2">Efficiency</th>
                        <th className="py-2.5 px-2">Area Req.</th>
                        <th className="py-2.5 px-2">Total Panels</th>
                        <th className="py-2.5 px-2">Install Cost</th>
                        <th className="py-2.5 px-2">Generation</th>
                        <th className="py-2.5 px-2">CO₂ Red./Yr</th>
                        <th className="py-2.5 pl-2 text-right">Payback (ROI)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10 text-on-surface font-medium">
                      {compareSolar.map(s => {
                        const isCurrent = s.name === selectedPanel;
                        return (
                          <tr key={s.id || s.name} className={`hover:bg-surface-container-low transition ${isCurrent ? 'bg-secondary/5 font-semibold text-secondary' : ''}`}>
                            <td className="py-3 pr-2 font-bold flex items-center gap-1.5">
                              {s.name}
                              {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block"></span>}
                            </td>
                            <td className="py-3 px-2">{s.wattage}W</td>
                            <td className="py-3 px-2">{Math.round(s.efficiency * 100)}%</td>
                            <td className="py-3 px-2">{s.areaRequired} m²</td>
                            <td className="py-3 px-2">{s.panels}</td>
                            <td className="py-3 px-2">₹{s.cost.toLocaleString('en-IN')}</td>
                            <td className="py-3 px-2 font-mono text-[11px]">{Math.round(s.generation).toLocaleString()} kWh/yr</td>
                            <td className="py-3 px-2 text-secondary font-bold">{s.co2.toFixed(1)} T/yr</td>
                            <td className="py-3 pl-2 text-right font-mono text-[11px]">
                              {s.roi > 0 ? (
                                <div className="flex flex-col items-end">
                                  <span className="text-on-surface font-bold">{s.roi.toFixed(1)} Yrs</span>
                                  {s.cost === minSolarCost && <span className="text-[9px] bg-primary/10 text-primary px-1 rounded font-sans uppercase font-bold mt-0.5">Budget</span>}
                                  {s.generation === maxSolarGen && <span className="text-[9px] bg-secondary/10 text-secondary px-1 rounded font-sans uppercase font-bold mt-0.5">Max Output</span>}
                                  {s.roi === minSolarROI && <span className="text-[9px] bg-impact-positive/10 text-impact-positive px-1 rounded font-sans uppercase font-bold mt-0.5">Fastest ROI</span>}
                                </div>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Simulation History Log Section */}
        <div className="bg-surface p-6 rounded-2xl shadow-soft border border-surface-container flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-outline-variant/10 pb-3">
            <span className="material-symbols-outlined text-primary font-bold">history</span>
            <h3 className="text-base font-bold text-on-surface">Simulation History Log</h3>
          </div>

          {!isAuthenticated ? (
            <div className="text-center py-6 text-on-surface-variant font-body-main text-sm bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">lock</span>
              <p className="font-semibold">Log in to save simulations and view historical runs.</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="text-center py-6 text-on-surface-variant font-body-main text-sm bg-surface-container-low rounded-xl border border-dashed border-outline-variant/30">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">folder_open</span>
              <p className="font-semibold">No saved simulations found.</p>
              <p className="text-xs text-on-surface-variant mt-1">Adjust parameters and click "Save Configuration to History" above to save your first run.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20 text-on-surface-variant uppercase tracking-wider font-bold">
                    <th className="py-2.5 pr-2">Saved Date</th>
                    <th className="py-2.5 px-2">Tree Configuration</th>
                    <th className="py-2.5 px-2">Solar Grid</th>
                    <th className="py-2.5 px-2 text-center">Waste %</th>
                    <th className="py-2.5 px-2 text-center">Eco Score</th>
                    <th className="py-2.5 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-on-surface font-medium">
                  {historyList.map((item) => {
                    const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    });
                    return (
                      <tr key={item.id} className="hover:bg-surface-container-low transition">
                        <td className="py-3 pr-2 text-on-surface-variant font-semibold">{dateStr}</td>
                        <td className="py-3 px-2">
                          <span className="font-bold">{item.treeSpecies}</span> ({item.plantationArea} m² · {item.treesPlanted} trees)
                        </td>
                        <td className="py-3 px-2">
                          <span className="font-bold">{item.solarPanelType}</span> ({item.rooftopArea} m²)
                        </td>
                        <td className="py-3 px-2 text-center">{item.wastePercent}%</td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded-full">{item.sustainabilityScore}</span>
                        </td>
                        <td className="py-3 pl-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleLoadSimulation(item)}
                              className="text-primary hover:bg-primary/10 p-1 rounded transition flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                              title="Load this simulation parameters onto the dashboard"
                            >
                              <span className="material-symbols-outlined text-[16px] font-bold">sync_saved_locally</span>
                              LOAD
                            </button>
                            <button
                              onClick={(e) => handleDeleteSimulation(item.id, e)}
                              className="text-impact-negative hover:bg-impact-negative/10 p-1 rounded transition flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                              title="Delete this history entry"
                            >
                              <span className="material-symbols-outlined text-[16px] font-bold">delete</span>
                              DELETE
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Simulate;