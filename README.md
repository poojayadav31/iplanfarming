# 🌱 Smart Farm Planning Application

A full-stack web application to help farmers digitally manage farms, land boundaries, crops, workers, and smart insights using maps and data-driven logic.

---

## 🚀 Features (Planned & In Progress)

### ✅ Phase 1: Authentication
- JWT-based authentication
- OTP login (Twilio / TextBee)
- Role-based access (Farmer, Admin, Expert)

### ✅ Phase 2: Farm & Land Management
- Create farm (name, location)
- Draw farm boundary on map
- Store GPS polygon in PostgreSQL (JSONB)
- Auto-calculate:
  - Area
  - Elevation
  - Slope
  - Risk level (Low / Medium / High)

### 🔜 Upcoming Modules
- Plot-wise crop planning
- Weather-based alerts
- Crop lifecycle tracking
- Worker & task management
- Reports & analytics dashboard

---

## 🧱 Tech Stack

### Frontend
- Next.js (React)
- Tailwind CSS
- Leaflet + react-leaflet
- leaflet-draw

### Backend
- Node.js + Express
- PostgreSQL
- JWT Authentication

### APIs
- OpenStreetMap (Maps)
- Open-Elevation API
- Twilio / TextBee (SMS OTP)

---

## To run 
## npm run dev

<!-- npm install --save-dev concurrently -->

<!-- psql postgresql://postgres:mukul123@localhost:5432/iit -->
