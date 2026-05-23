let AppComponent;
let isReactNative = false;
try {
  const { Platform } = require('react-native');
  isReactNative = Platform && (Platform.OS === 'android' || Platform.OS === 'ios');
} catch (e) {
  isReactNative = false;
}

if (isReactNative) {
  AppComponent = require('./mobile/NativeApp').default;
} else {
  AppComponent = require('./frontend/src/App.jsx').default;
}

export default AppComponent;