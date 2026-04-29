import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RideRequest } from '@/components/ride-request-modal';
import { RideRequestModal } from '@/components/ride-request-modal';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { DAILY_TARGET_INR, markOnboarded, useEarnings } from '@/services/demo-state';
import {
  acceptRide,
  DEMO_DRIVER,
  subscribeLatestRide,
  type RideDoc,
} from '@/services/ride-firestore';

type LastAction = null | 'accepted' | 'declined';

export default function OnlineScreen() {
  const [ride, setRide] = useState<RideDoc | null>(null);
  const [requestVisible, setRequestVisible] = useState(false);
  const [lastAction, setLastAction] = useState<LastAction>(null);
  const [accepting, setAccepting] = useState(false);
  const [shownRideId, setShownRideId] = useState<string | null>(null);

  useEffect(() => subscribeLatestRide(setRide), []);

  // Reaching /online means onboarding is done — flag it so the in-memory
  // demo redirect at app/index.tsx skips /sign-up next time root is hit.
  useEffect(() => {
    markOnboarded();
  }, []);

  // Pop the modal exactly once per dispatched ride targeting this driver.
  useEffect(() => {
    if (!ride) return;
    const isForMe = ride.driver?.id === DEMO_DRIVER.id;
    if (
      ride.status === 'dispatching' &&
      isForMe &&
      shownRideId !== ride.id &&
      lastAction !== 'declined'
    ) {
      setRequestVisible(true);
      setShownRideId(ride.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    // If the ride moved past 'dispatching' (we accepted, or rider cancelled),
    // close the modal.
    if (requestVisible && ride.status !== 'dispatching') {
      setRequestVisible(false);
    }
  }, [ride, shownRideId, lastAction, requestVisible]);

  const request: RideRequest | null = useMemo(() => {
    if (!ride) return null;
    return {
      fareInr: ride.fareInr,
      riderName: ride.rider.name.split(' ')[0],
      riderRating: 4.9,
      pickup: {
        address: ride.pickup.address || ride.pickup.name,
        landmark: ride.pickup.name,
        etaMin: ride.durationMin > 0 ? Math.max(2, Math.round(ride.durationMin / 8)) : 4,
        distanceKm: 1.6,
      },
      drop: {
        address: ride.drop.address || ride.drop.name,
        landmark: ride.drop.name,
        distanceKm: ride.distanceKm,
        durationMin: ride.durationMin || 30,
      },
    };
  }, [ride]);

  const accept = async () => {
    if (!ride || accepting) return;
    setAccepting(true);
    try {
      await acceptRide(ride.id);
      setLastAction('accepted');
      setRequestVisible(false);
      router.push('/navigate-to-pickup');
    } finally {
      setAccepting(false);
    }
  };

  const decline = () => {
    setRequestVisible(false);
    setLastAction('declined');
  };

  const replay = () => {
    setLastAction(null);
    setShownRideId(null);
    if (ride && ride.status === 'dispatching' && ride.driver?.id === DEMO_DRIVER.id) {
      setRequestVisible(true);
    }
  };

  const heading =
    lastAction === 'accepted'
      ? 'Ride accepted'
      : lastAction === 'declined'
        ? 'Ride declined'
        : ride && ride.status === 'requested'
          ? 'Live request — agent is connecting you to the rider'
          : 'Waiting for your next ride';

  const sub =
    lastAction === 'accepted'
      ? 'Last ride accepted — opening navigation to pickup.'
      : lastAction === 'declined'
        ? "You skipped this request. We'll keep matching nearby riders."
        : ride && ride.status === 'requested'
          ? 'A new rider just booked nearby. Stay sharp — the agent is dispatching now.'
          : "You'll get pinged the moment the agent assigns you a ride. Stay in a busy zone for faster matches.";

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="You're online" />

      <View style={styles.body}>
        <View style={styles.statusDot} />
        <ThemedText type="defaultSemiBold" style={styles.heading}>
          {heading}
        </ThemedText>
        <ThemedText style={styles.sub}>{sub}</ThemedText>

        <EarningsCard />

        <View style={styles.tip}>
          <MaterialIcons name="shield" size={16} color={Brand.gold} />
          <ThemedText style={styles.tipText}>
            Triple-press volume down at any time to trigger SOS.
          </ThemedText>
        </View>

        {lastAction === 'declined' ? (
          <View style={styles.replay}>
            <MaterialIcons name="replay" size={16} color={Brand.beigeMuted} />
            <ThemedText style={styles.replayText} onPress={replay}>
              Show next request again
            </ThemedText>
          </View>
        ) : null}
      </View>

      {request ? (
        <RideRequestModal
          visible={requestVisible}
          request={request}
          onAccept={accept}
          onDecline={decline}
        />
      ) : null}
    </ThemedView>
  );
}

// Today's running earnings — animates from previous value to current
// whenever the store updates (i.e., when a ride completes in /in-ride).
function EarningsCard() {
  const earnings = useEarnings();
  const [displayed, setDisplayed] = useState(earnings);
  const previousRef = useRef(earnings);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = previousRef.current;
    const to = earnings;
    if (from === to) return;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const duration = 1200;
    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplayed(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [earnings]);

  const pct = Math.min(100, Math.round((displayed / DAILY_TARGET_INR) * 100));

  return (
    <View style={styles.earningsCard}>
      <View style={styles.earningsTopRow}>
        <ThemedText style={styles.earningsLabel}>Today</ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.earningsValue}>
          ₹{displayed.toLocaleString('en-IN')}
          <ThemedText style={styles.earningsTarget}>
            {' / '}₹{DAILY_TARGET_INR}
          </ThemedText>
        </ThemedText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <ThemedText style={styles.earningsFoot}>
        Kyra keeps under 25% — the rest is yours.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    alignItems: 'center',
    gap: 14,
  },
  statusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#5BD2A2',
    marginBottom: 12,
  },
  heading: { color: Brand.beige, fontSize: 20, textAlign: 'center' },
  sub: {
    color: Brand.beigeMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    maxWidth: 320,
  },
  earningsCard: {
    marginTop: 28,
    width: '100%',
    maxWidth: 360,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1,
    borderColor: Brand.gold,
    gap: 10,
  },
  earningsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  earningsLabel: {
    color: Brand.beigeMuted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  earningsValue: {
    color: Brand.gold,
    fontSize: 22,
  },
  earningsTarget: {
    color: Brand.beigeMuted,
    fontSize: 13,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.burgundyLight,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Brand.gold,
  },
  earningsFoot: {
    color: Brand.beigeMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  tip: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    alignItems: 'center',
  },
  tipText: { flex: 1, color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  replay: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  replayText: { color: Brand.beigeMuted, fontSize: 13 },
});
