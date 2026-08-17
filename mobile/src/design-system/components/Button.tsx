import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, GestureResponderEvent, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '../tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'gold';

interface ButtonProps {
  title: string;
  onPress: (e: GestureResponderEvent) => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const VARIANT_BG: Record<Variant, string> = {
  primary: colors.primary,
  secondary: 'transparent',
  danger: colors.danger,
  gold: colors.gold,
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isSecondary = variant === 'secondary';
  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: VARIANT_BG[variant] },
        isSecondary && styles.secondaryBorder,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isSecondary ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.text, isSecondary && styles.secondaryText]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

export function LinkButton({ title, onPress, style }: { title: string; onPress: (e: GestureResponderEvent) => void; style?: ViewStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={style}>
      <Text style={styles.link}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBorder: { borderWidth: 1, borderColor: colors.primary },
  disabled: { opacity: 0.5 },
  text: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
  secondaryText: { color: colors.primary },
  link: { color: colors.accent, fontSize: fontSize.xs },
});
