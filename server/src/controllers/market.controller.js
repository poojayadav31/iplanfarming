import * as marketService from "../services/market.service.js";

// ─── Farmer controllers ───────────────────────────────────────────────────────

export const listMySupplies = async (req, res) => {
  const data = await marketService.getFarmerSupplies(req.user);
  res.json({ success: true, data });
};

export const editSupply = async (req, res) => {
  const data = await marketService.updateSupply(req.params.supplyId, req.body, req.user);
  res.json({ success: true, data });
};

export const listDemandAlerts = async (req, res) => {
  const data = await marketService.getDemandAlerts(req.user);
  res.json({ success: true, data });
};

export const listIncomingOrders = async (req, res) => {
  const data = await marketService.getIncomingOrders(req.user);
  res.json({ success: true, data });
};

export const changeOrderStatus = async (req, res) => {
  const data = await marketService.updateOrderStatus(req.params.orderId, req.body, req.user);
  res.json({ success: true, data });
};

export const fetchOrderBook = async (req, res) => {
  const data = await marketService.getOrderBook(req.user);
  res.json({ success: true, data });
};

// ─── Customer controllers ─────────────────────────────────────────────────────

export const listSupplies = async (req, res) => {
  const data = await marketService.browseSupplies(req.query);
  res.json({ success: true, data });
};

export const createOrder = async (req, res) => {
  const data = await marketService.placeOrder(req.body, req.user);
  res.status(201).json({ success: true, data });
};

export const listMyOrders = async (req, res) => {
  const data = await marketService.getMyOrders(req.user);
  res.json({ success: true, data });
};

export const cancelMyOrder = async (req, res) => {
  const data = await marketService.cancelOrder(req.params.orderId, req.body, req.user);
  res.json({ success: true, data });
};

export const postDemand = async (req, res) => {
  const data = await marketService.createDemand(req.body, req.user);
  res.status(201).json({ success: true, data });
};

export const listMyDemands = async (req, res) => {
  const data = await marketService.getMyDemands(req.user);
  res.json({ success: true, data });
};

export const editDemand = async (req, res) => {
  const data = await marketService.updateDemand(req.params.demandId, req.body, req.user);
  res.json({ success: true, data });
};
