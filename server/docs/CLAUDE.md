# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**iPlanFarmHouse** is a full-stack farm management SPA for smallholder farmers in Chhattisgarh, India. It models multi-layer natural farming (Haldi, Papaya, Creepers, Leafy Vegetables), zone-based soil planning, and irrigation scheduling.

## Repository Structure

```
iPlanFarmHouse/
├── client/          # React 19 + TypeScript SPA (Vite)
└── server/          # Express.js 5 API (ESM JavaScript)
    └── prisma/      # Schema, migrations, seed
```

## Commands

### Server (`server/`)
```bash
npm run dev             # Start with nodemon hot-reload
npm run start           # Production start

npm run db:up           # Start PostgreSQL Docker container (port 5433)
npm run db:down         # Stop PostgreSQL Docker container
npm run db:migrate      # Run pending Prisma migrations
npm run db:seed         # Seed reference data (crops, soil types)
npm run prisma:generate # Regenerate Prisma client after schema changes
npm run db:deploy       # Deploy migrations to production
```

### Client (`client/`)
```bash
npm run dev     # Vite dev server (proxies /api → localhost:5000)
npm run build   # TypeScript check + Vite production build
npm run lint    # ESLint
npm run preview # Preview production build
```ser

### First-time Setup
1. Copy `server/.env.example` → `server/.env`
2. `npm run db:up` — starts Postgres (postgres/postgres, DB: iplanfarmhouse)
3. `npm run db:migrate`
4. `npm run db:seed`
5. `npm run dev` in both `server/` and `client/`

## Architecture

### Backend Layers
Controllers (`src/controllers/`) handle HTTP concerns, delegate to Services (`src/services/`) for business logic. Routes (`src/routes/`) wire them together. Middleware covers auth (JWT), role-based access, Zod validation, and error handling.

All API responses use the envelope: `{ success: boolean, data: T }`.

Key service modules:
- `ecoHydraulic.service.js` — irrigation scheduling engine
- `cropRecommendation.service.js` — soil × crop matching
- `farmCalculations.service.js` — natural input recipes and per-zone financials
- `farmEconomics.service.js` — farm-level profit/loss aggregation

Domain constants live in `src/constants/naturalFarming.js` (crop data, input recipes, financial assumptions).

### Frontend Layers
- `src/context/AuthContext.tsx` — JWT auth state; token stored in localStorage
- `src/lib/api.ts` — Axios instance with request (inject Bearer token) and response (redirect on 401) interceptors
- `src/lib/farms.ts`, `auth.ts`, `soil.js` — typed API call wrappers
- `src/pages/` — one page per feature; pages compose components from `src/components/`
- `src/types/` — shared TypeScript types for farm, economics, water, calendar, plan

### Key Domain Logic

**Farm Geometry** (`server/src/utils/farm-spatial.js`): Turf.js validates polygons, calculates area (m² → Bigha ÷1333.33, Acres ÷4046.86, Hectares ÷10000), centroid, perimeter, and convexity score (farm area / convex hull area; flagged if < 0.7).

**Soil Health Score** (weighted equally at 25% each): pH fit, drainage type, soil type lookup, earthworm count.

**Crop Recommendation**: Suitability = (Soil Type Match × 0.7) + (pH Score × 0.3). Top 3 per season (Kharif, Rabi, Zaid).

**Eco-Hydraulic Irrigation Engine**:
```
Soil Retention Multiplier = SOIL_TYPE_MULTIPLIER × DRAINAGE_MULTIPLIER
Adjusted Weekly Water = Zone Area (acres) × Crop.weeklyWaterLitersPerAcre × Multiplier
```
Multipliers are in `ecoHydraulic.service.js`. Completing a schedule deducts from the water source's current level.

**Farm Economics** (multi-layer model): Each zone gets one crop assignment. Per zone: Net Profit = (Yield × Price) − (Seed + Processing costs). Farm level adds infrastructure overhead (land bunding, drip irrigation, solar dryer, annual labour).

### Database (Prisma + PostgreSQL)

Key constraints:
- One farm per farmer (`farmId` unique on `Farmer`)
- One soil report per zone
- One crop assignment per zone
- One `FarmFinancials` record per farm

Geospatial data stored as JSON (GeoJSON Polygon) — not native PostGIS. Turf.js runs calculations in Node.js.

Enums: `Role` (ADMIN, FARMER, CUSTOMER, EXPERT), `WaterSourceType` (POND, BOREWELL, CANAL, TANK, RIVER), `IrrigationStatus` (PENDING, COMPLETED, SKIPPED).

### API Routes (all under `/api`)

| Prefix | Module |
|--------|--------|
| `/auth` | Register, login, logout, me |
| `/farms` | Farm CRUD; zone save/get |
| `/farms/:farmId/zones/:zoneId/soil` | Soil reports |
| `/zones/:zoneId/recommendations` | Crop recommendations |
| `/zones/:zoneId/calculations/recipe` | Natural input recipes |
| `/zones/:zoneId/calculations/financial` | Per-zone financial estimates |
| `/farms/:farmId/economics` | Farm-level economics |
| `/farms/:farmId/plan`, `/zones/:zoneId/assign` | Crop assignments |
| `/farms/:farmId/water/sources` | Water sources CRUD |
| `/farms/:farmId/water/schedules` | Irrigation schedule generation/completion |
| `/farms/:farmId/calendar` | Activity calendar (filter by year/month/zone/category) |

## Documentation Files

- [CALCULATIONS.md](CALCULATIONS.md) — Farm economics formula details and assumptions
- [PROFIT_CALCULATIONS.md](PROFIT_CALCULATIONS.md) — Financial model breakdown
