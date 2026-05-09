/**
 * Driver-side SOS service.
 *
 * Same shape as the rider service. Wraps the `kyra.trigger_sos` RPC and
 * captures a fresh GPS fix. Drivers fire SOS more often while the vehicle
 * is moving, so we always prefer a recent last-known fix to keep the panic
 * action sub-second.
 */

import * as Location from 'expo-location';

import { supabase } from './supabase';

export type SosResult = {
  eventId: string;
  lat: number;
  lng: number;
  accuracy: number | null;
};

const FAST_TIMEOUT_MS = 4000;

async function captureFix(): Promise<{ lat: number; lng: number; accuracy: number | null }> {
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  if (last) {
    void Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).catch(() => null);
    return {
      lat: last.coords.latitude,
      lng: last.coords.longitude,
      accuracy: last.coords.accuracy ?? null,
    };
  }
  const fix = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), FAST_TIMEOUT_MS)),
  ]);
  if (!fix) {
    throw new Error('SOS_NO_LOCATION');
  }
  return {
    lat: fix.coords.latitude,
    lng: fix.coords.longitude,
    accuracy: fix.coords.accuracy ?? null,
  };
}

export async function triggerSOS(rideId?: string | null, _note?: string): Promise<SosResult> {
  const { lat, lng, accuracy } = await captureFix();

  const { data, error } = await supabase.rpc('trigger_sos', {
    p_lat: lat,
    p_lng: lng,
    p_ride_id: rideId ?? null,
  });
  if (error) throw new Error(error.message || 'SOS_RPC_FAILED');

  const row = Array.isArray(data) ? data[0] : data;
  return {
    eventId: row?.id ?? 'unknown',
    lat,
    lng,
    accuracy,
  };
}
