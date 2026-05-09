/**
 * Permissions setup screen — shown once after a driver's KYC is first approved.
 *
 * Walks the driver through three permissions that make the app reliable:
 *   1. Background location  → so riders see the driver arriving
 *   2. Display over other apps → so ride alerts show on the lock screen
 *   3. Battery optimisation → so Android doesn't kill the app
 *
 * After tapping Continue, sets the 'kyra_permissions_shown' key in AsyncStorage
 * and routes the driver to the main online dashboard.
 */

import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BrandButton } from '@/components/brand-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export const PERMISSIONS_SHOWN_KEY = 'kyra_permissions_shown';

export default function PermissionsScreen() {
  const [bgLocation, setBgLocation] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [overlayDone, setOverlayDone]   = useState(false);
  const [batteryDone, setBatteryDone]   = useState(false);
  const [notifStatus, setNotifStatus]   = useState<'granted' | 'denied' | 'unknown'>('unknown');

  useEffect(() => {
    void Location.getBackgroundPermissionsAsync().then(({ status }) => {
      setBgLocation(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
    });
    void Notifications.getPermissionsAsync().then(({ status }) => {
      setNotifStatus(status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'unknown');
    });
  }, []);

  const requestBgLocation = async () => {
    // Foreground must be granted first before Android allows background.
    const fg = await Location.requestForegroundPermissionsAsync();
    if (!fg.granted) return;
    const bg = await Location.requestBackgroundPermissionsAsync();
    setBgLocation(bg.granted ? 'granted' : 'denied');
  };

  const openOverlaySettings = async () => {
    // "Draw over other apps" lives in a non-standard system settings page.
    // The closest we can do without expo-intent-launcher is app settings.
    if (Platform.OS === 'android') {
      try {
        await Linking.openURL(`package:app.kyra.driver`);
      } catch {
        await Linking.openSettings();
      }
    } else {
      await Linking.openSettings();
    }
    setOverlayDone(true);
  };

  const requestNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifStatus(status === 'granted' ? 'granted' : 'denied');
  };

  const openBatterySettings = async () => {
    if (Platform.OS === 'android') {
      try {
        // Opens battery optimization list; user taps Kyra Driver → All apps → Don't optimize.
        await Linking.openURL('android.settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      } catch {
        await Linking.openSettings();
      }
    } else {
      await Linking.openSettings();
    }
    setBatteryDone(true);
  };

  const onContinue = async () => {
    await AsyncStorage.setItem(PERMISSIONS_SHOWN_KEY, '1');
    router.replace('/online');
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>

        {/* Header */}
        <View style={styles.topSection}>
          <View style={styles.iconRing}>
            <MaterialIcons name="security" size={36} color={Brand.gold} />
          </View>
          <ThemedText type="title" style={styles.title}>Set Up Permissions</ThemedText>
          <ThemedText style={styles.subtitle}>
            These permissions help Kyra work smoothly — riders can always see you, and you'll
            never miss a fare even when your screen is off.
          </ThemedText>
        </View>

        {/* Permission cards */}
        <View style={styles.cards}>
          <PermissionCard
            icon="my-location"
            title="Background Location"
            description="Allows Kyra to track your position while minimised, so riders see you arriving in real time."
            status={bgLocation === 'granted' ? 'granted' : 'pending'}
            onGrant={() => { void requestBgLocation(); }}
          />
          <PermissionCard
            icon="picture-in-picture"
            title="Display Over Other Apps"
            description="Shows full-screen ride alerts over your lock screen so you never miss a request."
            status={overlayDone ? 'granted' : 'pending'}
            onGrant={() => { void openOverlaySettings(); }}
          />
          <PermissionCard
            icon="battery-charging-full"
            title="Battery Optimisation"
            description="Prevents Android from putting the app to sleep so your location always stays live."
            status={batteryDone ? 'granted' : 'pending'}
            onGrant={() => { void openBatterySettings(); }}
          />
          <PermissionCard
            icon="notifications-active"
            title="Notifications"
            description="Lets Kyra alert you instantly when a new ride request arrives, even when your screen is locked."
            status={notifStatus === 'granted' ? 'granted' : 'pending'}
            onGrant={() => { void requestNotifications(); }}
          />
        </View>

        <BrandButton title="Continue to Dashboard" onPress={() => { void onContinue(); }} style={styles.cta} />

        <ThemedText style={styles.skipNote}>
          You can always grant these later in your device settings.
        </ThemedText>

      </ScrollView>
    </ThemedView>
  );
}

function PermissionCard({
  icon, title, description, status, onGrant,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  description: string;
  status: 'granted' | 'pending';
  onGrant: () => void;
}) {
  return (
    <View style={[styles.card, status === 'granted' && styles.cardGranted]}>
      <View style={[styles.cardIcon, status === 'granted' && styles.cardIconGranted]}>
        <MaterialIcons
          name={icon}
          size={24}
          color={status === 'granted' ? '#5BD2A2' : Brand.gold}
        />
      </View>
      <View style={styles.cardText}>
        <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{title}</ThemedText>
        <ThemedText style={styles.cardDesc}>{description}</ThemedText>
      </View>
      {status === 'granted' ? (
        <MaterialIcons name="check-circle" size={22} color="#5BD2A2" />
      ) : (
        <Pressable onPress={onGrant} style={styles.grantBtn} hitSlop={8}>
          <ThemedText style={styles.grantText}>Grant</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 24, paddingTop: 64, gap: 20, paddingBottom: 48 },

  topSection: { alignItems: 'center', gap: 14, paddingBottom: 4 },
  iconRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 2, borderColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { color: Brand.beige, fontSize: 24, textAlign: 'center' },
  subtitle: { color: Brand.beigeMuted, fontSize: 14, textAlign: 'center', lineHeight: 21 },

  cards: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius, borderWidth: 1, borderColor: Brand.border,
    padding: 14,
  },
  cardGranted:     { borderColor: '#5BD2A2' },
  cardIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardIconGranted: { backgroundColor: '#1F3A2D' },
  cardText:  { flex: 1, gap: 3 },
  cardTitle: { color: Brand.beige, fontSize: 14 },
  cardDesc:  { color: Brand.beigeMuted, fontSize: 12, lineHeight: 17 },
  grantBtn: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: Brand.gold,
    flexShrink: 0,
  },
  grantText: { color: Brand.gold, fontSize: 13, fontWeight: '600' },

  cta:      { marginTop: 4 },
  skipNote: { color: Brand.beigeMuted, fontSize: 12, textAlign: 'center' },
});
