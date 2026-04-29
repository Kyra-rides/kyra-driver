import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

export default function SignUpScreen() {
  const [phone, setPhone] = useState('');
  const valid = phone.replace(/\D/g, '').length === 10;

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Sign in to drive" />

      <View style={styles.body}>
        <ThemedText type="title" style={styles.heading}>
          Enter your phone number
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          We&apos;ll send a one-time code to verify it&apos;s you. Kyra is for women drivers
          only — your number is what we tie your account to.
        </ThemedText>

        <View style={styles.inputRow}>
          <View style={styles.prefix}>
            <ThemedText type="defaultSemiBold" style={styles.prefixText}>
              +91
            </ThemedText>
          </View>
          <TextInput
            style={styles.input}
            placeholder="98765 43210"
            placeholderTextColor={Brand.beigeMuted}
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
            autoFocus
          />
        </View>

        <Pressable hitSlop={8} style={styles.terms}>
          <ThemedText style={styles.termsText}>
            By continuing, you agree to Kyra&apos;s{' '}
            <ThemedText style={styles.termsLink}>Terms</ThemedText> and{' '}
            <ThemedText style={styles.termsLink}>Privacy Policy</ThemedText>.
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <BrandButton
          title="Send OTP"
          disabled={!valid}
          style={styles.cta}
          onPress={() => router.push({ pathname: '/otp', params: { phone } })}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 24, gap: 16, flex: 1 },
  heading: { fontSize: 28, lineHeight: 34 },
  subtitle: {
    color: Brand.beigeMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  prefix: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    justifyContent: 'center',
  },
  prefixText: { color: Brand.beige, fontSize: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    paddingHorizontal: 14,
    fontSize: 18,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    letterSpacing: 1.5,
  },
  terms: { marginTop: 8 },
  termsText: {
    color: Brand.beigeMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  termsLink: { color: Brand.beige, textDecorationLine: 'underline' },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  cta: { width: '100%' },
});
