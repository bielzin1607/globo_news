import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LANGUAGES } from '../services/translate';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

export default function Settings() {
  const insets = useSafeAreaInsets();
  const st = useSettings();
  return (
    <View style={[s.root, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={s.head}>
        <Text style={s.title}>Configurações</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}><Text style={s.done}>Concluir</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 10 }}>
        <Text style={s.section}>Tradução</Text>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>Traduzir lista de notícias</Text>
            <Text style={s.help}>Traduz títulos e resumos automaticamente.</Text>
          </View>
          <Switch value={st.translateList} onValueChange={(v) => st.update({ translateList: v })} trackColor={{ true: colors.accent, false: colors.border }} />
        </View>
        <Text style={s.section}>Idioma de destino</Text>
        {LANGUAGES.map((l) => (
          <Pressable key={l.code} onPress={() => st.update({ targetLang: l.code })} style={[s.row, st.targetLang === l.code && { borderColor: colors.accent }]}>
            <Text style={s.label}>{l.label}</Text>
            {st.targetLang === l.code && <Text style={{ color: colors.accent, fontSize: 18 }}>✓</Text>}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 8 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  done: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  section: { color: colors.textDim, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  help: { color: colors.textDim, fontSize: 12, marginTop: 2 },
});
