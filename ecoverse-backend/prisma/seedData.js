// ecoverse-backend/prisma/seedData.js

const defaultTreeSpecies = [
  {
    name: "Neem",
    co2Absorption: 20.0, // kg/year per tree
    avgLifespan: 150,     // years
    saplingCost: 50.0,    // INR
    annualMaintenanceCost: 100.0, // INR
    spacingRequirement: 3.0 // meters
  },
  {
    name: "Peepal",
    co2Absorption: 22.0,
    avgLifespan: 2000,
    saplingCost: 60.0,
    annualMaintenanceCost: 120.0,
    spacingRequirement: 4.0
  },
  {
    name: "Banyan",
    co2Absorption: 25.0,
    avgLifespan: 250,
    saplingCost: 80.0,
    annualMaintenanceCost: 150.0,
    spacingRequirement: 6.0
  },
  {
    name: "Mango",
    co2Absorption: 18.0,
    avgLifespan: 100,
    saplingCost: 100.0,
    annualMaintenanceCost: 200.0,
    spacingRequirement: 5.0
  },
  {
    name: "Ashoka",
    co2Absorption: 15.0,
    avgLifespan: 80,
    saplingCost: 40.0,
    annualMaintenanceCost: 80.0,
    spacingRequirement: 2.0
  },
  {
    name: "Eucalyptus",
    co2Absorption: 30.0,
    avgLifespan: 70,
    saplingCost: 30.0,
    annualMaintenanceCost: 50.0,
    spacingRequirement: 2.5
  }
];

const defaultSolarPanels = [
  {
    name: "Monocrystalline",
    efficiency: 0.20, // 20%
    wattage: 400,    // Watts
    areaRequired: 2.0, // sqm per panel
    averageMarketCost: 15000.0 // INR
  },
  {
    name: "Polycrystalline",
    efficiency: 0.15, // 15%
    wattage: 350,
    areaRequired: 2.0,
    averageMarketCost: 12000.0 // INR
  },
  {
    name: "Thin Film",
    efficiency: 0.12, // 12%
    wattage: 250,
    areaRequired: 2.2,
    averageMarketCost: 8000.0 // INR
  }
];

async function seedDatabase(prisma) {
  console.log('[seeder] Checking database for TreeSpecies and SolarPanelType data...');
  try {
    const speciesCount = await prisma.treeSpecies.count();
    if (speciesCount === 0) {
      console.log('[seeder] Seeding default tree species...');
      for (const s of defaultTreeSpecies) {
        await prisma.treeSpecies.create({ data: s });
      }
      console.log('[seeder] Tree species seeded.');
    } else {
      console.log('[seeder] Tree species already exist in the database.');
    }

    const panelsCount = await prisma.solarPanelType.count();
    if (panelsCount === 0) {
      console.log('[seeder] Seeding default solar panel types...');
      for (const p of defaultSolarPanels) {
        await prisma.solarPanelType.create({ data: p });
      }
      console.log('[seeder] Solar panel types seeded.');
    } else {
      console.log('[seeder] Solar panel types already exist in the database.');
    }
  } catch (error) {
    console.error('[seeder] Error seeding database:', error.message);
    console.log('[seeder] Will use default JSON data values as runtime fallback.');
  }
}

module.exports = {
  defaultTreeSpecies,
  defaultSolarPanels,
  seedDatabase
};
