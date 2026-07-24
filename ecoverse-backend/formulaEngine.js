// formulaEngine.js
require('dotenv').config();
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Retry helper for Groq calls ──────────────────────────────────────────
// Automatically retries on 429 (rate limit) errors with exponential backoff.
// Reads the server's suggested retry headers when available.
async function callGroqWithRetry(callFn, { maxRetries = 3 } = {}) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await callFn();
        } catch (err) {
            lastError = err;

            const status = err?.status || err?.statusCode;
            const isRateLimit = status === 429;

            // Not a rate-limit error → don't retry, fail immediately
            if (!isRateLimit || attempt === maxRetries) {
                throw err;
            }

            let waitMs = Math.pow(2, attempt + 1) * 1000; // fallback: 2s, 4s, 8s
            try {
                const headers = err?.headers || err?.response?.headers;
                if (headers) {
                    const retryAfter = headers['retry-after'] || headers['x-ratelimit-reset'];
                    if (retryAfter) {
                        const seconds = parseFloat(retryAfter);
                        if (!isNaN(seconds)) waitMs = Math.ceil(seconds * 1000) + 500; // +buffer
                    }
                }
            } catch (_) {
                // ignore parsing issues
            }

            console.warn(`[formulaEngine] Groq Rate limited (429). Retrying in ${Math.round(waitMs / 1000)}s... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }

    throw lastError;
}

function calculateSolar(areaSqm, panelType) {
    // Default to Monocrystalline specs if no panelType is provided
    const panel = panelType || {
        name: "Monocrystalline",
        efficiency: 0.20,
        wattage: 400,
        areaRequired: 2.0,
        averageMarketCost: 15000.0
    };

    const area = panel.areaRequired || 2.0;
    const numPanels = Math.floor(areaSqm / area);
    const capacityKw = numPanels * ((panel.wattage || 400) / 1000);
    
    // Annual energy generation (kWh/year) = Capacity (kW) * average daily solar hours (4.5) * 365 days
    const AnnualEnergy = capacityKw * 4.5 * 365;
    
    // Installation Cost in INR
    const installationCost = numPanels * (panel.averageMarketCost || 15000.0);
    
    // Annual electricity savings (INR/year) @ standard rate of 7 INR per kWh
    const annualSavings = AnnualEnergy * 7.0;
    
    // CO2 reduction (tons/year) = (kWh * emission factor 0.727 kg/kWh) / 1000
    const co2ReductionTons = (AnnualEnergy * 0.727) / 1000;
    
    // ROI in years (payback period)
    const roiYears = annualSavings > 0 ? (installationCost / annualSavings) : 0;

    return {
        estimated_panels: numPanels,
        estimated_energy_output_kwh: AnnualEnergy,
        installation_cost: installationCost,
        annual_savings: annualSavings,
        co2_reduction_tons: co2ReductionTons,
        roi_years: Number(roiYears.toFixed(1))
    }
}

// plantation 

function calculatePlantation(areaSqm, species) {
    // Default to Neem specs if no species is provided
    const tree = species || {
        name: "Neem",
        co2Absorption: 20.0,
        avgLifespan: 150,
        saplingCost: 50.0,
        annualMaintenanceCost: 100.0,
        spacingRequirement: 3.0
    };

    const spacing = tree.spacingRequirement || 3.0;
    const areaPerTree = spacing * spacing;
    const trees = areaPerTree > 0 ? Math.floor(areaSqm / areaPerTree) : 0;
    
    const annualCO2AbsorptionKg = trees * (tree.co2Absorption || 20.0);
    const annualCO2AbsorptionTons = annualCO2AbsorptionKg / 1000;

    const totalPlantationCost = trees * (tree.saplingCost || 50.0);
    const annualMaintenanceCost = trees * (tree.annualMaintenanceCost || 100.0);

    return {
        estimated_trees: trees,
        estimated_co2_absorption_tons: annualCO2AbsorptionTons,
        co2_absorption_10y_tons: annualCO2AbsorptionTons * 10,
        co2_absorption_20y_tons: annualCO2AbsorptionTons * 20,
        total_plantation_cost: totalPlantationCost,
        annual_maintenance_cost: annualMaintenanceCost,
        average_lifespan: tree.avgLifespan || 150,
        spacing_requirement: spacing
    }
}

function calculateWaste(students, diversionPercent) {
    // 4 steps
    const dailyWaste = students * 0.1
    const annualWaste = dailyWaste * 365
    const divertedWaste = annualWaste * diversionPercent
    const CO2_Avoided = divertedWaste * 7;

    return {
        estimated_daily_waste_kg: dailyWaste,
        estimated_annual_waste_kg: annualWaste,
        estimated_diverted_waste_kg: divertedWaste,
        estimated_co2_avoided_tons: CO2_Avoided / 1000
    }
}

async function getAIRecommendation(summaryData) {
    const prompt = `You are an environmental sustainability advisor for a college campus.

Here is the current simulated environmental impact data for the campus:

- Solar Energy: ${summaryData.totalPanels} panels installed, generating ${summaryData.totalEnergyKwh} kWh of clean energy per year.
- Plantation: ${summaryData.totalTrees} trees planted, absorbing ${summaryData.totalCO2AbsorptionTons} tons of CO2 per year.
- Waste Management: ${summaryData.divertedWasteKg} kg of waste diverted from landfills annually, avoiding ${summaryData.co2AvoidedTons} tons of CO2-equivalent emissions.

Based on this data, provide exactly 3 short, actionable recommendations (1-2 sentences each) to help the college improve its environmental impact further. Focus on the area that seems to need the most improvement. Keep the tone practical and encouraging, not overly technical. Do not use markdown formatting, just plain numbered text.`;

    const response = await callGroqWithRetry(() =>
        groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }]
        })
    );

    return response.choices[0].message.content;
}

async function generateAuditReport(formData) {
    const {
        institution, campus, academicYear, preparedBy, committee,
        totalArea, builtUpArea, greenArea, students, faculty, staff,
        electricity, hasSolar, solarCapacity, hasDiesel, dieselUsage,
        waterConsumption, rainwaterPoints, hasSTP, recycledWater,
        organicWaste, plasticWaste, paperWaste, eWaste, wasteDiversion,
        existingTrees, newTrees, greenCover, plantationDrives,
        initiatives
    } = formData;

    const prompt = `You are an expert sustainability consultant generating a professional Internal Green Audit Report for an educational institution. 
    
Return ONLY a valid JSON object (no markdown, no code blocks, no extra text) with exactly this structure:

{
  "executiveSummary": "string (3-4 sentences summarizing institution performance, key achievements, and overall green score out of 100)",
  "overallScore": number (0-100),
  "campusProfile": "string (2-3 sentences about institution size, population, and campus characteristics)",
  "energyAnalysis": {
    "summary": "string (analysis of electricity consumption and renewable energy usage)",
    "status": "Excellent|Good|Needs Improvement",
    "co2Footprint": "string (estimated CO2 footprint in tons/year)",
    "recommendations": ["string", "string"]
  },
  "waterAnalysis": {
    "summary": "string (analysis of water consumption, rainwater harvesting, recycling)",
    "status": "Excellent|Good|Needs Improvement",
    "recommendations": ["string", "string"]
  },
  "wasteAnalysis": {
    "summary": "string (analysis of waste generation and diversion rates)",
    "status": "Excellent|Good|Needs Improvement",
    "totalMonthlyWaste": "string (calculated total in kg)",
    "recommendations": ["string", "string"]
  },
  "greenCoverAnalysis": {
    "summary": "string (analysis of trees, plantation drives, green coverage)",
    "status": "Excellent|Good|Needs Improvement",
    "co2Absorbed": "string (estimated CO2 absorbed by trees per year)",
    "recommendations": ["string", "string"]
  },
  "strengths": ["string", "string", "string"],
  "weaknesses": ["string", "string", "string"],
  "aiRecommendations": [
    { "title": "string", "description": "string (2-3 sentences)", "priority": "High|Medium|Low" },
    { "title": "string", "description": "string (2-3 sentences)", "priority": "High|Medium|Low" },
    { "title": "string", "description": "string (2-3 sentences)", "priority": "High|Medium|Low" },
    { "title": "string", "description": "string (2-3 sentences)", "priority": "High|Medium|Low" },
    { "title": "string", "description": "string (2-3 sentences)", "priority": "High|Medium|Low" }
  ],
  "conclusion": "string (3-4 sentences concluding the audit with forward-looking statement)"
}

Here is the audit data for ${institution || 'the institution'} — ${campus || 'Main Campus'} (${academicYear || '2024-2025'}):

INSTITUTION DETAILS:
- Institution: ${institution}
- Campus: ${campus}
- Academic Year: ${academicYear}
- Prepared By: ${preparedBy}
- Committee: ${committee}

CAMPUS INFORMATION:
- Total Area: ${totalArea} acres
- Built-up Area: ${builtUpArea} sq.ft.
- Green Area: ${greenArea}%
- Students: ${students}
- Faculty: ${faculty}
- Staff: ${staff}

ENERGY:
- Annual Electricity: ${electricity} kWh
- Solar Installed: ${hasSolar ? 'Yes, ' + solarCapacity + ' kWp' : 'No'}
- Diesel Generator: ${hasDiesel ? 'Yes, ' + dieselUsage + ' litres/year' : 'No'}

WATER:
- Daily Water Consumption: ${waterConsumption} litres
- Rainwater Harvesting Points: ${rainwaterPoints}
- STP/ETP Available: ${hasSTP ? 'Yes' : 'No'}
- Recycled Water: ${recycledWater}%

WASTE (Monthly, kg):
- Organic: ${organicWaste} kg
- Plastic: ${plasticWaste} kg
- Paper/Cardboard: ${paperWaste} kg
- E-Waste: ${eWaste} kg
- Waste Diversion/Recycling: ${wasteDiversion}%

GREEN INFRASTRUCTURE:
- Existing Trees: ${existingTrees}
- New Saplings This Year: ${newTrees}
- Green Cover: ${greenCover} sq.ft.
- Plantation Drives: ${plantationDrives} per year

ADDITIONAL INITIATIVES:
${(initiatives || []).join(', ') || 'None specified'}

Generate a professional, data-driven report. Be specific with numbers from the data provided.`;

    const response = await callGroqWithRetry(() =>
        groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: "You are an expert sustainability consultant. You must output ONLY a valid JSON object matching the requested schema structure. Do not wrap the response in markdown code blocks or add any trailing/leading commentary. Ensure all keys and string values are enclosed in double quotes, and arrays/objects are properly closed so that the output is 100% valid parseable JSON."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            response_format: { type: "json_object" }
        })
    );


    // Parse the JSON response
    let text = response.choices[0].message.content.trim();

    // Strip all possible markdown code fences
    text = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    // If the model wrapped JSON inside extra text, extract the first JSON object
    const jsonStart = text.indexOf('{');
    const jsonEnd   = text.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        text = text.slice(jsonStart, jsonEnd + 1);
    }

    try {
        return JSON.parse(text);
    } catch (parseErr) {
        console.error('[formulaEngine] JSON parse failed. Raw Groq response:\n', text.slice(0, 500));
        throw new Error('Groq returned invalid JSON. Please try again.');
    }

}

module.exports = { calculateSolar, calculatePlantation, calculateWaste, getAIRecommendation, generateAuditReport };