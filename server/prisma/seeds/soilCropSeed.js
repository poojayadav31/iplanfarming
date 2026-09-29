import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { fileURLToPath } from "node:url";

const rows = [
  { soilType: "Kanhar", cropName: "Rice", season: "Kharif", phMin: 5.5, phMax: 7.0 },
  { soilType: "Kanhar", cropName: "Wheat", season: "Rabi", phMin: 6.0, phMax: 7.5 },
  { soilType: "Kanhar", cropName: "Gram", season: "Rabi", phMin: 6.0, phMax: 7.5 },
  { soilType: "Kanhar", cropName: "Cotton", season: "Kharif", phMin: 6.0, phMax: 8.0 },
  { soilType: "Kanhar", cropName: "Soybean", season: "Kharif", phMin: 6.0, phMax: 7.0 },
  { soilType: "Kanhar", cropName: "Tur/Arhar", season: "Kharif", phMin: 5.5, phMax: 7.5 },
  { soilType: "Matasi", cropName: "Millets", season: "Kharif", phMin: 5.5, phMax: 7.5 },
  { soilType: "Matasi", cropName: "Groundnut", season: "Kharif", phMin: 5.5, phMax: 7.0 },
  { soilType: "Matasi", cropName: "Pulses", season: "Rabi", phMin: 6.0, phMax: 7.5 },
  { soilType: "Matasi", cropName: "Moong", season: "Kharif", phMin: 6.0, phMax: 7.5 },
  { soilType: "Matasi", cropName: "Urad", season: "Kharif", phMin: 5.5, phMax: 7.0 },
  { soilType: "Dorsa", cropName: "Rice", season: "Kharif", phMin: 5.5, phMax: 7.0 },
  { soilType: "Dorsa", cropName: "Maize", season: "Kharif", phMin: 5.8, phMax: 7.0 },
  { soilType: "Dorsa", cropName: "Vegetables", season: "Zaid", phMin: 6.0, phMax: 7.0 },
  { soilType: "Dorsa", cropName: "Soybean", season: "Kharif", phMin: 6.0, phMax: 7.0 },
  { soilType: "Dorsa", cropName: "Tur/Arhar", season: "Kharif", phMin: 5.5, phMax: 7.5 },
  { soilType: "Bhata", cropName: "Millets", season: "Kharif", phMin: 5.0, phMax: 7.0 },
  { soilType: "Bhata", cropName: "Maize", season: "Kharif", phMin: 5.8, phMax: 7.0 },
  { soilType: "Bhata", cropName: "Tuber crops", season: "Rabi", phMin: 5.5, phMax: 7.0 },
];

export const seedSoilReferences = async () => {
  await prisma.soilCropReference.deleteMany();
  await prisma.soilCropReference.createMany({
    data: rows,
  });
};

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  seedSoilReferences()
    .then(async () => {
      console.log(`Seeded ${rows.length} soil crop reference rows.`);
      await prisma.$disconnect();
    })
    .catch(async (error) => {
      console.error("Failed to seed soil crop references:", error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
