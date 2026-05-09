/**
 * Driver phone-OTP entry. Collects first/last name + phone in one screen so
 * we have everything required to mint the auth user when the OTP verifies.
 *
 *   sign-up (name + phone) → otp-send (role=driver) → /otp → otp-verify → /welcome
 */

import { useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { BrandButton } from '@/components/brand-button';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import { sendOtp } from '@/services/auth';

export default function SignUpScreen() {
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [busy,      setBusy]      = useState(false);

  const phoneDigits = phone.replace(/\D/g, '');
  const formValid =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    phoneDigits.length === 10 &&
    /^[6-9]/.test(phoneDigits);

  const onSendOtp = async () => {
    Keyboard.dismiss();
    if (!formValid) {
      Alert.alert(t('signup.title'), t('signup.invalid_phone'));
      return;
    }
    setBusy(true);
    try {
      const { devOtp } = await sendOtp(`+91${phoneDigits}`);
      router.push({
        pathname: '/otp',
        params: {
          phone: phoneDigits,
          first_name: firstName.trim(),
          last_name:  lastName.trim(),
          ...(devOtp ? { dev_otp: devOtp } : {}),
        },
      });
    } catch (err) {
      Alert.alert(t('signup.could_not_send'), err instanceof Error ? err.message : t('signup.try_again'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ThemedView style={styles.container}>
        <ScreenHeader title="Sign up to drive" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText type="title" style={styles.heading}>
              {t('signup.title')}
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {t('signup.subtitle')}
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder={t('signup.first_name')}
              placeholderTextColor={Brand.beigeMuted}
              autoCapitalize="words"
              autoComplete="given-name"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={styles.input}
              placeholder={t('signup.last_name')}
              placeholderTextColor={Brand.beigeMuted}
              autoCapitalize="words"
              autoComplete="family-name"
              value={lastName}
              onChangeText={setLastName}
            />

            <View style={styles.inputRow}>
              <View style={styles.prefix}>
                <ThemedText type="defaultSemiBold" style={styles.prefixText}>+91</ThemedText>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="98765 43210"
                placeholderTextColor={Brand.beigeMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ''))}
              />
            </View>

            <Pressable hitSlop={8} style={styles.terms}>
              <ThemedText style={styles.termsText}>
                By continuing, you agree to Kyra&apos;s{' '}
                <ThemedText style={styles.termsLink}>Terms</ThemedText> and{' '}
                <ThemedText style={styles.termsLink}>Privacy Policy</ThemedText>.
              </ThemedText>
            </Pressable>

            <View style={styles.footer}>
              <BrandButton
                title={busy ? t('signup.sending') : t('signup.send_otp')}
                disabled={!formValid || busy}
                onPress={onSendOtp}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ThemedView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Brand.burgundy },
  flex:      { flex: 1 },
  body:      { paddingHorizontal: 24, paddingTop: 16, gap: 14, flexGrow: 1, paddingBottom: 32 },
  heading:   { fontSize: 28, lineHeight: 34 },
  subtitle:  { color: Brand.beigeMuted, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: Brand.radius,
    padding: 14,
    fontSize: 16,
    backgroundColor: Brand.burgundyLight,
    color: Brand.beige,
  },
  inputRow:  { flexDirection: 'row', gap: 10, marginTop: 4 },
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
  phoneInput: { flex: 1, fontSize: 18, letterSpacing: 1.5 },
  terms:      { marginTop: 8 },
  termsText:  { color: Brand.beigeMuted, fontSize: 12, lineHeight: 18 },
  termsLink:  { color: Brand.beige, textDecorationLine: 'underline' },
  footer:     { paddingTop: 12 },
});
