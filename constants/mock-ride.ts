import type { RideRequest } from '@/components/ride-request-modal';

export type LatLng = { lat: number; lng: number };

export const DRIVER_LOCATION: LatLng = { lat: 12.9719, lng: 77.6412 };

export const PICKUP_COORDS: LatLng = { lat: 12.9784, lng: 77.6408 };

export const DROP_COORDS: LatLng = { lat: 13.0418, lng: 77.6217 };

export const MOCK_RIDE: RideRequest = {
  fareInr: 248,
  riderName: 'Aanya',
  riderRating: 4.9,
  pickup: {
    address: 'Indiranagar Metro Station, 100 Feet Road, Bengaluru',
    landmark: 'Gate B, near CCD',
    etaMin: 4,
    distanceKm: 1.6,
  },
  drop: {
    address: 'Manyata Tech Park, Outer Ring Road, Bengaluru',
    landmark: 'F1 block reception',
    distanceKm: 12.4,
    durationMin: 32,
  },
};

export const RIDE_OTP = '4729';
