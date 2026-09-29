import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import farmRouter from "./routes/farm.routes.js";
import soilRouter from "./routes/soil.routes.js";
import cropRouter from "./routes/crop.routes.js";
import calcRouter from "./routes/farmCalculations.routes.js";
import economicsRouter from "./routes/farmEconomics.routes.js";
import { farmPlanRouter, zonePlanRouter } from "./routes/farmPlan.routes.js";
import waterRouter from "./routes/water.routes.js";
import calendarRouter from "./routes/farmCalendar.routes.js";
import marketRouter from "./routes/market.routes.js";
import expertRouter from "./routes/expert.routes.js";
import farmerRouter from "./routes/farmer.routes.js";
import intelligenceRouter from "./routes/intelligence.routes.js";
import designerRouter from "./routes/designer.routes.js";
import { requireAuth as authMiddleware } from "./middleware/auth.middleware.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/farms", authMiddleware, farmRouter);
app.use("/api/farms", authMiddleware, soilRouter);
app.use("/api/farms", authMiddleware, designerRouter);
app.use("/api/zones", authMiddleware, cropRouter);
app.use("/api/zones", authMiddleware, calcRouter);
app.use("/api/farms", authMiddleware, economicsRouter);
app.use("/api/farms", authMiddleware, farmPlanRouter);
app.use("/api/zones", authMiddleware, zonePlanRouter);
app.use("/api/farms/:farmId/water", authMiddleware, waterRouter);
app.use("/api/farms", authMiddleware, calendarRouter);
app.use("/api/market", authMiddleware, marketRouter);
app.use("/api/expert", authMiddleware, expertRouter);
app.use("/api/farmer", authMiddleware, farmerRouter);
app.use("/api/intel", authMiddleware, intelligenceRouter);

// Catch-all 404 for unknown API routes
app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
