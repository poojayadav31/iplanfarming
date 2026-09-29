import "dotenv/config";
import { fileURLToPath } from "url";
import prisma from "../../src/config/prisma.js";

/**
 * Multilayer natural farming model sourced from the agricultural manual.
 * These four crops are grown simultaneously on the same plot:
 *   Haldi (Kharif, 9 mo) + Papaya (Perennial, 24 mo) +
 *   Creepers (Zaid, 6 mo) + Leafy Vegetable (Rabi, 3 mo)
 *
 * Key note: Papaya has a 24-month establishment period — it produces 0 kg
 * in Year 1 and reaches full yield (10,000 kg/acre) only from Year 2 onward.
 * The economics service honours this by zeroing Papaya revenue in Year 1.
 *
 * Processed prices are approximate 2x–2.5x multipliers reflecting value
 * addition common in self-help-group (SHG) rural processing units:
 *   - Haldi → Haldi powder (grind + pack)
 *   - Papaya → Dried/packaged papaya
 *   - Creepers → Cleaned, graded, crated for wholesale
 *   - Leafy Veg → Washed, bundled, retail-packed
 */
const CROP_ECONOMICS_ROWS = [
  {
    cropName: "Haldi",
    season: "Kharif",
    durationMonths: 9,
    yieldPerAcreKg: 7000,
    rawSalePricePerKg: 60,          // ₹60/kg raw rhizome
    processedSalePricePerKg: 120,   // ₹120/kg haldi powder
    processingCostPerKg: 15,        // drying + grinding + packaging
    seedCostPerAcre: 8000,
  },
  {
    cropName: "Papaya",
    season: "Perennial",
    durationMonths: 24,
    yieldPerAcreKg: 10000,
    rawSalePricePerKg: 30,          // ₹30/kg raw fruit
    processedSalePricePerKg: 65,    // ₹65/kg dried / packaged
    processingCostPerKg: 8,         // solar drying + packaging
    seedCostPerAcre: 3000,
  },
  {
    cropName: "Creepers",
    season: "Zaid",
    durationMonths: 6,
    yieldPerAcreKg: 8000,
    rawSalePricePerKg: 40,          // ₹40/kg at farm gate
    processedSalePricePerKg: 75,    // ₹75/kg graded + crated
    processingCostPerKg: 10,        // grading + crating + transport
    seedCostPerAcre: 2000,
  },
  {
    cropName: "Leafy Vegetable",
    season: "Rabi",
    durationMonths: 3,
    yieldPerAcreKg: 2000,
    rawSalePricePerKg: 30,
    processedSalePricePerKg: 55,
    processingCostPerKg: 8,
    seedCostPerAcre: 1500,
  },
  // ── Agronomic crops recommended by the soil engine ──────────────────────────
  { cropName: "Rice",       season: "Kharif",    durationMonths: 4,  yieldPerAcreKg: 1800, rawSalePricePerKg: 22,  processedSalePricePerKg: 32,  processingCostPerKg: 3, seedCostPerAcre: 1200 },
  { cropName: "Wheat",      season: "Rabi",      durationMonths: 5,  yieldPerAcreKg: 1600, rawSalePricePerKg: 24,  processedSalePricePerKg: 35,  processingCostPerKg: 4, seedCostPerAcre: 1500 },
  { cropName: "Cotton",     season: "Kharif",    durationMonths: 6,  yieldPerAcreKg: 500,  rawSalePricePerKg: 60,  processedSalePricePerKg: 80,  processingCostPerKg: 8, seedCostPerAcre: 2000 },
  { cropName: "Gram",       season: "Rabi",      durationMonths: 4,  yieldPerAcreKg: 600,  rawSalePricePerKg: 55,  processedSalePricePerKg: 75,  processingCostPerKg: 5, seedCostPerAcre: 1800 },
  { cropName: "Maize",      season: "Kharif",    durationMonths: 3,  yieldPerAcreKg: 2000, rawSalePricePerKg: 18,  processedSalePricePerKg: 28,  processingCostPerKg: 3, seedCostPerAcre: 1000 },
  { cropName: "Millets",    season: "Kharif",    durationMonths: 3,  yieldPerAcreKg: 800,  rawSalePricePerKg: 30,  processedSalePricePerKg: 45,  processingCostPerKg: 4, seedCostPerAcre: 600  },
  { cropName: "Groundnut",  season: "Kharif",    durationMonths: 4,  yieldPerAcreKg: 900,  rawSalePricePerKg: 50,  processedSalePricePerKg: 70,  processingCostPerKg: 6, seedCostPerAcre: 3500 },
  { cropName: "Pulses",     season: "Rabi",      durationMonths: 4,  yieldPerAcreKg: 500,  rawSalePricePerKg: 60,  processedSalePricePerKg: 80,  processingCostPerKg: 5, seedCostPerAcre: 1500 },
  { cropName: "Vegetables", season: "Zaid",      durationMonths: 3,  yieldPerAcreKg: 3000, rawSalePricePerKg: 25,  processedSalePricePerKg: 40,  processingCostPerKg: 5, seedCostPerAcre: 2000 },
  { cropName: "Tuber crops",season: "Rabi",      durationMonths: 4,  yieldPerAcreKg: 4000, rawSalePricePerKg: 15,  processedSalePricePerKg: 25,  processingCostPerKg: 3, seedCostPerAcre: 3000 },
  { cropName: "Moong",      season: "Kharif",    durationMonths: 2,  yieldPerAcreKg: 400,  rawSalePricePerKg: 70,  processedSalePricePerKg: 90,  processingCostPerKg: 5, seedCostPerAcre: 700  },
  { cropName: "Soybean",    season: "Kharif",    durationMonths: 4,  yieldPerAcreKg: 700,  rawSalePricePerKg: 40,  processedSalePricePerKg: 55,  processingCostPerKg: 4, seedCostPerAcre: 1200 },
  { cropName: "Tur/Arhar",  season: "Kharif",    durationMonths: 6,  yieldPerAcreKg: 500,  rawSalePricePerKg: 80,  processedSalePricePerKg: 100, processingCostPerKg: 6, seedCostPerAcre: 500  },
  { cropName: "Urad",       season: "Kharif",    durationMonths: 2,  yieldPerAcreKg: 350,  rawSalePricePerKg: 75,  processedSalePricePerKg: 95,  processingCostPerKg: 5, seedCostPerAcre: 800  },
];

export const seedCropEconomics = async () => {
  for (const row of CROP_ECONOMICS_ROWS) {
    await prisma.cropEconomics.upsert({
      where: { cropName: row.cropName },
      create: row,
      update: {
        yieldPerAcreKg: row.yieldPerAcreKg,
        rawSalePricePerKg: row.rawSalePricePerKg,
        processedSalePricePerKg: row.processedSalePricePerKg,
        processingCostPerKg: row.processingCostPerKg,
        seedCostPerAcre: row.seedCostPerAcre,
      },
    });
  }
};

export { CROP_ECONOMICS_ROWS };

// Allow direct execution: node prisma/seeds/cropEconomicsSeed.js
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCropEconomics()
    .then(async () => {
      console.log(`Seeded ${CROP_ECONOMICS_ROWS.length} crop economics records.`);
      await prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error("Failed to seed crop economics:", err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
