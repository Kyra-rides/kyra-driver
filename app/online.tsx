/**
 * Driver online screen — the main canvas after KYC approval.
 *
 * State machine driven by:
 *   1. Local `isOnline` toggle (sends GPS heartbeats every 10s while on)
 *   2. `assignment` — the ride row this driver is currently working,
 *      fetched via subscribeAssignment. Its status drives the view.
 *
 *   off                → big "Go Online" CTA
 *   online, no trip    → ride request pool
 *   matched            → "On your way" + "I'm at pickup"
 *   driver_arriving    → mutual gender check ("Is the rider a woman?")
 *   pickup_verified    → "Start trip"
 *   in_trip            → "Complete trip" + fare input
 *   completed          → trip wrap-up, then back to pool
 *
 * Real Supabase calls only — no mocks. Earnings card pulls from
 * kyra.drivers.lifetime_earnings_inr.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import {
  acceptRide,
  completeRide,
  currentDriver,
  goOnline,
  heartbeat,
  markArriving,
  pingLocation,
  startTrip,
  submitDriverGenderCheck,
  subscribeAssignment,
  subscribeOpenRequests,
  type Ride,
} from '@/services/rides';
import { startBackgroundLocation, stopBackgroundLocation } from '@/services/background-location';
import { supabase } from '@/services/supabase';
import type { Driver } from '@/types/database';

const HEARTBEAT_MS = 10_000;
const IN_TRIP_PING_MS = 7_000;

/**
 * Pull today's earnings (sum of fare_inr_final for rides completed today)
 * and the active first-5-rides goal for the signed-in driver.
 *
 * "Today" is computed in Asia/Kolkata so a ride completed at 11:30pm IST
 * counts as today's earnings, not tomorrow's.
 */
async function loadEarningsAndGoal(): Promise<{
  earningsToday: number;
  goal: { progress: number; target: number; bonus: number } | null;
}> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return { earningsToday: 0, goal: null };

  // Compute IST midnight as a UTC timestamp.
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIst = new Date(Date.now() + istOffsetMs);
  const istMidnight = new Date(Date.UTC(
    nowIst.getUTCFullYear(),
    nowIst.getUTCMonth(),
    nowIst.getUTCDate(),
  ));
  const startOfTodayUtc = new Date(istMidnight.getTime() - istOffsetMs).toISOString();

  const [todayRes, goalRes] = await Promise.all([
    supabase.from('rides')
      .select('fare_inr_final')
      .eq('driver_id', uid)
      .eq('status', 'completed')
      .gte('completed_at', startOfTodayUtc),
    supabase.from('goals')
      .select('progress_count, target_count, bonus_inr, status')
      .eq('driver_id', uid)
      .eq('goal_type', 'first_5_rides')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const earningsToday = (todayRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.fare_inr_final ?? 0),
    0,
  );

  const goal = goalRes.data
    ? {
        progress: Number(goalRes.data.progress_count),
        target:   Number(goalRes.data.target_count),
        bonus:    Number(goalRes.data.bonus_inr),
      }
    : null;

  return { earningsToday, goal };
}

