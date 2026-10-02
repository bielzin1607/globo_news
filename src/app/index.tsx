import { router } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, GlobeHandle, Selection } from '../components/globe/Globe';
import { NewsSheet } from '../components/NewsSheet';
import { NewsSide, NewsPanelProps } from '../components/NewsSide';
import { useNews } from '../hooks/useNews';
import type { Article } from '../services/news';
import { useSettings } from '../state/settings';
import { colors } from '../theme';
import { findCountry } from '../utils/geo';

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900; // telas largas: notícias nas laterais do globo
  const globe = useRef<GlobeHandle>(null);
  const settings = useSettings();
  const [selection, setSelection] = useState<Selection>(null);
  const [country, setCountry] = useState<{ code: string | null; name: string } | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const news = useNews(country?.code ?? null, categoryId);

  const showHint = useCallback((msg: string) => {
    setHint(msg);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 2200);
  }, []);

  const onPick = useCallback(
    (lat: number, lon: number) => {
      const c = findCountry(lat, lon);
      if (!c) { showHint('Selecione um país ou território'); return; }
      setSelection({ lat, lon, code: c.code ? c.code : null });
      setCountry({ code: c.code, name: c.name });
      globe.current?.focus(lat, lon);
    },
    [showHint]
  );

  const close = () => { setCountry(null); setSelection(null); };
  const openArticle = (a: Article) => router.push({ pathname: '/article', params: { id: a.id } });

  const panel: NewsPanelProps = {
    visible: !!country,
    country,
    categoryId,
    onCategory: setCategoryId,
    articles: news.articles,
    loading: news.loading,
    loadingMore: news.loadingMore,
    error: news.error,
    onRetry: news.refresh,
    onLoadMore: news.loadMore,
    onClose: close,
    onOpenArticle: openArticle,
    translate: settings.translateList,
    onToggleTranslate: (v) => settings.update({ translateList: v }),
    targetLang: settings.targetLang,
    sourceName: news.source?.name,
  };

  return (
    <View style={s.root}>
      <Globe ref={globe} selection={selection} sheetOpen={!!country} sideLayout={wide} onPick={onPick} />

      <View pointerEvents="box-none" style={[s.top, { paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={s.brand}>Globo News</Text>
          <Text style={s.tag}>Toque em um país para ver as notícias</Text>
        </View>
        <Pressable onPress={() => router.push('/settings')} style={s.gear} hitSlop={8}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </Pressable>
      </View>

      {hint && (
        <View pointerEvents="none" style={s.hint}><Text style={{ color: colors.text }}>{hint}</Text></View>
      )}

      {wide ? <NewsSide {...panel} /> : <NewsSheet {...panel} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: 0.3 },
  tag: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  gear: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(22,30,51,0.85)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  hint: { position: 'absolute', top: 120, alignSelf: 'center', backgroundColor: 'rgba(22,30,51,0.95)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
});
