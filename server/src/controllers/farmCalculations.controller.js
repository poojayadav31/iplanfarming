import {
  getInputRecipe,
  getFinancialEstimate,
} from "../services/farmCalculations.service.js";

export const getRecipe = async (req, res) => {
  const data = await getInputRecipe(req.params.zoneId, req.query.type, req.user);
  res.status(200).json({ success: true, data });
};

export const getFinancial = async (req, res) => {
  const data = await getFinancialEstimate(req.params.zoneId, req.query.crop, req.user);
  res.status(200).json({ success: true, data });
};
