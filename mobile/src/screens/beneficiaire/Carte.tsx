import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../../design-system/tokens';

export default function Carte() {
  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Carte Physique TIKEXO</Text>
      <Text style={styles.info}>
        La carte physique TIKEXO est en cours de développement. Elle sera disponible prochainement.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  titre: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  info: { fontSize: fontSize.base, color: colors.dark + '80', textAlign: 'center', lineHeight: 24 },
});
