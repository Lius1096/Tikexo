import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '../design-system/tokens';
import { Button } from '../design-system/components';

export default function Lock({ onRetry, echec }: { onRetry: () => void; echec: boolean }) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="lock-closed" size={32} color={colors.white} />
      </View>
      <Text style={styles.titre}>TIKEXO verrouillé</Text>
      <Text style={styles.sous}>
        {echec ? "Authentification échouée — réessayez." : 'Déverrouillez avec Face ID, empreinte ou votre code appareil.'}
      </Text>
      <Button title="Déverrouiller" onPress={onRetry} style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  icon: {
    width: 64, height: 64, borderRadius: borderRadius.full,
    backgroundColor: colors.white + '22', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  titre: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  sous: { color: colors.white + 'AA', fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.xl },
  btn: { paddingHorizontal: spacing.xl },
});
