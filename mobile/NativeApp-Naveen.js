import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

export default function NativeApp() {
  const [loading, setLoading] = useState(true);
  const source = { uri: 'file:///android_asset/web/index.html' };
  const injectedJavaScriptBeforeContentLoaded = useMemo(
    () => `
      (function () {
        function safeStringify(value) {
          try {
            return typeof value === 'string' ? value : JSON.stringify(value);
          } catch (_e) {
            return String(value);
          }
        }

        function post(type, payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: type, payload: payload })
            );
          }
        }

        var originalConsoleError = console.error;
        console.error = function () {
          var args = Array.prototype.slice.call(arguments).map(safeStringify).join(' ');
          post('console.error', args);
          if (originalConsoleError) {
            originalConsoleError.apply(console, arguments);
          }
        };

        var originalConsoleWarn = console.warn;
        console.warn = function () {
          var args = Array.prototype.slice.call(arguments).map(safeStringify).join(' ');
          post('console.warn', args);
          if (originalConsoleWarn) {
            originalConsoleWarn.apply(console, arguments);
          }
        };

        window.addEventListener('error', function (event) {
          post('window.error', {
            message: event && event.message,
            source: event && event.filename,
            line: event && event.lineno,
            column: event && event.colno
          });
        });

        window.addEventListener('unhandledrejection', function (event) {
          post('unhandledrejection', safeStringify(event && event.reason));
        });

        post('webview.init', 'WebView debug bridge ready');
      })();
      true;
    `,
    []
  );

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log(`[WebView:${data.type}]`, data.payload);
    } catch (_e) {
      console.log('[WebView:message]', event.nativeEvent.data);
    }
  };

  const handleError = (event) => {
    console.error('[WebView:onError]', event.nativeEvent);
  };

  const handleHttpError = (event) => {
    console.error('[WebView:onHttpError]', event.nativeEvent);
  };

  useEffect(() => {
    // First-launch permission flow for Android
    async function ensureLocationPermissionFirstLaunch() {
      if (Platform.OS !== 'android') return;

      const MESSAGE = `Verbena Tech uses your location to:\n\n- Share locations in chat\n- Attach service locations to requests\n- Help workers navigate to assignments\n- Improve assignment accuracy`;

      try {
        const stored = await AsyncStorage.getItem('location_permission_status');

        // If already granted, nothing to do
        if (stored === 'granted') return;

        // If previously denied, offer Settings or re-request
        if (stored === 'denied') {
          const fineCheck = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
          if (fineCheck) {
            await AsyncStorage.setItem('location_permission_status', 'granted');
            return;
          }

          Alert.alert(
            'Location permission required',
            'Location access is required for location sharing and service requests.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Allow Permission', onPress: () => requestPermissions() }
            ],
            { cancelable: false }
          );

          return;
        }

        // First install: show explanation then request
        Alert.alert(
          'Enable location services',
          MESSAGE,
          [
            { text: 'Not now', onPress: async () => { await AsyncStorage.setItem('location_permission_status', 'denied'); } },
            { text: 'Allow', onPress: () => requestPermissions() }
          ],
          { cancelable: false }
        );
      } catch (err) {
        console.warn('Permission flow error:', err);
      }
    }

    async function requestPermissions() {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
        ]);

        const fine = granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
        const coarse = granted[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];

        if (fine === PermissionsAndroid.RESULTS.GRANTED || coarse === PermissionsAndroid.RESULTS.GRANTED) {
          await AsyncStorage.setItem('location_permission_status', 'granted');
        } else if (fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          await AsyncStorage.setItem('location_permission_status', 'denied');
          Alert.alert(
            'Location permission required',
            'Location access is required for location sharing and service requests.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Cancel', style: 'cancel' }
            ],
            { cancelable: false }
          );
        } else {
          await AsyncStorage.setItem('location_permission_status', 'denied');
        }
      } catch (err) {
        console.warn('Failed to request location permissions:', err);
      }
    }

    ensureLocationPermissionFirstLaunch();
  }, []);

  return (
    <View style={styles.container}>
      <WebView
        source={source}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        geolocationEnabled
        startInLoadingState
        mixedContentMode="always"
        allowsInlineMediaPlayback
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onLoadStart={() => {
          setLoading(true);
          console.log('[WebView:onLoadStart]', source.uri);
        }}
        onLoadEnd={() => {
          setLoading(false);
          console.log('[WebView:onLoadEnd]', source.uri);
        }}
        onError={handleError}
        onHttpError={handleHttpError}
        onMessage={handleMessage}
      />
      {loading ? (
        <View style={styles.statusOverlay} pointerEvents="none">
          <Text style={styles.statusTitle}>Loading app...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  webview: { flex: 1, backgroundColor: '#111827' },
  statusOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.02)'
  },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#cbd5e1' },
});
