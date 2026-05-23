import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      <WebView
        source={source}
        style={styles.webview}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
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
