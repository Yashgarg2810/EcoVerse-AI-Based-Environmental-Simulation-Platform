const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const Groq = require('groq-sdk');

function getGroqClient() {
    const key = process.env.GROQ_API_KEY;
    if (!key) return null;
    return new Groq({ apiKey: key });
}

// ─── Retry helper for Groq calls ──────────────────────────────────────────
// Automatically retries on 429 (rate limit) errors with exponential backoff.
// Reads the server's suggested retry headers when available.
async function callGroqWithRetry(callFn, { maxRetries = 2 } = {}) {
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

            let waitMs = Math.pow(2, attempt + 1) * 1000; // fallback: 2s, 4s
            try {
                const headers = err?.headers || err?.response?.headers;
                if (headers) {
                    const retryAfter = headers['retry-after'] || headers['x-ratelimit-reset'];
                    if (retryAfter) {
                        const seconds = parseFloat(retryAfter);
                        if (!isNaN(seconds)) waitMs = Math.ceil(seconds * 1000) + 500;
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
    };
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
    };
}

function calculateWaste(students, diversionPercent) {
    // 4 steps
    const dailyWaste = students * 0.1;
    const annualWaste = dailyWaste * 365;
    const divertedWaste = annualWaste * diversionPercent;
    const CO2_Avoided = divertedWaste * 7;

    return {
        estimated_daily_waste_kg: dailyWaste,
        estimated_annual_waste_kg: annualWaste,
        estimated_diverted_waste_kg: divertedWaste,
        estimated_co2_avoided_tons: CO2_Avoided / 1000
    };
}

async function getAIRecommendation(summaryData) {
    const prompt = `You are an environmental sustainability advisor for a college campus.

Here is the current simulated environmental impact data for the campus:

- Solar Energy: ${summaryData.totalPanels} panels installed, generating ${summaryData.totalEnergyKwh} kWh of clean energy per year.
- Plantation: ${summaryData.totalTrees} trees planted, absorbing ${summaryData.totalCO2AbsorptionTons} tons of CO2 per year.
- Waste Management: ${summaryData.divertedWasteKg} kg of waste diverted from landfills annually, avoiding ${summaryData.co2AvoidedTons} tons of CO2-equivalent emissions.

Based on this data, provide exactly 3 short, actionable recommendations (1-2 sentences each) to help the college improve its environmental impact further. Focus on the area that seems to need the most improvement. Keep the tone practical and encouraging, not overly technical. Do not use markdown formatting, just plain numbered text.`;

    const groq = getGroqClient();
    if (groq) {
        const candidateModels = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'llama-3.1-8b-instant'];
        for (const model of candidateModels) {
            try {
                const response = await callGroqWithRetry(() =>
                    groq.chat.completions.create({
                        model,
                        messages: [{ role: "user", content: prompt }]
                    })
                );
                if (response?.choices?.[0]?.message?.content) {
                    return response.choices[0].message.content.trim();
                }
            } catch (err) {
                console.warn(`[formulaEngine] getAIRecommendation model ${model} failed:`, err.message);
            }
        }
    }

    // High quality deterministic fallback
    return `1. Expand rooftop solar panel deployment to increase clean energy generation and offset campus grid reliance.
2. Undertake targeted indigenous plantation drives (Neem, Peepal, Banyan) to boost local biodiversity and carbon sequestration.
3. Establish dedicated on-campus composting and segregated recycling to maximize solid waste diversion from municipal landfills.`;
}

