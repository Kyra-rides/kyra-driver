/**
 * Driver in-trip screen.
 *
 * Restored from the original Firestore-era screen — same fare strip, same
 * pickup→drop route card, same SOS tip, same "End ride" CTA. Wired to
 * Supabase: subscribes to the active assignment and routes to /rate when
 * the ride completes (which happens when the driver enters the final fare).
 *
 * The fare-entry sheet is inlined here as a small bottom modal — replaces
 * the original "End ride" → unconditional completion. We need the final
 * fare amount to write to kyra.rides.fare_inr_final on completion.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { SosButton } from '@/components/sos-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import {
  completeRide,
  startTrip,
  subscribeAssignment,
  type Ride,
} from '@/services/rides';
import { fetchRoute } from '@/services/maps';
import { supabase } from '@/services/supabase';

export default function InRideScreen() {
  const { t } = useTranslation();
  const mapHeight = Dimensions.get('window').height * 0.45;
  const [ride, setRide]     = useState<Ride | null>(null);
  const [riderName, setRiderName] = useState<string>('');
  const [endingOpen, setEndingOpen] = useState(false);
  const [finalFare, setFinalFare]   = useState<string>('');
  const [busy, setBusy]     = useState(false);

  useEffect(() => subscribeAssignment(setRide), []);

  // If we landed here in `pickup_verified`, advance to `in_trip` automatically
  // by computing the route (Google Routes API) and calling startTrip RPC.
  useEffect(() => {
    if (!ride || ride.status !== 'pickup_verified') return;
    void (async () => {
      try {
        const pickup = ride.pickup_location?.coordinates;
        const drop   = ride.drop_location?.coordinates;
        if (!pickup || !drop) return;
        const route = await fetchRoute(
          { lat: pickup[1], lng: pickup[0] },
          { lat: drop[1],   lng: drop[0] },
        ).catch(() => null);
        await startTrip(
          ride.id,
          route?.encodedPolyline ?? '',
          route?.distanceMeters ?? 0,
          route?.durationSeconds ?? 0,
        );
      } catch (err) {
        console.warn('startTrip failed', err);
      }
    })();
  }, [ride?.status]);

  // Auto-route on terminal status.
  useEffect(() => {
    if (!ride) {
      router.replace('/online');
      return;
    }
    if (ride.status === 'completed') {
      router.replace(`/rate/${ride.id}`);
    } else if (ride.status.startsWith('cancelled')) {
      router.replace('/online');
    }
  }, [ride?.status, ride?.id]);

  // Pre-fill finalFare with the estimate.
  useEffect(() => {
    if (ride && !finalFare) setFinalFare(String(Math.round(Number(ride.fare_inr))));
  }, [ride]);

  // Load rider profile for the fare strip.
  useEffect(() => {
    if (!ride?.rider_id) return;
    void supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', ride.rider_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRiderName(`${data.first_name} ${data.last_name}`.trim());
      });
  }, [ride?.rider_id]);

  if (!ride || (ride.status !== 'in_trip' && ride.status !== 'pickup_verified')) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color={Brand.gold} />
        </View>
      </ThemedView>
    );
  }

  const pickupCoord = ride.pickup_location?.coordinates ?? [77.5946, 12.9716];
  const dropCoord   = ride.drop_location?.coordinates   ?? [77.5946, 12.9716];
  const initialRegion = {
    latitude:  (pickupCoord[1] + dropCoord[1]) / 2,
    longitude: (pickupCoord[0] + dropCoord[0]) / 2,
    latitudeDelta: Math.max(0.04, Math.abs(pickupCoord[1] - dropCoord[1]) * 1.6),
    longitudeDelta: Math.max(0.04, Math.abs(pickupCoord[0] - dropCoord[0]) * 1.6),
  };

  const openMapsToDrop = () => {
    if (!ride) return;
    const coord = ride.drop_location?.coordinates ?? [77.5946, 12.9716];
    const lat = coord[1];
    const lng = coord[0];
    const nativeUrl = Platform.OS === 'ios'
      ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`
      : `google.navigation:q=${lat},${lng}&mode=d`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    Linking.canOpenURL(nativeUrl).then((ok) => {
      Linking.openURL(ok ? nativeUrl : webUrl);
    });
  };

  const onEnd = async () => {
    const inr = Number(finalFare);
    if (!Number.isFinite(inr) || inr <= 0) {
      Alert.alert(t('in_ride.enter_valid'), t('in_ride.invalid_fare'));
      return;
    }
    setBusy(true);
    try {
      await completeRide(ride.id, inr);
      // Status flip routes us to /rate via the useEffect above.
    } catch (err) {
      Alert.alert(t('in_ride.could_not_end'), err instanceof Error ? err.message : '');
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={{ height: mapHeight }}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
        >
          <Marker
            coordinate={{ latitude: pickupCoord[1], longitude: pickupCoord[0] }}
            title={t('in_ride.marker_pickup')}
            pinColor="#5BD2A2"
          />
          <Marker
            coordinate={{ latitude: dropCoord[1], longitude: dropCoord[0] }}
            title={t('in_ride.marker_drop')}
            pinColor="#E07B7B"
          />
        </MapView>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerRow}>
          <ScreenHeader title={t('in_ride.title')} />
        </View>

        <View style={styles.fareStrip}>
          <View>
            <ThemedText style={styles.fareLabel}>{t('in_ride.fare_estimate')}</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.fareValue}>
              ₹{Number(ride.fare_inr).toFixed(0)}
            </ThemedText>
          </View>
          <View style={styles.fareMeta}>
            {ride.planned_distance_m ? (
              <ThemedText style={styles.fareMetaText}>
                {t('in_ride.distance_duration', {
                  km: (ride.planned_distance_m / 1000).toFixed(1),
                  min: Math.round((ride.planned_duration_s ?? 0) / 60),
                })}
              </ThemedText>
            ) : null}
            {riderName ? (
              <ThemedText style={styles.fareMetaSub}>
                {t('in_ride.rider_meta', { name: riderName })}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotPickup]} />
            <View style={styles.routeText}>
              <ThemedText type="defaultSemiBold" style={styles.routeTitle}>
                {t('in_ride.picked_up')}
              </ThemedText>
              <ThemedText style={styles.routeAddr}>{ride.pickup_address}</ThemedText>
            </View>
          </View>

          <View style={styles.connector} />

          <View style={styles.routeRow}>
            <View style={[styles.dot, styles.dotDrop]} />
            <View style={styles.routeText}>
              <ThemedText type="defaultSemiBold" style={styles.routeTitle}>
                {t('in_ride.heading_to')}
              </ThemedText>
              <ThemedText style={styles.routeAddr}>{ride.drop_address}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.tip}>
          <MaterialIcons name="shield" size={16} color={Brand.gold} />
          <ThemedText style={styles.tipText}>
            {t('in_ride.sos_hint')}
          </ThemedText>
        </View>

        <Pressable onPress={openMapsToDrop} style={({ pressed }) => [styles.mapsBtn, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="directions" size={20} color={Brand.burgundyDark} />
          <ThemedText style={styles.mapsBtnText}>
            {t('in_ride.open_maps', { defaultValue: 'Navigate to Drop in Google Maps' })}
          </ThemedText>
        </Pressable>

        <BrandButton
          title={t('in_ride.end_ride')}
          onPress={() => setEndingOpen(true)}
          style={styles.cta}
        />
      </ScrollView>

      <Modal visible={endingOpen} transparent animationType="slide" onRequestClose={() => setEndingOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ThemedText type="title" style={styles.modalTitle}>
              {t('in_ride.modal_title')}
            </ThemedText>
            <ThemedText style={styles.modalSub}>
              {t('in_ride.modal_sub')}
            </ThemedText>
            <View style={styles.fareInputRow}>
              <ThemedText style={styles.fareInputPrefix}>₹</ThemedText>
              <TextInput
                style={styles.fareInput}
                keyboardType="number-pad"
                value={finalFare}
                onChangeText={(v) => setFinalFare(v.replace(/[^0-9]/g, ''))}
                maxLength={5}
                autoFocus
              />
            </View>
            <BrandButton
              title={busy ? t('in_ride.ending') : t('in_ride.confirm_end')}
              onPress={onEnd}
              disabled={busy}
              style={styles.cta}
            />
            <BrandButton
              title={t('in_ride.modal_cancel')}
              onPress={() => setEndingOpen(false)}
              style={styles.cancelBtn}
            />
          </View>
        </View>
      </Modal>
      <SosButton rideId={ride.id} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Brand.burgundy },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow:  { marginHorizontal: -24, marginTop: -16 },
  body:       { padding: 24, paddingBottom: 32, gap: 16 },
  fareStrip: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16,
    borderWidth: 1, borderColor: Brand.gold,
  },
  fareLabel:    { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 1 },
  fareValue:    { color: Brand.beige, fontSize: 26, marginTop: 2 },
  fareMeta:     { alignItems: 'flex-end', gap: 4 },
  fareMetaText: { color: Brand.beige, fontSize: 13 },
  fareMetaSub:  { color: Brand.beigeMuted, fontSize: 12 },
  routeCard: {
    backgroundColor: Brand.burgundyDark,
    borderRadius: Brand.radius,
    padding: 14, gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
  },
  routeRow:   { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dot:        { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  dotPickup:  { backgroundColor: '#5BD2A2' },
  dotDrop:    { backgroundColor: Brand.gold },
  connector:  { width: 2, height: 18, backgroundColor: Brand.burgundyLight, marginLeft: 5 },
  routeText:  { flex: 1, gap: 2 },
  routeTitle: { color: Brand.beige, fontSize: 14 },
  routeAddr:  { color: Brand.beige, fontSize: 13, lineHeight: 18 },
  tip: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Brand.burgundyLight,
    alignItems: 'center',
  },
  tipText:   { flex: 1, color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
    borderRadius: Brand.radius,
    backgroundColor: Brand.gold,
  },
  mapsBtnText: { color: Brand.burgundyDark, fontWeight: '600', fontSize: 14 },
  cta:       { marginTop: 4, alignSelf: 'stretch' },
  cancelBtn: { marginTop: 8, alignSelf: 'stretch', backgroundColor: 'transparent', borderWidth: 1, borderColor: Brand.border },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Brand.burgundy,
    padding: 24, paddingBottom: 36,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    gap: 12,
    borderTopWidth: 1, borderTopColor: Brand.gold,
  },
  modalTitle: { color: Brand.beige, fontSize: 22 },
  modalSub:   { color: Brand.beigeMuted, fontSize: 13, lineHeight: 18 },
  fareInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1, borderColor: Brand.gold,
    marginTop: 4,
  },
  fareInputPrefix: { color: Brand.beige, fontSize: 24, fontWeight: '600' },
  fareInput:       { flex: 1, color: Brand.beige, fontSize: 24, fontWeight: '600', padding: 0 },
});
