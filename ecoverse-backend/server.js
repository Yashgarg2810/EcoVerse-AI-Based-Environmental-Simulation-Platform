require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { calculateSolar, calculatePlantation, calculateWaste, getAIRecommendation, generateAuditReport } = require('./formulaEngine');
const prisma = require('./prisma/db');
const { seedDatabase, defaultTreeSpecies, defaultSolarPanels } = require('./prisma/seedData');

// Seed the database tables with default data
seedDatabase(prisma);


const { verifyToken } = require('./middleware/authMiddleware');

// ─── Route Modules ─────────────────────────────────────────────────────────────
const authRouter  = require('./routes/auth');
const auditRouter = require('./routes/audit');
const contactRouter = require('./routes/contact');
const campusRouter = require('./routes/campus');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Auth, Audit & Campus Routes ───────────────────────────────────────────────
app.use('/api/auth',  authRouter);
app.use('/api/audit', auditRouter);
app.use('/api/contact', contactRouter);
app.use('/api/campus', campusRouter);

// Helper to compute asset metrics dynamically based on database properties
async function computeAssetMetrics(asset) {
  const details = asset.details || {};
  let computed = {
    id: asset.id,
    name: asset.name,
    category: asset.category,
    latitude: asset.latitude,
    longitude: asset.longitude,
    area_sqm: Number(details.area_sqm) || 0,
  };

  if (asset.category === 'plantation') {
    const speciesName = details.species || 'Neem';
    let speciesObj = defaultTreeSpecies.find(s => s.name === speciesName) || defaultTreeSpecies[0];
    try {
      const dbSpecies = await prisma.treeSpecies.findFirst({ where: { name: speciesName } });
      if (dbSpecies) speciesObj = dbSpecies;
    } catch (e) {}

    const count = Number(details.count) || 0;
    computed.estimated_trees = count;
    computed.estimated_co2_absorption_tons = (count * speciesObj.co2Absorption) / 1000;
    computed.total_plantation_cost = count * speciesObj.saplingCost;
    computed.annual_maintenance_cost = count * speciesObj.annualMaintenanceCost;
    computed.spacing_requirement = speciesObj.spacingRequirement;
  } else if (asset.category === 'solar') {
    const panelName = details.panelType || 'Monocrystalline';
    let panelObj = defaultSolarPanels.find(p => p.name === panelName) || defaultSolarPanels[0];
    try {
      const dbPanel = await prisma.solarPanelType.findFirst({ where: { name: panelName } });
      if (dbPanel) panelObj = dbPanel;
    } catch (e) {}

    const capacityKw = Number(details.capacityKw) || 0;
    const numPanels = Number(details.numPanels) || 0;
    computed.estimated_panels = numPanels;
    computed.estimated_energy_output_kwh = capacityKw * 1400; // 1400 kWh per kWp annually
    computed.estimated_co2_avoided_tons = (capacityKw * 1400 * 0.727) / 1000;
    computed.installation_cost = numPanels * panelObj.averageMarketCost;
    computed.annual_savings = capacityKw * 1400 * 8; // ₹8 per kWh
  } else if (asset.category === 'waste') {
    const capacity = Number(details.capacity) || 0; // kg/day
    computed.estimated_students_served = Math.round(capacity / 0.15); // 0.15kg/student/day
    computed.estimated_diverted_waste_kg = capacity * 365;
    computed.estimated_co2_avoided_tons = (capacity * 365 * 0.6) / 1000;
  } else if (asset.category === 'water') {
    const tankCapacity = Number(details.tankCapacity) || 0;
    const collectionArea = Number(details.collectionArea) || 0;
    computed.estimated_harvest_litres = collectionArea * 800 * 0.8;
    computed.tank_capacity_litres = tankCapacity;
  }

  return computed;
}

// Middleware to dynamically fetch campusId from database if missing in stale tokens, with self-healing
async function ensureCampusId(req, res, next) {
  try {
    if (req.user) {
      let campusId = req.user.campusId;
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id }
      });

      if (dbUser) {
        if (dbUser.campusId) {
          campusId = dbUser.campusId;
        } else {
          // Self-heal: link user to first existing campus or create a default one
          let campus = await prisma.campus.findFirst();
          if (!campus) {
            campus = await prisma.campus.create({
              data: {
                name: 'COER University',
                address: 'Roorkee, Uttarakhand, India',
                latitude: 29.8918,
                longitude: 77.9601,
                totalArea: 120,
                numBuildings: 15
              }
            });
          }
          await prisma.user.update({
            where: { id: req.user.id },
            data: { campusId: campus.id }
          });
          campusId = campus.id;
          console.log(`[Self-Healing] Linked user ${dbUser.email} to campus ${campus.name}`);
        }
      }
      req.user.campusId = campusId;
    }
  } catch (err) {
    console.error('[server] DB campusId query/self-heal failed:', err.message);
  }
  next();
}

