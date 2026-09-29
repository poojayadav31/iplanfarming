import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Pencil, Check, X } from 'lucide-react';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { farmService } from '../../lib/farms';
import { calculateFarmMetrics, generateZones, suggestZoneCount } from '../../utils/farmCalculations';
import type { PolygonFeature, ZonePayload } from '../../types/farm';
import type { GeneratedZone } from '../../utils/farmCalculations';
import L, { createBaseLayers, createDivLabelIcon } from './leafletSetup';

const ZONE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const BIGHA = 1333.33;

interface ZoneManagerProps {
  farmId: string;
  farmBoundary: PolygonFeature;
  farmAreaBigha: number;
}

interface ApiErrorResponse { message?: string }

const scaleZonesToActualFarmArea = (
  generatedZones: GeneratedZone[],
  farmBoundary: PolygonFeature,
  farmAreaBigha: number
) => {
  const geometricFarmAreaBigha = calculateFarmMetrics(farmBoundary).areaBigha;
  const scaleFactor = geometricFarmAreaBigha > 0 ? farmAreaBigha / geometricFarmAreaBigha : 1;
  return generatedZones.map((zone) => ({
    ...zone,
    properties: {
      ...zone.properties,
      areaBigha: zone.properties.areaBigha * scaleFactor,
      areaSquareMeters: zone.properties.areaSquareMeters * scaleFactor,
    },
  }));
};

