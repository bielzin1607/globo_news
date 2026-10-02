import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions, Platform } from 'react-native';
import { CategoryChips } from './CategoryChips';
import { colors } from '../theme';
import { flagEmoji } from '../utils/geo';
import { NewsCard } from './NewsCard';
import type { NewsPanelProps } from './NewsSide';

type Props = NewsPanelProps;

export function NewsSheet(p: Props) {
  const { height } = useWindowDimensions();
  const sheetH = Math.round(height * 0.58);
  const y = useRef(new Animated.Value(sheetH)).current;

  useEffect(() => {
    Animated.spring(y, { toValue: p.visible ? 0 : sheetH, useNativeDriver: Platform.OS !== 'web', bounciness: 3, speed: 14 }).start();
  }, [p.visible, sheetH, y]);

  const noCode = p.country && !p.country.code;

  return (
    <Animated.View pointerEvents={p.visible ? 'auto' : 'none'} style={[s.sheet, { height: sheetH, transform: [{ translateY: y }] }]}>
      <View style={s.handle} />
      <View style={s.header}>
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

      {noCode ? (
        <Center text="Não há fonte de notícias para este território." />
      ) : p.loading ? (
        <View style={s.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : p.error ? (
        <View style={s.center}>
          <Text style={s.msg}>{p.error.message}</Text>
          {p.error.kind !== 'no-key' && p.error.kind !== 'auth' && (
            <Pressable onPress={p.onRetry} style={s.retry}><Text style={{ color: '#fff', fontWeight: '700' }}>Tentar de novo</Text></Pressable>
          )}
        </View>
      ) : p.articles.length === 0 ? (
        <Center text="Nenhuma notícia encontrada para esse filtro." />
      ) : (
        <FlatList
          data={p.articles}
          keyExtractor={(a) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
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

const Center = ({ text }: { text: string }) => (
  <View style={s.center}><Text style={s.msg}>{text}</Text></View>
);

const s = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  flag: { fontSize: 30 },
  country: { color: colors.text, fontSize: 20, fontWeight: '800' },
  sub: { color: colors.textDim, fontSize: 12 },
  switchWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  switchLabel: { color: colors.textDim, fontSize: 12 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  msg: { color: colors.textDim, textAlign: 'center', fontSize: 15 },
  retry: { backgroundColor: colors.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
});
