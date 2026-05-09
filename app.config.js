// Dynamic Expo config — pulls the Google Maps API key from .env so app.json
// stays committable. EXPO_PUBLIC_GOOGLE_MAPS_KEY drives both the iOS Maps
// SDK and the Android Maps SDK via the native config blocks below.

module.exports = ({ config }) => {
  const googleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config ?? {}),
        googleMapsApiKey: googleMapsKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        googleMaps: { apiKey: googleMapsKey },
      },
    },
    extra: {
      ...(config.extra ?? {}),
      googleMapsKey,
    },
  };
};
