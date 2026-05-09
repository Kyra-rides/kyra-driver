/**
 * Driver-side ride data layer over Supabase.
 *
 * Replaces the previous Firestore-based services/ride-firestore.ts.
 *
 * Drivers see:
 *   - their own assigned rides (any status)
 *   - open `requested` rides in their area when online (RLS policy "rides driver pool")
 *
 * Drivers act:
 *   - go online / offline (driver_heartbeat / driver_go_offline RPCs)
 *   - accept a requested ride (UPDATE status='matched', driver_id=self)
 *   - mark arriving / start trip / complete trip (state-machine triggers enforce legality)
 *   - submit gender-check answer at pickup
 */

import { supabase } from './supabase';
import type {
  Ride as RideRow,
  RideStatus,
  GenderCheckResponse,
  Driver,
} from '@/types/database';

export type Ride = RideRow;
export type { RideStatus, GenderCheckResponse };

// ─────────────────────────────────────────────────────────────────────────────
// Identity
// ─────────────────────────────────────────────────────────────────────────────

export async function currentDriverId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session?.user.id) throw new Error('not_authenticated');
  return data.session.user.id;
}

export async function currentDriver(): Promise<Driver> {
  const id = await currentDriverId();
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('profile_id', id)
    .single();
  if (error) throw error;
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Presence
// ─────────────────────────────────────────────────────────────────────────────

export async function goOnline(lat: number, lng: number, headingDeg?: number): Promise<void> {
  const { error } = await supabase.rpc('driver_heartbeat', {
    p_lat: lat,
    p_lng: lng,
    p_heading_deg: headingDeg ?? null,
  });
  if (error) throw error;
}

export async function goOffline(): Promise<void> {
  const { error } = await supabase.rpc('driver_go_offline', {});
  if (error) throw error;
}

export async function heartbeat(lat: number, lng: number, headingDeg?: number): Promise<void> {
  return goOnline(lat, lng, headingDeg);
}

// ─────────────────────────────────────────────────────────────────────────────
// Ride pool & assigned rides
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchOpenRequests(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('status', 'requested')
    .is('driver_id', null)
    .order('requested_at', { ascending: true })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveAssignment(): Promise<Ride | null> {
  const id = await currentDriverId();
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_id', id)
    .in('status', ['matched', 'driver_arriving', 'pickup_verified', 'in_trip'])
    .order('matched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchRideHistory(): Promise<Ride[]> {
  const id = await currentDriverId();
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('driver_id', id)
    .order('completed_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// Realtime
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeOpenRequests(cb: (rides: Ride[]) => void): () => void {
  let active = true;

  const reload = () => {
    void fetchOpenRequests().then((rides) => {
      if (active) cb(rides);
    });
  };

  reload();

  // Unique channel name per call avoids the "cannot add callbacks after
  // subscribe()" error that fires when a hot-reload or remount tries to
  // reuse an already-subscribed channel.
  const channelName = `rides_pool:${Math.random().toString(36).slice(2, 10)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: '*', schema: 'kyra', table: 'rides' },
      () => reload(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

export function subscribeAssignment(cb: (ride: Ride | null) => void): () => void {
  let active = true;

  const reload = () => {
    void fetchActiveAssignment().then((ride) => {
      if (active) cb(ride);
    }).catch(() => { if (active) cb(null); });
  };

  reload();

  // Broad listener — fires on ANY rides change so we catch the moment a ride
  // is assigned to this driver (driver_id was null before accept, so a
  // driver-filtered channel would miss the transition).
  const channelName = `driver_assign:${Math.random().toString(36).slice(2, 10)}`;
  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'kyra', table: 'rides' }, () => reload())
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// State-changing actions
// ─────────────────────────────────────────────────────────────────────────────

export async function acceptRide(rideId: string, vehicleId: string): Promise<Ride> {
  const id = await currentDriverId();
  const { data, error } = await supabase
    .from('rides')
    .update({ driver_id: id, vehicle_id: vehicleId, status: 'matched' })
    .eq('id', rideId)
    .eq('status', 'requested') // optimistic guard against double-accept
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function markArriving(rideId: string): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .update({ status: 'driver_arriving' })
    .eq('id', rideId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function submitDriverGenderCheck(
  rideId: string,
  answer: GenderCheckResponse,
): Promise<Ride> {
  const { data, error } = await supabase.rpc('submit_pickup_gender_check', {
    p_ride_id: rideId,
    p_answer: answer,
  });
  if (error) throw error;
  return data;
}

export async function startTrip(rideId: string, polyline: string, distanceM: number, durationS: number): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .update({
      status: 'in_trip',
      planned_polyline:    polyline,
      planned_distance_m:  distanceM,
      planned_duration_s:  durationS,
    })
    .eq('id', rideId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeRide(rideId: string, fareInrFinal: number): Promise<void> {
  const { error } = await supabase
    .from('rides')
    .update({ status: 'completed', fare_inr_final: fareInrFinal })
    .eq('id', rideId);
  if (error) throw error;
}

export async function cancelRideByDriver(rideId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('rides')
    .update({ status: 'cancelled_by_driver', cancelled_reason: reason })
    .eq('id', rideId);
  if (error) throw error;
}

export async function pingLocation(
  rideId: string,
  lat: number,
  lng: number,
  speedKmh?: number,
  headingDeg?: number,
  accuracyM?: number,
): Promise<void> {
  const driverId = await currentDriverId();
  const { error } = await supabase.from('ride_locations').insert({
    ride_id:     rideId,
    driver_id:   driverId,
    location:    `SRID=4326;POINT(${lng} ${lat})` as unknown as Ride['pickup_location'],
    speed_kmh:   speedKmh,
    heading_deg: headingDeg,
    accuracy_m:  accuracyM,
  });
  if (error) throw error;
}

export async function rateRider(
  rideId: string,
  riderId: string,
  stars: number,
  review: string | null,
): Promise<void> {
  const id = await currentDriverId();
  const { error } = await supabase
    .from('ratings')
    .upsert(
      { ride_id: rideId, rater_id: id, ratee_id: riderId, stars, review },
      { onConflict: 'ride_id,rater_id' },
    );
  if (error) throw error;
}
