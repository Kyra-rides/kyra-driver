/**
 * Firestore data layer for rides — shared schema across rider/driver/admin.
 *
 * Single active ride at a time (prototype scope). Schema:
 *
 *   rides/{rideId}                 ← rider+driver+admin all read/write
 *     rider, driver, pickup, drop, status, fare, agentStep, driverOtpAttempt, ...
 *
 *   rides/{rideId}/secrets/otp     ← only rider+admin read; driver app never queries this path
 *     { otp: '4 digits' }
 *
 * Status transitions:
 *   requested → dispatching → accepted → in_progress → completed → rated
 *
 * For the prototype, security rules are open — OTP secrecy is enforced by
 * client behavior (driver app simply never reads rides/{id}/secrets/*).
 */

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore';

import { db } from './firebase';

export type RideStatus =
  | 'requested'
  | 'dispatching'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'rated'
  | 'cancelled';

export type RideAgentStep = 'reading' | 'searching' | 'found' | 'dispatched';

export type LatLng = { lat: number; lng: number };

export type RidePlace = {
  name: string;
  address: string;
  coord: LatLng;
};

export type RideRider = { id: string; name: string; phone: string };

export type RideDriver = {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  rating: number;
};

export type RideDoc = {
  id: string;
  status: RideStatus;
  rider: RideRider;
  driver: RideDriver | null;
  pickup: RidePlace;
  drop: RidePlace;
  vehicleType: 'auto' | 'bike';
  fareInr: number;
  distanceKm: number;
  durationMin: number;
  agentStep?: RideAgentStep | null;
  driverOtpAttempt?: string | null;
  driverOtpError?: boolean;
  riderRating?: number | null;
  riderNote?: string | null;
  createdAt: Timestamp | null;
  acceptedAt?: Timestamp | null;
  startedAt?: Timestamp | null;
  completedAt?: Timestamp | null;
};

export type RideSecret = { otp: string };

// Demo identities — one rider, one driver for the prototype.
export const DEMO_RIDER: RideRider = {
  id: 'demo-rider-aanya',
  name: 'Aanya Sharma',
  phone: '+91 98765 44210',
};

export const DEMO_DRIVER: RideDriver = {
  id: 'demo-driver-priya',
  name: 'Priya Devi',
  phone: '+91 97412 11023',
  vehicle: 'KA-01-XX-2104 · Auto',
  rating: 4.9,
};

const ridesRef = () => collection(db, 'rides');
export const rideDocRef = (rideId: string) => doc(db, 'rides', rideId);
export const rideSecretRef = (rideId: string) => doc(db, 'rides', rideId, 'secrets', 'otp');

export function newRideId(): string {
  return `rid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function generate4DigitOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Subscribes to the most recent ride doc. Used by all three apps to track the
// "current" active ride. With one rider/driver in the prototype there's at most
// one ride live at a time.
export function subscribeLatestRide(cb: (ride: RideDoc | null) => void) {
  const q = query(ridesRef(), orderBy('createdAt', 'desc'), limit(1));
  return onSnapshot(q, (snap) => {
    const docSnap = snap.docs[0];
    if (!docSnap) return cb(null);
    cb({ ...(docSnap.data() as Omit<RideDoc, 'id'>), id: docSnap.id });
  });
}

export function subscribeRide(rideId: string, cb: (ride: RideDoc | null) => void) {
  return onSnapshot(rideDocRef(rideId), (snap) => {
    if (!snap.exists()) return cb(null);
    cb({ ...(snap.data() as Omit<RideDoc, 'id'>), id: snap.id });
  });
}

export function subscribeRideSecret(rideId: string, cb: (otp: string | null) => void) {
  return onSnapshot(rideSecretRef(rideId), (snap) => {
    cb(snap.exists() ? (snap.data() as RideSecret).otp : null);
  });
}

// Rider books a ride.
export async function createRide(input: {
  pickup: RidePlace;
  drop: RidePlace;
  vehicleType: 'auto' | 'bike';
  fareInr: number;
  distanceKm: number;
  durationMin: number;
}): Promise<string> {
  const id = newRideId();
  await setDoc(rideDocRef(id), {
    status: 'requested',
    rider: DEMO_RIDER,
    driver: null,
    pickup: input.pickup,
    drop: input.drop,
    vehicleType: input.vehicleType,
    fareInr: input.fareInr,
    distanceKm: input.distanceKm,
    durationMin: input.durationMin,
    agentStep: null,
    createdAt: serverTimestamp(),
  });
  return id;
}

// Admin marks dispatch progress (theatrical agent steps).
export async function setAgentStep(rideId: string, step: RideAgentStep | null) {
  await updateDoc(rideDocRef(rideId), { agentStep: step });
}

// Admin assigns the driver and moves status → dispatching.
export async function dispatchRideToDriver(rideId: string, driver: RideDriver) {
  await updateDoc(rideDocRef(rideId), {
    driver,
    status: 'dispatching',
    agentStep: 'dispatched',
  });
}

// Driver accepts the request — admin will then generate OTP separately.
export async function acceptRide(rideId: string) {
  await updateDoc(rideDocRef(rideId), {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  });
}

// Admin generates and stores the ride OTP (in subcollection — driver doesn't read this path).
export async function setRideOtp(rideId: string, otp: string) {
  await setDoc(rideSecretRef(rideId), { otp });
}

// Driver submits an OTP attempt — admin app verifies via subscribeRideSecret + this field.
export async function submitDriverOtpAttempt(rideId: string, attempt: string) {
  await updateDoc(rideDocRef(rideId), { driverOtpAttempt: attempt, driverOtpError: false });
}

export async function rejectDriverOtpAttempt(rideId: string) {
  await updateDoc(rideDocRef(rideId), { driverOtpAttempt: null, driverOtpError: true });
}

export async function startRide(rideId: string) {
  await updateDoc(rideDocRef(rideId), {
    status: 'in_progress',
    startedAt: serverTimestamp(),
    driverOtpError: false,
  });
}

export async function endRide(rideId: string) {
  await updateDoc(rideDocRef(rideId), {
    status: 'completed',
    completedAt: serverTimestamp(),
  });
}

export async function rateRide(rideId: string, rating: number, note: string | null) {
  await updateDoc(rideDocRef(rideId), { riderRating: rating, riderNote: note, status: 'rated' });
}
