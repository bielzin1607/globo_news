import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InAppBrowser } from '../components/InAppBrowser';
import { useSpeech } from '../hooks/useSpeech';
import { translatedPageUrl, translateText, ttsLocale } from '../services/translate';
import { getArticle } from '../state/articleStore';
import { useSettings } from '../state/settings';
import { colors } from '../theme';
import { timeAgo } from '../utils/format';

type Mode = 'site' | 'text';

export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = id ? getArticle(String(id)) : undefined;
  const insets = useSafeAreaInsets();
  const { targetLang } = useSettings();
  const { speaking, speak, stop } = useSpeech();

  // Na web muitos sites bloqueiam iframe, então abre direto no modo texto.
  const [mode, setMode] = useState<Mode>(Platform.OS === 'web' ? 'text' : 'site');
  const [translated, setTranslated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState<{ title: string; body: string } | null>(null);

  const { width } = useWindowDimensions();
  const wide = width >= 900;

  // O plano gratuito da APITube corta o corpo e acrescenta um aviso ao final; remove o aviso e guarda a informação.
  const original = useMemo(() => {
    const raw = article?.body || article?.description || '';
    const cut = /\.{0,3}\s*\(\+\d+ chars hidden\)\.{0,3}\s*\[Upgrade subscription plan\]/i;
    return { title: article?.title ?? '', body: raw.replace(cut, '…').trim(), truncated: cut.test(raw) };
  }, [article]);

  useEffect(() => {
    let alive = true;
    setText(null);
    if (!translated || !article) return;
    setBusy(true);
    Promise.all([
      translateText(original.title, targetLang, article.language || 'auto'),
      translateText(original.body, targetLang, article.language || 'auto'),
    ])
      .then(([title, body]) => alive && setText({ title, body }))
      .catch(() => alive && setTranslated(false))
      .finally(() => alive && setBusy(false));
    return () => { alive = false; };
  }, [translated, targetLang, article, original]);

  if (!article) {
    return (
      <View style={[s.root, s.center]}>
        <Text style={{ color: colors.textDim, marginBottom: 16 }}>Notícia indisponível.</Text>
        <Pressable onPress={() => router.replace('/')} style={s.pill}><Text style={s.pillText}>Voltar ao globo</Text></Pressable>
      </View>
    );
  }

  const shown = text ?? original;
  const paragraphs = shown.body.split(/\n+/).map((t) => t.trim()).filter(Boolean);
  const speechLang = translated ? ttsLocale(targetLang) : ttsLocale(article.language);
  const siteUrl = translated ? translatedPageUrl(article.url, targetLang) : article.url;

  const toggleListen = () => {
    if (speaking) return stop();
    // Em modo site também lê o texto da API (o conteúdo da página em si não é acessível ao app).
    speak(`${shown.title}. ${shown.body}`, speechLang);
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.iconBtn}><Text style={s.icon}>←</Text></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.barTitle} numberOfLines={1}>{article.sourceName ?? article.sourceDomain}</Text>
          <Text style={s.barSub} numberOfLines={1}>{article.sourceDomain}</Text>
        </View>
        <Pressable onPress={() => Linking.openURL(article.url)} hitSlop={10} style={s.iconBtn}><Text style={s.icon}>↗</Text></Pressable>
      </View>

      <View style={s.tools}>
        <Seg label="Site" active={mode === 'site'} onPress={() => setMode('site')} />
        <Seg label="Texto" active={mode === 'text'} onPress={() => setMode('text')} />
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => setTranslated((v) => !v)} style={[s.tool, translated && s.toolOn]}>
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.toolText}>🌐 {translated ? 'Original' : 'Traduzir'}</Text>}
        </Pressable>
        <Pressable onPress={toggleListen} style={[s.tool, speaking && s.toolOn]}>
          <Text style={s.toolText}>{speaking ? '⏹ Parar' : '🔊 Ouvir'}</Text>
        </Pressable>
      </View>

      {mode === 'site' ? (
        <View style={{ flex: 1 }}>
          {Platform.OS === 'web' && (
            <Text style={s.note}>Se a página não carregar, o site bloqueia incorporação: use “Texto” ou ↗.</Text>
          )}
          <InAppBrowser url={siteUrl} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 48, paddingTop: wide ? 12 : 0 }}>
          <View style={s.page}>
            {!!article.image && (
              <Image source={{ uri: article.image }} style={[s.hero, wide && s.heroWide]} resizeMode="cover" />
            )}
            <View style={{ paddingHorizontal: wide ? 4 : 18, paddingTop: 18, gap: 14 }}>
              <Text style={s.meta}>{[article.sourceName ?? article.sourceDomain, timeAgo(article.publishedAt)].filter(Boolean).join(' · ')}</Text>
              <Text style={[s.h1, wide && { fontSize: 32, lineHeight: 40 }]}>{shown.title}</Text>
              {paragraphs.map((t, i) => (
                <Text key={i} style={s.p}>{t}</Text>
              ))}
              {paragraphs.length === 0 && (
                <View style={s.notice}>
                  <Text style={s.noticeText}>Esta fonte não fornece resumo nem texto. Use “Ler no site original” ou o botão ↗.</Text>
                </View>
              )}
              {original.truncated && (
                <View style={s.notice}>
                  <Text style={s.noticeText}>
                    Prévia: a APITube entrega apenas o começo do texto neste plano. Leia a matéria completa no site da fonte.
                  </Text>
                </View>
              )}
              <Pressable onPress={() => setMode('site')} style={[s.pill, { alignSelf: 'flex-start' }]}>
                <Text style={s.pillText}>Ler no site original</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Seg({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.seg, active && s.segOn]}>
      <Text style={[s.segText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  bar: { width: '100%', maxWidth: 1000, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  icon: { color: colors.text, fontSize: 18 },
  barTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  barSub: { color: colors.textDim, fontSize: 12 },
  tools: { width: '100%', maxWidth: 1000, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  seg: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  segText: { color: colors.textDim, fontWeight: '700', fontSize: 13 },
  tool: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surfaceAlt, minWidth: 84, alignItems: 'center' },
  toolOn: { backgroundColor: colors.accent },
  toolText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  note: { color: colors.textDim, fontSize: 12, padding: 8, textAlign: 'center', backgroundColor: colors.surface },
  page: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { width: '100%', aspectRatio: 16 / 9 },
  heroWide: { borderRadius: 18, maxHeight: 380, aspectRatio: 2 },
  notice: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderWidth: 1, borderRadius: 12, padding: 12 },
  noticeText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  meta: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  h1: { color: colors.text, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  p: { color: '#d6dcee', fontSize: 17, lineHeight: 28 },
  pill: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 14 },
  pillText: { color: '#fff', fontWeight: '700' },
});
