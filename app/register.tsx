import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function RegisterScreen() {
  const [whatsApp, setWhatsApp] = useState(true);
  const [referral, setReferral] = useState('');
  const [showReferral, setShowReferral] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Register as a driver" />

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <MaterialIcons name="person-outline" size={36} color={Brand.beige} />
          </View>
        </View>

        <ThemedText type="title" style={styles.heading}>
          Welcome to Kyra
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          A few quick details and you&apos;re on your way to driving with us.
        </ThemedText>

        <Pressable
          onPress={() => setWhatsApp(!whatsApp)}
          style={styles.toggleRow}
        >
          <View style={[styles.checkbox, whatsApp && styles.checkboxOn]}>
            {whatsApp && <MaterialIcons name="check" size={16} color={Brand.burgundy} />}
          </View>
          <ThemedText style={styles.toggleText}>
            Receive ride alerts and account updates on{' '}
            <ThemedText style={styles.toggleAccent}>WhatsApp</ThemedText>
          </ThemedText>
        </Pressable>

        {showReferral ? (
          <View style={styles.referralWrap}>
            <ThemedText style={styles.referralLabel}>Referral code</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter code"
              placeholderTextColor={Brand.beigeMuted}
              autoCapitalize="characters"
              value={referral}
              onChangeText={setReferral}
            />
          </View>
        ) : (
          <Pressable onPress={() => setShowReferral(true)} hitSlop={8}>
            <ThemedText style={styles.referralLink}>
              Have a referral code?
            </ThemedText>
          </Pressable>
        )}

        <View style={styles.note}>
          <MaterialIcons name="verified-user" size={18} color={Brand.gold} />
          <ThemedText style={styles.noteText}>
            Kyra is women-only on both sides. You&apos;ll verify with Aadhaar + selfie before
            you can go online.
          </ThemedText>
        </View>
      </View>

      <View style={styles.footer}>
        <BrandButton
          title="Register as a Kyra Driver"
          style={styles.cta}
          onPress={() => router.push('/vehicle')}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 24, gap: 14, flex: 1 },
  avatarWrap: { alignItems: 'flex-start' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontSize: 26, lineHeight: 32 },
  subtitle: { color: Brand.beigeMuted, fontSize: 14, lineHeight: 20 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    marginTop: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Brand.beigeMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: Brand.beige,
    borderColor: Brand.beige,
  },
  toggleText: { flex: 1, color: Brand.beige, fontSize: 14 },
  toggleAccent: { color: Brand.gold, fontWeight: '600' },
  referralLink: {
    color: Brand.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  referralWrap: { gap: 6 },
  referralLabel: { color: Brand.beigeMuted, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 12,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    fontSize: 16,
  },
  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    backgroundColor: Brand.burgundyDark,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    marginTop: 8,
  },
  noteText: { flex: 1, color: Brand.beigeMuted, fontSize: 13, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  cta: { width: '100%' },
});