export default function OnlineScreen() {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<Location.LocationPermissionResponse | null>(null);
  const [isOnline, setIsOnline]     = useState(false);
  const [driver, setDriver]         = useState<Driver | null>(null);
  const [assignment, setAssignment] = useState<Ride | null>(null);
  const [pool, setPool]             = useState<Ride[]>([]);
  const [busy, setBusy]             = useState(false);
  // Earnings dashboard data
  const [earningsToday, setEarningsToday] = useState<number>(0);
  const [activeGoal, setActiveGoal]       = useState<{ progress: number; target: number; bonus: number } | null>(null);
  const [driverCoord, setDriverCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [alertRide, setAlertRide]     = useState<Ride | null>(null);
  const lastLocation                  = useRef<{ lat: number; lng: number } | null>(null);
  const shownRideIds                  = useRef<Set<string>>(new Set());

  useEffect(() => {
    void (async () => {
      const p = await Location.requestForegroundPermissionsAsync();
      setPermission(p);
    })();
  }, []);

  // Auto-online: as soon as the screen mounts AND we have permission, flip
  // the driver online and start heartbeating. Driver stays online until they
  // sign out — backgrounding the app doesn't take them offline.
  useEffect(() => {
    if (!permission?.granted) return;
    let cancelled = false;
    void (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        await goOnline(loc.coords.latitude, loc.coords.longitude);
        if (cancelled) return;
        setDriverCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        lastLocation.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setIsOnline(true);
        // Start background GPS task so location stays live when app is minimised.
        void startBackgroundLocation().catch(() => { /* no bg permission yet — silent */ });
      } catch {
        // Permission revoked or GPS off — UI shows the "permission needed" branch.
      }
    })();
    return () => {
      cancelled = true;
      void stopBackgroundLocation().catch(() => {/* noop */});
    };
  }, [permission?.granted]);

  // Refetch driver + earnings + goal whenever an assignment status changes.
  // The on_ride_completed trigger updates lifetime_earnings_inr and goals
  // server-side, so refetching after status='completed' picks up the new totals.
  useEffect(() => {
    void currentDriver().then(setDriver).catch(() => setDriver(null));
    void loadEarningsAndGoal().then(({ earningsToday, goal }) => {
      setEarningsToday(earningsToday);
      setActiveGoal(goal);
    }).catch(() => {/* silent */});
  }, [assignment?.status]);

  useEffect(() => subscribeAssignment(setAssignment), []);

  useEffect(() => {
    if (!isOnline || assignment) {
      setPool([]);
      return;
    }
    return subscribeOpenRequests(setPool);
  }, [isOnline, assignment]);

  // Full-screen ride alert: fire once per new ride that enters the pool.
  useEffect(() => {
    if (!isOnline || assignment) return;
    for (const ride of pool) {
      if (!shownRideIds.current.has(ride.id)) {
        shownRideIds.current.add(ride.id);
        setAlertRide(ride);
        break; // One alert at a time.
      }
    }
  }, [pool, isOnline, assignment]);

  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    const tick = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!alive) return;
        lastLocation.current = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        setDriverCoord({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        await heartbeat(
          loc.coords.latitude,
          loc.coords.longitude,
          loc.coords.heading ?? undefined,
        );
      } catch {
        // Silent — next tick retries.
      }
    };
    void tick();
    const id = setInterval(() => void tick(), HEARTBEAT_MS);
    return () => { alive = false; clearInterval(id); };
  }, [isOnline]);

  // Whenever a driver assignment exists, push them into the dedicated
  // trip-flow screens (navigate-to-pickup → enter-otp → in-ride). Each
  // screen subscribes to the same assignment and routes onward when the
  // status changes. online.tsx stays just for "no assignment" + ride pool.
  useEffect(() => {
    if (!assignment) return;
    if (assignment.status === 'matched') {
      router.push('/navigate-to-pickup');
    } else if (assignment.status === 'pickup_verified' || assignment.status === 'in_trip') {
      router.push('/in-ride');
    }
  }, [assignment?.id, assignment?.status]);

  // Faster GPS stream during in_trip — every 7s, insert into ride_locations.
  // The rider's app subscribes to this channel for live driver tracking.
  useEffect(() => {
    if (assignment?.status !== 'in_trip') return;
    let alive = true;
    const rideId = assignment.id;
    const tick = async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (!alive) return;
        await pingLocation(
          rideId,
          loc.coords.latitude,
          loc.coords.longitude,
          loc.coords.speed ? loc.coords.speed * 3.6 : undefined,
          loc.coords.heading ?? undefined,
          loc.coords.accuracy ?? undefined,
        );
      } catch {
        // Silent — keep retrying.
      }
    };
    void tick();
    const id = setInterval(() => void tick(), IN_TRIP_PING_MS);
    return () => { alive = false; clearInterval(id); };
  }, [assignment?.id, assignment?.status]);

  const onAccept = async (ride: Ride) => {
    if (!driver) return;
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('driver_id', driver.profile_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!vehicle) {
      Alert.alert(
        t('driver_online.no_vehicle_title'),
        t('driver_online.no_vehicle_body'),
      );
      return;
    }
    setBusy(true);
    try {
      const accepted = await acceptRide(ride.id, vehicle.id as string);
      setAssignment(accepted);
    } catch (err) {
      Alert.alert(
        t('driver_online.could_not_accept'),
        err instanceof Error ? err.message : t('driver_online.someone_else_took'),
      );
    } finally {
      setBusy(false);
    }
  };

  const onMarkArriving = async () => {
    if (!assignment) return;
    setBusy(true);
    try { await markArriving(assignment.id); }
    catch (err) { Alert.alert(t('nav_pickup.could_not_update'), err instanceof Error ? err.message : ''); }
    finally     { setBusy(false); }
  };

  const onAnswerGenderCheck = async (answer: 'yes' | 'no') => {
    if (!assignment) return;
    setBusy(true);
    try { await submitDriverGenderCheck(assignment.id, answer); }
    catch (err) { Alert.alert(t('enter_otp.could_not_submit'), err instanceof Error ? err.message : ''); }
    finally     { setBusy(false); }
  };

  const onStartTrip = async () => {
    if (!assignment) return;
    setBusy(true);
    try { await startTrip(assignment.id, '', 0, 0); }
    catch (err) { Alert.alert(t('in_ride.could_not_end'), err instanceof Error ? err.message : ''); }
    finally     { setBusy(false); }
  };

  if (permission && !permission.granted) {
    return (
      <ThemedView style={styles.container}>
        <ScreenHeader title={t('driver_online.permission_needed_title')} />
        <View style={styles.body}>
          <ThemedText type="title">{t('driver_online.permission_title')}</ThemedText>
          <ThemedText style={styles.muted}>{t('driver_online.permission_body')}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Header
        isOnline={isOnline}
        driver={driver}
        onProfile={() => router.push('/profile')}
      />

      <RideAlertModal
        ride={alertRide}
        driverCoord={driverCoord}
        busy={busy}
        onAccept={(ride) => {
          setAlertRide(null);
          void onAccept(ride);
        }}
        onDismiss={() => setAlertRide(null)}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {!assignment && (
          <EarningsCard
            todayInr={earningsToday}
            lifetimeInr={driver ? Number(driver.lifetime_earnings_inr) : 0}
            ridesCompleted={driver?.total_completed_rides ?? 0}
            goal={activeGoal}
          />
        )}
        {assignment ? (
          <AssignmentView
            ride={assignment}
            busy={busy}
            onMarkArriving={onMarkArriving}
            onAnswerGenderCheck={onAnswerGenderCheck}
            onStartTrip={onStartTrip}
          />
        ) : (
          <PoolView pool={pool} busy={busy} onAccept={onAccept} driverCoord={driverCoord} />
        )}
      </ScrollView>
    </ThemedView>
  );
}

