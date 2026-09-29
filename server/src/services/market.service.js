import prisma from "../config/prisma.js";
import { AppError } from "../utils/errors.js";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

const requireFarmer = (user) => {
  if (user?.role !== "FARMER" || !user.farmerId)
    throw new AppError("Only farmers can access this resource", 403);
  return user.farmerId;
};

const requireCustomer = (user) => {
  if (user?.role !== "CUSTOMER" || !user.customerId)
    throw new AppError("Only customers can access this resource", 403);
  return user.customerId;
};

const round = (n) => Math.round(n * 100) / 100;

// ─── Auto-publish: flip UPCOMING → AVAILABLE 75 days before harvest ──────────

const autoPublishDue = async (farmId) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 75);
  await prisma.supply.updateMany({
    where: {
      farmId,
      status: "UPCOMING",
      isPublished: false,
      predictedHarvestDate: { lte: cutoff },
    },
    data: { status: "AVAILABLE", isPublished: true },
  });
};

// ─── Demand matching: link open demands to a newly published supply ───────────

const matchDemands = async (supply) => {
  const openDemands = await prisma.demand.findMany({
    where: {
      cropName: supply.cropName,
      status: "OPEN",
      neededByDate: { gte: supply.predictedHarvestDate },
      form: supply.form,
    },
  });

  for (const demand of openDemands) {
    await prisma.demandMatch.upsert({
      where: { supplyId_demandId: { supplyId: supply.id, demandId: demand.id } },
      update: {},
      create: { supplyId: supply.id, demandId: demand.id },
    });
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FARMER SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

export const getFarmerSupplies = async (user) => {
  const farmerId = requireFarmer(user);

  const farms = await prisma.farm.findMany({
    where: { farmerId },
    select: { id: true },
  });
  const farmIds = farms.map((f) => f.id);

  // Trigger auto-publish for all farmer's farms (errors are non-fatal)
  await Promise.all(farmIds.map((fid) => autoPublishDue(fid).catch(() => {})));

  const supplies = await prisma.supply.findMany({
    where: { farmId: { in: farmIds } },
    include: {
      farm: { select: { name: true, district: true } },
      zone: { select: { name: true, zoneNumber: true } },
      orders: {
        select: { id: true, quantityKg: true, totalAmount: true, status: true },
      },
    },
    orderBy: { predictedHarvestDate: "asc" },
  });

  return supplies.map((s) => ({
    ...s,
    soldQuantityKg: s.orders
      .filter((o) => !["CANCELLED"].includes(o.status))
      .reduce((sum, o) => sum + o.quantityKg, 0),
    totalRevenue: s.orders
      .filter((o) => o.status === "DELIVERED")
      .reduce((sum, o) => sum + o.totalAmount, 0),
    pendingOrders: s.orders.filter((o) =>
      ["PENDING", "CONFIRMED", "PACKED", "DISPATCHED"].includes(o.status)
    ).length,
  }));
};

export const updateSupply = async (supplyId, body, user) => {
  const farmerId = requireFarmer(user);
  const supply = await prisma.supply.findFirst({
    where: { id: supplyId, farm: { farmerId } },
  });
  if (!supply) throw new AppError("Supply not found", 404);

  const { pricePerKg, availableQuantityKg, minOrderKg, grade, form, notes, isPublished } = body;

  const updateData = {};
  if (pricePerKg !== undefined)         updateData.pricePerKg = pricePerKg;
  if (availableQuantityKg !== undefined) updateData.availableQuantityKg = availableQuantityKg;
  if (minOrderKg !== undefined)         updateData.minOrderKg = minOrderKg;
  if (grade !== undefined)              updateData.grade = grade;
  if (form !== undefined)               updateData.form = form;
  if (notes !== undefined)              updateData.notes = notes;

  // When farmer manually publishes, flip status to AVAILABLE
  if (isPublished !== undefined) {
    updateData.isPublished = isPublished;
    if (isPublished && supply.status === "UPCOMING") {
      updateData.status = "AVAILABLE";
    }
  }

  const updated = await prisma.supply.update({
    where: { id: supplyId },
    data: updateData,
  });

  // Match open demands when supply becomes available
  if (updated.isPublished && supply.status !== "AVAILABLE") {
    await matchDemands(updated);
  }

  return updated;
};

export const getDemandAlerts = async (user) => {
  const farmerId = requireFarmer(user);

  // Get all crops this farmer grows
  const assignments = await prisma.zoneCropAssignment.findMany({
    where: { zone: { farm: { farmerId } } },
    select: { cropEconomics: { select: { cropName: true } } },
  });
  const cropNames = [...new Set(assignments.map((a) => a.cropEconomics.cropName))];

  // Get farmer's districts
  const farms = await prisma.farm.findMany({
    where: { farmerId },
    select: { district: true },
  });
  const districts = farms.map((f) => f.district);

  const demands = await prisma.demand.findMany({
    where: {
      cropName: { in: cropNames },
      status: "OPEN",
      neededByDate: { gte: new Date() },
    },
    include: {
      customer: { include: { user: { select: { name: true } } } },
    },
    orderBy: { neededByDate: "asc" },
  });

  return demands.map((d) => ({
    ...d,
    isNearby: d.preferredDistrict ? districts.includes(d.preferredDistrict) : true,
  }));
};

export const getIncomingOrders = async (user) => {
  const farmerId = requireFarmer(user);

  return prisma.order.findMany({
    where: { farmerId },
    include: {
      supply: { select: { cropName: true, form: true, farm: { select: { name: true } } } },
      customer: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateOrderStatus = async (orderId, body, user) => {
  const farmerId = requireFarmer(user);
  const order = await prisma.order.findFirst({ where: { id: orderId, farmerId } });
  if (!order) throw new AppError("Order not found", 404);

  const { status, farmerNote } = body;

  // Farmer can only move forward: PENDING→CONFIRMED→PACKED→DISPATCHED
  const FARMER_ALLOWED = ["CONFIRMED", "PACKED", "DISPATCHED", "CANCELLED"];
  if (!FARMER_ALLOWED.includes(status))
    throw new AppError(`Invalid status transition: ${status}`, 400);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      farmerNote: farmerNote ?? order.farmerNote,
      ...(status === "CANCELLED" ? { cancelledBy: "FARMER" } : {}),
    },
  });

  // Restore supply qty if cancelled
  if (status === "CANCELLED") {
    await prisma.supply.update({
      where: { id: order.supplyId },
      data: { availableQuantityKg: { increment: order.quantityKg } },
    });
    await _recalcSupplyStatus(order.supplyId);
  }

  return updated;
};

export const getOrderBook = async (user) => {
  const farmerId = requireFarmer(user);

  const orders = await prisma.order.findMany({
    where: { farmerId, status: { not: "CANCELLED" } },
    include: { supply: { select: { cropName: true } } },
  });

  const delivered = orders.filter((o) => o.status === "DELIVERED");
  const pending   = orders.filter((o) => ["PENDING", "CONFIRMED", "PACKED", "DISPATCHED"].includes(o.status));

  const byCrop = {};
  for (const o of delivered) {
    const c = o.supply.cropName;
    if (!byCrop[c]) byCrop[c] = { cropName: c, quantitySoldKg: 0, revenue: 0, orderCount: 0 };
    byCrop[c].quantitySoldKg += o.quantityKg;
    byCrop[c].revenue        += o.totalAmount;
    byCrop[c].orderCount     += 1;
  }

  // Monthly revenue for the last 6 months
  const monthlyMap = {};
  for (const o of delivered) {
    const key = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
    monthlyMap[key] = (monthlyMap[key] ?? 0) + o.totalAmount;
  }

  return {
    summary: {
      totalRevenue:     round(delivered.reduce((s, o) => s + o.totalAmount, 0)),
      totalQuantitySoldKg: delivered.reduce((s, o) => s + o.quantityKg, 0),
      pendingOrderCount:   pending.length,
      deliveredOrderCount: delivered.length,
    },
    byCrop: Object.values(byCrop),
    monthly: Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue: round(revenue) })),
    recentOrders: orders.slice(0, 20),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOMER SERVICES
// ═══════════════════════════════════════════════════════════════════════════════

export const browseSupplies = async (query) => {
  const { crop, district, form, maxPrice, fromDate, toDate, page = 1, limit = 20 } = query;

  const where = {
    isPublished: true,
    status: { in: ["AVAILABLE", "PARTIALLY_SOLD"] },
    availableQuantityKg: { gt: 0 },
  };

  if (crop)      where.cropName = { contains: crop, mode: "insensitive" };
  if (district)  where.district = { contains: district, mode: "insensitive" };
  if (form)      where.form = form;
  if (maxPrice)  where.pricePerKg = { lte: parseFloat(maxPrice) };
  if (fromDate)  where.predictedHarvestDate = { ...(where.predictedHarvestDate ?? {}), gte: new Date(fromDate) };
  if (toDate)    where.predictedHarvestDate = { ...(where.predictedHarvestDate ?? {}), lte: new Date(toDate) };

  const [total, supplies] = await Promise.all([
    prisma.supply.count({ where }),
    prisma.supply.findMany({
      where,
      include: {
        farm: { select: { name: true, district: true, state: true, centroid: true } },
        zone: { select: { name: true } },
      },
      orderBy: [{ district: "asc" }, { predictedHarvestDate: "asc" }],
      skip: (page - 1) * limit,
      take: Number(limit),
    }),
  ]);

  return { total, page: Number(page), limit: Number(limit), supplies };
};

export const placeOrder = async (body, user) => {
  const customerId = requireCustomer(user);
  const { supplyId, quantityKg, paymentMethod, deliveryAddress, demandId, customerNote } = body;

  const supply = await prisma.supply.findFirst({
    where: {
      id: supplyId,
      isPublished: true,
      status: { in: ["AVAILABLE", "PARTIALLY_SOLD"] },
    },
    include: { farm: { select: { farmerId: true } } },
  });
  if (!supply) throw new AppError("Supply not found or unavailable", 404);
  if (quantityKg < supply.minOrderKg)
    throw new AppError(`Minimum order is ${supply.minOrderKg} kg`, 400);
  if (quantityKg > supply.availableQuantityKg)
    throw new AppError(`Only ${supply.availableQuantityKg} kg available`, 400);

  const farmerId = supply.farm?.farmerId;
  if (!farmerId) throw new AppError("Farmer not found", 500);

  const totalAmount = round(quantityKg * supply.pricePerKg);

  const [order] = await prisma.$transaction([
    prisma.order.create({
      data: {
        supplyId,
        customerId,
        farmerId,
        demandId: demandId ?? null,
        quantityKg,
        pricePerKg: supply.pricePerKg,
        totalAmount,
        paymentMethod: paymentMethod ?? "COD",
        deliveryAddress,
        customerNote: customerNote ?? null,
      },
    }),
    prisma.supply.update({
      where: { id: supplyId },
      data: { availableQuantityKg: { decrement: quantityKg } },
    }),
  ]);

  await _recalcSupplyStatus(supplyId);
  return order;
};

export const getMyOrders = async (user) => {
  const customerId = requireCustomer(user);

  return prisma.order.findMany({
    where: { customerId },
    include: {
      supply: {
        include: { farm: { select: { name: true, district: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const cancelOrder = async (orderId, body, user) => {
  const customerId = requireCustomer(user);
  const order = await prisma.order.findFirst({ where: { id: orderId, customerId } });
  if (!order) throw new AppError("Order not found", 404);

  if (["PACKED", "DISPATCHED", "DELIVERED"].includes(order.status))
    throw new AppError("Cannot cancel order after it has been packed", 400);

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "CANCELLED",
      cancelledBy: "CUSTOMER",
      cancelReason: body.reason ?? null,
    },
  });

  await prisma.supply.update({
    where: { id: order.supplyId },
    data: { availableQuantityKg: { increment: order.quantityKg } },
  });
  await _recalcSupplyStatus(order.supplyId);

  return updated;
};

export const createDemand = async (body, user) => {
  const customerId = requireCustomer(user);
  const { cropName, quantityKg, maxPricePerKg, neededByDate, preferredDistrict, preferredState, form, notes } = body;

  if (!cropName || !quantityKg || !neededByDate)
    throw new AppError("cropName, quantityKg, and neededByDate are required", 400);

  const demand = await prisma.demand.create({
    data: {
      customerId,
      cropName,
      quantityKg,
      maxPricePerKg: maxPricePerKg ?? null,
      neededByDate: new Date(neededByDate),
      preferredDistrict: preferredDistrict ?? null,
      preferredState: preferredState ?? "Chhattisgarh",
      form: form ?? "RAW",
      notes: notes ?? null,
    },
  });

  // Find existing matching supplies and notify
  const matchingSupplies = await prisma.supply.findMany({
    where: {
      cropName: demand.cropName,
      isPublished: true,
      status: { in: ["AVAILABLE", "PARTIALLY_SOLD"] },
      predictedHarvestDate: { lte: demand.neededByDate },
      form: demand.form,
    },
  });
  for (const s of matchingSupplies) {
    await prisma.demandMatch.upsert({
      where: { supplyId_demandId: { supplyId: s.id, demandId: demand.id } },
      update: {},
      create: { supplyId: s.id, demandId: demand.id },
    });
  }

  return demand;
};

export const getMyDemands = async (user) => {
  const customerId = requireCustomer(user);

  const demands = await prisma.demand.findMany({
    where: { customerId },
    include: {
      demandMatches: {
        include: {
          supply: {
            include: {
              farm: { select: { name: true, district: true, state: true } },
              zone: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return demands;
};

export const updateDemand = async (demandId, body, user) => {
  const customerId = requireCustomer(user);
  const demand = await prisma.demand.findFirst({ where: { id: demandId, customerId } });
  if (!demand) throw new AppError("Demand not found", 404);
  if (demand.status === "FULFILLED") throw new AppError("Cannot edit a fulfilled demand", 400);

  const { quantityKg, maxPricePerKg, neededByDate, notes, status } = body;
  const updateData = {};
  if (quantityKg !== undefined)    updateData.quantityKg = quantityKg;
  if (maxPricePerKg !== undefined) updateData.maxPricePerKg = maxPricePerKg;
  if (neededByDate !== undefined)  updateData.neededByDate = new Date(neededByDate);
  if (notes !== undefined)         updateData.notes = notes;
  if (status === "CANCELLED")      updateData.status = "CANCELLED";

  return prisma.demand.update({ where: { id: demandId }, data: updateData });
};

// ─── Internal: recalculate supply status after qty change ────────────────────

const _recalcSupplyStatus = async (supplyId) => {
  const supply = await prisma.supply.findUnique({
    where: { id: supplyId },
    select: { availableQuantityKg: true, estimatedQuantityKg: true, isPublished: true },
  });
  if (!supply) return;

  let status;
  if (!supply.isPublished)                             status = "UPCOMING";
  else if (supply.availableQuantityKg <= 0)            status = "SOLD_OUT";
  else if (supply.availableQuantityKg < supply.estimatedQuantityKg) status = "PARTIALLY_SOLD";
  else                                                 status = "AVAILABLE";

  await prisma.supply.update({ where: { id: supplyId }, data: { status } });
};
