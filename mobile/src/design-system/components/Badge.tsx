import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../tokens';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral';

const TONE_BG: Record<Tone, string> = {
  success: '#dcfce7', warning: '#fef9c3', danger: '#fee2e2', neutral: colors.lightGray,
};
const TONE_TEXT: Record<Tone, string> = {
  success: colors.success, warning: '#854d0e', danger: colors.danger, neutral: colors.dark,
};

// Mappe les statuts backend (transactions, reversements, documents KYC) vers
// une tonalité visuelle cohérente sans dupliquer la logique dans chaque écran.
export function statutTone(statut: string): Tone {
  if (['VALIDEE', 'APPROUVE', 'VALIDE'].includes(statut)) return 'success';
  if (['EN_ATTENTE', 'PENDING'].includes(statut)) return 'warning';
  if (['REJETE', 'REJETEE', 'ECHOUEE', 'ANNULEE'].includes(statut)) return 'danger';
  return 'neutral';
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: TONE_BG[tone] }]}>
      <Text style={[styles.text, { color: TONE_TEXT[tone] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, alignSelf: 'flex-start' },
  text: { fontSize: fontSize.xs, fontWeight: '600' },
});
