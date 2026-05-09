/**
 * Driver post-trip rating screen.
 *
 * Loads the completed ride, shows 5 stars + Submit / Do it later. Pre-fills
 * any existing rating so the driver can edit it. Submit upserts via
 * services/rides.rateRider; Do it later returns to /online without writing.
 */

import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { currentDriverId, rateRider } from '@/services/rides';
import { supabase } from '@/services/supabase';

export default function RateRiderScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stars, setStars]     = useState<number>(0);
  const [riderId, setRiderId] = useState<string | null>(null);
  const [riderName, setName]  = useState<string>(t('nav_pickup.default_rider_name'));
  const [busy, setBusy]       = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const me = await currentDriverId();
      const { data: ride } = await supabase
        .from('rides')
        .select('rider_id')
        .eq('id', id)
        .maybeSingle();
      if (!ride?.rider_id) return;
      setRiderId(ride.rider_id);

      const [profileRes, existingRes] = await Promise.all([
        supabase.from('profiles').select('first_name, last_name').eq('id', ride.rider_id).maybeSingle(),
        supabase.from('ratings').select('stars').eq('ride_id', id).eq('rater_id', me).maybeSingle(),
      ]);
      if (profileRes.data) {
        setName(`${profileRes.data.first_name} ${profileRes.data.last_name}`.trim() || t('nav_pickup.default_rider_name'));
      }
      if (existingRes.data?.stars) {
        setStars(existingRes.data.stars);
      }
    })();
  }, [id]);

  const onSubmit = async () => {
    if (!id || !riderId || stars === 0) return;
    setBusy(true);
    try {
      await rateRider(id, riderId, stars, null);
      router.replace('/online');
    } catch (err) {
      Alert.alert(t('rate_rider.could_not_submit'), err instanceof Error ? err.message : '');
    } finally {
      setBusy(false);
    }
  };

  const onLater = () => router.replace('/online');

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('rate_rider.title')} />
      <View style={styles.body}>
        <MaterialIcons name="check-circle" size={56} color="#5BD2A2" />
        <ThemedText type="title" style={styles.title}>{t('rate_rider.trip_complete')}</ThemedText>
        <ThemedText style={styles.muted}>{t('rate_rider.how_was', { name: riderName })}</ThemedText>

        <Stars value={stars} onChange={setStars} />

        <BrandButton
          title={busy ? t('rate_rider.submitting') : t('rate_rider.submit')}
          onPress={onSubmit}
          disabled={busy || stars === 0}
        />

        <Pressable onPress={onLater} hitSlop={8} style={styles.laterBtn}>
          <ThemedText style={styles.laterText}>{t('rate_rider.do_later')}</ThemedText>
        </Pressable>

        <ThemedText style={styles.dim}>
          {t('rate_rider.history_hint')}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

function Stars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={4}>
          <MaterialIcons
            name={n <= value ? 'star' : 'star-border'}
            size={48}
            color={n <= value ? Brand.gold : Brand.beigeMuted}
          />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 16,
  },
  title:    { textAlign: 'center', fontSize: 26 },
  muted:    { color: Brand.beige, textAlign: 'center', fontSize: 16 },
  dim:      { color: Brand.beigeMuted, textAlign: 'center', fontSize: 12, lineHeight: 18 },
  stars:    { flexDirection: 'row', gap: 4, marginVertical: 16 },
  laterBtn: { paddingVertical: 8 },
  laterText:{ color: Brand.beigeMuted, textDecorationLine: 'underline' },
});
