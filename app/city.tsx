import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

const SERVICEABLE = [
  { id: 'blr', name: 'Bengaluru', tag: 'Pilot zone: HSR Layout' },
];

const ROADMAP = ['Hyderabad', 'Chennai', 'Pune', 'Mumbai', 'Delhi NCR'];

export default function CityScreen() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Where will you drive?" />

      <ScrollView contentContainerStyle={styles.body}>
        <ThemedText style={styles.subtitle}>
          Kyra is launching in Bengaluru first. Other cities are on our roadmap.
        </ThemedText>

        <ThemedText style={styles.sectionLabel}>Live now</ThemedText>
        {SERVICEABLE.map((c) => {
          const isSelected = selected === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setSelected(c.id)}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected && (
                    <MaterialIcons name="check" size={14} color={Brand.burgundy} />
                  )}
                </View>
                <View style={styles.cardText}>
                  <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                    {c.name}
                  </ThemedText>
                  <ThemedText style={styles.cardTag}>{c.tag}</ThemedText>
                </View>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveText}>Live</ThemedText>
              </View>
            </Pressable>
          );
        })}

        <ThemedText style={[styles.sectionLabel, styles.sectionLabelMt]}>
          Coming soon
        </ThemedText>
        {ROADMAP.map((c) => (
          <View key={c} style={[styles.card, styles.cardDisabled]}>
            <View style={styles.cardLeft}>
              <View style={[styles.radio, styles.radioDisabled]} />
              <ThemedText style={styles.cardTitleDisabled}>{c}</ThemedText>
            </View>
            <ThemedText style={styles.soonText}>Soon</ThemedText>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <BrandButton
          title="Confirm city"
          disabled={!selected}
          style={styles.cta}
          onPress={() => router.push('/driving-license')}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
  subtitle: {
    color: Brand.beigeMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  sectionLabel: {
    color: Brand.gold,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionLabelMt: { marginTop: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
  },
  cardSelected: {
    borderColor: Brand.beige,
    backgroundColor: Brand.burgundyDark,
  },
  cardDisabled: { opacity: 0.55 },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
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
  radioDisabled: { borderColor: Brand.burgundyLight },
  cardText: { gap: 2, flex: 1 },
  cardTitle: { color: Brand.beige, fontSize: 16 },
  cardTitleDisabled: { color: Brand.beigeMuted, fontSize: 16 },
  cardTag: { color: Brand.beigeMuted, fontSize: 12 },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Brand.burgundyDark,
    borderWidth: 1,
    borderColor: Brand.gold,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5BD2A2' },
  liveText: { color: Brand.gold, fontSize: 11, fontWeight: '600' },
  soonText: { color: Brand.beigeMuted, fontSize: 12 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.burgundyLight,
  },
  cta: { width: '100%' },
});