// Procedural fallback report generator if AI service is offline or rate-limited
function generateProceduralAuditReport(formData) {
    const institution = formData.institution || 'Institutional Campus';
    const electricity = Number(formData.electricity) || 500000;
    const hasSolar = Boolean(formData.hasSolar);
    const solarCapacity = Number(formData.solarCapacity) || 0;
    const co2Grid = Math.round((electricity * 0.727) / 1000);
    
    const organicWaste = Number(formData.organicWaste) || 500;
    const plasticWaste = Number(formData.plasticWaste) || 150;
    const paperWaste = Number(formData.paperWaste) || 200;
    const eWaste = Number(formData.eWaste) || 30;
    const totalMonthlyWasteKg = organicWaste + plasticWaste + paperWaste + eWaste;
    const diversion = Number(formData.wasteDiversion) || 50;

    const existingTrees = Number(formData.existingTrees) || 500;
    const newTrees = Number(formData.newTrees) || 50;
    const totalTrees = existingTrees + newTrees;
    const co2AbsorbedTons = Math.round((totalTrees * 20) / 1000);

    let score = 55;
    if (hasSolar && solarCapacity > 50) score += 15;
    else if (hasSolar) score += 8;
    if (diversion >= 60) score += 12;
    if (totalTrees > 500) score += 10;
    if (Boolean(formData.hasSTP)) score += 8;
    score = Math.min(Math.max(score, 60), 96);

    const energyStatus = hasSolar && solarCapacity >= 50 ? 'Excellent' : hasSolar ? 'Good' : 'Needs Improvement';
    const waterStatus = Boolean(formData.hasSTP) && Number(formData.recycledWater) >= 40 ? 'Excellent' : 'Good';
    const wasteStatus = diversion >= 65 ? 'Excellent' : diversion >= 40 ? 'Good' : 'Needs Improvement';
    const greenStatus = totalTrees >= 800 ? 'Excellent' : 'Good';

    return {
        executiveSummary: `${institution} demonstrates a commendable commitment to environmental sustainability, achieving an overall Internal Green Score of ${score}/100. The campus shows measurable performance in waste diversion and green landscaping, supported by proactive institutional initiatives. Continued scaling of on-site renewable energy and greywater recycling will position the campus as a leading eco-friendly institution.`,
        overallScore: score,
        campusProfile: `${institution} encompasses ${formData.totalArea || 50} acres with an estimated academic community of ${(Number(formData.students) || 2000) + (Number(formData.faculty) || 100)} individuals, exhibiting a well-balanced distribution between built-up infrastructure and open ecological zones.`,
        energyAnalysis: {
            summary: `The campus consumes approximately ${electricity.toLocaleString()} kWh of electricity annually. ${hasSolar ? `Rooftop solar generation of ${solarCapacity} kWp significantly offsets peak grid consumption.` : 'Currently relying predominantly on the regional electrical grid.'}`,
            status: energyStatus,
            co2Footprint: `${co2Grid} tons/year`,
            recommendations: [
                "Install automated sensor-based lighting and expand rooftop solar arrays to increase renewable capacity.",
                "Conduct regular energy audits across major academic blocks to minimize standby power loss."
            ]
        },
        waterAnalysis: {
            summary: `Daily campus water consumption is estimated at ${(Number(formData.waterConsumption) || 40000).toLocaleString()} litres, supported by ${formData.rainwaterPoints || 4} rainwater recharge pits and ${formData.hasSTP ? `an active STP recycling ${formData.recycledWater || 50}% of wastewater.` : 'standard municipal drainage.'}`,
            status: waterStatus,
            recommendations: [
                "Expand rainwater harvesting collection sumps to capture peak monsoon runoff.",
                "Implement dual-plumbing infrastructure to maximize recycled water utilization for landscape irrigation."
            ]
        },
        wasteAnalysis: {
            summary: `Monthly solid waste generation averages ${totalMonthlyWasteKg.toLocaleString()} kg with a reported landfill diversion rate of ${diversion}%, led by organic composting.`,
            status: wasteStatus,
            totalMonthlyWaste: `${totalMonthlyWasteKg.toLocaleString()} kg`,
            recommendations: [
                "Strengthen three-bin waste segregation at the source across hostels and academic cafeterias.",
                "Partner with authorized e-waste recyclers for quarterly certified disposal."
            ]
        },
        greenCoverAnalysis: {
            summary: `The campus boasts a vibrant canopy of ${totalTrees.toLocaleString()} trees, sequestering approximately ${co2AbsorbedTons} tons of CO₂ annually, supplemented by ${formData.plantationDrives || 2} annual plantation drives.`,
            status: greenStatus,
            co2Absorbed: `${co2AbsorbedTons} tons/year`,
            recommendations: [
                "Prioritize planting native indigenous tree varieties (Neem, Peepal, Banyan) with high drought tolerance.",
                "Create a QR-code enabled campus biodiversity registry for student environmental awareness."
            ]
        },
        strengths: [
            `High green canopy density with ${totalTrees.toLocaleString()} registered trees absorbing ${co2AbsorbedTons} tons of CO₂ annually.`,
            `${diversion}% waste diversion achieved through institutional segregation and composting drives.`,
            `Active implementation of campus environmental initiatives including ${(formData.initiatives || ['LED lighting']).slice(0, 2).join(' and ')}.`
        ],
        weaknesses: [
            hasSolar ? "Potential for further rooftop solar expansion remains unutilized across secondary roofs." : "Absence of significant on-site renewable solar generation increases grid emissions.",
            "Water metering lacks real-time sub-metering across individual building blocks.",
            "Need for formalized hazardous and e-waste collection drives at scheduled semester intervals."
        ],
        aiRecommendations: [
            {
                title: "Scale Rooftop Solar Photovoltaic Capacity",
                description: "Expand existing solar installations across suitable rooftops to offset at least 40% of baseline grid energy consumption.",
                priority: "High"
            },
            {
                title: "Enhance Rainwater Harvesting & Groundwater Recharge",
                description: "Construct additional percolation pits connected to academic block catchment gutters to maximize aquifer recharge during monsoons.",
                priority: "High"
            },
            {
                title: "Decentralized Organic Composting Enhancement",
                description: "Upgrade canteen organic waste processing to aerobic composters to supply 100% of campus landscaping fertilizer.",
                priority: "Medium"
            },
            {
                title: "Campus-Wide Smart Energy Sub-Metering",
                description: "Deploy digital IoT energy sub-meters across hostels and laboratories to detect abnormal consumption patterns.",
                priority: "Medium"
            },
            {
                title: "Biodiversity & Native Species Conservation Drive",
                description: "Establish a dedicated herbal and native tree nursery managed jointly by faculty and student green clubs.",
                priority: "Low"
            }
        ],
        conclusion: `The green audit reveals that ${institution} has established solid foundational sustainability practices with clear pathways for high-impact improvements. By implementing the prioritized recommendations—particularly expanding renewable energy and optimizing water stewardship—the institution will significantly reduce its carbon footprint and set a benchmark for sustainable academic campuses.`
    };
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

    const groq = getGroqClient();
    if (groq) {
        // Try proven active models in priority order
        const candidateModels = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'llama-3.3-70b-versatile'];

        for (const model of candidateModels) {
            try {
                console.log(`[formulaEngine] Requesting audit report generation with model: ${model}`);
                const response = await callGroqWithRetry(() =>
                    groq.chat.completions.create({
                        model,
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

                let text = response.choices[0].message.content.trim();
                text = text
                    .replace(/^```json\s*/i, '')
                    .replace(/^```\s*/i, '')
                    .replace(/```\s*$/i, '')
                    .trim();

                const jsonStart = text.indexOf('{');
                const jsonEnd   = text.lastIndexOf('}');
                if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                    text = text.slice(jsonStart, jsonEnd + 1);
                }

                const parsed = JSON.parse(text);
                console.log(`[formulaEngine] Successfully generated report using ${model}`);
                return parsed;
            } catch (err) {
                console.warn(`[formulaEngine] Model ${model} generation failed:`, err.message);
            }
        }
    }

    console.warn('[formulaEngine] Groq service unavailable or failed. Generating procedural audit report fallback.');
    return generateProceduralAuditReport(formData);
}

module.exports = { calculateSolar, calculatePlantation, calculateWaste, getAIRecommendation, generateAuditReport };