function Header({
  isOnline, driver, onProfile,
}: {
  isOnline: boolean;
  driver: Driver | null;
  onProfile: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <ThemedText style={styles.headerLabel}>{t('driver_online.status_label')}</ThemedText>
        <ThemedText type="defaultSemiBold" style={isOnline ? styles.headerOn : styles.headerOff}>
          {isOnline ? t('driver_online.online') : '…'}
        </ThemedText>
      </View>
      <View style={styles.headerStats}>
        <ThemedText style={styles.headerLabel}>{t('driver_online.earned')}</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.headerEarn}>
          ₹{driver ? Math.round(Number(driver.lifetime_earnings_inr)).toLocaleString('en-IN') : '0'}
        </ThemedText>
      </View>
      <Pressable onPress={onProfile} hitSlop={8} style={styles.avatarBtn}>
        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={20} color={Brand.burgundyDark} />
        </View>
      </Pressable>
    </View>
  );
}

/**
 * Earnings dashboard card.
 *
 * Top row: "Today's earnings ₹X" + lifetime total + total completed rides.
 * Bottom: 5-segment first-5-rides goal progress bar with a ₹200 bonus
 * indicator at the end. Each segment fills gold as the driver completes
 * a ride. Hidden once the goal is paid out.
 */
function EarningsCard({
  todayInr,
  lifetimeInr,
  ridesCompleted,
  goal,
}: {
  todayInr: number;
  lifetimeInr: number;
  ridesCompleted: number;
  goal: { progress: number; target: number; bonus: number } | null;
}) {
  const { t } = useTranslation();
  const fmt = (n: number) => n.toLocaleString('en-IN');
  const showGoal = !!goal && goal.progress < goal.target;
  const segments = goal?.target ?? 5;
  const filled   = Math.min(goal?.progress ?? 0, segments);
  const remaining = segments - filled;

  return (
    <View style={styles.earnCard}>
      <View style={styles.earnTopRow}>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.earnLabel}>{t('driver_online.earned_today')}</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.earnToday}>
            ₹{fmt(Math.round(todayInr))}
          </ThemedText>
          <ThemedText style={styles.earnLifetime}>
            {ridesCompleted === 1
              ? t('driver_online.lifetime_one', { amount: fmt(Math.round(lifetimeInr)) })
              : t('driver_online.lifetime', { amount: fmt(Math.round(lifetimeInr)), count: ridesCompleted })}
          </ThemedText>
        </View>
        <MaterialIcons name="trending-up" size={28} color={Brand.gold} />
      </View>

      {showGoal && goal ? (
        <View style={styles.goalSection}>
          <View style={styles.goalLabelRow}>
            <ThemedText style={styles.goalTitle}>{t('driver_online.first_n_rides', { count: goal.target })}</ThemedText>
            <ThemedText style={styles.goalProgressText}>
              {t('driver_online.progress', { progress: goal.progress, target: goal.target })}
            </ThemedText>
          </View>
          <View style={styles.goalBar}>
            {Array.from({ length: segments }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.goalSegment,
                  i < filled ? styles.goalSegmentFilled : styles.goalSegmentEmpty,
                ]}
              />
            ))}
            <View style={[styles.goalBonus, filled >= segments && styles.goalBonusUnlocked]}>
              <MaterialIcons
                name={filled >= segments ? 'star' : 'star-border'}
                size={16}
                color={filled >= segments ? Brand.burgundyDark : Brand.gold}
              />
              <ThemedText style={[
                styles.goalBonusText,
                filled >= segments && styles.goalBonusTextUnlocked,
              ]}>₹{goal.bonus}</ThemedText>
            </View>
          </View>
          <ThemedText style={styles.goalHint}>
            {filled === 0
              ? t('driver_online.goal_first', { target: goal.target, bonus: goal.bonus })
              : filled < segments
                ? remaining === 1
                  ? t('driver_online.goal_more_one', { bonus: goal.bonus })
                  : t('driver_online.goal_more', { remaining, bonus: goal.bonus })
                : t('driver_online.goal_done')}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function PoolView({
  pool, busy, onAccept, driverCoord,
}: { pool: Ride[]; busy: boolean; onAccept: (r: Ride) => void; driverCoord: { lat: number; lng: number } | null }) {
  const { t } = useTranslation();
  if (pool.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Brand.beige} />
        <ThemedText type="title" style={styles.centerTitle}>{t('driver_online.pool_empty_title')}</ThemedText>
        <ThemedText style={styles.muted}>
          {t('driver_online.pool_visible_body')}
        </ThemedText>
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        {pool.length === 1
          ? t('driver_online.pool_count_one')
          : t('driver_online.pool_count', { count: pool.length })}
      </ThemedText>
      {pool.map((r) => {
        const pCoord = coordOf(r.pickup_location);
        const dCoord = coordOf(r.drop_location);
        const distToPickup = driverCoord && pCoord ? haversineKm(driverCoord, pCoord) : null;
        const distPickupToDrop = pCoord && dCoord ? haversineKm(pCoord, dCoord) : null;
        const pickup = splitAddress(r.pickup_address);
        const drop   = splitAddress(r.drop_address);
        return (
          <View key={r.id} style={styles.rideCard}>
            <View style={styles.rideRow}>
              <ThemedText style={styles.rideEarn}>₹{Number(r.fare_inr).toFixed(0)}</ThemedText>
              {distToPickup !== null && (
                <ThemedText style={styles.rideDistance}>
                  {distToPickup.toFixed(1)} km away
                </ThemedText>
              )}
            </View>
            <View style={styles.locBlock}>
              <ThemedText style={styles.locLabel}>Pickup</ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.locMain}>{pickup.main}</ThemedText>
              {pickup.detail ? <ThemedText style={styles.locDetail}>{pickup.detail}</ThemedText> : null}
            </View>
            <View style={styles.locBlock}>
              <ThemedText style={styles.locLabel}>
                Drop{distPickupToDrop !== null ? ` · ${distPickupToDrop.toFixed(1)} km from pickup` : ''}
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={styles.locMain}>{drop.main}</ThemedText>
              {drop.detail ? <ThemedText style={styles.locDetail}>{drop.detail}</ThemedText> : null}
            </View>
            <BrandButton title={t('driver_online.accept')} onPress={() => onAccept(r)} disabled={busy} />
          </View>
        );
      })}
    </View>
  );
}

