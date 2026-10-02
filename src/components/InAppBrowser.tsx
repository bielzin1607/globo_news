import React, { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

/** "Navegador interno" nativo (WebView). */
export function InAppBrowser({ url }: { url: string }) {
  const [loading, setLoading] = useState(true);
  const ref = useRef<WebView>(null);
  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={ref}
        key={url}
        source={{ uri: url }}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        allowsBackForwardNavigationGestures
        startInLoadingState={false}
        setSupportMultipleWindows={false}
        style={{ flex: 1, backgroundColor: '#fff' }}
      />
      {loading && (
        <View pointerEvents="none" style={s.loader}><ActivityIndicator color={colors.accent} size="large" /></View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  loader: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
