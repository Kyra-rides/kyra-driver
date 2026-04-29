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
import { endRide, subscribeLatestRide, type RideDoc } from '@/services/ride-firestore';

export default function InRideScreen() {
  const mapHeight = Dimensions.get('window').height * 0.45;
  const [ride, setRide] = useState<RideDoc | null>(null);
  const [ending, setEnding] = useState(false);

  useEffect(() => subscribeLatestRide(setRide), []);

  useEffect(() => {
    if (!ride) return;
    if (ride.status === 'completed' || ride.status === 'rated' || ride.status === 'cancelled') {
      router.replace('/online');
    } else if (ride.status === 'requested' || ride.status === 'dispatching' || ride.status === 'accepted') {
      // Status went backwards — shouldn't happen, but defensive bail-out.
      router.replace('/online');
    }
  }, [ride?.status]);

  if (!ride || ride.status !== 'in_progress') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color={Brand.gold} />
        </View>
      </ThemedView>
    );
  }

  const pickupCoords = { lat: ride.pickup.coord.lat, lng: ride.pickup.coord.lng };
  const dropCoords = { lat: ride.drop.coord.lat, lng: ride.drop.coord.lng };

  const onEnd = async () => {
    if (ending) return;
    setEnding(true);
    try {
      await endRide(ride.id);
      // Effect above will redirect once status flips to 'completed'.
    } catch (e) {
      setEnding(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <RouteMap origin={pickupCoords} destination={dropCoords} height={mapHeight} />

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerRow}>
          <ScreenHeader title="On trip" />
        </View>

        <View style={styles.fareStrip}>
          <View>
            <ThemedText style={styles.fareLabel}>Trip fare</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.fareValue}>
              ₹{ride.fareInr}
            </ThemedText>
          </View>
          <View style={styles.fareMeta}>
            <ThemedText style={styles.fareMetaText}>
              {ride.distanceKm.toFixed(1)} km · ~{ride.durationMin || 30} min
            </ThemedText>
            <ThemedText style={styles.fareMetaSub}>
              Rider · {ride.rider.name}
            </ThemedText>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotPickup]} />
            <View style={styles.routeText}>
              <ThemedText type="defaultSemiBold" style={styles.routeTitle}>
                Picked up
              </ThemedText>
              <ThemedText style={styles.routeAddr}>{ride.pickup.address || ride.pickup.name}</ThemedText>
              <ThemedText style={styles.routeHint}>Landmark: {ride.pickup.name}</ThemedText>
            </View>
          </View>

          <View style={styles.connector} />

          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotDrop]} />
            <View style={styles.routeText}>
              <ThemedText type="defaultSemiBold" style={styles.routeTitle}>
                Heading to drop
              </ThemedText>
              <ThemedText style={styles.routeAddr}>{ride.drop.address || ride.drop.name}</ThemedText>
              <ThemedText style={styles.routeHint}>Landmark: {ride.drop.name}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.tip}>
          <MaterialIcons name="shield" size={16} color={Brand.gold} />
          <ThemedText style={styles.tipText}>
            Triple-press volume down to silently trigger SOS during the ride.
          </ThemedText>
        </View>

        <BrandButton
          title={ending ? 'Ending…' : 'End ride'}
          disabled={ending}
          onPress={onEnd}
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
  body: { padding: 24, paddingBottom: 32, gap: 16 },
  fareStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  fareLabel: { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 1 },
  fareValue: { color: Brand.beige, fontSize: 26, marginTop: 2 },
  fareMeta: { alignItems: 'flex-end', gap: 4 },
  fareMetaText: { color: Brand.beige, fontSize: 13 },
  fareMetaSub: { color: Brand.beigeMuted, fontSize: 12 },
  routeCard: {
    backgroundColor: Brand.burgundyDark,
    borderRadius: Brand.radius,
    padding: 14,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
  },
  routeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  dotPickup: { backgroundColor: '#5BD2A2' },
  dotDrop: { backgroundColor: Brand.gold },
  connector: {
    width: 2,
    height: 18,
    backgroundColor: Brand.burgundyLight,
    marginLeft: 5,
  },
  routeText: { flex: 1, gap: 2 },
  routeTitle: { color: Brand.beige, fontSize: 14 },
  routeAddr: { color: Brand.beige, fontSize: 13, lineHeight: 18 },
  routeHint: { color: Brand.beigeMuted, fontSize: 12, lineHeight: 16 },
  tip: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
    alignItems: 'center',
  },
  tipText: { flex: 1, color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  cta: { marginTop: 4, alignSelf: 'stretch' },
});