// ─── GET /api/zones — All zones with computed values (Protected) ──────────────
app.get('/api/zones', verifyToken, ensureCampusId, async (req, res) => {
  try {
    if (!req.user.campusId) {
      return res.json([]);
    }

    const dbAssets = await prisma.campusAsset.findMany({
      where: { campusId: req.user.campusId }
    });

    const updatedZones = await Promise.all(dbAssets.map(computeAssetMetrics));
    res.json(updatedZones);
  } catch (error) {
    console.error('[server] zones endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch campus map zones.' });
  }
});

// ─── GET /api/zones/:category — Filter zones by category (Protected) ──────────
app.get('/api/zones/:category', verifyToken, ensureCampusId, async (req, res) => {
  try {
    if (!req.user.campusId) {
      return res.json([]);
    }

    const dbAssets = await prisma.campusAsset.findMany({
      where: { campusId: req.user.campusId, category: req.params.category }
    });

    const updatedZones = await Promise.all(dbAssets.map(computeAssetMetrics));
    res.json(updatedZones);
  } catch (error) {
    console.error('[server] filtered zones error:', error.message);
    res.status(500).json({ error: 'Failed to fetch campus map zones.' });
  }
});

// ─── GET / — Health check ─────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('EcoVerse Backend is running ✅');
});

// ─── GET /api/recommendations — AI summary + recommendations (Protected) ──────
app.get('/api/recommendations', verifyToken, ensureCampusId, async (req, res) => {
  try {
    if (!req.user.campusId) {
      return res.json({ summary: {}, recommendation: 'No campus profile found.' });
    }

    const dbAssets = await prisma.campusAsset.findMany({
      where: { campusId: req.user.campusId }
    });

    const updatedZones = await Promise.all(dbAssets.map(computeAssetMetrics));

    // Compute Summaries
    const totalTrees = updatedZones
      .filter(z => z.category === 'plantation')
      .reduce((sum, z) => sum + (z.estimated_trees || 0), 0);

    const totalCO2AbsorptionTons = updatedZones
      .filter(z => z.category === 'plantation')
      .reduce((sum, z) => sum + (z.estimated_co2_absorption_tons || 0), 0);

    const totalPanels = updatedZones
      .filter(z => z.category === 'solar')
      .reduce((sum, z) => sum + (z.estimated_panels || 0), 0);

    const totalEnergyKwh = updatedZones
      .filter(z => z.category === 'solar')
      .reduce((sum, z) => sum + (z.estimated_energy_output_kwh || 0), 0);

    const solarCO2EquivalentTons = (totalEnergyKwh * 0.727) / 1000;

    const divertedWasteKg = updatedZones
      .filter(z => z.category === 'waste')
      .reduce((sum, z) => sum + (z.estimated_diverted_waste_kg || 0), 0);

    const co2AvoidedTons = updatedZones
      .filter(z => z.category === 'waste')
      .reduce((sum, z) => sum + (z.estimated_co2_avoided_tons || 0), 0);

    const totalWaterHarvested = updatedZones
      .filter(z => z.category === 'water')
      .reduce((sum, z) => sum + (z.estimated_harvest_litres || 0), 0);

    const totalWaterCapacity = updatedZones
      .filter(z => z.category === 'water')
      .reduce((sum, z) => sum + (z.tank_capacity_litres || 0), 0);

    const plantationCost = updatedZones
      .filter(z => z.category === 'plantation')
      .reduce((sum, z) => sum + (z.total_plantation_cost || 0), 0);

    const solarCost = updatedZones
      .filter(z => z.category === 'solar')
      .reduce((sum, z) => sum + (z.installation_cost || 0), 0);

    const plantationMaint = updatedZones
      .filter(z => z.category === 'plantation')
      .reduce((sum, z) => sum + (z.annual_maintenance_cost || 0), 0);

    const solarSavings = updatedZones
      .filter(z => z.category === 'solar')
      .reduce((sum, z) => sum + (z.annual_savings || 0), 0);

    // Calculate Sustainability Score (Baseline 30, up to 100 based on assets)
    let score = 30;
    score += Math.min(Math.round(totalTrees / 5), 25); // max 25 points for trees (125+ trees)
    score += Math.min(Math.round(totalEnergyKwh / 2000), 25); // max 25 points for solar
    score += Math.min(Math.round(divertedWasteKg / 1000), 10); // max 10 points for waste
    score += Math.min(Math.round(totalWaterHarvested / 5000), 10); // max 10 points for water
    score = Math.min(score, 100);

    const summaryData = {
      totalTrees,
      totalCO2AbsorptionTons,
      totalPanels,
      totalEnergyKwh,
      divertedWasteKg,
      co2AvoidedTons,
      solarCO2EquivalentTons,
      totalWaterHarvested,
      totalWaterCapacity,
      plantationCost,
      solarCost,
      plantationMaint,
      solarSavings,
      sustainabilityScore: score
    };

    let recommendation;
    try {
      recommendation = await getAIRecommendation(summaryData);
    } catch (error) {
      console.error('Groq API failed:', error.message);
      recommendation = `Recommendations: 
1. Consider installing solar panels on rooftops to increase clean energy output.
2. Plant more indigenous species like Neem or Peepal in open areas to enhance carbon sequestration.
3. Optimize organic waste processing to increase compost yield and reduce carbon footprint.`;
    }

    res.json({ summary: summaryData, recommendation });
  } catch (error) {
    console.error('[server] recommendations endpoint error:', error.message);
    res.status(500).json({ error: 'Failed to fetch recommendations.' });
  }
});

