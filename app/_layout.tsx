import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Brand } from '@/constants/theme';

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
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
