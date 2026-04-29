import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, StyleSheet, View } from 'react-native';

import { BrandButton } from '@/components/brand-button';
import { RouteMap } from '@/components/route-map';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { DRIVER_LOCATION } from '@/constants/mock-ride';
import { subscribeLatestRide, type RideDoc } from '@/services/ride-firestore';

export default function NavigateToPickupScreen() {
  const mapHeight = Dimensions.get('window').height * 0.45;
  const [ride, setRide] = useState<RideDoc | null>(null);

  useEffect(() => subscribeLatestRide(setRide), []);

  // Auto-progress when admin moves the ride into in_progress (driver entered correct OTP).
  useEffect(() => {
    if (!ride) return;
    if (ride.status === 'in_progress') {
      router.replace('/in-ride');
    } else if (ride.status === 'completed' || ride.status === 'rated' || ride.status === 'cancelled') {
      router.replace('/online');
    } else if (ride.status === 'requested' || ride.status === 'dispatching') {
      // Edge case: lost the ride somehow.
      router.replace('/online');
    }
  }, [ride?.status]);

  if (!ride || ride.status !== 'accepted') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color={Brand.gold} />
        </View>
      </ThemedView>
    );
  }

  const pickupCoords = { lat: ride.pickup.coord.lat, lng: ride.pickup.coord.lng };
  const etaMin = ride.durationMin > 0 ? Math.max(2, Math.round(ride.durationMin / 8)) : 4;

  return (
    <ThemedView style={styles.container}>
      <RouteMap origin={DRIVER_LOCATION} destination={pickupCoords} height={mapHeight} />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerRow}>
          <ScreenHeader title="Navigate to pickup" />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.dot, styles.dotPickup]} />
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {etaMin} min · approaching pickup
            </ThemedText>
          </View>
          <ThemedText style={styles.address}>{ride.pickup.address || ride.pickup.name}</ThemedText>
          <ThemedText style={styles.hint}>Pickup landmark: {ride.pickup.name}</ThemedText>

          <View style={styles.divider} />

          <View style={styles.riderRow}>
            <MaterialIcons name="person" size={18} color={Brand.beigeMuted} />
            <ThemedText style={styles.riderText}>
              {ride.rider.name} · {ride.rider.phone}
            </ThemedText>
          </View>

          <View style={styles.fareRow}>
            <ThemedText style={styles.fareLabel}>Trip fare</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.fareValue}>
              ₹{ride.fareInr}
            </ThemedText>
          </View>
        </View>

        <View style={styles.otpHint}>
          <MaterialIcons name="lock" size={16} color={Brand.gold} />
          <ThemedText style={styles.otpHintText}>
            Ask the rider for her 4-digit Kyra OTP at pickup. Ride only starts after you enter it.
          </ThemedText>
        </View>

        <BrandButton
          title="Reached pickup location"
          onPress={() => router.push('/enter-otp')}
          style={styles.cta}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { marginHorizontal: -24, marginTop: -16 },
  body: { padding: 24, paddingBottom: 32, gap: 18 },
  card: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  dotPickup: { backgroundColor: '#5BD2A2' },
  cardTitle: { color: Brand.beige, fontSize: 16 },
  address: { color: Brand.beige, fontSize: 14, lineHeight: 20 },
  hint: { color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Brand.burgundyDark,
    marginVertical: 6,
  },
  riderRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  riderText: { color: Brand.beigeMuted, fontSize: 13 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  fareLabel: { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 0.5 },
  fareValue: { color: Brand.beige, fontSize: 18 },
  otpHint: {
    padding: 10,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1,
    borderColor: Brand.gold,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  otpHintText: { flex: 1, color: Brand.beige, fontSize: 12, lineHeight: 17 },
  cta: { alignSelf: 'stretch' },
});
