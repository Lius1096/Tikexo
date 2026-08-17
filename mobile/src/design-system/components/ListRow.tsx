import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '../tokens';

interface ListRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  title: string;
  subtitle?: string;
  rightPrimary?: string;
  rightPrimaryColor?: string;
  rightSecondary?: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export function ListRow({
  icon, iconColor = colors.primary, iconBg = colors.lightBlue,
  title, subtitle, rightPrimary, rightPrimaryColor = colors.dark, rightSecondary, style, onPress,
}: ListRowProps) {
  const Conteneur = onPress ? TouchableOpacity : View;
  return (
    <Conteneur style={[styles.row, style]} onPress={onPress} activeOpacity={onPress ? 0.7 : undefined}>
      {icon && (
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
      )}
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.right}>
        {!!rightPrimary && <Text style={[styles.rightPrimary, { color: rightPrimaryColor }]}>{rightPrimary}</Text>}
        {rightSecondary}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={colors.dark + '30'} style={styles.chevron} />}
    </Conteneur>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, padding: spacing.md,
    marginHorizontal: spacing.md, marginTop: spacing.sm, borderRadius: borderRadius.md,
  },
  iconWrap: { width: 40, height: 40, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  left: { flex: 1 },
  title: { fontSize: fontSize.base, fontWeight: '600', color: colors.dark },
  subtitle: { fontSize: fontSize.xs, color: colors.dark + '80', marginTop: 2 },
  right: { alignItems: 'flex-end', marginLeft: spacing.sm, gap: 4 },
  rightPrimary: { fontSize: fontSize.md, fontWeight: '700' },
  chevron: { marginLeft: spacing.xs },
});
