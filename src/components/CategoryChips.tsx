import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { CATEGORIES } from '../services/categories';
import { colors } from '../theme';

type Props = { categoryId: string | null; onCategory: (id: string | null) => void };

export function CategoryChips({ categoryId, onCategory }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {CATEGORIES.map((c) => {
        const active = c.id === categoryId;
        return (
          <Pressable key={c.label} onPress={() => onCategory(c.id)} style={[s.chip, active && s.chipActive]}>
            <Text style={[s.chipText, active && { color: '#fff' }]}>{c.emoji} {c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
});