export default function ZoneManager({ farmId, farmBoundary, farmAreaBigha }: ZoneManagerProps) {
  const navigate = useNavigate();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const farmLayerRef  = useRef<L.GeoJSON | null>(null);
  const zoneLayerGroupRef = useRef<L.LayerGroup | null>(null);
  // Refs used during edit session — must be stable across renders
  const editGroupRef  = useRef<L.FeatureGroup | null>(null);
  const editHandlerRef = useRef<L.EditToolbar.Edit | null>(null);
  const editingZoneNumRef = useRef<number | null>(null);

  const [zoneCount,         setZoneCount]         = useState(() => suggestZoneCount(farmAreaBigha));
  const [zones,             setZones]             = useState<GeneratedZone[]>([]);
  const [activeZoneNumber,  setActiveZoneNumber]  = useState<number | null>(null);
  const [editingZoneNumber, setEditingZoneNumber] = useState<number | null>(null); // table rename
  const [editingMapZone,    setEditingMapZone]    = useState<number | null>(null); // map vertex edit
  const [isGenerating,      setIsGenerating]      = useState(true);
  const [isSaving,          setIsSaving]          = useState(false);

  // ── Map init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, { zoomControl: true, gestureHandling: true });
    const { esriLayer, osmLayer } = createBaseLayers();
    esriLayer.addTo(map);
    L.control.layers({ 'ESRI Satellite': esriLayer, OpenStreetMap: osmLayer }, undefined, { position: 'topright' }).addTo(map);

    const farmLayer = L.geoJSON(farmBoundary, {
      style: { color: '#166534', weight: 3, fillColor: '#22c55e', fillOpacity: 0.05 },
    }).addTo(map);

    const zoneGroup = L.layerGroup().addTo(map);
    map.fitBounds(farmLayer.getBounds(), { padding: [20, 20] });

    mapRef.current          = map;
    farmLayerRef.current    = farmLayer;
    zoneLayerGroupRef.current = zoneGroup;

    return () => {
      if (map.getContainer()?.isConnected) map.remove();
      mapRef.current = null;
      farmLayerRef.current = null;
      zoneLayerGroupRef.current = null;
    };
  }, [farmBoundary]);

  // ── Auto-generate zones ──────────────────────────────────────────────────────

  useEffect(() => {
    setIsGenerating(true);
    const timeoutId = window.setTimeout(() => {
      try {
        const generated = scaleZonesToActualFarmArea(
          generateZones(farmBoundary, zoneCount).map((zone) => ({
            ...zone,
            properties: { ...zone.properties, name: zone.properties.name },
          })),
          farmBoundary,
          farmAreaBigha
        );
        setZones(generated);
        setActiveZoneNumber((cur) =>
          generated.some((z) => z.properties.zoneNumber === cur)
            ? cur
            : generated[0]?.properties.zoneNumber ?? null
        );
      } catch {
        toast.error('Could not generate zones. Please try another zone count.');
      } finally {
        setIsGenerating(false);
      }
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [farmAreaBigha, farmBoundary, zoneCount]);

  // ── Render zones on map ──────────────────────────────────────────────────────

  useEffect(() => {
    const zoneGroup = zoneLayerGroupRef.current;
    if (!zoneGroup) return;
    // Don't redraw while a map-edit session is active
    if (editingMapZone !== null) return;
    zoneGroup.clearLayers();

    zones.forEach((zone, index) => {
      const isActive = zone.properties.zoneNumber === activeZoneNumber;
      const color = ZONE_COLORS[index % ZONE_COLORS.length];

      L.geoJSON(zone, {
        style: {
          color: isActive ? '#0f172a' : color,
          weight: isActive ? 3 : 2,
          fillColor: color,
          fillOpacity: isActive ? 0.45 : 0.3,
        },
      })
        .on('click', () => setActiveZoneNumber(zone.properties.zoneNumber))
        .addTo(zoneGroup);

      const [lng, lat] = zone.properties.centroid.geometry.coordinates;
      L.marker([lat, lng], { icon: createDivLabelIcon(String(zone.properties.zoneNumber), isActive) })
        .on('click', () => setActiveZoneNumber(zone.properties.zoneNumber))
        .addTo(zoneGroup);
    });
  }, [activeZoneNumber, zones, editingMapZone]);

  // ── Start vertex edit for a zone ─────────────────────────────────────────────

  const startMapEdit = useCallback((zoneNumber: number) => {
    const map = mapRef.current;
    const zoneGroup = zoneLayerGroupRef.current;
    if (!map || !zoneGroup) return;

    const zone = zones.find((z) => z.properties.zoneNumber === zoneNumber);
    if (!zone) return;

    // Clear normal zone layers; replace with editable feature group
    zoneGroup.clearLayers();

    const index = zones.findIndex((z) => z.properties.zoneNumber === zoneNumber);
    const color = ZONE_COLORS[index % ZONE_COLORS.length];

    // Draw non-editing zones as static layers in zoneGroup
    zones.forEach((z, i) => {
      if (z.properties.zoneNumber === zoneNumber) return;
      const c = ZONE_COLORS[i % ZONE_COLORS.length];
      L.geoJSON(z, { style: { color: c, weight: 2, fillColor: c, fillOpacity: 0.2 } }).addTo(zoneGroup);
    });

    // Create editable feature group using a real L.Polygon
    // (L.geoJSON wrapper layers are not editable by leaflet-draw)
    const editGroup = new L.FeatureGroup();
    const coords = zone.geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
    const polygon = L.polygon(coords, { color, weight: 3, fillColor: color, fillOpacity: 0.4 });
    editGroup.addLayer(polygon);
    editGroup.addTo(map);
    editGroupRef.current = editGroup;
    editingZoneNumRef.current = zoneNumber;

    // Start leaflet-draw edit handler
    const handler = new (L.EditToolbar as unknown as {
      Edit: new (map: L.Map, opts: object) => L.EditToolbar.Edit;
    }).Edit(map, { featureGroup: editGroup });
    handler.enable();
    editHandlerRef.current = handler;

    (map as unknown as { gestureHandling?: { disable: () => void } }).gestureHandling?.disable();

    setEditingMapZone(zoneNumber);
    setActiveZoneNumber(zoneNumber);
  }, [zones]);

  // ── Commit vertex edits ──────────────────────────────────────────────────────

  const commitMapEdit = useCallback(() => {
    const handler  = editHandlerRef.current;
    const editGroup = editGroupRef.current;
    const zoneNum   = editingZoneNumRef.current;
    const map       = mapRef.current;
    if (!handler || !editGroup || zoneNum === null || !map) return;

    handler.save();
    handler.disable();

    // Extract the new GeoJSON geometry from the edited layer
    let newGeoJson: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
    editGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        newGeoJson = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
      }
    });

    editGroup.removeFrom(map);
    editGroupRef.current   = null;
    editHandlerRef.current = null;
    editingZoneNumRef.current = null;
    (map as unknown as { gestureHandling?: { enable: () => void } }).gestureHandling?.enable();

    if (newGeoJson) {
      const areaM2    = turf.area(newGeoJson);
      const areaBigha = areaM2 / BIGHA;
      const centroid  = turf.centroid(newGeoJson);

      setZones((prev) =>
        prev.map((z) =>
          z.properties.zoneNumber === zoneNum
            ? {
                ...newGeoJson!,
                properties: {
                  ...z.properties,
                  areaSquareMeters: areaM2,
                  areaBigha,
                  centroid,
                },
              } as GeneratedZone
            : z
        )
      );
    }

    setEditingMapZone(null);
  }, []);

  // ── Cancel vertex edits ──────────────────────────────────────────────────────

  const cancelMapEdit = useCallback(() => {
    const handler   = editHandlerRef.current;
    const editGroup = editGroupRef.current;
    const map       = mapRef.current;
    if (!handler || !editGroup || !map) return;

    handler.revertLayers();
    handler.disable();
    editGroup.removeFrom(map);

    editGroupRef.current   = null;
    editHandlerRef.current = null;
    editingZoneNumRef.current = null;
    (map as unknown as { gestureHandling?: { enable: () => void } }).gestureHandling?.enable();
    setEditingMapZone(null);
  }, []);

  // ── Rename (table) ───────────────────────────────────────────────────────────

  const handleRename = (zoneNumber: number, name: string) =>
    setZones((prev) =>
      prev.map((z) =>
        z.properties.zoneNumber === zoneNumber ? { ...z, properties: { ...z.properties, name } } : z
      )
    );

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await farmService.saveZones(
        farmId,
        zones.map((zone): ZonePayload => ({
          name: zone.properties.name,
          zoneNumber: zone.properties.zoneNumber,
          boundary: zone as PolygonFeature,
          areaSquareMeters: zone.properties.areaSquareMeters,
          areaBigha: zone.properties.areaBigha,
          centroid: zone.properties.centroid,
        }))
      );
      toast.success('Zones saved successfully');
      navigate(`/dashboard/farm/${farmId}`, { replace: true });
    } catch (error) {
      const apiError = error as AxiosError<ApiErrorResponse>;
      toast.error(apiError.response?.data?.message || 'Could not save zones.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = async () => {
    if (!window.confirm('Going back will remove this saved boundary so you can redraw it. Continue?')) return;
    try {
      await farmService.deleteFarm(farmId);
      toast.success('Farm removed. You can draw the boundary again.');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const apiError = error as AxiosError<ApiErrorResponse>;
      toast.error(apiError.response?.data?.message || 'Could not go back to boundary drawing.');
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Zone Division</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">Review and adjust your zones</h2>
            <p className="mt-2 text-sm text-stone-600">
              {editingMapZone !== null
                ? 'Drag the white handles to reshape the zone boundary, then click Done.'
                : 'Auto-divided zones shown below. Click ✏️ on a zone row to edit its boundary.'}
            </p>
          </div>

          {editingMapZone !== null ? (
            /* Edit-mode action bar */
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
              <span className="text-sm font-semibold text-amber-800">
                Editing Zone {editingMapZone}
              </span>
              <button
                type="button"
                onClick={commitMapEdit}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <Check className="h-4 w-4" /> Done
              </button>
              <button
                type="button"
                onClick={cancelMapEdit}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-stone-50 px-4 py-3">
              <label htmlFor="zone-count" className="block text-sm font-semibold text-stone-700">
                Number of Zones: {zoneCount}
              </label>
              <input
                id="zone-count"
                type="range"
                min="1"
                max="10"
                value={zoneCount}
                onChange={(e) => setZoneCount(Number(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer accent-green-700 lg:w-72"
              />
            </div>
          )}
        </div>

        <div
          ref={mapElementRef}
          className="mt-4 h-[60vh] min-h-80 w-full rounded-3xl border border-stone-200 md:h-[70vh]"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleBack}
            disabled={editingMapZone !== null}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!zones.length || isSaving || isGenerating || editingMapZone !== null}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Zones
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Zone list</h3>
            <p className="mt-1 text-sm text-stone-500">
              Click ✏️ to edit a zone's boundary on the map. Click the name to rename.
            </p>
          </div>
          {isGenerating && (
            <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-3 py-2 text-sm text-stone-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-stone-200 text-sm">
            <thead>
              <tr className="text-left text-stone-500">
                <th className="pb-3 font-medium">Zone</th>
                <th className="pb-3 font-medium">Area (Bigha)</th>
                <th className="pb-3 font-medium">Area (Acres)</th>
                <th className="pb-3 font-medium">Edit Boundary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {zones.map((zone) => {
                const num      = zone.properties.zoneNumber;
                const isActive = num === activeZoneNumber;
                const isEditing = num === editingMapZone;

                return (
                  <tr
                    key={num}
                    className={`cursor-pointer transition ${isActive ? 'bg-green-50' : 'hover:bg-stone-50'} ${isEditing ? 'ring-2 ring-inset ring-amber-400' : ''}`}
                    onClick={() => setActiveZoneNumber(num)}
                  >
                    <td className="py-3 pr-4">
                      {editingZoneNumber === num ? (
                        <input
                          autoFocus
                          value={zone.properties.name}
                          onChange={(e) => handleRename(num, e.target.value)}
                          onBlur={() => setEditingZoneNumber(null)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setEditingZoneNumber(null); }}
                          className="min-h-11 w-full rounded-xl border border-stone-300 px-3 text-sm outline-none focus:border-green-600"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingZoneNumber(num); }}
                          className="rounded-xl px-2 py-1 text-left font-semibold text-stone-900 transition hover:bg-white"
                        >
                          {zone.properties.name}
                        </button>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-stone-700">{zone.properties.areaBigha.toFixed(2)}</td>
                    <td className="py-3 pr-4 text-stone-700">
                      {(zone.properties.areaSquareMeters / 4046.86).toFixed(2)}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); commitMapEdit(); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" /> Done
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); cancelMapEdit(); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                          >
                            <X className="h-3 w-3" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={editingMapZone !== null}
                          onClick={(e) => { e.stopPropagation(); startMapEdit(num); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
