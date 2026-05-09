/**
 * First-launch language picker for the driver app.
 *
 * Mirror of kyra-rider/app/language.tsx. Shown to every new user before
 * /sign-up. Persists the chosen language locally + syncs to
 * kyra.profiles.language_pref once signed in.
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { setLanguage, type LangCode } from '@/services/i18n';

const OPTIONS: { code: LangCode; label: string; tag: string }[] = [
  { code: 'en', label: 'English', tag: 'A' },
  { code: 'hi', label: 'हिंदी',   tag: 'अ' },
  { code: 'kn', label: 'ಕನ್ನಡ',   tag: 'ಅ' },
];

export default function LanguageScreen() {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<LangCode>('en');
  const [busy, setBusy]     = useState(false);

  const onContinue = async () => {
    setBusy(true);
    await setLanguage(picked);
    router.replace('/sign-up');
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={t('language.title')} />
      <ScrollView contentContainerStyle={styles.body}>
        <ThemedText style={styles.subtitle}>{t('language.subtitle')}</ThemedText>

        <View style={styles.options}>
          {OPTIONS.map((o) => {
            const active = picked === o.code;
            return (
              <Pressable
                key={o.code}
                onPress={() => setPicked(o.code)}
                style={[styles.option, active && styles.optionActive]}
              >
                <View style={[styles.optionTag, active && styles.optionTagActive]}>
                  <ThemedText style={[styles.optionTagText, active && styles.optionTagTextActive]}>
                    {o.tag}
                  </ThemedText>
                </View>
                <ThemedText type="defaultSemiBold" style={styles.optionLabel}>
                  {o.label}
                </ThemedText>
                {active ? (
                  <MaterialIcons name="check-circle" size={22} color={Brand.gold} />
                ) : (
                  <View style={styles.optionRadio} />
                )}
              </Pressable>
            );
          })}
        </View>

        <BrandButton
          title={t('language.continue')}
          onPress={onContinue}
          disabled={busy}
          style={styles.cta}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 24, gap: 16, flexGrow: 1 },
  subtitle:  { color: Brand.beigeMuted, fontSize: 14, lineHeight: 20 },
  options:   { gap: 10, marginTop: 16, marginBottom: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 2, borderColor: Brand.border,
  },
  optionActive: { borderColor: Brand.gold },
  optionTag: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Brand.burgundyDark,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Brand.border,
  },
  optionTagActive:     { backgroundColor: Brand.gold, borderColor: Brand.gold },
  optionTagText:       { color: Brand.beige, fontSize: 18, fontWeight: '700' },
  optionTagTextActive: { color: Brand.burgundyDark },
  optionLabel:         { flex: 1, fontSize: 18, color: Brand.beige },
  optionRadio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: Brand.beigeMuted,
  },
  cta: { marginTop: 'auto', alignSelf: 'stretch' },
});
