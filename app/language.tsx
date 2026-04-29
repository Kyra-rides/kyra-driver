import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
];

export default function LanguageScreen() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Choose your language" />

      <ScrollView contentContainerStyle={styles.list}>
        <ThemedText style={styles.subtitle}>
          You can change this later in your profile.
        </ThemedText>

        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => setSelected(lang.code)}
              style={[styles.row, isSelected && styles.rowSelected]}
            >
              <View style={styles.rowText}>
                <ThemedText type="defaultSemiBold" style={styles.native}>
                  {lang.native}
                </ThemedText>
                <ThemedText style={styles.label}>{lang.label}</ThemedText>
              </View>
              <View style={[styles.radio, isSelected && styles.radioSelected]}>
                {isSelected && (
                  <MaterialIcons name="check" size={16} color={Brand.burgundy} />
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <BrandButton
          title="Confirm"
          disabled={!selected}
          style={styles.cta}
          onPress={() => router.push('/sign-up')}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24, gap: 12 },
  subtitle: {
    color: Brand.beigeMuted,
    fontSize: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
  },
  rowSelected: {
    borderColor: Brand.beige,
    backgroundColor: Brand.burgundyDark,
  },
  rowText: { gap: 2 },
  native: { fontSize: 18, color: Brand.beige },
  label: { fontSize: 13, color: Brand.beigeMuted },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Brand.beigeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: Brand.beige,
    borderColor: Brand.beige,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.burgundyLight,
  },
  cta: { width: '100%' },
});
