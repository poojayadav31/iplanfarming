import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Loader2,
  LocateFixed,
  MapPinned,
  Pencil,
  RotateCcw,
  Save,
} from 'lucide-react';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { farmService } from '../../lib/farms';
import { calculateFarmMetrics, validatePolygon } from '../../utils/farmCalculations';
import type { Farm, PolygonFeature } from '../../types/farm';
import L, { CG_CENTER, createBaseLayers } from './leafletSetup';

const DISTRICTS = [
  'Raipur',
  'Durg',
  'Bilaspur',
  'Korba',
  'Rajnandgaon',
  'Raigarh',
  'Janjgir-Champa',
  'Surguja',
  'Bastar',
  'Dhamtari',
  'Kanker',
  'Kabirdham',
  'Mahasamund',
  'Koriya',
  'Jashpur',
  'Gariaband',
  'Balod',
  'Bemetara',
  'Mungeli',
  'Surajpur',
  'Balrampur',
  'Kondagaon',
  'Narayanpur',
  'Bijapur',
  'Dantewada',
  'Sukma',
  'Balodabazar',
  'Gaurela-Pendra-Marwahi',
  'Manendragarh',
  'Sakti',
  'Sarangarh-Bilaigarh',
  'Khairagarh',
  'Mohla-Manpur',
  'Shakti',
];

const isGeoJsonLayer = (layer: unknown): layer is L.Layer & { toGeoJSON: () => unknown } =>
  typeof layer === 'object' && layer !== null && 'toGeoJSON' in layer;

interface FarmFormState {
  name: string;
  district: string;
  address: string;
}

interface ApiErrorResponse {
  message?: string;
  details?: string;
  code?: string;
}

