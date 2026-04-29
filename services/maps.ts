import type { LatLng } from '@/constants/mock-ride';

// TODO: move to EXPO_PUBLIC_GOOGLE_MAPS_KEY once we restart Metro on Node 22.
// Mirrors kyra-rider/.env so all three apps share the same project key.
export const GOOGLE_MAPS_KEY = 'AIzaSyDZCAFL8oIrhWhAxin1s01xwqJRUVil90o';

const STATIC_MAPS_BASE = 'https://maps.googleapis.com/maps/api/staticmap';
const ROUTES_BASE = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export type RouteData = {
  encodedPolyline: string;
  distanceMeters: number;
  durationSeconds: number;
};

export async function fetchRoute(origin: LatLng, destination: LatLng): Promise<RouteData | null> {
  try {
    const res = await fetch(ROUTES_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
        'X-Goog-FieldMask':
          'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: 'DRIVE',
        regionCode: 'in',
        polylineEncoding: 'ENCODED_POLYLINE',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route?.polyline?.encodedPolyline) return null;
    const durationSeconds = Number(String(route.duration ?? '0s').replace('s', ''));
    return {
      encodedPolyline: route.polyline.encodedPolyline,
      distanceMeters: route.distanceMeters ?? 0,
      durationSeconds,
    };
  } catch {
    return null;
  }
}

export function staticMapUrl({
  origin,
  destination,
  encodedPolyline,
  width = 640,
  height = 400,
  scale = 2,
}: {
  origin: LatLng;
  destination: LatLng;
  encodedPolyline?: string;
  width?: number;
  height?: number;
  scale?: 1 | 2;
}): string {
  const params = new URLSearchParams({
    size: `${width}x${height}`,
    scale: String(scale),
    maptype: 'roadmap',
    key: GOOGLE_MAPS_KEY,
  });

  // Markers: green dot for origin, gold for destination.
  params.append('markers', `color:0x5BD2A2|label:A|${origin.lat},${origin.lng}`);
  params.append('markers', `color:0xCFA45D|label:B|${destination.lat},${destination.lng}`);

  if (encodedPolyline) {
    params.append('path', `color:0xCFA45Dff|weight:5|enc:${encodedPolyline}`);
  } else {
    params.append('path', `color:0xCFA45Dff|weight:5|${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`);
  }

  return `${STATIC_MAPS_BASE}?${params.toString()}`;
}
