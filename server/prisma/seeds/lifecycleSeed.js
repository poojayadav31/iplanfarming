import prisma from "../../src/config/prisma.js";
import { fileURLToPath } from "node:url";

// Mirrors the CROP_LIFECYCLE + CROP_OBSERVATIONS constants from farmCalendar.service.js.
// Experts can edit these rows via the Expert Panel without code changes.
const TEMPLATES = [
  // ─── Haldi ────────────────────────────────────────────────────────────────
  { cropName: "Haldi", weekOffset:  0, taskType: "field_prep",   category: "crop_care", workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Field Preparation & Bunding" },
  { cropName: "Haldi", weekOffset:  1, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  4, priority: "morning",   title: "Beejamrit Rhizome Treatment",          recipeKey: "Beejamrit" },
  { cropName: "Haldi", weekOffset:  2, taskType: "planting",     category: "crop_care", workers: 6, hoursPerAcre: 40, priority: "morning",   title: "Haldi Rhizome Planting" },
  { cropName: "Haldi", weekOffset:  4, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #1",             recipeKey: "Jeevamrit" },
  { cropName: "Haldi", weekOffset:  6, taskType: "thinning",     category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "morning",   title: "Thinning & First Weeding" },
  { cropName: "Haldi", weekOffset:  8, taskType: "mulching",     category: "crop_care", workers: 4, hoursPerAcre: 20, priority: "afternoon", title: "Mulching with Crop Residue" },
  { cropName: "Haldi", weekOffset: 10, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #2",             recipeKey: "Jeevamrit" },
  { cropName: "Haldi", weekOffset: 12, taskType: "weeding",      category: "crop_care", workers: 5, hoursPerAcre: 24, priority: "morning",   title: "Weeding" },
  { cropName: "Haldi", weekOffset: 14, taskType: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #1",            recipeKey: "Agniastra" },
  { cropName: "Haldi", weekOffset: 16, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #3",             recipeKey: "Jeevamrit" },
  { cropName: "Haldi", weekOffset: 20, taskType: "weeding",      category: "crop_care", workers: 5, hoursPerAcre: 20, priority: "morning",   title: "Weeding & Earthing Up" },
  { cropName: "Haldi", weekOffset: 24, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #4",             recipeKey: "Jeevamrit" },
  { cropName: "Haldi", weekOffset: 28, taskType: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #2",            recipeKey: "Agniastra" },
  { cropName: "Haldi", weekOffset: 32, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #5 (Pre-harvest)", recipeKey: "Jeevamrit" },
  { cropName: "Haldi", weekOffset: 36, taskType: "harvest",      category: "harvest",   workers: 8, hoursPerAcre: 80, priority: "morning",   title: "Haldi Harvest — Opening Window" },
  { cropName: "Haldi", weekOffset: 38, taskType: "harvest",      category: "harvest",   workers: 8, hoursPerAcre: 80, priority: "morning",   title: "Haldi Harvest (continued)" },
  // Haldi observations
  { cropName: "Haldi", weekOffset:  6, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Germination Check",            isObservation: true },
  { cropName: "Haldi", weekOffset: 12, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Canopy Growth Assessment",     isObservation: true },
  { cropName: "Haldi", weekOffset: 20, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Pest & Disease Scouting",      isObservation: true },
  { cropName: "Haldi", weekOffset: 30, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Rhizome Size Assessment",      isObservation: true },

  // ─── Papaya ───────────────────────────────────────────────────────────────
  { cropName: "Papaya", weekOffset:  0, taskType: "field_prep",   category: "crop_care", workers: 5, hoursPerAcre: 40, priority: "morning",   title: "Field Preparation for Papaya" },
  { cropName: "Papaya", weekOffset:  1, taskType: "planting",     category: "crop_care", workers: 5, hoursPerAcre: 32, priority: "morning",   title: "Papaya Seedling Transplanting" },
  { cropName: "Papaya", weekOffset:  3, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #1",             recipeKey: "Jeevamrit" },
  { cropName: "Papaya", weekOffset:  6, taskType: "mulching",     category: "crop_care", workers: 4, hoursPerAcre: 20, priority: "afternoon", title: "Mulching" },
  { cropName: "Papaya", weekOffset:  8, taskType: "weeding",      category: "crop_care", workers: 4, hoursPerAcre: 20, priority: "morning",   title: "Weeding" },
  { cropName: "Papaya", weekOffset: 10, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #2",             recipeKey: "Jeevamrit" },
  { cropName: "Papaya", weekOffset: 12, taskType: "pruning",      category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "morning",   title: "Pruning & Staking" },
  { cropName: "Papaya", weekOffset: 16, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #3",             recipeKey: "Jeevamrit" },
  { cropName: "Papaya", weekOffset: 18, taskType: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #1",            recipeKey: "Agniastra" },
  { cropName: "Papaya", weekOffset: 20, taskType: "weeding",      category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "morning",   title: "Weeding" },
  { cropName: "Papaya", weekOffset: 24, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #4",             recipeKey: "Jeevamrit" },
  { cropName: "Papaya", weekOffset: 25, taskType: "pruning",      category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "morning",   title: "Pruning & Training" },
  { cropName: "Papaya", weekOffset: 30, taskType: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control #2",            recipeKey: "Agniastra" },
  { cropName: "Papaya", weekOffset: 36, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #5",             recipeKey: "Jeevamrit" },
  { cropName: "Papaya", weekOffset: 40, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest Begins" },
  { cropName: "Papaya", weekOffset: 44, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (bi-weekly)" },
  { cropName: "Papaya", weekOffset: 48, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (bi-weekly)" },
  { cropName: "Papaya", weekOffset: 52, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (bi-weekly)" },
  { cropName: "Papaya", weekOffset: 56, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #6 (Year 2)",    recipeKey: "Jeevamrit" },
  { cropName: "Papaya", weekOffset: 60, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
  { cropName: "Papaya", weekOffset: 64, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
  { cropName: "Papaya", weekOffset: 68, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
  { cropName: "Papaya", weekOffset: 72, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 48, priority: "morning",   title: "Papaya Harvest (Year 2)" },
  // Papaya observations
  { cropName: "Papaya", weekOffset:  4, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Seedling Establishment Check",  isObservation: true },
  { cropName: "Papaya", weekOffset: 12, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Flowering Onset Assessment",    isObservation: true },
  { cropName: "Papaya", weekOffset: 24, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Fruit Set Monitoring",          isObservation: true },
  { cropName: "Papaya", weekOffset: 36, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Pre-harvest Maturity Check",    isObservation: true },

  // ─── Creepers ─────────────────────────────────────────────────────────────
  { cropName: "Creepers", weekOffset:  0, taskType: "field_prep",   category: "crop_care", workers: 5, hoursPerAcre: 36, priority: "morning",   title: "Field Preparation for Creepers" },
  { cropName: "Creepers", weekOffset:  1, taskType: "planting",     category: "crop_care", workers: 5, hoursPerAcre: 30, priority: "morning",   title: "Creeper Seeding" },
  { cropName: "Creepers", weekOffset:  2, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  4, priority: "morning",   title: "Beejamrit Seed Treatment",             recipeKey: "Beejamrit" },
  { cropName: "Creepers", weekOffset:  3, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #1",             recipeKey: "Jeevamrit" },
  { cropName: "Creepers", weekOffset:  4, taskType: "training",     category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "afternoon", title: "Trellis Setup & Vine Training" },
  { cropName: "Creepers", weekOffset:  6, taskType: "thinning",     category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "morning",   title: "Thinning" },
  { cropName: "Creepers", weekOffset:  8, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #2",             recipeKey: "Jeevamrit" },
  { cropName: "Creepers", weekOffset:  9, taskType: "weeding",      category: "crop_care", workers: 4, hoursPerAcre: 16, priority: "morning",   title: "Weeding" },
  { cropName: "Creepers", weekOffset: 11, taskType: "pruning",      category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "afternoon", title: "Vine Pruning & Training" },
  { cropName: "Creepers", weekOffset: 12, taskType: "pest_control", category: "inputs",    workers: 3, hoursPerAcre:  5, priority: "afternoon", title: "Agniastra Pest Control",               recipeKey: "Agniastra" },
  { cropName: "Creepers", weekOffset: 14, taskType: "fertilizer",   category: "inputs",    workers: 3, hoursPerAcre:  6, priority: "morning",   title: "Jeevamrit Application #3",             recipeKey: "Jeevamrit" },
  { cropName: "Creepers", weekOffset: 16, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 36, priority: "morning",   title: "Creepers Harvest — Opening Window" },
  { cropName: "Creepers", weekOffset: 18, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 36, priority: "morning",   title: "Creepers Harvest (continued)" },
  { cropName: "Creepers", weekOffset: 20, taskType: "harvest",      category: "harvest",   workers: 6, hoursPerAcre: 36, priority: "morning",   title: "Creepers Final Harvest" },
  { cropName: "Creepers", weekOffset: 22, taskType: "field_prep",   category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "afternoon", title: "Crop Removal & Field Cleanup" },
  // Creepers observations
  { cropName: "Creepers", weekOffset:  3, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Germination Rate Check",       isObservation: true },
  { cropName: "Creepers", weekOffset:  8, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Vine Growth & Health Check",   isObservation: true },
  { cropName: "Creepers", weekOffset: 14, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Fruit Development Assessment", isObservation: true },

  // ─── Leafy Vegetable ──────────────────────────────────────────────────────
  { cropName: "Leafy Vegetable", weekOffset:  0, taskType: "field_prep",   category: "crop_care", workers: 4, hoursPerAcre: 30, priority: "morning",   title: "Bed Preparation for Leafy Veg" },
  { cropName: "Leafy Vegetable", weekOffset:  1, taskType: "planting",     category: "crop_care", workers: 3, hoursPerAcre: 24, priority: "morning",   title: "Seed Sowing" },
  { cropName: "Leafy Vegetable", weekOffset:  1, taskType: "fertilizer",   category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "morning",   title: "Jeevamrit Application #1",             recipeKey: "Jeevamrit" },
  { cropName: "Leafy Vegetable", weekOffset:  2, taskType: "thinning",     category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "morning",   title: "Thinning & Gap Filling" },
  { cropName: "Leafy Vegetable", weekOffset:  3, taskType: "weeding",      category: "crop_care", workers: 3, hoursPerAcre: 16, priority: "morning",   title: "First Weeding" },
  { cropName: "Leafy Vegetable", weekOffset:  4, taskType: "fertilizer",   category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "morning",   title: "Jeevamrit Application #2",             recipeKey: "Jeevamrit" },
  { cropName: "Leafy Vegetable", weekOffset:  5, taskType: "weeding",      category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "morning",   title: "Second Weeding" },
  { cropName: "Leafy Vegetable", weekOffset:  6, taskType: "pest_control", category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "afternoon", title: "Agniastra Pest Control",               recipeKey: "Agniastra" },
  { cropName: "Leafy Vegetable", weekOffset:  7, taskType: "fertilizer",   category: "inputs",    workers: 2, hoursPerAcre:  4, priority: "morning",   title: "Jeevamrit Application #3 (Pre-harvest)", recipeKey: "Jeevamrit" },
  { cropName: "Leafy Vegetable", weekOffset:  8, taskType: "harvest",      category: "harvest",   workers: 5, hoursPerAcre: 25, priority: "morning",   title: "Leafy Veg Harvest Begins" },
  { cropName: "Leafy Vegetable", weekOffset: 10, taskType: "harvest",      category: "harvest",   workers: 5, hoursPerAcre: 25, priority: "morning",   title: "Leafy Veg Final Harvest" },
  { cropName: "Leafy Vegetable", weekOffset: 11, taskType: "field_prep",   category: "crop_care", workers: 3, hoursPerAcre: 12, priority: "afternoon", title: "Crop Removal & Composting" },
  // Leafy Vegetable observations
  { cropName: "Leafy Vegetable", weekOffset:  2, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Germination Uniformity Check", isObservation: true },
  { cropName: "Leafy Vegetable", weekOffset:  5, taskType: "observation",  category: "observation", workers: 1, hoursPerAcre: 1, priority: "morning",  title: "Leaf Quality Assessment",      isObservation: true },
];

export const seedLifecycleTemplates = async () => {
  await prisma.cropLifecycleTemplate.deleteMany();
  await prisma.cropLifecycleTemplate.createMany({ data: TEMPLATES });
};

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  seedLifecycleTemplates()
    .then(async () => {
      console.log(`Seeded ${TEMPLATES.length} lifecycle template rows.`);
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("Failed:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
