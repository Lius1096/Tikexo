import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, shadows, fontSize } from '../../design-system/tokens';

export default function CommercantDashboard() {
  const { data: wallet } = useQuery({
    queryKey: ['wallet-solde'],
    queryFn: () => axios.get('/api/v1/wallet/solde').then((r) => r.data.data),
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.walletCard}>
        <Text style={styles.label}>Solde à reverser</Text>
        <Text style={styles.solde}>
          {Number(wallet?.solde || 0).toLocaleString('fr-FR')} XOF
        </Text>
        <Text style={styles.hint}>Le reversement est effectué automatiquement toutes les 72h</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  walletCard: {
    backgroundColor: colors.primary,
    margin: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.card,
    alignItems: 'center',
  },
  label: { color: colors.white + 'CC', fontSize: fontSize.sm },
  solde: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.xs },
  hint: { color: colors.accent, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
});
