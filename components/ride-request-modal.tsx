import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';

export type RideRequest = {
  fareInr: number;
  pickup: {
    address: string;
    landmark: string;
    etaMin: number;
    distanceKm: number;
  };
  drop: {
    address: string;
    landmark: string;
    distanceKm: number;
    durationMin: number;
  };
  riderName: string;
  riderRating: number;
};

const COUNTDOWN_S = 15;

export function RideRequestModal({
  visible,
  request,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  request: RideRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_S);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!visible) return;
    setSecondsLeft(COUNTDOWN_S);
    progress.setValue(1);
    Animated.timing(progress, {
      toValue: 0,
      duration: COUNTDOWN_S * 1000,
      useNativeDriver: false,
    }).start();
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(tick);
          onDecline();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [visible, onDecline, progress]);

  const widthPct = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDecline}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                New ride request
              </ThemedText>
              <ThemedText style={styles.headerSub}>
                {request.riderName} · ★ {request.riderRating.toFixed(1)}
              </ThemedText>
            </View>
            <View style={styles.timer}>
              <ThemedText type="defaultSemiBold" style={styles.timerText}>
                {secondsLeft}s
              </ThemedText>
            </View>
          </View>

          <View style={styles.timerBarTrack}>
            <Animated.View style={[styles.timerBarFill, { width: widthPct }]} />
          </View>

          <View style={styles.fareBlock}>
            <ThemedText style={styles.fareLabel}>Fare</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.fareValue}>
              ₹{request.fareInr}
            </ThemedText>
            <ThemedText style={styles.fareTrip}>
              {request.drop.distanceKm.toFixed(1)} km · ~{request.drop.durationMin} min trip
            </ThemedText>
          </View>

          <View style={styles.locationBlock}>
            <View style={styles.locationRow}>
              <View style={[styles.dot, styles.dotPickup]} />
              <View style={styles.locationText}>
                <ThemedText type="defaultSemiBold" style={styles.locationTitle}>
                  Pickup · {request.pickup.etaMin} min away
                </ThemedText>
                <ThemedText style={styles.locationAddr}>{request.pickup.address}</ThemedText>
                <ThemedText style={styles.locationHint}>
                  Landmark: {request.pickup.landmark} · {request.pickup.distanceKm.toFixed(1)} km from you
                </ThemedText>
              </View>
            </View>

            <View style={styles.connector} />

            <View style={styles.locationRow}>
              <View style={[styles.dot, styles.dotDrop]} />
              <View style={styles.locationText}>
                <ThemedText type="defaultSemiBold" style={styles.locationTitle}>
                  Drop
                </ThemedText>
                <ThemedText style={styles.locationAddr}>{request.drop.address}</ThemedText>
                <ThemedText style={styles.locationHint}>Landmark: {request.drop.landmark}</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={[styles.btn, styles.declineBtn]} onPress={onDecline}>
              <MaterialIcons name="close" size={18} color={Brand.beige} />
              <ThemedText type="defaultSemiBold" style={styles.declineLabel}>
                Decline
              </ThemedText>
            </Pressable>
            <Pressable style={[styles.btn, styles.acceptBtn]} onPress={onAccept}>
              <MaterialIcons name="check" size={20} color={Brand.burgundy} />
              <ThemedText type="defaultSemiBold" style={styles.acceptLabel}>
                Accept
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Brand.burgundy,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: Brand.gold,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { color: Brand.beige, fontSize: 18 },
  headerSub: { color: Brand.beigeMuted, fontSize: 13, marginTop: 2 },
  timer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { color: Brand.burgundy, fontSize: 15 },
  timerBarTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.burgundyDark,
    overflow: 'hidden',
  },
  timerBarFill: {
    height: '100%',
    backgroundColor: Brand.gold,
  },
  fareBlock: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  fareLabel: { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 1 },
  fareValue: { color: Brand.beige, fontSize: 36, lineHeight: 42 },
  fareTrip: { color: Brand.beigeMuted, fontSize: 13, marginTop: 2 },
  locationBlock: {
    backgroundColor: Brand.burgundyDark,
    borderRadius: Brand.radius,
    padding: 14,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
  },
  locationRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  dotPickup: { backgroundColor: '#5BD2A2' },
  dotDrop: { backgroundColor: Brand.gold },
  connector: {
    width: 2,
    height: 18,
    backgroundColor: Brand.burgundyLight,
    marginLeft: 5,
  },
  locationText: { flex: 1, gap: 2 },
  locationTitle: { color: Brand.beige, fontSize: 14 },
  locationAddr: { color: Brand.beige, fontSize: 13, lineHeight: 18 },
  locationHint: { color: Brand.beigeMuted, fontSize: 12, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Brand.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
  },
  declineLabel: { color: Brand.beige, fontSize: 15 },
  acceptBtn: { backgroundColor: Brand.beige },
  acceptLabel: { color: Brand.burgundy, fontSize: 15 },
});
