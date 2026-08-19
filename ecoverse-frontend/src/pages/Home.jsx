import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '';

function Home() {
  const navigate = useNavigate();
  const [trees, setTrees] = useState(0);
  const [campuses, setCampuses] = useState(0);
  const [co2, setCo2] = useState(0);

  // Spawning Floating Leaf Particles
  useEffect(() => {
    const container = document.getElementById('particle-container');
    if (!container) return;

    const createParticle = () => {
      const particle = document.createElement('span');
      particle.className = 'material-symbols-outlined leaf-particle';
      particle.innerText = 'eco';

      const size = Math.random() * 20 + 10;
      const left = Math.random() * 100;
      const duration = Math.random() * 10 + 10;
      const delay = Math.random() * 5;

      particle.style.fontSize = `${size}px`;
      particle.style.left = `${left}%`;
      particle.style.animation = `float ${duration}s linear ${delay}s infinite`;

      container.appendChild(particle);

      // Cleanup
      setTimeout(() => {
        particle.remove();
      }, (duration + delay) * 1000);
    };

    // Initialize particles
    for (let i = 0; i < 20; i++) {
      setTimeout(createParticle, i * 400);
    }

    const interval = setInterval(createParticle, 3000);

    return () => {
      clearInterval(interval);
      if (container) container.innerHTML = '';
    };
  }, []);

  // Fetching dynamic stats with a counting animation
  useEffect(() => {
    let active = true;

    fetch(`${API_BASE}/api/recommendations`)
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        const treesTarget = data.summary?.totalTrees || 10000;
        const campusesTarget = 500;
        const co2Target = Math.round((data.summary?.totalCO2AbsorptionTons || 0) * 1000 + (data.summary?.co2AvoidedTons || 0) * 1000) || 1000000;
        animate(treesTarget, campusesTarget, co2Target);
      })
      .catch(() => {
        if (!active) return;
        animate(10000, 500, 1000000); // Fallbacks
      });

    const animate = (treesTarget, campusesTarget, co2Target) => {
      let tCurrent = 0;
      let cCurrent = 0;
      let coCurrent = 0;
      const duration = 1200; // ms
      const steps = 50;
      const intervalTime = duration / steps;
      let stepCount = 0;

      const timer = setInterval(() => {
        stepCount++;
        tCurrent += treesTarget / steps;
        cCurrent += campusesTarget / steps;
        coCurrent += co2Target / steps;

        if (stepCount >= steps) {
          setTrees(treesTarget);
          setCampuses(campusesTarget);
          setCo2(co2Target);
          clearInterval(timer);
        } else {
          setTrees(Math.floor(tCurrent));
          setCampuses(Math.floor(cCurrent));
          setCo2(Math.floor(coCurrent));
        }
      }, intervalTime);
    };

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="relative overflow-x-hidden w-full">
      {/* Hero Section */}
      <header className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden">
        {/* Floating Particles Container */}
        <div className="absolute inset-0 z-0 pointer-events-none" id="particle-container"></div>
        
        <div className="max-w-max-width mx-auto px-margin-desktop w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 py-12 lg:py-0">
          <div className="space-y-8">
            <h1 className="font-hero-h1 text-hero-h1 text-primary max-w-2xl leading-tight">
              Simulate Environmental Change Before Making Real Decisions
            </h1>
            <p className="font-body-main text-body-main text-on-surface-variant text-xl max-w-lg">
              EcoVerse helps institutions visualize the impact of eco-friendly actions — before implementing them in the real world.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => navigate('/simulate')}
                className="bg-primary text-on-primary px-8 py-4 rounded-xl font-label-caps text-label-caps hover:translate-y-[-2px] hover:brightness-110 transition-all duration-300 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                Start Simulation
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>play_arrow</span>
              </button>
              <button 
                onClick={() => {
                  const element = document.getElementById('how-it-works');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border-2 border-primary text-primary px-8 py-4 rounded-xl font-label-caps text-label-caps hover:bg-primary/5 hover:translate-y-[-2px] transition-all duration-300 cursor-pointer"
              >
                See How It Works
              </button>
            </div>
          </div>
          
          <div className="relative flex justify-center items-center">
            <div className="w-full aspect-square max-w-lg glass-panel rounded-3xl overflow-hidden shadow-soft flex items-center justify-center border border-white/50 group">
              <img 
                alt="Sustainable Campus Digital Twin" 
                className="w-full h-full object-cover rounded-3xl transition-transform duration-700 group-hover:scale-110" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLyen-Np3jWio4-xYFKY4I1O-wxWehaHZdE7Otl6xe_g-sMK9GdnjZ0-T2LJNnRiFN1IIG_JDt1vQ-iahgwEdvGpncZcMuyd3s9tIu1cm6souOUVA3-rFZb8E5EVLpntCau-3ZssljNbSZtj-XWditk1_XeSqZ1djUWuxxS85CJenwBmVGnPQDZ-DVntH2jU-0zdBl1Z6kWkSYTOOzgXwFrYCpNG681TlfJx4DyGacaTqsKlb2G6EYhKRzjn3KTaUMw5yVJH1-rDc"
              />
            </div>
            {/* Technical Accent Decoration */}
            <div className="absolute -bottom-6 -right-6 font-mono-data text-mono-data text-primary/45 bg-surface px-4 py-2 rounded shadow-sm border border-outline-variant">
              SIM_V4.2 // ECO_GRID_ACTIVE
            </div>
          </div>
        </div>
      </header>

      {/* Impact Stats Strip */}
      <section className="bg-surface border-y border-outline-variant/30 py-12 relative z-20">
        <div className="max-w-max-width mx-auto px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center group">
            <div className="font-hero-h1 text-hero-h1 text-primary-container tabular-nums">
              {trees.toLocaleString()}+
            </div>
            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mt-2 group-hover:text-primary transition-colors">
              Trees Simulated
            </div>
          </div>
          <div className="text-center group">
            <div className="font-hero-h1 text-hero-h1 text-primary-container tabular-nums">
              {campuses.toLocaleString()}+
            </div>
            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mt-2 group-hover:text-primary transition-colors">
              Active Campuses
            </div>
          </div>
          <div className="text-center group">
            <div className="font-hero-h1 text-hero-h1 text-primary-container tabular-nums">
              {co2.toLocaleString()}+
            </div>
            <div className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest mt-2 group-hover:text-primary transition-colors">
              Kg CO₂ Tracked
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-surface-container-low">
        <div className="max-w-max-width mx-auto px-margin-desktop">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-section-h2 text-section-h2 text-on-surface">Streamlined Path to Sustainability</h2>
            <div className="w-16 h-1 bg-primary mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {/* Step 1 */}
            <div className="bg-surface p-8 rounded-xl shadow-soft hover:-translate-y-2 transition-all duration-300 group border border-transparent hover:border-primary/10">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-primary-container/10 p-4 rounded-xl text-primary-container">
                  <span className="material-symbols-outlined text-3xl">tune</span>
                </div>
                <span className="text-4xl font-bold text-impact-positive/20 font-hero-h1">01</span>
              </div>
              <h3 className="font-card-h3 text-card-h3 text-on-surface mb-3">Enter Your Actions</h3>
              <p className="text-on-surface-variant text-body-main">
                Input specific ecological measures like tree planting, solar retrofits, or waste reduction targets into our high-fidelity interface.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-surface p-8 rounded-xl shadow-soft hover:-translate-y-2 transition-all duration-300 group border border-transparent hover:border-primary/10">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-primary-container/10 p-4 rounded-xl text-primary-container">
                  <span className="material-symbols-outlined text-3xl">play_circle</span>
                </div>
                <span className="text-4xl font-bold text-impact-positive/20 font-hero-h1">02</span>
              </div>
              <h3 className="font-card-h3 text-card-h3 text-on-surface mb-3">Run Simulation</h3>
              <p className="text-on-surface-variant text-body-main">
                Our advanced environmental engine processes your data against real-world ecological models to forecast long-term outcomes.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-surface p-8 rounded-xl shadow-soft hover:-translate-y-2 transition-all duration-300 group border border-transparent hover:border-primary/10">
              <div className="flex justify-between items-start mb-6">
                <div className="bg-primary-container/10 p-4 rounded-xl text-primary-container">
                  <span className="material-symbols-outlined text-3xl">bar_chart</span>
                </div>
                <span className="text-4xl font-bold text-impact-positive/20 font-hero-h1">03</span>
              </div>
              <h3 className="font-card-h3 text-card-h3 text-on-surface mb-3">View Your Impact</h3>
              <p className="text-on-surface-variant text-body-main">
                Visualize detailed projections of carbon sequestration, energy savings, and biodiversity gains in interactive dashboards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-surface">
        <div className="max-w-max-width mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div>
              <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest block mb-4">Powerful Toolset</span>
              <h2 className="font-section-h2 text-section-h2 text-on-surface mb-8">Professional Grade Environmental Analysis</h2>
              
              <div className="relative rounded-2xl overflow-hidden h-[400px] shadow-lg group">
                <img 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  alt="A lush green forest seen from a bird's-eye view with high-tech digital overlays." 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuANjqOuh45zwpr3PFsXlb69ph1zXoeHGV0IJw77uMaSq9sBWtD7Okq-5V7gIHMtW6yHqun0DCMUWZqi0fp-Veb52PYCEpwmEBl9MNodBg3jIVRCRPL8bao8ngUHaH5_XqgmWcQt4bKCpvW5Tlz0DWHWySlT129jw6MmWUxXFZa_bA6KSwO1R4fN2WBc2VY1qo525VmkY2Vy-1xmCoWowytFVSsbjPz2CY9BnYahZhVSq3d99m65OkUWNr7wRExi74JjAYJax_t0ko0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                <div className="absolute bottom-8 left-8 text-on-primary">
                  <p className="font-mono-data text-mono-data mb-2">LAT: 34.0522 N // LONG: 118.2437 W</p>
                  <p className="font-card-h3 text-card-h3">Real-time Biometric Monitoring</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
              {/* Feature 1 */}
              <div className="p-6 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low transition-colors group">
                <span className="material-symbols-outlined text-primary mb-4 block" style={{ fontSize: '32px' }}>co2</span>
                <h3 className="font-card-h3 text-card-h3 text-on-surface mb-2">Carbon Analysis</h3>
                <p className="text-on-surface-variant text-body-main text-sm">
                  Dynamic footprint modeling with granular decomposition of emissions sources.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-6 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low transition-colors group">
                <span className="material-symbols-outlined text-primary mb-4 block" style={{ fontSize: '32px' }}>solar_power</span>
                <h3 className="font-card-h3 text-card-h3 text-on-surface mb-2">Solar Modeling</h3>
                <p className="text-on-surface-variant text-body-main text-sm">
                  Optimized solar placement simulations based on topographical and meteorological data.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-6 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low transition-colors group">
                <span className="material-symbols-outlined text-primary mb-4 block" style={{ fontSize: '32px' }}>recycling</span>
                <h3 className="font-card-h3 text-card-h3 text-on-surface mb-2">Waste Tracking</h3>
                <p className="text-on-surface-variant text-body-main text-sm">
                  End-to-end circularity projections for institutional waste management flows.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-6 rounded-xl border border-outline-variant/40 hover:bg-surface-container-low transition-colors group">
                <span className="material-symbols-outlined text-primary mb-4 block" style={{ fontSize: '32px' }}>map</span>
                <h3 className="font-card-h3 text-card-h3 text-on-surface mb-2">Campus Maps</h3>
                <p className="text-on-surface-variant text-body-main text-sm">
                  Real-time spatial visualization layer for immediate ecosystem health overview.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;