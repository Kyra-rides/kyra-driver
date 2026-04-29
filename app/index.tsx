import { Redirect } from 'expo-router';

import { isOnboarded } from '@/services/demo-state';

/**
 * Demo entry: every fresh launch lands on /sign-up so the demo flow always
 * starts from onboarding. Once the driver completes onboarding (in this
 * session) we redirect to /online instead. The pre-existing marketing
 * carousel is preserved at /welcome.
 *
 * The in-memory flag in services/demo-state.ts resets on Expo Go reload,
 * so a fresh demo always shows sign-up.
 */
export default function Index() {
  if (isOnboarded()) {
    return <Redirect href="/online" />;
  }
  return <Redirect href="/sign-up" />;
}
