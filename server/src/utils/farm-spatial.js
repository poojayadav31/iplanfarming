import * as turf from "@turf/turf";
import { AppError } from "./errors.js";
import { SQ_METERS_PER_ACRE } from "../constants/naturalFarming.js";

export const BIGHA_IN_SQUARE_METERS = 1333.33;

const getConvexityScore = (polygon) => {
  const polygonArea = turf.area(polygon);
  const convexHull = turf.convex(polygon);

  if (!convexHull || polygonArea === 0) {
    return 1;
  }

  return polygonArea / turf.area(convexHull);
};

export const assertPolygon = (polygon, fieldName = "boundary") => {
  if (!polygon || polygon.type !== "Feature" || polygon.geometry?.type !== "Polygon") {
    throw new AppError(`${fieldName} must be a valid GeoJSON Polygon feature`, 400);
  }

  return polygon;
};

export const calculateFarmMetrics = (polygon) => {
  assertPolygon(polygon);

  const areaSquareMeters = turf.area(polygon);
  const centroid = turf.centroid(polygon);
  const perimeter = turf.length(turf.polygonToLine(polygon), {
    units: "meters",
  });
  const bbox = turf.bbox(polygon);
  const convexityScore = getConvexityScore(polygon);

  return {
    areaSquareMeters,
    areaBigha: areaSquareMeters / BIGHA_IN_SQUARE_METERS,
    areaAcres: areaSquareMeters / SQ_METERS_PER_ACRE,
    areaHectares: areaSquareMeters / 10000,
    perimeter,
    centroid,
    convexityScore,
    bbox,
  };
};

export const calculateZoneMetrics = (polygon) => {
  assertPolygon(polygon, "zone boundary");

  const areaSquareMeters = turf.area(polygon);

  return {
    areaSquareMeters,
    areaBigha: areaSquareMeters / BIGHA_IN_SQUARE_METERS,
    centroid: turf.centroid(polygon),
  };
};
