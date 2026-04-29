/**
 * Firebase singleton — one app, one Firestore instance, shared across screens.
 *
 * For the hackathon MVP we point at a LOCAL Firestore emulator running on the
 * laptop (no cloud project / no internet needed). The phone connects to the
 * emulator over LAN — host is auto-derived from the Expo dev-server hostUri,
 * so it Just Works whether the laptop's IP is 192.168.x.x or 10.x.x.x.
 *
 * Flip EXPO_PUBLIC_FIRESTORE_EMULATOR=false in .env to talk to real cloud
 * Firestore (post-MVP).
 */

import Constants from 'expo-constants';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  throw new Error(
    'Firebase config missing — copy .env.example to .env and fill EXPO_PUBLIC_FIREBASE_* keys.',
  );
}

export const app: FirebaseApp = getApps()[0] ?? initializeApp(config);
export const db: Firestore = getFirestore(app);

const useEmulator = process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR !== 'false';
const port = Number(process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT ?? '8080');

if (useEmulator) {
  const flag = '__kyra_firestore_emu_connected__';
  const g = globalThis as Record<string, unknown>;
  if (!g[flag]) {
    const hostUri =
      (Constants.expoConfig?.hostUri as string | undefined) ??
      // @ts-expect-error: expoGoConfig is the right one in Expo Go runtime
      (Constants.expoGoConfig?.hostUri as string | undefined) ??
      '';
    const host = hostUri.split(':')[0] || 'localhost';
    connectFirestoreEmulator(db, host, port);
    g[flag] = true;
    if (__DEV__) {
      console.log(`[firebase] Firestore emulator → ${host}:${port}`);
    }
  }
}
