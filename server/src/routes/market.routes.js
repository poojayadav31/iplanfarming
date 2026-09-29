import { Router } from "express";
import {
  listMySupplies,
  editSupply,
  listDemandAlerts,
  listIncomingOrders,
  changeOrderStatus,
  fetchOrderBook,
  listSupplies,
  createOrder,
  listMyOrders,
  cancelMyOrder,
  postDemand,
  listMyDemands,
  editDemand,
} from "../controllers/market.controller.js";

const router = Router();

// ─── Farmer routes ────────────────────────────────────────────────────────────
router.get("/farmer/supplies",             listMySupplies);
router.patch("/farmer/supplies/:supplyId", editSupply);
router.get("/farmer/demand-alerts",        listDemandAlerts);
router.get("/farmer/orders",               listIncomingOrders);
router.patch("/farmer/orders/:orderId",    changeOrderStatus);
router.get("/farmer/order-book",           fetchOrderBook);

// ─── Customer routes ──────────────────────────────────────────────────────────
router.get("/supplies",                       listSupplies);
router.post("/orders",                        createOrder);
router.get("/customer/orders",                listMyOrders);
router.patch("/customer/orders/:orderId/cancel", cancelMyOrder);
router.post("/demands",                       postDemand);
router.get("/customer/demands",               listMyDemands);
router.patch("/customer/demands/:demandId",   editDemand);

export default router;