export default function FarmMapper() {
  const navigate = useNavigate();
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const editHandlerRef = useRef<L.EditToolbar.Edit | null>(null);

  const [boundary, setBoundary] = useState<PolygonFeature | null>(null);
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateFarmMetrics> | null>(null);
  const [validation, setValidation] = useState<ReturnType<typeof validatePolygon> | null>(null);
  const [locationMessage, setLocationMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingBoundary, setIsEditingBoundary] = useState(false);
  const [actualAreaInput, setActualAreaInput] = useState('');
  const [hasManualAreaOverride, setHasManualAreaOverride] = useState(false);
  const [form, setForm] = useState<FarmFormState>({
    name: '',
    district: '',
    address: '',
  });

  const syncActualAreaInput = (
    nextMetrics: ReturnType<typeof calculateFarmMetrics>,
    options?: { force?: boolean }
  ) => {
    if (!hasManualAreaOverride || options?.force) {
      setActualAreaInput(nextMetrics.areaBigha.toFixed(2));
    }
  };

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return undefined;
    }

    let isMounted = true;
    let mapInstance: L.Map | null = null;

    const initializeMap = async () => {
      await import('leaflet-draw');

      // leaflet-draw 1.0.4 bug: readableArea assigns to undeclared `type`, which throws
      // ReferenceError in strict mode (ES modules). Patch it with a declared local variable.
      // Cast to any to bypass the incomplete @types/leaflet-draw signature (isMetric also
      // accepts string | string[], and formattedNumber actually accepts number not just string).
      if (L.GeometryUtil) {
        const precisionDefaults: Record<string, number> = { km: 2, ha: 2, m: 0, mi: 2, ac: 2, yd: 0, ft: 0, nm: 2 };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (L.GeometryUtil as any).readableArea = function (
          area: number,
          isMetric: boolean | string | string[],
          precision?: Record<string, number>
        ): string {
          const p: Record<string, number> = L.Util.extend({}, precisionDefaults, precision);
          const fmt = (val: number, decimals: number) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (L.GeometryUtil as any).formattedNumber(String(val), decimals) as string;
          if (isMetric) {
            let units = ['ha', 'm'];
            const metricType = typeof isMetric;
            if (metricType === 'string') units = [isMetric as string];
            else if (metricType !== 'boolean') units = isMetric as string[];
            if (area >= 1e6 && units.includes('km')) return fmt(area * 1e-6, p.km) + ' km²';
            if (area >= 1e4 && units.includes('ha')) return fmt(area * 1e-4, p.ha) + ' ha';
            return fmt(area, p.m) + ' m²';
          }
          const sqyd = area / 0.836127;
          if (sqyd >= 3097600) return fmt(sqyd / 3097600, p.mi) + ' mi²';
          if (sqyd >= 4840) return fmt(sqyd / 4840, p.ac) + ' acres';
          return fmt(sqyd, p.yd) + ' yd²';
        };
      }

      if (!isMounted || !mapElementRef.current) {
        return;
      }

      if (!L.Control?.Draw) {
        toast.error('Map drawing tools could not be loaded. Please refresh and try again.');
        return;
      }

      const map = L.map(mapElementRef.current, {
        center: CG_CENTER,
        zoom: 7,
        gestureHandling: true,
      });

      const { esriLayer, osmLayer } = createBaseLayers();
      esriLayer.addTo(map);
      L.control.layers(
        {
          'ESRI Satellite': esriLayer,
          OpenStreetMap: osmLayer,
        },
        undefined,
        { position: 'topright' }
      ).addTo(map);

      const drawnItems = new L.FeatureGroup();
      drawnItems.addTo(map);
      const editHandler = new L.EditToolbar.Edit(map, {
        featureGroup: drawnItems,
      });

      const drawControl = new L.Control.Draw({
        draw: {
          polygon: {
            allowIntersection: false,
            showArea: true,
            shapeOptions: {
              color: '#166534',
              fillColor: '#22c55e',
              fillOpacity: 0.2,
            },
          },
          rectangle: false,
          polyline: false,
          circle: false,
          marker: false,
          circlemarker: false,
        },
        edit: {
          featureGroup: drawnItems,
          edit: false,
          remove: false,
        },
      });

      map.addControl(drawControl);

      map.on('draw:created', ((event: L.DrawEvents.Created) => {
        drawnItems.clearLayers();
        const layer = event.layer;
        drawnItems.addLayer(layer);

        const polygon = layer.toGeoJSON() as PolygonFeature;
        const nextMetrics = calculateFarmMetrics(polygon);
        const nextValidation = validatePolygon(polygon);

        setBoundary(polygon);
        setMetrics(nextMetrics);
        setValidation(nextValidation);
        setIsEditingBoundary(false);
        syncActualAreaInput(nextMetrics, { force: true });
        setHasManualAreaOverride(false);
      }) as L.LeafletEventHandlerFn);

      map.on('draw:edited', ((event: L.DrawEvents.Edited) => {
        const editedLayer = event.layers.getLayers()[0];
        if (!isGeoJsonLayer(editedLayer)) {
          return;
        }

        const polygon = editedLayer.toGeoJSON() as PolygonFeature;
        const nextMetrics = calculateFarmMetrics(polygon);
        const nextValidation = validatePolygon(polygon);

        setBoundary(polygon);
        setMetrics(nextMetrics);
        setValidation(nextValidation);
        syncActualAreaInput(nextMetrics);
      }) as L.LeafletEventHandlerFn);

      mapRef.current = map;
      drawnItemsRef.current = drawnItems;
      editHandlerRef.current = editHandler;
      mapInstance = map;
    };

    void initializeMap();

    return () => {
      isMounted = false;
      mapInstance?.remove();
      mapRef.current = null;
      drawnItemsRef.current = null;
      editHandlerRef.current = null;
    };
  }, []);

  const handleLocateMe = () => {
    setLocationMessage('');

    if (!navigator.geolocation || !mapRef.current) {
      setLocationMessage('Location access denied. Please navigate to your farm manually.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const map = mapRef.current;
        if (!map) {
          return;
        }

        map.flyTo([coords.latitude, coords.longitude], 16, {
          duration: 1.5,
        });
      },
      () => {
        setLocationMessage('Location access denied. Please navigate to your farm manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleRedraw = () => {
    if (isEditingBoundary) {
      editHandlerRef.current?.disable();
      setIsEditingBoundary(false);
    }

    drawnItemsRef.current?.clearLayers();
    setBoundary(null);
    setMetrics(null);
    setValidation(null);
    setActualAreaInput('');
    setHasManualAreaOverride(false);
  };

  const handleToggleEditBoundary = () => {
    if (!boundary || !editHandlerRef.current || !drawnItemsRef.current) {
      return;
    }

    if (isEditingBoundary) {
      editHandlerRef.current.save();
      editHandlerRef.current.disable();

      const layer = drawnItemsRef.current.getLayers()[0];
      if (isGeoJsonLayer(layer)) {
        const polygon = layer.toGeoJSON() as PolygonFeature;
        const nextMetrics = calculateFarmMetrics(polygon);
        const nextValidation = validatePolygon(polygon);

        setBoundary(polygon);
        setMetrics(nextMetrics);
        setValidation(nextValidation);
        syncActualAreaInput(nextMetrics);
      }

      setIsEditingBoundary(false);
      return;
    }

    editHandlerRef.current.enable();
    setIsEditingBoundary(true);
  };

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleActualAreaChange = (event: ChangeEvent<HTMLInputElement>) => {
    setActualAreaInput(event.target.value);
    setHasManualAreaOverride(true);
  };

  const handleSave = async () => {
    if (!boundary || !form.name.trim() || !form.district) {
      return;
    }

    const parsedActualAreaBigha = Number(actualAreaInput);
    if (!Number.isFinite(parsedActualAreaBigha) || parsedActualAreaBigha <= 0) {
      toast.error('Please enter a valid actual area in bigha.');
      return;
    }

    setIsSaving(true);
    try {
      const farm = await farmService.createFarm({
        name: form.name.trim(),
        district: form.district,
        address: form.address.trim(),
        actualAreaBigha: parsedActualAreaBigha,
        boundary,
      });

      toast.success('Farm boundary saved successfully');
      navigate(`/dashboard/farm/${farm.id}/zones`, {
        replace: true,
        state: { farm: farm as Farm },
      });
    } catch (error) {
      const apiError = error as AxiosError<ApiErrorResponse>;
      const errorMessage = apiError.response?.data?.details || apiError.response?.data?.message;
      toast.error(errorMessage || 'Could not save your farm boundary.');
    } finally {
      setIsSaving(false);
    }
  };

  const cornerCount = boundary ? boundary.geometry.coordinates[0].length - 1 : 0;
  const warningMessage = validation?.warnings?.find((message) =>
    message.includes('boundary looks unusual')
  );
  const parsedActualAreaBigha = Number(actualAreaInput);
  const displayedAreaBigha =
    Number.isFinite(parsedActualAreaBigha) && parsedActualAreaBigha > 0
      ? parsedActualAreaBigha
      : metrics?.areaBigha ?? 0;
  const displayedAreaSquareMeters = displayedAreaBigha * 1333.33;
  const displayedAreaAcres = displayedAreaSquareMeters / 4046.86;
  const displayedAreaHectares = displayedAreaSquareMeters / 10000;
  const isActualAreaDifferent =
    Boolean(metrics) && Math.abs(displayedAreaBigha - (metrics?.areaBigha ?? 0)) > 0.01;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
      <section className="rounded-[28px] border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700">
              Farm Boundary
            </p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">Draw your farm once</h2>
            <p className="mt-2 text-sm text-stone-600">
              Tap each corner of your farm boundary. You can add as many points as needed. Click
              the first point only when the full boundary is traced.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-green-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800"
          >
            <LocateFixed className="h-4 w-4" />
            <span>📍 Locate My Farm</span>
          </button>
        </div>

        {locationMessage ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {locationMessage}
          </div>
        ) : null}

        <div
          ref={mapElementRef}
          className="mt-4 h-[60vh] min-h-80 w-full rounded-3xl border border-stone-200 md:h-[70vh]"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleToggleEditBoundary}
            disabled={!boundary}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil className="h-4 w-4" />
            {isEditingBoundary ? 'Done Editing' : 'Edit Boundary'}
          </button>

          <button
            type="button"
            onClick={handleRedraw}
            disabled={!boundary}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Redraw
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!boundary || !form.name.trim() || !form.district || isSaving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Farm Boundary
          </button>
        </div>

        {boundary ? (
          <p className="mt-3 text-sm text-stone-500">
            Need more corners? Tap <span className="font-semibold text-stone-700">Edit Boundary</span>{' '}
            and drag the small white edge markers to add more points.
          </p>
        ) : null}
      </section>

      <aside className="space-y-4">
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Live Area
              </p>
              <h3 className="mt-2 text-4xl font-bold text-stone-900">
                {displayedAreaBigha.toFixed(2)} <span className="text-xl">Bigha</span>
              </h3>
              <p className="mt-2 text-sm text-stone-500">
                {displayedAreaAcres.toFixed(2)} acres • {displayedAreaHectares.toFixed(2)} hectares
              </p>
              {isActualAreaDifferent && metrics ? (
                <p className="mt-2 text-xs text-stone-500">
                  Map estimate: {metrics.areaBigha.toFixed(2)} bigha
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl bg-green-50 p-3 text-green-700">
              <MapPinned className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-stone-500">Perimeter</p>
              <p className="mt-2 text-lg font-semibold text-stone-900">
                {metrics ? Math.round(metrics.perimeter) : 0} m
              </p>
            </div>
            <div className="rounded-2xl bg-stone-50 p-4">
              <p className="text-stone-500">Corners</p>
              <p className="mt-2 text-lg font-semibold text-stone-900">{cornerCount}</p>
            </div>
          </div>

          {warningMessage ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{warningMessage}</p>
              </div>
            </div>
          ) : null}

          {validation?.warnings?.length && !warningMessage ? (
            <div className="mt-4 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              {validation.warnings[0]}
            </div>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-stone-900">Farm details</h3>
          <p className="mt-1 text-sm text-stone-500">
            Fill these details before saving the boundary.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="farm-name" className="mb-2 block text-sm font-medium text-stone-700">
                Farm name
              </label>
              <input
                id="farm-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Example: Sahu Family Farm"
                className="min-h-11 w-full rounded-2xl border border-stone-300 px-4 text-sm text-stone-900 outline-none transition focus:border-green-600"
              />
            </div>

            <div>
              <label htmlFor="farm-district" className="mb-2 block text-sm font-medium text-stone-700">
                District
              </label>
              <select
                id="farm-district"
                name="district"
                value={form.district}
                onChange={handleChange}
                className="min-h-11 w-full rounded-2xl border border-stone-300 px-4 text-sm text-stone-900 outline-none transition focus:border-green-600"
              >
                <option value="">Select your district</option>
                {DISTRICTS.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="farm-actual-area"
                className="mb-2 block text-sm font-medium text-stone-700"
              >
                Actual farm area (Bigha)
              </label>
              <input
                id="farm-actual-area"
                name="actualAreaBigha"
                type="number"
                min="0"
                step="0.01"
                value={actualAreaInput}
                onChange={handleActualAreaChange}
                placeholder="Enter known farm area"
                className="min-h-11 w-full rounded-2xl border border-stone-300 px-4 text-sm text-stone-900 outline-none transition focus:border-green-600"
              />
              <p className="mt-2 text-xs text-stone-500">
                The map gives an estimate. Enter the known actual area from your land record if it
                is different.
              </p>
            </div>

            <div>
              <label htmlFor="farm-address" className="mb-2 block text-sm font-medium text-stone-700">
                Address (optional)
              </label>
              <textarea
                id="farm-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Village, nearby landmark, or local address"
                rows={3}
                className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-green-600"
              />
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
