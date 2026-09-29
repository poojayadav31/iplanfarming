import "dotenv/config";
import cron from "node-cron";
import app from "./app.js";
import { aggregatePestAlerts } from "./services/intelligence.service.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Run pest-alert aggregation every day at 2 AM
cron.schedule("0 2 * * *", async () => {
  try {
    await aggregatePestAlerts();
    console.log("[cron] Pest alert aggregation complete");
  } catch (e) {
    console.error("[cron] Pest alert aggregation failed:", e.message);
  }
});
