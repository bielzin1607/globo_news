import React from 'react';
import { View } from 'react-native';

/** "Navegador interno" na web (iframe). Muitos sites bloqueiam iframes; a tela de leitura oferece o modo Texto e "abrir no navegador". */
export function InAppBrowser({ url }: { url: string }) {
  return (
    <View style={{ flex: 1 }}>
      {React.createElement('iframe', {
        key: url,
        src: url,
        style: { border: 0, width: '100%', height: '100%', backgroundColor: '#fff' },
        referrerPolicy: 'no-referrer',
      })}
    </View>
  );
}
