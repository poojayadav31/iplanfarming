import {
  getFarmEconomics, getWeeklyEconomics,
  getEconomicsConfig, updateEconomicsConfig,
  getFarmFinancials, saveFarmFinancials,
} from "../services/farmEconomics.service.js";

const wrap = (fn) => (req, res, next) => fn(req, res).catch(next);

export const getEconomics              = wrap(async (req, res) => res.json({ success: true, data: await getFarmEconomics(req.params.farmId, req.user) }));
export const getWeeklyEconomicsHandler = wrap(async (req, res) => res.json({ success: true, data: await getWeeklyEconomics(req.params.farmId, { startDate: req.query.startDate }, req.user) }));

export const getConfig    = wrap(async (_req, res) => res.json({ success: true, data: await getEconomicsConfig() }));
export const patchConfig  = wrap(async (req, res) => res.json({ success: true, data: await updateEconomicsConfig(req.user, req.body) }));

export const getFinancials  = wrap(async (req, res) => res.json({ success: true, data: await getFarmFinancials(req.params.farmId, req.user) }));
export const saveFinancials = wrap(async (req, res) => res.json({ success: true, data: await saveFarmFinancials(req.params.farmId, req.user, req.body) }));
