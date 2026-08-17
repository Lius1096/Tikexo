import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '../tokens';

export function LoadingState({ inline }: { inline?: boolean }) {
  return (
    <View style={inline ? styles.inline : styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  inline: { padding: spacing.lg, alignItems: 'center' },
});
