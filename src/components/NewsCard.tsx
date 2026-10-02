import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Article } from '../services/news';
import { useTranslated } from '../hooks/useTranslated';
import { colors } from '../theme';
import { timeAgo } from '../utils/format';

type Props = { article: Article; translate: boolean; targetLang: string; onPress: () => void };

export const NewsCard = React.memo(function NewsCard({ article, translate, targetLang, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const title = useTranslated(article.title, targetLang, article.language, translate, article.translations?.[targetLang]?.title);
  const desc = useTranslated(article.description, targetLang, article.language, translate, article.translations?.[targetLang]?.description);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }]}>
      {article.image ? (
        imgFailed ? (
          <View style={[s.image, s.placeholder]}><Text style={{ fontSize: 28, opacity: 0.5 }}>📰</Text></View>
        ) : (
          <Image source={{ uri: article.image }} style={s.image} resizeMode="cover" onError={() => setImgFailed(true)} />
        )
      ) : null /* fontes sem imagem (ex.: Google News): cartão compacto */}
      <View style={s.body}>
        <Text style={s.meta} numberOfLines={1}>
          {[article.sourceName ?? article.sourceDomain, timeAgo(article.publishedAt)].filter(Boolean).join(' · ')}
        </Text>
        <Text style={s.title} numberOfLines={3}>{title}</Text>
        {!!desc && <Text style={s.desc} numberOfLines={3}>{desc}</Text>}
      </View>
    </Pressable>
  );
});

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: colors.border },
  image: { width: '100%', aspectRatio: 16 / 9 },
  placeholder: { backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 14, gap: 6 },
  meta: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  desc: { color: colors.textDim, fontSize: 14, lineHeight: 20 },
});
