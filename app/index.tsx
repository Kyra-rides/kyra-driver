/**
 * Entry router for the driver app. Reads the live Supabase session and
 * routes accordingly:
 *   - no session     → /sign-up
 *   - session, KYC pending → /welcome (onboarding info screen)
 *   - session, KYC approved → /online
 *
 * KYC approval is set by ops in the admin panel after reviewing uploaded docs.
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { supabase } from '@/services/supabase';
import { ThemedView } from '@/components/themed-view';
import { Brand } from '@/constants/theme';
import type { DriverStatus } from '@/types/database';

type Route =
  | { kind: 'loading' }
  | { kind: 'no_session' }
  | { kind: 'pending' }
  | { kind: 'approved' };

export default function Index() {
  const [route, setRoute] = useState<Route>({ kind: 'loading' });

  useEffect(() => {
    let mounted = true;

    const resolve = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        if (mounted) setRoute({ kind: 'no_session' });
        return;
      }
      const { data: driver } = await supabase
        .from('drivers')
        .select('status')
        .eq('profile_id', sessionData.session.user.id)
        .maybeSingle();
      const status: DriverStatus = (driver?.status as DriverStatus) ?? 'pending';
      if (!mounted) return;
      setRoute({ kind: status === 'approved' ? 'approved' : 'pending' });
    };

    void resolve();

    const sub = supabase.auth.onAuthStateChange(() => void resolve());
    return () => {
      mounted = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  if (route.kind === 'loading') {
    return <ThemedView style={{ flex: 1, backgroundColor: Brand.burgundy }} />;
  }
  if (route.kind === 'no_session') return <Redirect href="/sign-up" />;
  if (route.kind === 'pending')    return <Redirect href="/document-centre" />;
  return <Redirect href="/online" />;
}
