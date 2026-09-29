/// <reference types="vite/client" />
import 'leaflet';

declare module 'leaflet-draw';
declare module 'leaflet-gesture-handling';

declare module 'leaflet' {
  interface MapOptions {
    gestureHandling?: boolean;
  }
}
