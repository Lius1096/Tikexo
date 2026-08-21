import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../tokens';

interface WordmarkProps {
  size?: number;
  tone?: 'clair' | 'sombre';
  style?: TextStyle;
}

// Wordmark TIKEXO partagé (Login, Onboarding, splash) : "TIKE" neutre, "XO" en accent — le "XO" signe le paiement.
export function Wordmark({ size = 24, tone = 'clair', style }: WordmarkProps) {
  const neutre = tone === 'clair' ? colors.white : colors.dark;
  return (
    <Text style={[styles.base, { fontSize: size }, style]}>
      <Text style={{ color: neutre }}>TIKE</Text>
      <Text style={{ color: colors.accent }}>XO</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { fontWeight: '800', letterSpacing: 1 },
});
