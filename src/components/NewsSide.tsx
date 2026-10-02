import React, { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Platform, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import type { Article, NewsError } from '../services/news';
import { colors } from '../theme';
import { flagEmoji } from '../utils/geo';
import { CategoryChips } from './CategoryChips';
import { NewsCard } from './NewsCard';

export type NewsPanelProps = {
  visible: boolean;
  country: { code: string | null; name: string } | null;
  categoryId: string | null;
  onCategory: (id: string | null) => void;
  articles: Article[];
  loading: boolean;
  loadingMore: boolean;
  error: NewsError | null;
  onRetry: () => void;
  onLoadMore: () => void;
  onClose: () => void;
  onOpenArticle: (a: Article) => void;
  translate: boolean;
  onToggleTranslate: (v: boolean) => void;
  targetLang: string;
  /** nome da fonte de dados que respondeu (ex.: APITube, GNews) */
  sourceName?: string;
};

const COL_W = 340;
const TOP = 96; // espaço do título do app
const glass: any = Platform.OS === 'web' ? { backdropFilter: 'blur(14px)' } : null;

function Skeleton() {
  const o = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 0.8, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(o, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View style={[s.skel, { opacity: o }]}>
      <View style={s.skelImg} />
      <View style={[s.skelLine, { width: '90%' }]} />
      <View style={[s.skelLine, { width: '65%' }]} />
    </Animated.View>
  );
}

type ColProps = {
  side: 'left' | 'right';
  items: Article[];
  visible: boolean;
  skeleton: boolean;
  p: NewsPanelProps;
  bottom: number;
};

function Column({ side, items, visible, skeleton, p, bottom }: ColProps) {
  const x = useRef(new Animated.Value(side === 'left' ? -COL_W - 40 : COL_W + 40)).current;
  const op = useRef(new Animated.Value(0)).current;
  const off = side === 'left' ? -COL_W - 40 : COL_W + 40;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(x, { toValue: visible ? 0 : off, useNativeDriver: Platform.OS !== 'web', bounciness: 2, speed: 11 }),
      Animated.timing(op, { toValue: visible ? 1 : 0, duration: 260, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }, [visible, off, x, op]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[s.col, side === 'left' ? { left: 16 } : { right: 16 }, { bottom, opacity: op, transform: [{ translateX: x }] }]}
    >
      {skeleton ? (
        <View>{[0, 1, 2].map((i) => <Skeleton key={i} />)}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(a) => a.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          onEndReachedThreshold={0.6}
          onEndReached={p.onLoadMore}
          ListFooterComponent={p.loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} /> : null}
          renderItem={({ item }) => (
            <NewsCard article={item} translate={p.translate} targetLang={p.targetLang} onPress={() => p.onOpenArticle(item)} />
          )}
        />
      )}
    </Animated.View>
  );
}

/** Layout para telas largas: país + filtros numa barra no topo; notícias em colunas à esquerda e à direita do globo. */
export function NewsSide(p: NewsPanelProps) {
  const { width } = useWindowDimensions();
  const barW = Math.min(760, Math.max(360, width - 2 * (COL_W + 32) + 80));
  const y = useRef(new Animated.Value(-140)).current;

  useEffect(() => {
    Animated.spring(y, { toValue: p.visible ? 0 : -140, useNativeDriver: Platform.OS !== 'web', bounciness: 2, speed: 12 }).start();
  }, [p.visible, y]);

  // alterna as notícias entre as colunas para a leitura ir descendo dos dois lados
  const [left, right] = useMemo(() => {
    const l: Article[] = [], r: Article[] = [];
    p.articles.forEach((a, i) => (i % 2 === 0 ? l : r).push(a));
    return [l, r];
  }, [p.articles]);

  const noCode = !!p.country && !p.country.code;
  const message = noCode
    ? 'Não há fonte de notícias para este território.'
    : p.error
      ? p.error.message
      : !p.loading && p.articles.length === 0
        ? 'Nenhuma notícia encontrada para esse filtro.'
        : null;
  const showCols = p.visible && !message;

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { overflow: "hidden" }]}>
      <Animated.View pointerEvents={p.visible ? 'auto' : 'none'} style={[s.bar, glass, { width: barW, transform: [{ translateY: y }] }]}>
        <View style={s.barRow}>
          <Text style={s.flag}>{flagEmoji(p.country?.code)}</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.country} numberOfLines={1}>{p.country?.name}</Text>
            <Text style={s.sub}>Últimas notícias{p.sourceName ? ` · via ${p.sourceName}` : ''}</Text>
          </View>
          <View style={s.switchWrap}>
            <Text style={s.switchLabel}>Traduzir</Text>
            <Switch value={p.translate} onValueChange={p.onToggleTranslate} trackColor={{ true: colors.accent, false: colors.border }} />
          </View>
          <Pressable onPress={p.onClose} hitSlop={10} style={s.close}>
            <Text style={{ color: colors.text, fontSize: 18 }}>✕</Text>
          </Pressable>
        </View>
        <CategoryChips categoryId={p.categoryId} onCategory={p.onCategory} />
      </Animated.View>

      <Column side="left" items={left} visible={showCols} skeleton={p.loading} p={p} bottom={16} />
      <Column side="right" items={right} visible={showCols} skeleton={p.loading} p={p} bottom={16} />

      {p.visible && !!message && (
        <View style={s.msgBox}>
          <Text style={s.msg}>{message}</Text>
          {!noCode && p.error && p.error.kind !== 'no-key' && p.error.kind !== 'auth' && (
            <Pressable onPress={p.onRetry} style={s.retry}><Text style={{ color: '#fff', fontWeight: '700' }}>Tentar de novo</Text></Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    position: 'absolute', top: 12, alignSelf: 'center',
    backgroundColor: 'rgba(8,12,24,0.78)', borderRadius: 22, borderWidth: 1, borderColor: colors.border, paddingTop: 12, paddingBottom: 4,
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 },
  flag: { fontSize: 30 },
  country: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 12 },
  switchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchLabel: { color: colors.textDim, fontSize: 12 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  col: { position: 'absolute', top: TOP + 70, width: COL_W },
  skel: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10, marginBottom: 14 },
  skelImg: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: colors.surfaceAlt },
  skelLine: { height: 12, borderRadius: 6, backgroundColor: colors.surfaceAlt },
  msgBox: { position: 'absolute', bottom: 40, alignSelf: 'center', alignItems: 'center', gap: 12, backgroundColor: 'rgba(8,12,24,0.85)', paddingHorizontal: 22, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  msg: { color: colors.textDim, fontSize: 15, textAlign: 'center' },
  retry: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
});
