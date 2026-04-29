import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import {
  submitDriverOtpAttempt,
  subscribeLatestRide,
  type RideDoc,
} from '@/services/ride-firestore';

const LENGTH = 4;

export default function EnterOtpScreen() {
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ride, setRide] = useState<RideDoc | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => subscribeLatestRide(setRide), []);

  // Watch the ride doc — admin verifies and flips status to in_progress when correct.
  useEffect(() => {
    if (!ride) return;
    if (ride.status === 'in_progress') {
      router.replace('/in-ride');
    } else if (ride.status === 'completed' || ride.status === 'rated' || ride.status === 'cancelled') {
      router.replace('/online');
    } else if (ride.status === 'requested' || ride.status === 'dispatching') {
      router.replace('/online');
    }
    // If admin rejected the attempt, show error and let driver retry.
    if (ride.driverOtpError) {
      setError("That OTP doesn't match. Ask the rider to read it again.");
      setDigits(Array(LENGTH).fill(''));
      setSubmitting(false);
      inputs.current[0]?.focus();
    }
  }, [ride?.status, ride?.driverOtpError]);

  const onChange = (i: number, v: string) => {
    const cleaned = v.replace(/[^0-9]/g, '').slice(0, 1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = cleaned;
      return next;
    });
    setError(null);
    if (cleaned && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onKey = (i: number, key: string) => {
    if (key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const code = digits.join('');
  const ready = code.length === LENGTH && !submitting;

  const verify = async () => {
    if (!ride || !ready) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitDriverOtpAttempt(ride.id, code);
      // Admin app will read the secret, compare, and flip status. The
      // useEffect above will navigate us to /in-ride on success or show the
      // error on rejection.
    } catch (e) {
      setError(`Could not verify. ${(e as Error).message}`);
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title="Enter ride OTP" />

      <View style={styles.body}>
        <ThemedText type="defaultSemiBold" style={styles.heading}>
          Ask {ride?.rider.name.split(' ')[0] ?? 'the rider'} for her 4-digit code
        </ThemedText>
        <ThemedText style={styles.sub}>
          The rider sees this code on her Kyra app. The ride only starts after Kyra verifies it.
        </ThemedText>

        <View style={styles.row}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => {
                inputs.current[i] = el;
              }}
              value={d}
              onChangeText={(v) => onChange(i, v)}
              onKeyPress={({ nativeEvent }) => onKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              autoFocus={i === 0}
              editable={!submitting}
              style={[styles.box, d ? styles.boxFilled : null, error ? styles.boxError : null]}
              selectionColor={Brand.gold}
            />
          ))}
        </View>

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}
        {submitting && !error ? (
          <ThemedText style={styles.verifying}>Verifying with Kyra…</ThemedText>
        ) : null}

        <BrandButton
          title={submitting ? 'Verifying…' : 'Verify & start ride'}
          disabled={!ready}
          onPress={verify}
          style={styles.cta}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body: { padding: 24, gap: 14 },
  heading: { color: Brand.beige, fontSize: 18 },
  sub: { color: Brand.beigeMuted, fontSize: 13, lineHeight: 19 },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 70,
    borderRadius: Brand.radius,
    borderWidth: 1,
    borderColor: Brand.burgundyLight,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  boxFilled: {
    borderColor: Brand.gold,
    backgroundColor: Brand.burgundyDark,
  },
  boxError: { borderColor: '#E07A6A' },
  error: { color: '#E07A6A', fontSize: 13, textAlign: 'center', marginTop: 6 },
  verifying: { color: Brand.beigeMuted, fontSize: 12, textAlign: 'center', marginTop: 6 },
  cta: { marginTop: 22, alignSelf: 'stretch' },
});
