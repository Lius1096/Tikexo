import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '../tokens';

interface CardProps {
  children: ReactNode;
  variant?: 'white' | 'primary' | 'info';
  style?: ViewStyle;
}

export function Card({ children, variant = 'white', style }: CardProps) {
  return (
    <View style={[styles.base, VARIANT_STYLE[variant], style]}>
      {children}
    </View>
  );
}

const VARIANT_STYLE: Record<NonNullable<CardProps['variant']>, ViewStyle> = {
  white: { backgroundColor: colors.white },
  primary: { backgroundColor: colors.primary },
  info: { backgroundColor: colors.lightBlue, shadowOpacity: 0, elevation: 0 },
};

const styles = StyleSheet.create({
  base: { borderRadius: borderRadius.lg, padding: spacing.lg, ...shadows.card },
});