// ─── GET /api/simulation-data — Fetch species and panel options ────────────────
app.get('/api/simulation-data', async (req, res) => {
  try {
    const treeSpecies = await prisma.treeSpecies.findMany({ orderBy: { name: 'asc' } });
    const solarPanels = await prisma.solarPanelType.findMany({ orderBy: { name: 'asc' } });

    res.json({
      treeSpecies: treeSpecies.length > 0 ? treeSpecies : defaultTreeSpecies,
      solarPanels: solarPanels.length > 0 ? solarPanels : defaultSolarPanels
    });
  } catch (err) {
    console.error('[server] Error fetching simulation data, using defaults:', err.message);
    res.json({
      treeSpecies: defaultTreeSpecies,
      solarPanels: defaultSolarPanels
    });
  }
});

// ─── GET /api/simulate — Simulation calculator ────────────────────────────────
app.get('/api/simulate', async (req, res) => {
  const plantationArea = Number(req.query.plantationArea) || 0;
  const rooftopArea    = Number(req.query.rooftopArea)    || 0;
  const wastePercent   = Number(req.query.wastePercent)   || 0;
  const selectedSpeciesName = req.query.treeSpecies || 'Neem';
  const selectedPanelName = req.query.solarPanelType || 'Monocrystalline';

  let speciesObj = defaultTreeSpecies.find(s => s.name === selectedSpeciesName) || defaultTreeSpecies[0];
  let panelObj = defaultSolarPanels.find(p => p.name === selectedPanelName) || defaultSolarPanels[0];

  try {
    const dbSpecies = await prisma.treeSpecies.findFirst({ where: { name: selectedSpeciesName } });
    if (dbSpecies) speciesObj = dbSpecies;

    const dbPanel = await prisma.solarPanelType.findFirst({ where: { name: selectedPanelName } });
    if (dbPanel) panelObj = dbPanel;
  } catch (err) {
    console.error('[server] DB error fetching species/panels, using fallback:', err.message);
  }

  res.json({
    plantation: calculatePlantation(plantationArea, speciesObj),
    solar:      calculateSolar(rooftopArea, panelObj),
    waste:      calculateWaste(4000, wastePercent / 100),
  });
});

// ─── POST /api/simulate/save — Save simulation config (Protected) ─────────────
app.post('/api/simulate/save', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      treeSpecies,
      plantationArea,
      solarPanelType,
      rooftopArea,
      wastePercent,
      co2Reduced,
      energySaved,
      treesPlanted,
      wasteDiverted,
      sustainabilityScore
    } = req.body;

    const savedSim = await prisma.simulationHistory.create({
      data: {
        userId,
        treeSpecies,
        plantationArea: Number(plantationArea) || 0,
        solarPanelType,
        rooftopArea: Number(rooftopArea) || 0,
        wastePercent: Number(wastePercent) || 0,
        co2Reduced: Number(co2Reduced) || 0,
        energySaved: Number(energySaved) || 0,
        treesPlanted: Number(treesPlanted) || 0,
        wasteDiverted: Number(wasteDiverted) || 0,
        sustainabilityScore: Number(sustainabilityScore) || 0
      }
    });

    res.status(201).json({ message: 'Simulation saved successfully', data: savedSim });
  } catch (err) {
    console.error('[server] Error saving simulation history:', err.message);
    res.status(500).json({ error: 'Failed to save simulation history. ' + err.message });
  }
});

// ─── GET /api/simulate/history — Get saved simulation runs (Protected) ─────────
app.get('/api/simulate/history', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await prisma.simulationHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(history);
  } catch (err) {
    console.error('[server] Error fetching simulation history:', err.message);
    res.status(500).json({ error: 'Failed to fetch simulation history.' });
  }
});

// ─── DELETE /api/simulate/history/:id — Delete simulation run (Protected) ──────
app.delete('/api/simulate/history/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Verify ownership
    const record = await prisma.simulationHistory.findFirst({
      where: { id, userId }
    });

    if (!record) {
      return res.status(404).json({ error: 'Simulation record not found or unauthorized.' });
    }

    await prisma.simulationHistory.delete({
      where: { id }
    });

    res.json({ message: 'Simulation deleted successfully' });
  } catch (err) {
    console.error('[server] Error deleting simulation history:', err.message);
    res.status(500).json({ error: 'Failed to delete simulation history.' });
  }
});

// ─── Start Server (skip in Vercel serverless) ─────────────────────────────────
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`EcoVerse backend running at http://localhost:${PORT}`);
  });
}

module.exports = app;




