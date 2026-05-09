/**
 * Background location task for kyra-driver.
 *
 * Registers a TaskManager task that fires whenever the OS delivers a new
 * GPS position while the app is in the background or the screen is off.
 * The handler calls the same heartbeat RPC used in the foreground so the
 * driver's position stays live on the rider's map.
 *
 * IMPORTANT: TaskManager.defineTask must run at module load time (top level),
 * so this file must be imported from a root module such as app/_layout.tsx
 * before any navigation occurs.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { heartbeat } from './rides';

export const BG_LOCATION_TASK = 'kyra-background-location';

// ─── Task definition (runs at module import time) ────────────────────────────

TaskManager.defineTask(BG_LOCATION_TASK, ({ data, error }: TaskManager.TaskManagerTaskBody) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] })?.locations;
  const loc = locations?.[0];
  if (!loc) return;
  void heartbeat(
    loc.coords.latitude,
    loc.coords.longitude,
    loc.coords.heading ?? undefined,
  );
});

// ─── Start / stop ─────────────────────────────────────────────────────────────

/**
 * Start the background location task.
 * Call this only after both foreground AND background permissions are granted.
 */
export async function startBackgroundLocation(): Promise<void> {
  const hasTask = await TaskManager.isTaskRegisteredAsync(BG_LOCATION_TASK);
  if (hasTask) return; // Already running.

  await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15_000,          // Minimum ms between updates.
    distanceInterval: 50,          // Minimum metres of movement.
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Kyra Driver',
      notificationBody: 'Location active — ride alerts on.',
      notificationColor: '#CEB37E',
    },
    pausesUpdatesAutomatically: false,
  });
}

/**
 * Stop the background location task (call when driver goes offline or signs out).
 */
export async function stopBackgroundLocation(): Promise<void> {
  const hasTask = await TaskManager.isTaskRegisteredAsync(BG_LOCATION_TASK);
  if (!hasTask) return;
  await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
}
