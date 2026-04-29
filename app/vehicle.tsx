import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

type VehicleId = 'auto' | 'bike';

const VEHICLES: Array<{
  id: VehicleId;
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  {
    id: 'auto',
    title: 'Auto-rickshaw',
    subtitle: 'Drive your own auto, or use a Kyra-leased auto.',
    icon: 'electric-rickshaw',
  },
  {
    id: 'bike',
    title: 'Bike-taxi',
    subtitle: 'Two-wheeler bike-taxi service. PSV badge required.',
    icon: 'two-wheeler',
  },
];

export default function VehicleScreen() {
  const [selected, setSelected] = useState<VehicleId | null>(null);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Select your vehicle" />

      <View style={styles.body}>
        <ThemedText style={styles.subtitle}>
          Kyra supports auto-rickshaw and bike-taxi only. Cab service is on our roadmap
          but out of scope for the Bengaluru launch.
        </ThemedText>

        <View style={styles.list}>
          {VEHICLES.map((v) => {
            const isSelected = selected === v.id;
            return (
              <Pressable
                key={v.id}
                onPress={() => setSelected(v.id)}
                style={[styles.card, isSelected && styles.cardSelected]}
              >
                <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
                  <MaterialIcons
                    name={v.icon}
                    size={32}
                    color={isSelected ? Brand.burgundy : Brand.beige}
                  />
                </View>
                <View style={styles.cardText}>
                  <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                    {v.title}
                  </ThemedText>
                  <ThemedText style={styles.cardSubtitle}>{v.subtitle}</ThemedText>
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && (
                    <MaterialIcons name="check" size={14} color={Brand.burgundy} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <BrandButton
          title="Confirm vehicle"
          disabled={!selected}
          style={styles.cta}
          onPress={() => router.push({ pathname: '/city', params: { vehicle: selected ?? '' } })}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 24, flex: 1, gap: 16 },
  subtitle: {
    color: Brand.beigeMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  list: { gap: 12, marginTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
  },
  cardSelected: {
    borderColor: Brand.beige,
    backgroundColor: Brand.burgundyDark,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: { backgroundColor: Brand.beige },
  cardText: { flex: 1, gap: 4 },
  cardTitle: { color: Brand.beige, fontSize: 17 },
  cardSubtitle: { color: Brand.beigeMuted, fontSize: 13, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Brand.beigeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: Brand.beige, borderColor: Brand.beige },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  cta: { width: '100%' },
});
