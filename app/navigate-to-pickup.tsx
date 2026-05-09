/**
 * Driver navigates to the rider's pickup point.
 *
 * Restored from the original Firestore-era screen — same card layout, same
 * map header, same "Reached pickup" CTA. Wired to Supabase: subscribes to
 * the driver's active assignment and auto-progresses when status flips.
 *
 * Visual differences from original:
 *   - Uses inline react-native-maps instead of the deleted RouteMap
 *     component (which depended on mock-ride constants).
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { SosButton } from '@/components/sos-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { markArriving, subscribeAssignment, type Ride } from '@/services/rides';
import { supabase } from '@/services/supabase';

export default function NavigateToPickupScreen() {
  const { t } = useTranslation();
  const mapHeight = Dimensions.get('window').height * 0.45;
  const [ride, setRide] = useState<Ride | null>(null);
  const [riderName, setRiderName] = useState<string>(t('nav_pickup.default_rider_name'));
  const [riderPhone, setRiderPhone] = useState<string>('');
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeAssignment(setRide), []);

  // Auto-progress through the state machine.
  useEffect(() => {
    if (!ride) {
      router.replace('/online');
      return;
    }
    if (ride.status === 'driver_arriving') {
      router.replace('/enter-otp');
    } else if (ride.status === 'pickup_verified' || ride.status === 'in_trip') {
      router.replace('/in-ride');
    } else if (ride.status === 'completed' || ride.status.startsWith('cancelled')) {
      router.replace('/online');
    }
  }, [ride?.status]);

  // Load rider profile.
  useEffect(() => {
    if (!ride?.rider_id) return;
    void supabase
      .from('profiles')
      .select('first_name, last_name, phone')
      .eq('id', ride.rider_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setRiderName(`${data.first_name} ${data.last_name}`.trim() || t('nav_pickup.default_rider_name'));
        setRiderPhone(data.phone ?? '');
      });
  }, [ride?.rider_id]);

  // Driver's current GPS for the map.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        setDriverPos({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      } catch {
        // GPS denied — show map centered on pickup.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const openMapsToPickup = () => {
    if (!ride) return;
    const coord = ride.pickup_location?.coordinates ?? [77.5946, 12.9716];
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

  const onReached = async () => {
    if (!ride) return;
    setBusy(true);
    try {
      await markArriving(ride.id);
      // Subscription will detect driver_arriving and useEffect routes to /enter-otp.
    } catch (err) {
      Alert.alert(t('nav_pickup.could_not_update'), err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  if (!ride || ride.status !== 'matched') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.fullCenter}>
          <ActivityIndicator size="large" color={Brand.gold} />
        </View>
      </ThemedView>
    );
  }

  const pickupCoord = ride.pickup_location?.coordinates ?? [77.5946, 12.9716];
  const initialRegion = {
    latitude:  driverPos?.lat ?? pickupCoord[1],
    longitude: driverPos?.lng ?? pickupCoord[0],
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
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
            title={t('nav_pickup.approaching')}
            pinColor="#5BD2A2"
          />
          {driverPos && (
            <Marker
              coordinate={{ latitude: driverPos.lat, longitude: driverPos.lng }}
              title={t('driver_online.status_label')}
            >
              <View style={styles.driverDot}>
                <MaterialIcons name="local-taxi" size={18} color={Brand.burgundyDark} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.headerRow}>
          <ScreenHeader title={t('nav_pickup.title')} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.dot, styles.dotPickup]} />
            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
              {t('nav_pickup.approaching')}
            </ThemedText>
          </View>
          <ThemedText style={styles.address}>{ride.pickup_address}</ThemedText>

          <View style={styles.divider} />

          <View style={styles.riderRow}>
            <MaterialIcons name="person" size={18} color={Brand.beigeMuted} />
            <ThemedText style={styles.riderText}>
              {riderName}{riderPhone ? ` · ${riderPhone}` : ''}
            </ThemedText>
          </View>

          <View style={styles.fareRow}>
            <ThemedText style={styles.fareLabel}>{t('nav_pickup.trip_fare')}</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.fareValue}>
              ₹{Number(ride.fare_inr).toFixed(0)}
            </ThemedText>
          </View>
        </View>

        <View style={styles.otpHint}>
          <MaterialIcons name="shield" size={16} color={Brand.gold} />
          <ThemedText style={styles.otpHintText}>
            {t('nav_pickup.safety_hint')}
          </ThemedText>
        </View>

        <Pressable onPress={openMapsToPickup} style={({ pressed }) => [styles.mapsBtn, pressed && { opacity: 0.8 }]}>
          <MaterialIcons name="directions" size={20} color={Brand.burgundyDark} />
          <ThemedText style={styles.mapsBtnText}>
            {t('nav_pickup.open_maps', { defaultValue: 'Navigate in Google Maps' })}
          </ThemedText>
        </Pressable>

        <BrandButton
          title={busy ? t('nav_pickup.updating') : t('nav_pickup.reached')}
          onPress={onReached}
          disabled={busy}
          style={styles.cta}
        />
      </ScrollView>
      <SosButton rideId={ride.id} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Brand.burgundy },
  fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow:  { marginHorizontal: -24, marginTop: -16 },
  body:       { padding: 24, paddingBottom: 32, gap: 18 },
  card: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    padding: 16, gap: 8,
    borderWidth: 1, borderColor: Brand.burgundyLight,
  },
  cardHead:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot:       { width: 12, height: 12, borderRadius: 6 },
  dotPickup: { backgroundColor: '#5BD2A2' },
  cardTitle: { color: Brand.beige, fontSize: 16 },
  address:   { color: Brand.beige, fontSize: 14, lineHeight: 20 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Brand.burgundyDark,
    marginVertical: 6,
  },
  riderRow:  { flexDirection: 'row', gap: 8, alignItems: 'center' },
  riderText: { color: Brand.beigeMuted, fontSize: 13 },
  fareRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  fareLabel: { color: Brand.beigeMuted, fontSize: 12, letterSpacing: 0.5 },
  fareValue: { color: Brand.beige, fontSize: 18 },
  otpHint: {
    padding: 10,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1, borderColor: Brand.gold,
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
  },
  otpHintText: { flex: 1, color: Brand.beige, fontSize: 12, lineHeight: 17 },
  mapsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13,
    borderRadius: Brand.radius,
    backgroundColor: Brand.gold,
  },
  mapsBtnText: { color: Brand.burgundyDark, fontWeight: '600', fontSize: 14 },
  cta:        { alignSelf: 'stretch' },
  driverDot: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Brand.beige,
  },
});