function splitAddress(raw: string | null | undefined): { main: string; detail: string } {
  const s = (raw ?? '').trim();
  if (!s) return { main: '—', detail: '' };
  const parts = s.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return { main: s, detail: '' };
  return { main: parts[0], detail: parts.slice(1).join(', ') };
}

function coordOf(loc: unknown): { lat: number; lng: number } | null {
  const point = loc as { coordinates?: [number, number] } | null;
  if (!point?.coordinates || point.coordinates.length !== 2) return null;
  const [lng, lat] = point.coordinates;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lat, lng };
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function AssignmentView({
  ride, busy, onMarkArriving, onAnswerGenderCheck, onStartTrip,
}: {
  ride: Ride;
  busy: boolean;
  onMarkArriving: () => void;
  onAnswerGenderCheck: (a: 'yes' | 'no') => void;
  onStartTrip: () => void;
}) {
  const { t } = useTranslation();
  const { status } = ride;

  const titleForStatus =
    status === 'matched'         ? t('driver_online.assign_drive_to_pickup') :
    status === 'driver_arriving' ? t('driver_online.assign_arrived') :
    status === 'pickup_verified' ? t('driver_online.assign_ready') :
    status === 'in_trip'         ? t('driver_online.assign_in_trip') :
    status === 'completed'       ? t('driver_online.assign_complete') :
    t('driver_online.assign_working');

  return (
    <View style={styles.assignment}>
      <View style={styles.assignBanner}>
        <ThemedText style={styles.assignStage}>{stageLabel(status, t)}</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.assignTitle}>
          {titleForStatus}
        </ThemedText>
      </View>

      <View style={styles.rideCard}>
        <ThemedText style={styles.rideEarn}>₹{Number(ride.fare_inr).toFixed(0)}</ThemedText>
        <View style={styles.locBlock}>
          <ThemedText style={styles.locLabel}>Pickup</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.locMain}>
            {splitAddress(ride.pickup_address).main}
          </ThemedText>
          {splitAddress(ride.pickup_address).detail ? (
            <ThemedText style={styles.locDetail}>{splitAddress(ride.pickup_address).detail}</ThemedText>
          ) : null}
        </View>
        <View style={styles.locBlock}>
          <ThemedText style={styles.locLabel}>Drop</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.locMain}>
            {splitAddress(ride.drop_address).main}
          </ThemedText>
          {splitAddress(ride.drop_address).detail ? (
            <ThemedText style={styles.locDetail}>{splitAddress(ride.drop_address).detail}</ThemedText>
          ) : null}
        </View>
      </View>

      {status === 'matched' && (
        <BrandButton title={t('driver_online.at_pickup')} onPress={onMarkArriving} disabled={busy} />
      )}

      {status === 'driver_arriving' && (
        <GenderCheckCard ride={ride} busy={busy} onAnswer={onAnswerGenderCheck} />
      )}

      {status === 'pickup_verified' && (
        <BrandButton title={t('driver_online.start_trip')} onPress={onStartTrip} disabled={busy} />
      )}

      {status === 'in_trip' && (
        <CompleteTripCard
          rideId={ride.id}
          fareEstimate={Number(ride.fare_inr)}
          disabled={busy}
        />
      )}

      {status === 'completed' && (
        <View style={styles.center}>
          <MaterialIcons name="check-circle" size={48} color="#5BD2A2" />
          <ThemedText style={styles.muted}>{t('driver_online.assign_complete_waiting')}</ThemedText>
        </View>
      )}
    </View>
  );
}

