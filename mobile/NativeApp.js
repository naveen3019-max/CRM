import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WebView } from 'react-native-webview';

const PERMISSION_STATUS_KEYS = {
  location: 'permission_status_location',
  microphone: 'permission_status_microphone',
  notifications: 'permission_status_notifications'
};

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

      if (data?.type === 'open-settings') {
        Linking.openSettings();
        return;
      }

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
    if (Platform.OS !== 'android') {
      return;
    }

    let isActive = true;
    const notificationPermission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;

    async function readPermissionStatus(key) {
      const value = await AsyncStorage.getItem(key);
      return value || 'unknown';
    }

    async function writePermissionStatus(key, value) {
      await AsyncStorage.setItem(key, value);
    }

    async function hasLocationPermission() {
      const fineGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
      const coarseGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
      return fineGranted || coarseGranted;
    }

    async function hasMicrophonePermission() {
      return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    }

    async function hasNotificationPermission() {
      if (!notificationPermission || Platform.Version < 33) {
        return true;
      }

      return PermissionsAndroid.check(notificationPermission);
    }

    async function requestLocationPermission() {
      if (await hasLocationPermission()) {
        console.log('[LocationPermission] already granted');
        await writePermissionStatus(PERMISSION_STATUS_KEYS.location, 'granted');
        return true;
      }

      console.log('[LocationPermission] requesting Android location permission');
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION
      ]);

      if (!isActive) {
        return false;
      }

      const fine = result[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const coarse = result[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION];
      const granted = fine === PermissionsAndroid.RESULTS.GRANTED || coarse === PermissionsAndroid.RESULTS.GRANTED;
      const denied = fine === PermissionsAndroid.RESULTS.DENIED || coarse === PermissionsAndroid.RESULTS.DENIED;
      const neverAskAgain = fine === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || coarse === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      console.log('[LocationPermission] result', { fine, coarse, granted, denied, neverAskAgain });
      await writePermissionStatus(PERMISSION_STATUS_KEYS.location, granted ? 'granted' : 'denied');
      return granted;
    }

    async function requestMicrophonePermission() {
      if (await hasMicrophonePermission()) {
        console.log('[MicrophonePermission] already granted');
        await writePermissionStatus(PERMISSION_STATUS_KEYS.microphone, 'granted');
        return true;
      }

      console.log('[MicrophonePermission] requesting Android microphone permission');
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

      if (!isActive) {
        return false;
      }

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      const denied = result === PermissionsAndroid.RESULTS.DENIED;
      const neverAskAgain = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      console.log('[MicrophonePermission] result', { result, granted, denied, neverAskAgain });
      await writePermissionStatus(PERMISSION_STATUS_KEYS.microphone, granted ? 'granted' : 'denied');
      return granted;
    }

    async function requestNotificationPermission() {
      if (!notificationPermission || Platform.Version < 33) {
        await writePermissionStatus(PERMISSION_STATUS_KEYS.notifications, 'granted');
        return true;
      }

      if (await hasNotificationPermission()) {
        console.log('[NotificationPermission] already granted');
        await writePermissionStatus(PERMISSION_STATUS_KEYS.notifications, 'granted');
        return true;
      }

      console.log('[NotificationPermission] requesting Android notification permission');
      const result = await PermissionsAndroid.request(notificationPermission);

      if (!isActive) {
        return false;
      }

      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      const denied = result === PermissionsAndroid.RESULTS.DENIED;
      const neverAskAgain = result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      console.log('[NotificationPermission] result', { result, granted, denied, neverAskAgain });
      await writePermissionStatus(PERMISSION_STATUS_KEYS.notifications, granted ? 'granted' : 'denied');
      return granted;
    }

    async function requestAllMissingPermissions() {
      const locationGranted = await requestLocationPermission();
      const microphoneGranted = await requestMicrophonePermission();
      const notificationGranted = await requestNotificationPermission();

      console.log('[PermissionOnboarding] request results', {
        locationGranted,
        microphoneGranted,
        notificationGranted
      });

      return locationGranted && microphoneGranted && notificationGranted;
    }

    async function showSettingsFallback(title, message) {
      Alert.alert(
        title,
        message,
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Allow Permission', onPress: () => requestAllMissingPermissions() }
        ],
        { cancelable: false }
      );
    }

    async function ensurePermissionOnFirstLaunch() {
      try {
        const [locationStatus, microphoneStatus, notificationStatus] = await Promise.all([
          readPermissionStatus(PERMISSION_STATUS_KEYS.location),
          readPermissionStatus(PERMISSION_STATUS_KEYS.microphone),
          readPermissionStatus(PERMISSION_STATUS_KEYS.notifications)
        ]);

        const locationGranted = await hasLocationPermission();
        const microphoneGranted = await hasMicrophonePermission();
        const notificationGranted = await hasNotificationPermission();

        if (locationGranted) {
          await writePermissionStatus(PERMISSION_STATUS_KEYS.location, 'granted');
        }
        if (microphoneGranted) {
          await writePermissionStatus(PERMISSION_STATUS_KEYS.microphone, 'granted');
        }
        if (notificationGranted) {
          await writePermissionStatus(PERMISSION_STATUS_KEYS.notifications, 'granted');
        }

        if (locationGranted && microphoneGranted && notificationGranted) {
          console.log('[PermissionOnboarding] all permissions already granted');
          return;
        }

        if (locationStatus === 'denied' || microphoneStatus === 'denied' || notificationStatus === 'denied') {
          await showSettingsFallback(
            'Permissions required',
            'Verbena Tech needs location for sharing locations, microphone for voice messages, and notifications for chat updates.'
          );
          return;
        }

        Alert.alert(
          'Enable app permissions',
          'Verbena Tech uses location to share locations, microphone to record voice messages, and notifications for chat updates.',
          [
            {
              text: 'Not now',
              style: 'cancel',
              onPress: async () => {
                await writePermissionStatus(PERMISSION_STATUS_KEYS.location, locationGranted ? 'granted' : 'denied');
                await writePermissionStatus(PERMISSION_STATUS_KEYS.microphone, microphoneGranted ? 'granted' : 'denied');
                await writePermissionStatus(PERMISSION_STATUS_KEYS.notifications, notificationGranted ? 'granted' : 'denied');
              }
            },
            {
              text: 'Allow Permission',
              onPress: async () => {
                const granted = await requestAllMissingPermissions();
                if (!granted) {
                  await showSettingsFallback(
                    'Permissions required',
                    'Some permissions are still disabled. You can grant them from Android settings and try again.'
                  );
                }
              }
            }
          ],
          { cancelable: false }
        );
      } catch (error) {
        console.warn('[PermissionOnboarding] failed:', error);
      }
    }

    ensurePermissionOnFirstLaunch();

    return () => {
      isActive = false;
    };
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
