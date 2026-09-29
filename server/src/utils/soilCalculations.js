const SOIL_TYPE_SCORES = {
  Dorsa: 25,
  Kanhar: 20,
  Matasi: 12,
  Bhata: 8,
};

const SOIL_TYPE_TIPS = {
  Kanhar: "Add compost or mulched crop residue to keep heavy Kanhar soil loose and easier for roots to breathe.",
  Matasi: "Mix in compost and cover the soil with mulch to help Matasi soil hold water for longer.",
  Dorsa: "Feed Dorsa soil with compost and rotating green manure crops to keep its balanced structure healthy.",
  Bhata: "Build Bhata soil with compost, mulch, and regular organic matter to improve moisture retention.",
};

const GENERAL_SOIL_TIP =
  "Apply well-rotted farmyard manure or compost before the season to steadily improve soil life.";

export const getCurrentSeason = () => {
  const month = new Date().getMonth();

  if (month >= 5 && month <= 9) {
    return "Kharif";
  }

  if (month >= 10 || month <= 1) {
    return "Rabi";
  }

  return "Zaid";
};

const getPhScore = (phLevel) => {
  if (phLevel >= 6 && phLevel <= 7) {
    return 30;
  }

  if ((phLevel >= 5.5 && phLevel < 6) || (phLevel > 7 && phLevel <= 7.5)) {
    return 20;
  }

  if ((phLevel >= 5 && phLevel < 5.5) || (phLevel > 7.5 && phLevel <= 8)) {
    return 10;
  }

  return 0;
};

const getDrainageScore = (drainageSpeed) => {
  if (drainageSpeed === "Balanced") {
    return 25;
  }

  if (drainageSpeed === "Slow") {
    return 12;
  }

  return 8;
};

const getEarthwormScore = (earthwormCount) => {
  if (earthwormCount <= 0) {
    return 0;
  }

  if (earthwormCount <= 3) {
    return 5;
  }

  if (earthwormCount <= 7) {
    return 12;
  }

  return 20;
};

const getScoreLabel = (soilHealthScore) => {
  if (soilHealthScore >= 75) {
    return "Excellent";
  }

  if (soilHealthScore >= 50) {
    return "Good";
  }

  if (soilHealthScore >= 25) {
    return "Fair";
  }

  return "Poor";
};

export const computeSoilScore = ({
  soilType,
  phLevel = 6.5,
  drainageSpeed,
  earthwormCount = 3,
}) => {
  const soilTypeScore = SOIL_TYPE_SCORES[soilType] ?? 0;
  const phScore = getPhScore(phLevel);
  const drainageScore = getDrainageScore(drainageSpeed);
  const earthwormScore = getEarthwormScore(earthwormCount);
  const soilHealthScore =
    soilTypeScore + phScore + drainageScore + earthwormScore;

  return {
    phScore,
    drainageScore,
    soilTypeScore,
    earthwormScore,
    soilHealthScore,
    scoreLabel: getScoreLabel(soilHealthScore),
  };
};

export const getImprovementTips = ({
  soilType,
  phLevel = 6.5,
  drainageSpeed,
}) => {
  const tips = [SOIL_TYPE_TIPS[soilType], GENERAL_SOIL_TIP].filter(Boolean);

  if (phLevel < 5.5) {
    tips.push("Add finely ground limestone (CaCO3) in small planned doses to reduce acidity naturally.");
  } else if (phLevel >= 5.5 && phLevel < 6) {
    tips.push("Add compost or grow green manure to gently move the soil closer to the ideal pH range.");
  } else if (phLevel > 7 && phLevel <= 7.5) {
    tips.push("Use compost, neem powder, or diluted gomutra to help balance slightly alkaline soil.");
  } else if (phLevel > 7.5) {
    tips.push("Use green manure and a mild lemon juice concentrate treatment carefully to bring high pH down over time.");
  }

  if (drainageSpeed === "Fast") {
    tips.push("Add compost to help the soil retain more moisture after irrigation or rain.");
  } else if (drainageSpeed === "Slow") {
    tips.push("Mix in sand or farmyard manure and keep drainage channels open so excess water can move away.");
  }

  return [...new Set(tips)].slice(0, 4);
};
