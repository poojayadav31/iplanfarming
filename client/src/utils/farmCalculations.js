import * as turf from '@turf/turf';

const BIGHA_IN_SQUARE_METERS = 1333.33;

const getConvexHull = (polygon) => turf.convex(polygon);

const getConvexityScore = (polygon) => {
  const convexHull = getConvexHull(polygon);
  const polygonArea = turf.area(polygon);

  if (!convexHull || polygonArea === 0) {
    return 1;
  }

  return polygonArea / turf.area(convexHull);
};

const toPolygonFeatures = (feature) => {
  if (!feature) {
    return [];
  }

  if (feature.geometry.type === 'Polygon') {
    return [feature];
  }

  if (feature.geometry.type !== 'MultiPolygon') {
    return [];
  }

  return turf.flatten(feature).features.filter((item) => item.geometry.type === 'Polygon');
};

const mergeCells = (firstCell, secondCell) => {
  const merged = turf.union(turf.featureCollection([firstCell, secondCell]));
  const mergedPolygons = toPolygonFeatures(merged);

  return mergedPolygons.length === 1 ? mergedPolygons[0] : null;
};

const mergeAdjacentCells = (cells, targetCount) => {
  const workingCells = [...cells];

  while (workingCells.length > targetCount) {
    workingCells.sort((a, b) => turf.area(a) - turf.area(b));
    const smallest = workingCells.shift();

    if (!smallest) {
      break;
    }

    let mergeIndex = -1;
    let mergedCell = null;

    for (let index = 0; index < workingCells.length; index += 1) {
      const candidate = workingCells[index];
      if (!turf.booleanIntersects(smallest, candidate)) {
        continue;
      }

      const nextMergedCell = mergeCells(smallest, candidate);

      if (nextMergedCell) {
        mergeIndex = index;
        mergedCell = nextMergedCell;
        break;
      }
    }

    if (mergeIndex === -1 || !mergedCell) {
      workingCells.push(smallest);
      break;
    }

    workingCells.splice(mergeIndex, 1);
    workingCells.push(mergedCell);
  }

  return workingCells;
};

export function calculateFarmMetrics(geojsonPolygon) {
  const polygon = geojsonPolygon;
  const areaSquareMeters = turf.area(polygon);
  const areaBigha = areaSquareMeters / BIGHA_IN_SQUARE_METERS;
  const areaAcres = areaSquareMeters / 4046.86;
  const areaHectares = areaSquareMeters / 10000;
  const perimeter = turf.length(turf.polygonToLine(polygon), { units: 'meters' });
  const centroid = turf.centroid(polygon);
  const convexityScore = getConvexityScore(polygon);
  const bbox = turf.bbox(polygon);

  return {
    areaSquareMeters,
    areaBigha,
    areaAcres,
    areaHectares,
    perimeter,
    centroid,
    convexityScore,
    bbox,
  };
}

export function suggestZoneCount(areaBigha) {
  if (areaBigha < 2) return 1;
  if (areaBigha <= 5) return 2;
  if (areaBigha <= 10) return 3;
  if (areaBigha <= 20) return 4;
  return 5;
}

export function generateZones(farmPolygon, zoneCount) {
  const { bbox, areaBigha } = calculateFarmMetrics(farmPolygon);
  const cellSize = areaBigha < 5 ? 20 : areaBigha <= 20 ? 30 : 50;
  const paddedBbox = turf.bbox(
    turf.buffer(turf.bboxPolygon(bbox), cellSize, { units: 'meters' })
  );
  const grid = turf.squareGrid(paddedBbox, cellSize, { units: 'meters' });

  const clippedCells = grid.features
    .flatMap((cell) => toPolygonFeatures(turf.intersect(turf.featureCollection([farmPolygon, cell]))))
    .filter(Boolean);

  if (!clippedCells.length) {
    return [];
  }

  const mergedCells = mergeAdjacentCells(clippedCells, zoneCount);

  return mergedCells.slice(0, zoneCount).map((cell, index) => {
    const metrics = calculateFarmMetrics(cell);

    return {
      ...cell,
      properties: {
        zoneNumber: index + 1,
        name: `Zone ${index + 1}`,
        areaBigha: metrics.areaBigha,
        areaSquareMeters: metrics.areaSquareMeters,
        centroid: metrics.centroid,
      },
    };
  });
}

export function validatePolygon(geojsonPolygon) {
  const { areaBigha, convexityScore } = calculateFarmMetrics(geojsonPolygon);
  const warnings = [];

  if (convexityScore < 0.7) {
    warnings.push(
      'Your farm boundary looks unusual. Please verify it matches your actual farm.'
    );
  }

  if (areaBigha < 0.5) {
    warnings.push('Farm area seems too small. Please check your boundary.');
  }

  if (areaBigha > 500) {
    warnings.push('Farm area seems very large. Please check your boundary.');
  }

  return {
    isValid: true,
    convexityScore,
    warnings,
  };
}
