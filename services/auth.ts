/**
 * Auth wrappers for the driver app. Calls the Supabase Edge Functions
 * `otp-send` and `otp-verify`. Identical surface to kyra-rider/services/auth.ts
 * but every call hard-codes role: 'driver' so a rider can never get
 * provisioned as a driver via this client.
 */

import { supabase } from './supabase';

const FUNCTIONS_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON_KEY      = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface SendOtpResult {
  ttlSeconds: number;
  provider: 'stub' | 'msg91';
  /** Only populated when SMS_PROVIDER=stub on the backend. Surfaces the OTP for dev. */
  devOtp?: string;
}

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  const res = await fetch(`${FUNCTIONS_URL}/otp-send`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: ANON_KEY,
      authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({ phone, role: 'driver' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `OTP send failed (${res.status})`);
  return {
    ttlSeconds: body.ttl_seconds,
    provider:   body.provider,
    devOtp:     body.dev_otp,
  };
}

export interface VerifyOtpInput {
  phone: string;
  otp: string;
  firstName: string;
  lastName: string;
  languagePref?: 'en' | 'hi' | 'kn';
}

export async function verifyOtp(input: VerifyOtpInput): Promise<void> {
  const res = await fetch(`${FUNCTIONS_URL}/otp-verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: ANON_KEY,
      authorization: `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify({
      phone:         input.phone,
      otp:           input.otp,
      role:          'driver',
      first_name:    input.firstName,
      last_name:     input.lastName,
      language_pref: input.languagePref ?? 'en',
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(body?.error ?? `OTP verification failed (${res.status})`);
  }

  const { error } = await supabase.auth.setSession({
    access_token:  body.access_token,
    refresh_token: body.refresh_token,
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
