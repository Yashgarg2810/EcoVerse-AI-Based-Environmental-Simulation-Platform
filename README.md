# EcoVerse – AI-Based Environmental Simulation Platform

EcoVerse is a full-stack, multi-tenant campus sustainability platform 
that enables educational institutions to simulate, audit, and optimize 
their environmental impact using real geographic data and scientific 
formulas — not guesswork.

## 🌿 What It Does

Administrators draw campus zone boundaries directly on an interactive 
Leaflet.js GIS map. The system uses the **Shoelace formula** to compute 
the exact polygon area (m²), then runs species-specific or panel-specific 
calculations to produce real-time environmental metrics:

- 🌳 **Tree Plantation** — CO₂ absorption, canopy cover, rainwater harvesting yield
- ☀️ **Solar Panels** — energy yield (kWh), setup cost, annual savings at ₹8/kWh tariff
- ♻️ **Waste Diversion** — landfill reduction estimates
- 📊 **Carbon Footprint** — zone-level CO₂ reduction tracking

All statistics feed directly into the **Groq AI (Llama 3.3)** engine, 
which generates context-aware sustainability strategies tailored to 
each campus zone.

## 🚀 Key Features

- **Interactive GIS Map** — draw polygons, auto-compute area, assign zone type
- **Formula Engine** — deterministic, peer-reviewed calculations (no ML black-box)
- **Multi-step Green Audit** — auto-saved to localStorage + PostgreSQL (zero data loss)
- **AI Report Generation** — Groq AI produces structured sustainability reports instantly
- **Print-to-PDF Export** — clean A4 environmental reports for NAAC submission
- **My Reports Dashboard** — search, view, and manage all generated reports
- **2-Step Signup Wizard** — institution onboards with campus boundary + building profiles
- **JWT Authentication** — secure session management with auto-restore

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Leaflet.js |
| Backend | Node.js, Express.js, REST APIs |
| Database | PostgreSQL, Prisma ORM |
| AI | Groq Cloud — Llama 3.3 (reports) + Llama 3.1 (advisor) |
| Auth | JWT-based authentication |
| Export | Native print-to-PDF styling |

<img width="1906" height="918" alt="image" src="https://github.com/user-attachments/assets/87f8783c-d398-40b0-a856-67b8f2413a4f" />
