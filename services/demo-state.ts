/**
 * In-memory demo state — lives only for this Expo Go session, so a reload
 * resets everything to a fresh demo. Two slices:
 *
 *   1. onboardingComplete — gates the /sign-up redirect at app/index.tsx
 *   2. earnings           — driver's "today" running total, ticked when a
 *                           ride ends in /in-ride. Subscribed via
 *                           useEarnings() so the /online counter animates
 *                           on change.
 *
 * For production: swap onboarding for AsyncStorage-backed session tokens
 * and earnings for a Firestore aggregate query.
 */

import { useSyncExternalStore } from 'react';

// --- onboarding flag --------------------------------------------------------

let onboardingComplete = false;

export function markOnboarded() {
  onboardingComplete = true;
}

export function isOnboarded() {
  return onboardingComplete;
}

// --- driver earnings store --------------------------------------------------

// Driver's take per ride — Kyra keeps under 25%.
export const DRIVER_TAKE_RATIO = 0.75;
// Daily target shown on the /online counter.
export const DAILY_TARGET_INR = 500;

let earningsInr = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function addEarnings(amount: number) {
  earningsInr += Math.max(0, Math.round(amount));
  notify();
}

export function getEarnings() {
  return earningsInr;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useEarnings(): number {
  return useSyncExternalStore(subscribe, () => earningsInr, () => 0);
}
