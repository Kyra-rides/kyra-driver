import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import type { LatLng } from '@/constants/mock-ride';
import { GOOGLE_MAPS_KEY } from '@/services/maps';
import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';

export function RouteMap({
  origin,
  destination,
  height,
}: {
  origin: LatLng;
  destination: LatLng;
  height: number;
}) {
  const [authError, setAuthError] = useState<string | null>(null);
  const html = useMemo(() => buildMapHtml(origin, destination), [origin, destination]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://localhost' }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'gmaps-auth-failure') setAuthError(msg.detail || 'auth failure');
            if (msg.type === 'gmaps-error') setAuthError(msg.detail);
          } catch {}
        }}
      />
      {authError ? (
        <View style={styles.errorOverlay}>
          <ThemedText style={styles.errorText}>Map auth blocked: {authError}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function buildMapHtml(origin: LatLng, destination: LatLng) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no, width=device-width" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #21080C; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      function gm_authFailure() {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'gmaps-auth-failure',
            detail: 'API key blocked by referrer/package restriction. Origin: ' + location.origin
          }));
        } catch (e) {}
      }
      window.addEventListener('error', function (e) {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'gmaps-error',
            detail: String(e.message)
          }));
        } catch (err) {}
      });
      function initMap() {
        var origin = { lat: ${origin.lat}, lng: ${origin.lng} };
        var destination = { lat: ${destination.lat}, lng: ${destination.lng} };
        var map = new google.maps.Map(document.getElementById('map'), {
          center: origin,
          zoom: 13,
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          backgroundColor: '#21080C'
        });
        new google.maps.Marker({
          position: origin,
          map: map,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#5BD2A2', fillOpacity: 1, strokeColor: '#0d2a1f', strokeWeight: 2 }
        });
        new google.maps.Marker({
          position: destination,
          map: map,
          icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#CFA45D', fillOpacity: 1, strokeColor: '#3a2810', strokeWeight: 2 }
        });
        var directions = new google.maps.DirectionsService();
        var renderer = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true,
          polylineOptions: { strokeColor: '#CFA45D', strokeOpacity: 0.95, strokeWeight: 5 }
        });
        directions.route(
          { origin: origin, destination: destination, travelMode: 'DRIVING', region: 'IN' },
          function (result, status) {
            if (status === 'OK' && result) {
              renderer.setDirections(result);
            } else {
              var bounds = new google.maps.LatLngBounds();
              bounds.extend(origin);
              bounds.extend(destination);
              map.fitBounds(bounds, 60);
            }
          }
        );
      }
    </script>
    <script async src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=initMap"></script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    backgroundColor: Brand.burgundyDark,
    overflow: 'hidden',
  },
  map: { flex: 1, backgroundColor: Brand.burgundyDark },
  errorOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(33,8,12,0.92)',
    borderWidth: 1,
    borderColor: '#E07A6A',
  },
  errorText: { color: '#E07A6A', fontSize: 12, lineHeight: 17 },
});
