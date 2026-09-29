import type { PointFeature, PolygonFeature } from '../types/farm';

export interface FarmMetrics {
  areaSquareMeters: number;
  areaBigha: number;
  areaAcres: number;
  areaHectares: number;
  perimeter: number;
  centroid: PointFeature;
  convexityScore: number;
  bbox: [number, number, number, number];
}

export interface GeneratedZone extends PolygonFeature {
  properties: {
    zoneNumber: number;
    name: string;
    areaBigha: number;
    areaSquareMeters: number;
    centroid: PointFeature;
  };
}

export interface PolygonValidation {
  isValid: boolean;
  convexityScore: number;
  warnings: string[];
}

export function calculateFarmMetrics(geojsonPolygon: PolygonFeature): FarmMetrics;
export function suggestZoneCount(areaBigha: number): number;
export function generateZones(farmPolygon: PolygonFeature, zoneCount: number): GeneratedZone[];
export function validatePolygon(geojsonPolygon: PolygonFeature): PolygonValidation;
