/**
 * Kyra brand tokens — sourced from kyrarides.in to keep the rider app a
 * visual continuation of the marketing site.
 */

import { Platform } from 'react-native';

export const Brand = {
  burgundyDark: '#21080C',
  burgundy: '#2F0E13',
  burgundyLight: '#45171E',
  beige: '#E8DAC9',
  beigeMuted: '#C5A886',
  gold: '#CEB37E',
  border: '#846847',
  radius: 8,
};

const palette = {
  text: Brand.beige,
  background: Brand.burgundy,
  tint: Brand.beige,
  icon: Brand.beigeMuted,
  tabIconDefault: Brand.beigeMuted,
  tabIconSelected: Brand.beige,
};

export const Colors = {
  light: palette,
  dark: palette,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "'Libre Baskerville', Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
