import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { Brand } from '@/constants/theme';
import '@/services/i18n';
import { getStoredLanguage } from '@/services/i18n';
// Register background location task at module load time (before any navigation).
import '@/services/background-location';

// Show ride-alert notifications even when the app is open in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const KyraNavTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Brand.burgundy,
    card: Brand.burgundy,
    text: Brand.beige,
    border: Brand.burgundyLight,
    primary: Brand.beige,
  },
};

export default function RootLayout() {
  const [langChecked, setLangChecked] = useState(false);
  const segments = useSegments();

  // First-launch language gate. If the device has no stored language, send
  // the user to /language before /sign-up so the entire onboarding flow is
  // already in their chosen tongue.
  useEffect(() => {
    if (langChecked) return;
    void (async () => {
      const stored = await getStoredLanguage();
      if (!stored && segments[0] !== 'language') {
        router.replace('/language');
      }
      setLangChecked(true);
    })();
  }, [langChecked, segments]);

  return (
    <ThemeProvider value={KyraNavTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Brand.burgundy },
          animation: 'slide_from_right',
          animationDuration: 220,
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="language" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="otp" />
        <Stack.Screen name="register" />
        <Stack.Screen name="vehicle" />
        <Stack.Screen name="city" />
        <Stack.Screen name="driving-license" />
        <Stack.Screen name="document-centre" />
        <Stack.Screen name="online" />
        <Stack.Screen name="navigate-to-pickup" />
        <Stack.Screen name="enter-otp" />
        <Stack.Screen name="in-ride" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="permissions" />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
