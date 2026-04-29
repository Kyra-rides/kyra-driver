/**
 * In-memory demo flag — lets the app launch into /sign-up on every fresh
 * launch (Expo Go reload resets the flag), and skip the redirect once the
 * driver has actually completed onboarding in this session.
 *
 * For real auth: replace this with an AsyncStorage check on a session token.
 */

let onboardingComplete = false;

export function markOnboarded() {
  onboardingComplete = true;
}

export function isOnboarded() {
  return onboardingComplete;
}
