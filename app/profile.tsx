/**
 * Driver profile screen.
 *
 * Fetches the driver's Profile + Driver rows, recent completed rides,
 * and active first-5-rides goal. Provides navigation to Language, Help,
 * and a Sign Out button at the bottom.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { currentDriver, goOffline } from '@/services/rides';
import { signOut } from '@/services/auth';
import { supabase } from '@/services/supabase';
import type { Driver, Profile } from '@/types/database';

interface GoalData {
  progress: number;
  target: number;
  bonus: number;
  status: string;
}

interface RideHistoryItem {
  id: string;
  pickup_address: string | null;
  drop_address: string | null;
  fare_inr_final: number | null;
  completed_at: string | null;
}

interface ProfileData {
  driver: Driver;
  profile: Profile;
  ridesHistory: RideHistoryItem[];
  goal: GoalData | null;
}

export default function ProfileScreen() {
  const { t } = useTranslation();
  const [data, setData]             = useState<ProfileData | null>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;

      const [driver, profileRes, ridesRes, goalRes] = await Promise.all([
        currentDriver(),
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase
          .from('rides')
          .select('id, pickup_address, drop_address, fare_inr_final, completed_at')
          .eq('driver_id', uid)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(30),
        supabase
          .from('goals')
          .select('progress_count, target_count, bonus_inr, status')
          .eq('driver_id', uid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setData({
        driver,
        profile: profileRes.data!,
        ridesHistory: ridesRes.data ?? [],
        goal: goalRes.data
          ? {
              progress: Number(goalRes.data.progress_count),
              target:   Number(goalRes.data.target_count),
              bonus:    Number(goalRes.data.bonus_inr),
              status:   goalRes.data.status,
            }
          : null,
      });
    } catch {
      // Silent — UI shows placeholder values.
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleSignOut = async () => {
    setSignOutBusy(true);
    try {
      try { await goOffline(); } catch { /* noop */ }
      await signOut();
      router.replace('/sign-up');
    } finally {
      setSignOutBusy(false);
    }
  };

  const initials = data?.profile
    ? `${data.profile.first_name?.[0] ?? ''}${data.profile.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const fullName = data?.profile
    ? `${data.profile.first_name} ${data.profile.last_name}`.trim()
    : '—';

  const totalEarnings = data ? Number(data.driver.lifetime_earnings_inr) : 0;
  const totalRides    = data?.driver.total_completed_rides ?? 0;

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('profile.title', { defaultValue: 'My Profile' })} />

      <ScrollView contentContainerStyle={styles.body}>

        {/* ── Avatar + identity ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <ThemedText style={styles.avatarInitials}>{initials}</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.name}>{fullName}</ThemedText>
          <ThemedText style={styles.phone}>{data?.profile?.phone ?? '—'}</ThemedText>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>{totalRides}</ThemedText>
            <ThemedText style={styles.statLabel}>
              {t('profile.rides_label', { defaultValue: 'Rides' })}
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>
              ₹{Math.round(totalEarnings).toLocaleString('en-IN')}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              {t('profile.lifetime_label', { defaultValue: 'Lifetime' })}
            </ThemedText>
          </View>
        </View>

        {/* ── Rewards goal ── */}
        {data?.goal ? (
          <View style={styles.rewardCard}>
            <View style={styles.rewardHeader}>
              <MaterialIcons name="star" size={18} color={Brand.gold} />
              <ThemedText type="defaultSemiBold" style={styles.rewardTitle}>
                {t('profile.first_n_rides', {
                  defaultValue: `First {{count}} Rides Bonus`,
                  count: data.goal.target,
                })}
              </ThemedText>
            </View>
            <View style={styles.rewardBar}>
              {Array.from({ length: data.goal.target }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.rewardSegment,
                    i < data!.goal!.progress ? styles.rewardFilled : styles.rewardEmpty,
                  ]}
                />
              ))}
            </View>
            <ThemedText style={styles.rewardHint}>
              {data.goal.progress >= data.goal.target
                ? t('profile.bonus_unlocked', {
                    defaultValue: `₹{{bonus}} bonus unlocked!`,
                    bonus: data.goal.bonus,
                  })
                : t('profile.rides_to_bonus', {
                    defaultValue: `{{remaining}} more ride(s) to earn ₹{{bonus}}`,
                    remaining: data.goal.target - data.goal.progress,
                    bonus: data.goal.bonus,
                  })}
            </ThemedText>
          </View>
        ) : null}

        {/* ── Recent rides ── */}
        {(data?.ridesHistory?.length ?? 0) > 0 ? (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              {t('profile.recent_rides', { defaultValue: 'Recent Rides' })}
            </ThemedText>
            <View style={styles.rideList}>
              {data!.ridesHistory.map((ride) => (
                <View key={ride.id} style={styles.rideItem}>
                  <View style={styles.rideItemLeft}>
                    <ThemedText type="defaultSemiBold" style={styles.ridePickup}>
                      {ride.pickup_address?.split(',')[0] ?? '—'}
                    </ThemedText>
                    <ThemedText style={styles.rideDrop}>
                      → {ride.drop_address?.split(',')[0] ?? '—'}
                    </ThemedText>
                    {ride.completed_at ? (
                      <ThemedText style={styles.rideDate}>
                        {new Date(ride.completed_at).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </ThemedText>
                    ) : null}
                  </View>
                  <ThemedText style={styles.rideFare}>
                    ₹{Math.round(Number(ride.fare_inr_final ?? 0))}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Menu items ── */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="help-outline"
            label={t('profile.help', { defaultValue: 'Help & Support' })}
            onPress={() => { /* TODO: help screen */ }}
          />
          <MenuItem
            icon="language"
            label={t('profile.language', { defaultValue: 'Language' })}
            onPress={() => router.push('/language')}
          />
        </View>

        {/* ── Logout ── */}
        <Pressable
          style={[styles.logoutBtn, signOutBusy && { opacity: 0.5 }]}
          onPress={() => { void handleSignOut(); }}
          disabled={signOutBusy}
        >
          <MaterialIcons name="logout" size={18} color="#E07B7B" />
          <ThemedText style={styles.logoutText}>
            {t('profile.sign_out', { defaultValue: 'Sign Out' })}
          </ThemedText>
        </Pressable>

      </ScrollView>
    </ThemedView>
  );
}

function MenuItem({
  icon, label, onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuItem}>
      <MaterialIcons name={icon} size={20} color={Brand.gold} />
      <ThemedText style={styles.menuLabel}>{label}</ThemedText>
      <MaterialIcons name="chevron-right" size={20} color={Brand.beigeMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 20, gap: 16, paddingBottom: 48 },

  avatarSection: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Brand.gold,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Brand.beige,
  },
  avatarInitials: { fontSize: 28, fontWeight: '700', color: Brand.burgundyDark },
  name:           { fontSize: 20, color: Brand.beige },
  phone:          { color: Brand.beigeMuted, fontSize: 14 },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    borderWidth: 1, borderColor: Brand.border,
    overflow: 'hidden',
  },
  statBox:     { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  statDivider: { width: 1, backgroundColor: Brand.border },
  statValue:   { color: Brand.gold, fontSize: 20 },
  statLabel:   { color: Brand.beigeMuted, fontSize: 11, letterSpacing: 0.6 },

  rewardCard: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    borderWidth: 1, borderColor: Brand.gold,
    padding: 14, gap: 10,
  },
  rewardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rewardTitle:   { color: Brand.beige, fontSize: 14 },
  rewardBar:     { flexDirection: 'row', gap: 4 },
  rewardSegment: { flex: 1, height: 8, borderRadius: 4 },
  rewardFilled:  { backgroundColor: Brand.gold },
  rewardEmpty:   { backgroundColor: Brand.burgundyDark, borderWidth: 1, borderColor: Brand.border },
  rewardHint:    { color: Brand.beigeMuted, fontSize: 12 },

  section:      { gap: 10 },
  sectionTitle: { color: Brand.beige, fontSize: 15 },
  rideList:     { gap: 8 },
  rideItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius, borderWidth: 1, borderColor: Brand.border,
    padding: 12, gap: 12,
  },
  rideItemLeft: { flex: 1, gap: 2 },
  ridePickup:   { color: Brand.beige, fontSize: 13 },
  rideDrop:     { color: Brand.beigeMuted, fontSize: 12 },
  rideDate:     { color: Brand.beigeMuted, fontSize: 11, marginTop: 2 },
  rideFare:     { color: Brand.gold, fontSize: 16, fontWeight: '700' },

  menuSection: {
    backgroundColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    borderWidth: 1, borderColor: Brand.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Brand.border,
  },
  menuLabel: { flex: 1, color: Brand.beige, fontSize: 15 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
    borderRadius: Brand.radius,
    borderWidth: 1, borderColor: '#E07B7B',
    backgroundColor: 'rgba(224,123,123,0.08)',
    marginTop: 8,
  },
  logoutText: { color: '#E07B7B', fontSize: 16, fontWeight: '600' },
});
