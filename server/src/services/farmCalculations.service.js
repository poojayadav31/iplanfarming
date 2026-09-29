import prisma from "../config/prisma.js";
import {
  RECIPES,
  CROP_FINANCIALS,
  BASE_INPUT_COST_PER_ACRE,
  SQ_METERS_PER_ACRE,
} from "../constants/naturalFarming.js";
import { getFarmerIdFromUser } from "../utils/serviceUtils.js";

const fetchZone = async (zoneId, farmerId) => {
  const zone = await prisma.zone.findFirst({
    where: {
      id: zoneId,
      farm: { farmerId },
    },
    select: {
      id: true,
      name: true,
      areaSquareMeters: true,
    },
  });

  if (!zone) {
    throw new AppError("Zone not found", 404);
  }

  return zone;
};

export const getInputRecipe = async (zoneId, recipeType, user) => {
  const farmerId = getFarmerIdFromUser(user);

  if (!RECIPES[recipeType]) {
    throw new AppError(
      `Invalid recipe type. Valid options: ${Object.keys(RECIPES).join(", ")}`,
      400
    );
  }

  const zone = await fetchZone(zoneId, farmerId);
  const areaAcres = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
  const recipePerAcre = RECIPES[recipeType];

  const ingredients = Object.entries(recipePerAcre).map(([key, ingredient]) => ({
    key,
    label: ingredient.label,
    amount: Math.round(ingredient.amount * areaAcres * 100) / 100,
    unit: ingredient.unit,
  }));

  return {
    zoneName: zone.name,
    areaAcres: Math.round(areaAcres * 100) / 100,
    recipeType,
    ingredients,
  };
};

export const getFinancialEstimate = async (zoneId, cropName, user) => {
  const farmerId = getFarmerIdFromUser(user);

  if (!CROP_FINANCIALS[cropName]) {
    throw new AppError(
      `Invalid crop. Valid options: ${Object.keys(CROP_FINANCIALS).join(", ")}`,
      400
    );
  }

  const zone = await fetchZone(zoneId, farmerId);
  const areaAcres = zone.areaSquareMeters / SQ_METERS_PER_ACRE;
  const { yieldKgPerAcre, pricePerKg } = CROP_FINANCIALS[cropName];

  const estimatedGrossIncome = areaAcres * yieldKgPerAcre * pricePerKg;
  const estimatedInputCost = areaAcres * BASE_INPUT_COST_PER_ACRE;
  const netProfit = estimatedGrossIncome - estimatedInputCost;

  return {
    zoneName: zone.name,
    areaAcres: Math.round(areaAcres * 100) / 100,
    cropName,
    estimatedGrossIncome: Math.round(estimatedGrossIncome),
    estimatedInputCost: Math.round(estimatedInputCost),
    netProfit: Math.round(netProfit),
  };
};
