import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const code = digits.join('');

  useEffect(() => {
    if (code.length === OTP_LENGTH) {
      router.push('/register');
    }
  }, [code]);

  const setAt = (idx: number, val: string) => {
    const clean = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = clean;
    setDigits(next);
    if (clean && idx < OTP_LENGTH - 1) inputs.current[idx + 1]?.focus();
  };

  const onKey = (idx: number, key: string) => {
    if (key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Verify your number" />

      <View style={styles.body}>
        <ThemedText type="title" style={styles.heading}>
          Enter the 6-digit code
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Sent to <ThemedText style={styles.phone}>+91 {phone}</ThemedText>
        </ThemedText>

        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
              keyboardType="number-pad"
              maxLength={1}
              value={d}
              onChangeText={(v) => setAt(i, v)}
              onKeyPress={({ nativeEvent }) => onKey(i, nativeEvent.key)}
              autoFocus={i === 0}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {seconds > 0 ? (
            <ThemedText style={styles.resendDim}>
              Resend in 00:{seconds.toString().padStart(2, '0')}
            </ThemedText>
          ) : (
            <Pressable onPress={() => setSeconds(RESEND_SECONDS)} hitSlop={8}>
              <ThemedText style={styles.resendActive}>Resend code</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  heading: { fontSize: 26, lineHeight: 32 },
  subtitle: { color: Brand.beigeMuted, fontSize: 14 },
  phone: { color: Brand.beige, fontWeight: '600' },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1,
    borderWidth: 1.5,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: Brand.beige,
  },
  resendRow: { marginTop: 16, alignItems: 'center' },
  resendDim: { color: Brand.beigeMuted, fontSize: 13 },
  resendActive: { color: Brand.beige, fontSize: 13, fontWeight: '600' },
});
