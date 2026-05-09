/**
 * Catches any unmatched route and silently navigates away instead of
 * showing the default expo-router "Unmatched Route" / sitemap error page.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function NotFoundScreen() {
  useEffect(() => {
    // Go back if possible; otherwise fall back to root.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/sign-up');
    }
  }, []);

  // Render nothing visible — redirect fires immediately.
  return (
    <ThemedView style={styles.container}>
      <View />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
});
