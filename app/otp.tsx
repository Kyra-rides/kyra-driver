/**
 * Driver OTP entry. Calls otp-verify with role='driver', sets the Supabase
 * session, then routes to /welcome (KYC pending) — the existing index.tsx
 * gate routes onward to /online once an admin has approved KYC.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { sendOtp, verifyOtp } from '@/services/auth';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    phone?: string;
    first_name?: string;
    last_name?: string;
    dev_otp?: string;
  }>();

  const initial = (params.dev_otp ?? '').padEnd(OTP_LENGTH, '').slice(0, OTP_LENGTH).split('');
  const [digits, setDigits] = useState<string[]>(
    Array(OTP_LENGTH).fill('').map((_, i) => initial[i] ?? ''),
  );
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [busy, setBusy] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const code = digits.join('');

  useEffect(() => {
    if (code.length !== OTP_LENGTH || busy) return;
    void handleVerify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const handleVerify = async () => {
    if (!params.phone || !params.first_name || !params.last_name) {
      Alert.alert(t('otp.missing'), t('otp.go_back'));
      return;
    }
    setBusy(true);
    try {
      await verifyOtp({
        phone:     `+91${params.phone}`,
        otp:       code,
        firstName: params.first_name,
        lastName:  params.last_name,
      });
      Keyboard.dismiss();
      router.replace('/document-centre');
    } catch (err) {
      Alert.alert(t('otp.fail'), err instanceof Error ? err.message : t('signup.try_again'));
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const onResend = async () => {
    if (!params.phone) return;
    try {
      await sendOtp(`+91${params.phone}`);
      setSeconds(RESEND_SECONDS);
    } catch (err) {
      Alert.alert(t('otp.could_not_resend'), err instanceof Error ? err.message : t('signup.try_again'));
    }
  };

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
      <ScreenHeader title={t('otp.title')} />

      <View style={styles.body}>
        <ThemedText type="title" style={styles.heading}>{t('otp.title')}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {t('otp.instruction', { phone: params.phone ? `+91 ${params.phone}` : '' })}
        </ThemedText>
        {params.dev_otp ? (
          <View style={styles.devBanner}>
            <ThemedText style={styles.devBannerText}>
              {t('otp.dev_hint', { otp: params.dev_otp })}
            </ThemedText>
          </View>
        ) : null}

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
              autoFocus={i === 0 && !d}
              selectTextOnFocus
              editable={!busy}
            />
          ))}
        </View>

        <View style={styles.resendRow}>
          {seconds > 0 ? (
            <ThemedText style={styles.resendDim}>
              {t('otp.resend_in', { seconds: seconds.toString().padStart(2, '0') })}
            </ThemedText>
          ) : (
            <Pressable onPress={onResend} hitSlop={8}>
              <ThemedText style={styles.resendActive}>{t('otp.resend')}</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  heading:   { fontSize: 26, lineHeight: 32 },
  subtitle:  { color: Brand.beigeMuted, fontSize: 14 },
  phone:     { color: Brand.beige, fontWeight: '600' },
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
  otpBoxFilled: { borderColor: Brand.beige },
  resendRow:    { marginTop: 16, alignItems: 'center' },
  resendDim:    { color: Brand.beigeMuted, fontSize: 13 },
  resendActive: { color: Brand.beige, fontSize: 13, fontWeight: '600' },
  devBanner: {
    backgroundColor: Brand.beige,
    borderRadius: Brand.radius,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    alignSelf: 'stretch',
  },
  devBannerText: {
    color: Brand.burgundy,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
});
