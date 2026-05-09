/**
 * Reusable placeholder for screens being rewritten against the new Supabase
 * backend. See /Users/Divyashri2/Kyra/kyra-backend/README.md.
 */

import { StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useTranslation } from 'react-i18next';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Brand } from '@/constants/theme';

export function ComingSoonScreen({
  title,
  body,
}: { title?: string; body?: string }) {
  const { t } = useTranslation();
  return (
    <ThemedView style={styles.container}>
      <MaterialIcons name="construction" size={48} color={Brand.gold} />
      <ThemedText type="title" style={styles.title}>{title ?? t('coming_soon.default_title')}</ThemedText>
      <ThemedText style={styles.body}>{body ?? t('coming_soon.default_body')}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    backgroundColor: Brand.burgundy,
  },
  title: { textAlign: 'center' },
  body:  { textAlign: 'center', color: Brand.beigeMuted, paddingHorizontal: 8 },
});