function GenderCheckCard({
  ride, busy, onAnswer,
}: { ride: Ride; busy: boolean; onAnswer: (a: 'yes' | 'no') => void }) {
  const { t } = useTranslation();
  const myAnswer    = ride.driver_woman_check;
  const theirAnswer = ride.rider_driver_check;
  const localized = (a: 'yes' | 'no' | null | undefined) =>
    a === 'yes' ? t('driver_online.answer_yes')
    : a === 'no' ? t('driver_online.answer_no')
    : '';

  return (
    <View style={styles.checkCard}>
      <ThemedText type="defaultSemiBold" style={styles.checkTitle}>{t('enter_otp.check_label')}</ThemedText>
      <ThemedText style={styles.checkBody}>
        {t('driver_online.safety_look')}{'\n'}
        <ThemedText type="defaultSemiBold">{t('driver_online.safety_question')}</ThemedText>{'\n'}
        {t('driver_online.safety_no_warn')}
      </ThemedText>

      {myAnswer ? (
        <ThemedText style={styles.muted}>
          {theirAnswer
            ? t('driver_online.you_answered_their', { answer: localized(myAnswer), their: localized(theirAnswer) })
            : t('driver_online.you_answered_waiting', { answer: localized(myAnswer) })}
        </ThemedText>
      ) : (
        <View style={styles.checkBtns}>
          <Pressable
            disabled={busy}
            onPress={() => onAnswer('no')}
            style={[styles.checkBtn, styles.checkBtnNo]}
          >
            <ThemedText style={styles.checkBtnText}>{t('enter_otp.no')}</ThemedText>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => onAnswer('yes')}
            style={[styles.checkBtn, styles.checkBtnYes]}
          >
            <ThemedText style={styles.checkBtnTextYes}>{t('enter_otp.yes')}</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function CompleteTripCard({
  rideId, fareEstimate, disabled,
}: { rideId: string; fareEstimate: number; disabled: boolean }) {
  const { t } = useTranslation();
  const [final, setFinal] = useState(String(fareEstimate.toFixed(0)));
  const [busy, setBusy]   = useState(false);

  const onComplete = async () => {
    const inr = Number(final);
    if (!Number.isFinite(inr) || inr <= 0) {
      Alert.alert(t('in_ride.enter_valid'), t('in_ride.invalid_fare'));
      return;
    }
    setBusy(true);
    try {
      await completeRide(rideId, inr);
      router.replace(`/rate/${rideId}`);
    }
    catch (err) { Alert.alert(t('driver_online.could_not_complete'), err instanceof Error ? err.message : ''); }
    finally     { setBusy(false); }
  };

  return (
    <View style={{ gap: 8 }}>
      <ThemedText style={styles.muted}>{t('driver_online.complete_hint')}</ThemedText>
      <View style={styles.fareRow}>
        <ThemedText style={styles.farePrefix}>₹</ThemedText>
        <TextInput
          style={styles.fareInput}
          keyboardType="numeric"
          value={final}
          onChangeText={(v) => setFinal(v.replace(/[^0-9.]/g, ''))}
        />
      </View>
      <BrandButton title={t('driver_online.complete_trip')} onPress={onComplete} disabled={disabled || busy} />
    </View>
  );
}

function RideAlertModal({
  ride, driverCoord, busy, onAccept, onDismiss,
}: {
  ride: Ride | null;
  driverCoord: { lat: number; lng: number } | null;
  busy: boolean;
  onAccept: (r: Ride) => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!ride) return null;

  const pCoord = coordOf(ride.pickup_location);
  const dCoord = coordOf(ride.drop_location);
  const distToPickup     = driverCoord && pCoord ? haversineKm(driverCoord, pCoord) : null;
  const distPickupToDrop = pCoord && dCoord ? haversineKm(pCoord, dCoord) : null;
  const pickup = splitAddress(ride.pickup_address);
  const drop   = splitAddress(ride.drop_address);

  return (
    <Modal visible animationType="slide" statusBarTranslucent transparent>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={alertStyles.header}>
            <ThemedText style={alertStyles.newRide}>
              {t('driver_online.new_ride_request', { defaultValue: 'NEW RIDE REQUEST' })}
            </ThemedText>
            {distToPickup !== null && (
              <ThemedText style={alertStyles.kmAway}>
                {distToPickup.toFixed(1)} km {t('driver_online.away', { defaultValue: 'away' })}
              </ThemedText>
            )}
          </View>

          <ThemedText type="defaultSemiBold" style={alertStyles.fare}>
            ₹{Number(ride.fare_inr).toFixed(0)}
          </ThemedText>

          <View style={alertStyles.locSection}>
            <View style={alertStyles.locRow}>
              <View style={[alertStyles.dot, alertStyles.dotGreen]} />
              <View style={alertStyles.locText}>
                <ThemedText style={alertStyles.locLabel}>PICKUP</ThemedText>
                <ThemedText type="defaultSemiBold" style={alertStyles.locMain}>{pickup.main}</ThemedText>
                {pickup.detail ? <ThemedText style={alertStyles.locDetail}>{pickup.detail}</ThemedText> : null}
              </View>
            </View>
            <View style={alertStyles.vertLine} />
            <View style={alertStyles.locRow}>
              <View style={[alertStyles.dot, alertStyles.dotGold]} />
              <View style={alertStyles.locText}>
                <ThemedText style={alertStyles.locLabel}>
                  DROP{distPickupToDrop !== null ? ` · ${distPickupToDrop.toFixed(1)} km` : ''}
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={alertStyles.locMain}>{drop.main}</ThemedText>
                {drop.detail ? <ThemedText style={alertStyles.locDetail}>{drop.detail}</ThemedText> : null}
              </View>
            </View>
          </View>

          <View style={alertStyles.btnRow}>
            <Pressable onPress={onDismiss} style={alertStyles.dismissBtn}>
              <ThemedText style={alertStyles.dismissText}>
                {t('driver_online.skip', { defaultValue: 'Skip' })}
              </ThemedText>
            </Pressable>
            <BrandButton
              title={t('driver_online.accept', { defaultValue: 'Accept Ride' })}
              onPress={() => onAccept(ride)}
              disabled={busy}
              style={alertStyles.acceptBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

type TFunc = (key: string, opts?: Record<string, unknown>) => string;

function stageLabel(s: Ride['status'], t: TFunc): string {
  switch (s) {
    case 'matched':         return t('driver_online.stage_n', { n: 1 });
    case 'driver_arriving': return t('driver_online.stage_n', { n: 2 });
    case 'pickup_verified': return t('driver_online.stage_n', { n: 3 });
    case 'in_trip':         return t('driver_online.stage_n', { n: 4 });
    case 'completed':       return t('driver_online.stage_complete');
    default:                return s.toUpperCase();
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    paddingTop: 56,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.burgundyLight,
    backgroundColor: Brand.burgundyDark,
  },
  headerLabel: { color: Brand.beigeMuted, fontSize: 10, letterSpacing: 1.2 },
  headerOn:    { color: '#5BD2A2', fontSize: 18 },
  headerOff:   { color: Brand.beigeMuted, fontSize: 18 },
  headerStats: { alignItems: 'flex-end', gap: 2 },
  headerEarn:  { color: Brand.gold, fontSize: 16 },
  avatarBtn:   { padding: 4 },
  avatarCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  body:        { padding: 20, gap: 14 },

  // Earnings dashboard card
  earnCard: {
    padding: 16, gap: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.gold,
  },
  earnTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  earnLabel:     { color: Brand.beigeMuted, fontSize: 10, letterSpacing: 1.2 },
  earnToday:     { color: Brand.beige, fontSize: 28, marginTop: 2 },
  earnLifetime:  { color: Brand.beigeMuted, fontSize: 12, marginTop: 2 },
  goalSection:   { gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Brand.burgundyDark },
  goalLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle:     { color: Brand.gold, fontSize: 11, letterSpacing: 1.5 },
  goalProgressText: { color: Brand.beige, fontSize: 12 },
  goalBar:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  goalSegment:   { flex: 1, height: 8, borderRadius: 4 },
  goalSegmentFilled: { backgroundColor: Brand.gold },
  goalSegmentEmpty:  { backgroundColor: Brand.burgundyDark, borderWidth: 1, borderColor: Brand.burgundyLight },
  goalBonus:     {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1, borderColor: Brand.gold,
    marginLeft: 6,
  },
  goalBonusUnlocked: { backgroundColor: Brand.gold },
  goalBonusText:     { color: Brand.gold, fontSize: 12, fontWeight: '600' },
  goalBonusTextUnlocked: { color: Brand.burgundyDark },
  goalHint:      { color: Brand.beigeMuted, fontSize: 11, lineHeight: 15 },

  center:      { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  centerTitle: { textAlign: 'center', fontSize: 22 },
  muted:       { color: Brand.beigeMuted, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  sectionTitle:{ color: Brand.beige, fontSize: 14 },
  rideCard: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    gap: 6,
  },
  rideRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rideEarn:     { color: Brand.gold, fontSize: 22, fontWeight: '700' },
  rideDistance: { color: Brand.beige, fontSize: 13, fontWeight: '600' },
  rideAddr:     { color: Brand.beige, fontSize: 13 },
  locBlock:     { gap: 2, marginTop: 4 },
  locLabel:     { color: Brand.beigeMuted, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
  locMain:      { color: Brand.beige, fontSize: 15 },
  locDetail:    { color: Brand.beigeMuted, fontSize: 12 },
  assignment:   { gap: 14 },
  assignBanner: {
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1,
    borderColor: Brand.gold,
    gap: 4,
  },
  assignStage: { color: Brand.gold, fontSize: 11, letterSpacing: 1.5 },
  assignTitle: { color: Brand.beige, fontSize: 18 },
  checkCard: {
    padding: 16,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: '#5BD2A2',
    gap: 10,
  },
  checkTitle: { color: '#5BD2A2', fontSize: 14, letterSpacing: 1 },
  checkBody:  { color: Brand.beige, fontSize: 14, lineHeight: 20 },
  checkBtns:  { flexDirection: 'row', gap: 10, marginTop: 4 },
  checkBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: Brand.radius,
    alignItems: 'center',
    borderWidth: 2,
  },
  checkBtnNo:      { borderColor: '#E07B7B', backgroundColor: 'transparent' },
  checkBtnYes:     { borderColor: '#5BD2A2', backgroundColor: '#5BD2A2' },
  checkBtnText:    { color: '#E07B7B', fontWeight: '700', fontSize: 18 },
  checkBtnTextYes: { color: Brand.burgundy, fontWeight: '700', fontSize: 18 },
  fareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    paddingHorizontal: 14,
  },
  farePrefix: { color: Brand.beige, fontSize: 22 },
  fareInput:  { flex: 1, fontSize: 22, color: Brand.beige, paddingVertical: 12 },
});

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Brand.burgundyDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Brand.gold,
    padding: 24,
    paddingBottom: 48,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newRide:  { color: Brand.gold, fontSize: 11, letterSpacing: 2 },
  kmAway:   { color: '#5BD2A2', fontSize: 13, fontWeight: '600' },
  fare:     { color: Brand.beige, fontSize: 44 },
  locSection: { gap: 0 },
  locRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot:      { width: 10, height: 10, borderRadius: 5, marginTop: 5, flexShrink: 0 },
  dotGreen: { backgroundColor: '#5BD2A2' },
  dotGold:  { backgroundColor: Brand.gold },
  vertLine: { width: 1, height: 18, backgroundColor: Brand.border, marginLeft: 4.5 },
  locText:  { flex: 1, paddingBottom: 10 },
  locLabel: { color: Brand.beigeMuted, fontSize: 10, letterSpacing: 1.2 },
  locMain:  { color: Brand.beige, fontSize: 16 },
  locDetail: { color: Brand.beigeMuted, fontSize: 13 },
  btnRow:   { flexDirection: 'row', gap: 12, marginTop: 4 },
  dismissBtn: {
    flex: 0,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.beigeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: { color: Brand.beigeMuted, fontSize: 16 },
  acceptBtn:   { flex: 1 },
});
