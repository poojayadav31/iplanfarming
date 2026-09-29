/**
 * Backfill calendar tasks for all zones that have a crop assignment.
 * Run: node src/scripts/backfill-calendar-tasks.js
 *
 * Safe to re-run — uses upsert with skipDuplicates.
 * Deletes existing tasks for each zone first so checklist items and
 * observation tasks are regenerated fresh.
 */

import prisma from "../config/prisma.js";
import { generateTasksForZone } from "../services/farmCalendar.service.js";

async function main() {
  const assignments = await prisma.zoneCropAssignment.findMany({
    include: {
      zone: { include: { farm: true } },
    },
  });

  if (assignments.length === 0) {
    console.log("No zone crop assignments found — nothing to backfill.");
    return;
  }

  console.log(`Found ${assignments.length} zone assignment(s). Regenerating tasks...\n`);

  let success = 0;
  let failed  = 0;

  for (const assignment of assignments) {
    const { zone } = assignment;
    const farm     = zone.farm;

    try {
      // Remove stale tasks so observation tasks + checklists are added fresh
      const deleted = await prisma.calendarTask.deleteMany({
        where: { zoneId: zone.id },
      });
      console.log(`  Zone "${zone.name}" (${zone.id}): deleted ${deleted.count} old tasks`);

      await generateTasksForZone(zone.id, farm.id, farm.createdAt);
      const count = await prisma.calendarTask.count({ where: { zoneId: zone.id } });
      console.log(`  Zone "${zone.name}": generated ${count} tasks ✓`);
      success++;
    } catch (err) {
      console.error(`  Zone "${zone.name}" FAILED:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone. ${success} zones regenerated, ${failed} failed.`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
