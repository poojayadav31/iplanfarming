import "dotenv/config";
import prisma from "../../src/config/prisma.js";
import { seedCrops, CROP_ROWS } from "./cropSeed.js";
import { seedSoilReferences } from "./soilCropSeed.js";
import { seedCropEconomics, CROP_ECONOMICS_ROWS } from "./cropEconomicsSeed.js";

const runSeeds = async () => {
  await seedSoilReferences();
  await seedCrops();
  await seedCropEconomics();
};

runSeeds()
  .then(async () => {
    console.log("Seeded soil crop reference rows.");
    console.log(`Seeded ${CROP_ROWS.length} crop rules.`);
    console.log(`Seeded ${CROP_ECONOMICS_ROWS.length} crop economics records.`);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to seed data:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
