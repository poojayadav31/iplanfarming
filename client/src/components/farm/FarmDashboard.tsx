import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, CalendarDays, IndianRupee, Sprout, ClipboardList, Droplets, Pencil, Check, X, Store, MessageCircle, AlertCircle, Award, Sun, Sparkles, FileText, Users, Target, ListChecks } from 'lucide-react';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { farmService } from '../../lib/farms';
import type { Farm, Zone, ZonePayload, PolygonFeature, PointFeature } from '../../types/farm';
import L, { createBaseLayers, createDivLabelIcon } from './leafletSetup';
import ExpertNotifications from './ExpertNotifications';

const ZONE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];
const BIGHA = 1333.33;

interface FarmDashboardProps { farmId: string }
interface ApiErrorResponse { message?: string }

export default function FarmDashboard({ farmId }: FarmDashboardProps) {
  const navigate = useNavigate();
  const mapElementRef  = useRef<HTMLDivElement | null>(null);
  const mapRef         = useRef<L.Map | null>(null);
  const zoneGroupRef   = useRef<L.LayerGroup | null>(null);
  const editGroupRef   = useRef<L.FeatureGroup | null>(null);
  const editHandlerRef = useRef<L.EditToolbar.Edit | null>(null);
  const editingZoneIdRef = useRef<string | null>(null);

  const [farm,           setFarm]           = useState<Farm | null>(null);
  const [localZones,     setLocalZones]     = useState<Zone[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isSaving,       setIsSaving]       = useState(false);
  const [editingZoneId,  setEditingZoneId]  = useState<string | null>(null); // which zone is being vertex-edited
  const [activeZoneId,   setActiveZoneId]   = useState<string | null>(null); // highlight only

  // ── Load farm ──────────────────────────────────────────────────────────────

  const loadFarm = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextFarm = await farmService.getFarmById(farmId);
      setFarm(nextFarm);
      setLocalZones(nextFarm.zones);
    } catch (error) {
      const apiError = error as AxiosError<ApiErrorResponse>;
      toast.error(apiError.response?.data?.message || 'Could not load farm details.');
    } finally {
      setIsLoading(false);
    }
  }, [farmId]);

  useEffect(() => { loadFarm(); }, [loadFarm]);

  // ── Init map once ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapElementRef.current || !farm || mapRef.current) return undefined;

    const map = L.map(mapElementRef.current, { zoomControl: true, gestureHandling: true });
    const { esriLayer, osmLayer } = createBaseLayers();
    esriLayer.addTo(map);
    L.control.layers({ 'ESRI Satellite': esriLayer, OpenStreetMap: osmLayer }, undefined, { position: 'topright' }).addTo(map);

    const farmBoundsLayer = L.geoJSON(farm.boundary, {
      style: { color: '#166534', weight: 3, fillColor: '#22c55e', fillOpacity: 0.08 },
    }).addTo(map);

    const zoneGroup = L.layerGroup().addTo(map);
    map.fitBounds(farmBoundsLayer.getBounds(), { padding: [20, 20] });

    mapRef.current     = map;
    zoneGroupRef.current = zoneGroup;

    return () => {
      try {
        map.scrollWheelZoom?.disable();
        map.off();
        map.remove();
      } catch { /* leaflet cleanup race — safe to swallow */ }
      mapRef.current       = null;
      zoneGroupRef.current = null;
    };
  }, [farm]);

  // ── Render normal zones (skip while a zone is being edited) ────────────────

  useEffect(() => {
    const zoneGroup = zoneGroupRef.current;
    if (!zoneGroup || editingZoneId !== null) return;
    zoneGroup.clearLayers();

    localZones.forEach((zone, index) => {
      const isActive = zone.id === activeZoneId;
      const color    = ZONE_COLORS[index % ZONE_COLORS.length];

      L.geoJSON(zone.boundary, {
        style: {
          color: isActive ? '#0f172a' : color,
          weight: isActive ? 3 : 2,
          fillColor: color,
          fillOpacity: isActive ? 0.45 : 0.28,
        },
      })
        .on('click', () => setActiveZoneId(zone.id))
        .addTo(zoneGroup);

      const [lng, lat] = zone.centroid.geometry.coordinates;
      L.marker([lat, lng], { icon: createDivLabelIcon(String(zone.zoneNumber), isActive) })
        .on('click', () => setActiveZoneId(zone.id))
        .addTo(zoneGroup);
    });
  }, [localZones, activeZoneId, editingZoneId]);

  // ── Start editing a single zone ────────────────────────────────────────────

  const startEditing = useCallback((zoneId: string) => {
    const map       = mapRef.current;
    const zoneGroup = zoneGroupRef.current;
    if (!map || !zoneGroup) return;

    const zoneIndex = localZones.findIndex((z) => z.id === zoneId);
    const zone      = localZones[zoneIndex];
    if (!zone) return;

    const color = ZONE_COLORS[zoneIndex % ZONE_COLORS.length];

    // Clear all zone layers; redraw non-editing ones as static
    zoneGroup.clearLayers();
    localZones.forEach((z, i) => {
      if (z.id === zoneId) return;
      const c = ZONE_COLORS[i % ZONE_COLORS.length];
      L.geoJSON(z.boundary, { style: { color: c, weight: 2, fillColor: c, fillOpacity: 0.2 } }).addTo(zoneGroup);
      const [lng, lat] = z.centroid.geometry.coordinates;
      L.marker([lat, lng], { icon: createDivLabelIcon(String(z.zoneNumber)) }).addTo(zoneGroup);
    });

    // Put selected zone in its own editable FeatureGroup using a real L.Polygon
    // (L.geoJSON wrapper layers are not editable by leaflet-draw)
    const editGroup = new L.FeatureGroup();
    const coords = zone.boundary.geometry.coordinates[0].map(
      ([lng, lat]) => [lat, lng] as [number, number]
    );
    const polygon = L.polygon(coords, { color, weight: 3, fillColor: color, fillOpacity: 0.45 });
    editGroup.addLayer(polygon);
    editGroup.addTo(map);
    editGroupRef.current    = editGroup;
    editingZoneIdRef.current = zoneId;

    const handler = new (L.EditToolbar as unknown as {
      Edit: new (map: L.Map, opts: object) => L.EditToolbar.Edit;
    }).Edit(map, { featureGroup: editGroup });
    handler.enable();
    editHandlerRef.current = handler;

    // Allow single-finger pan while editing (gesture handling blocks it)
    (map as unknown as { gestureHandling?: { disable: () => void } }).gestureHandling?.disable();

    setEditingZoneId(zoneId);
    setActiveZoneId(zoneId);
  }, [localZones]);

  // ── Commit single-zone edit ────────────────────────────────────────────────

  const commitEditing = useCallback(async () => {
    const handler    = editHandlerRef.current;
    const editGroup  = editGroupRef.current;
    const zoneId     = editingZoneIdRef.current;
    const map        = mapRef.current;
    if (!handler || !editGroup || !zoneId || !map) return;

    handler.save();
    handler.disable();

    let newGeoJson: GeoJSON.Feature<GeoJSON.Polygon> | null = null;
    editGroup.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        newGeoJson = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
      }
    });

    editGroup.removeFrom(map);
    editGroupRef.current     = null;
    editHandlerRef.current   = null;
    editingZoneIdRef.current = null;
    setEditingZoneId(null);
    (map as unknown as { gestureHandling?: { enable: () => void } }).gestureHandling?.enable();

    if (!newGeoJson) return;

    const areaM2    = turf.area(newGeoJson);
    const areaBigha = areaM2 / BIGHA;
    const centroid  = turf.centroid(newGeoJson);

    const updatedZones = localZones.map((z) =>
      z.id === zoneId
        ? { ...z, boundary: newGeoJson as PolygonFeature, centroid: centroid as PointFeature, areaSquareMeters: areaM2, areaBigha }
        : z
    );
    setLocalZones(updatedZones);

    setIsSaving(true);
    try {
      const payload: ZonePayload[] = updatedZones.map((z) => ({
        name: z.name, zoneNumber: z.zoneNumber,
        boundary: z.boundary, areaSquareMeters: z.areaSquareMeters,
        areaBigha: z.areaBigha, centroid: z.centroid,
      }));
      await farmService.saveZones(farmId, payload);
      toast.success('Zone boundary saved');
      await loadFarm();
    } catch (error) {
      const apiError = error as AxiosError<ApiErrorResponse>;
      toast.error(apiError.response?.data?.message || 'Could not save zone boundary.');
    } finally {
      setIsSaving(false);
    }
  }, [localZones, farmId, loadFarm]);

  // ── Cancel single-zone edit ────────────────────────────────────────────────

  const cancelEditing = useCallback(() => {
    const handler   = editHandlerRef.current;
    const editGroup = editGroupRef.current;
    const map       = mapRef.current;
    if (!handler || !editGroup || !map) return;

    handler.revertLayers();
    handler.disable();
    editGroup.removeFrom(map);

    editGroupRef.current     = null;
    editHandlerRef.current   = null;
    editingZoneIdRef.current = null;
    setEditingZoneId(null);
    (map as unknown as { gestureHandling?: { enable: () => void } }).gestureHandling?.enable();
  }, []);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center rounded-[28px] border border-stone-200 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-green-700" />
      </div>
    );
  }
  if (!farm) {
    return (
      <div className="rounded-[28px] border border-stone-200 bg-white p-8 text-center text-stone-600">
        Farm details are not available right now.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Total Farm Area</p>
          <h2 className="mt-3 text-3xl font-bold text-stone-900">{farm.areaBigha.toFixed(2)} Bigha</h2>
          <p className="mt-2 text-sm text-stone-500">{farm.areaAcres.toFixed(2)} acres</p>
        </div>
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Total Zones</p>
          <h2 className="mt-3 text-3xl font-bold text-stone-900">{farm.zones.length}</h2>
          <p className="mt-2 text-sm text-stone-500">Automatically divided and saved</p>
        </div>
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">District</p>
          <h2 className="mt-3 text-3xl font-bold text-stone-900">{farm.district}</h2>
          <p className="mt-2 text-sm text-stone-500">{farm.state}</p>
        </div>
      </section>

      {/* ── Map ──────────────────────────────────────────────────────────── */}
      <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">{farm.name}</h3>
            <p className="mt-1 text-sm text-stone-500">
              {editingZoneId !== null
                ? `Editing Zone ${localZones.find((z) => z.id === editingZoneId)?.zoneNumber} — drag the white handles to reshape.`
                : 'Click ✏️ on a zone row below to edit its boundary.'}
            </p>
          </div>

          {editingZoneId !== null && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                Editing Zone {localZones.find((z) => z.id === editingZoneId)?.zoneNumber}
              </span>
              <button
                type="button"
                onClick={commitEditing}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Done
              </button>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </button>
            </div>
          )}
        </div>

        <div
          ref={mapElementRef}
          className="mt-4 h-[50vh] min-h-80 w-full rounded-3xl border border-stone-200"
        />
      </section>

      {/* ── Zone summary + tools ─────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Zone summary</h3>
          <p className="mt-1 text-sm text-stone-500">Click ✏️ to edit a zone's boundary on the map.</p>
          <div className="mt-4 divide-y divide-stone-100">
            {localZones.map((zone, index) => {
              const isActive   = zone.id === activeZoneId;
              const isEditing  = zone.id === editingZoneId;

              return (
                <div
                  key={zone.id}
                  onClick={() => { if (!isEditing) setActiveZoneId(zone.id); }}
                  className={`flex cursor-pointer items-center justify-between py-3 px-2 rounded-xl transition
                    ${isEditing  ? 'bg-amber-50 ring-1 ring-amber-300'
                    : isActive   ? 'bg-green-50'
                    : 'hover:bg-stone-50'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-3.5 w-3.5 rounded-full shrink-0" style={{ backgroundColor: ZONE_COLORS[index % ZONE_COLORS.length] }} />
                    <div>
                      <p className="font-semibold text-stone-900 text-sm">{zone.name}</p>
                      <p className="text-xs text-stone-500">{zone.areaBigha.toFixed(2)} Bigha</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); commitEditing(); }}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          <Check className="h-3 w-3" /> Done
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); cancelEditing(); }}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-300 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-60"
                        >
                          <X className="h-3 w-3" /> Cancel
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); navigate(`/season-report/${zone.id}`); }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                          title="Season Report"
                        >
                          <FileText className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={editingZoneId !== null}
                          onClick={(e) => { e.stopPropagation(); startEditing(zone.id); }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Tools</h3>
          <div className="mt-4 space-y-3">
            <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}/designer`)}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-600 to-green-700 px-4 text-left text-sm font-bold text-white shadow-md transition hover:from-emerald-700 hover:to-green-800">
              <Sparkles className="h-5 w-5 text-amber-300" /> Farm Designer &amp; Bed Studio
            </button>
            <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}/soil`)}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 text-left text-sm font-medium text-green-800 transition hover:bg-green-100">
              <Sprout className="h-4 w-4" /> Zone Crop Planner
            </button>
            <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}/calendar`)}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 text-left text-sm font-medium text-teal-800 transition hover:bg-teal-100">
              <CalendarDays className="h-4 w-4" /> View Farm Calendar
            </button>
            <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}/economics`)}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-left text-sm font-medium text-amber-800 transition hover:bg-amber-100">
              <IndianRupee className="h-4 w-4" /> View Cost &amp; Profit
            </button>
            <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}/plan`)}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-left text-sm font-medium text-violet-800 transition hover:bg-violet-100">
              <ClipboardList className="h-4 w-4" /> Farm Planner
            </button>
            <button type="button" onClick={() => navigate(`/dashboard/farm/${farmId}/water`)}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-left text-sm font-medium text-blue-800 transition hover:bg-blue-100">
              <Droplets className="h-4 w-4" /> Smart Water Management
            </button>
            <button type="button" onClick={() => navigate('/market')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-100">
              <Store className="h-4 w-4" /> Market — Sell Your Produce
            </button>

            <div className="my-2 border-t border-stone-200" />

            <button type="button" onClick={() => navigate('/today')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-left text-sm font-medium text-orange-800 transition hover:bg-orange-100">
              <Sun className="h-4 w-4" /> Today's Tasks
            </button>
            <button type="button" onClick={() => navigate('/insights')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-4 text-left text-sm font-medium text-purple-800 transition hover:bg-purple-100">
              <Sparkles className="h-4 w-4" /> Smart Insights
            </button>
            <button type="button" onClick={() => navigate('/community')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50 px-4 text-left text-sm font-medium text-teal-800 transition hover:bg-teal-100">
              <Users className="h-4 w-4" /> Community
            </button>
            <button type="button" onClick={() => navigate('/goals')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 text-left text-sm font-medium text-violet-800 transition hover:bg-violet-100">
              <Target className="h-4 w-4" /> My Goals
            </button>
            <button type="button" onClick={() => navigate('/checklist')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-100">
              <ListChecks className="h-4 w-4" /> Checklist
            </button>
            <button type="button" onClick={() => navigate('/ask-expert')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-left text-sm font-medium text-sky-800 transition hover:bg-sky-100">
              <MessageCircle className="h-4 w-4" /> Ask an Expert
            </button>
            <button type="button" onClick={() => navigate('/report-issue')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-left text-sm font-medium text-rose-800 transition hover:bg-rose-100">
              <AlertCircle className="h-4 w-4" /> Report a Problem
            </button>
            <button type="button" onClick={() => navigate('/achievements')}
              className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-4 text-left text-sm font-medium text-yellow-800 transition hover:bg-yellow-100">
              <Award className="h-4 w-4" /> My Achievements
            </button>
          </div>
        </div>
      </section>

      {/* ── Expert Advisories & Crop Suggestions ─────────────────────── */}
      <ExpertNotifications farmId={farmId} />
    </div>
  );
}
