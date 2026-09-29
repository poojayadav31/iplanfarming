import { getCropRecommendationsForZone } from "../services/cropRecommendation.service.js";

export const getZoneRecommendations = async (req, res) => {
  const recommendations = await getCropRecommendationsForZone({
    zoneId: req.params.zoneId,
    user: req.user,
  });

  res.status(200).json({
    success: true,
    data: recommendations,
  });
};
