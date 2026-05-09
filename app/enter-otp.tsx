/**
 * Pickup verification — driver enters rider's 4-digit OTP, then confirms
 * gender at pickup. Combines the original OTP entry UI with the new mutual
 * gender-check safety flow.
 *
 * Flow:
 *   1. Driver types the 4-digit code the rider showed them.
 *   2. Code matches `kyra.rides.ride_otp` → unlocks gender check.
 *   3. Driver answers "Is this rider a woman?" Yes/No.
 *   4. On Yes → submitDriverGenderCheck → if rider also said yes, the
 *      backend trigger flips status to `pickup_verified` then `in_trip`.
 *      On No → backend cancels the ride immediately.
 *   5. Status change is observed via subscribeAssignment; we route to
 *      /in-ride or /online accordingly.
 */

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { submitDriverGenderCheck, subscribeAssignment, type Ride } from '@/services/rides';

const LENGTH = 4;

export default function EnterOtpScreen() {
  const { t } = useTranslation();
  const [ride, setRide]       = useState<Ride | null>(null);
  const [digits, setDigits]   = useState<string[]>(Array(LENGTH).fill(''));
  const [error, setError]     = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => subscribeAssignment(setRide), []);

  // Auto-progress: status changes routed by the backend trigger after both
  // sides answer the gender check.
  useEffect(() => {
    if (!ride) {
      router.replace('/online');
      return;
    }
    if (ride.status === 'pickup_verified' || ride.status === 'in_trip') {
      router.replace('/in-ride');
    } else if (ride.status === 'completed' || ride.status.startsWith('cancelled')) {
      router.replace('/online');
    }
  }, [ride?.status]);

  const code = digits.join('');
  const ready = code.length === LENGTH && !submitting;

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

  const verifyOtp = () => {
    if (!ride || !ready) return;
    if (code !== ride.ride_otp) {
      setError(t('enter_otp.mismatch'));
      setDigits(Array(LENGTH).fill(''));
      inputs.current[0]?.focus();
      return;
    }
    setError(null);
    setOtpVerified(true);
  };

  const onAnswerGender = async (answer: 'yes' | 'no') => {
    if (!ride) return;
    setSubmitting(true);
    try {
      await submitDriverGenderCheck(ride.id, answer);
      // Status change will route us via the useEffect above.
    } catch (err) {
      Alert.alert(t('enter_otp.could_not_submit'), err instanceof Error ? err.message : '');
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScreenHeader title={otpVerified ? t('enter_otp.stage2_title') : t('enter_otp.stage1_title')} />

      <View style={styles.body}>
        {!otpVerified ? (
          <>
            <ThemedText style={styles.subtitle}>
              {t('enter_otp.stage1_subtitle')}
            </ThemedText>

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  style={[styles.otpBox, d ? styles.otpBoxFilled : null, !!error && styles.otpBoxError]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  onChangeText={(v) => onChange(i, v)}
                  onKeyPress={({ nativeEvent }) => onKey(i, nativeEvent.key)}
                  autoFocus={i === 0}
                  selectTextOnFocus
                />
              ))}
            </View>

            {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

            <BrandButton
              title={t('enter_otp.verify')}
              onPress={verifyOtp}
              disabled={!ready}
              style={styles.cta}
            />
          </>
        ) : (
          <>
            <View style={styles.checkBanner}>
              <MaterialIcons name="check-circle" size={20} color="#5BD2A2" />
              <ThemedText style={styles.checkBannerText}>{t('enter_otp.matched')}</ThemedText>
            </View>

            <ThemedText type="defaultSemiBold" style={styles.checkTitle}>
              {t('enter_otp.check_label')}
            </ThemedText>
            <ThemedText style={styles.checkBody}>
              {t('enter_otp.check_body')}
            </ThemedText>

            <View style={styles.checkBtns}>
              <Pressable
                style={[styles.checkBtn, styles.checkBtnNo]}
                onPress={() => onAnswerGender('no')}
                disabled={submitting}
              >
                <ThemedText style={styles.checkBtnText}>{t('enter_otp.no')}</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.checkBtn, styles.checkBtnYes]}
                onPress={() => onAnswerGender('yes')}
                disabled={submitting}
              >
                <ThemedText style={styles.checkBtnTextYes}>{t('enter_otp.yes')}</ThemedText>
              </Pressable>
            </View>

            <ThemedText style={styles.dim}>
              {t('enter_otp.both_required')}
            </ThemedText>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  body:      { padding: 24, gap: 18 },
  subtitle:  { color: Brand.beigeMuted, fontSize: 14, lineHeight: 20 },
  otpRow:    { flexDirection: 'row', gap: 12, justifyContent: 'space-between', marginVertical: 8 },
  otpBox: {
    flex: 1, aspectRatio: 1,
    borderWidth: 1.5, borderColor: Brand.border,
    borderRadius: Brand.radius,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
    fontSize: 32, fontWeight: '600',
    textAlign: 'center',
  },
  otpBoxFilled: { borderColor: Brand.gold },
  otpBoxError:  { borderColor: '#E07B7B' },
  error:       { color: '#E07B7B', fontSize: 13 },
  cta:         { alignSelf: 'stretch', marginTop: 8 },

  checkBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Brand.burgundyDark,
    borderRadius: Brand.radius,
    padding: 10,
    borderWidth: 1, borderColor: '#5BD2A2',
  },
  checkBannerText: { color: '#5BD2A2', fontSize: 13, fontWeight: '600' },
  checkTitle:      { color: '#5BD2A2', fontSize: 14, letterSpacing: 1 },
  checkBody:       { color: Brand.beige, fontSize: 14, lineHeight: 20 },
  checkBtns:       { flexDirection: 'row', gap: 10, marginTop: 4 },
  checkBtn: {
    flex: 1, paddingVertical: 18, borderRadius: Brand.radius,
    alignItems: 'center', borderWidth: 2,
  },
  checkBtnNo:      { borderColor: '#E07B7B', backgroundColor: 'transparent' },
  checkBtnYes:     { borderColor: '#5BD2A2', backgroundColor: '#5BD2A2' },
  checkBtnText:    { color: '#E07B7B', fontWeight: '700', fontSize: 18 },
  checkBtnTextYes: { color: Brand.burgundy, fontWeight: '700', fontSize: 18 },
  dim:             { color: Brand.beigeMuted, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 8 },
});
