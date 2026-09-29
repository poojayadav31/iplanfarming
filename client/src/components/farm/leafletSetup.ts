import L from 'leaflet';
import 'leaflet-gesture-handling';

if (typeof window !== 'undefined') {
  (window as typeof window & { L?: typeof L }).L = L;
}

const markerIcon2x = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString();
const markerIcon = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString();
const markerShadow = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString();

delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

export const ESRI_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const CG_CENTER: [number, number] = [21.2787, 81.8661];

export const createBaseLayers = () => {
  const esriLayer = L.tileLayer(ESRI_TILE_URL, {
    attribution: 'Tiles © Esri',
    maxZoom: 20,
  });

  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  });

  return { esriLayer, osmLayer };
};

export const createDivLabelIcon = (label: string, isActive = false) =>
  L.divIcon({
    className: 'zone-label-icon',
    html: `<div style="
      min-width: 32px;
      height: 32px;
      padding: 0 10px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: ${isActive ? '#14532d' : '#1f2937'};
      color: white;
      font-size: 12px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
      border: 2px solid rgba(255,255,255,0.85);
    ">${label}</div>`,
  });

export default L;
