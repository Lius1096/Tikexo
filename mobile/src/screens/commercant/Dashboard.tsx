import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, LoadingState } from '../../design-system/components';

export default function CommercantDashboard() {
  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet-solde'],
    queryFn: () => api.get('/wallet/solde').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState />;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card variant="primary" style={styles.walletCard}>
        <View style={styles.icon}>
          <Ionicons name="cash" size={22} color={colors.white} />
        </View>
        <Text style={styles.label}>Solde à reverser</Text>
        <Text style={styles.solde}>
          {Number(wallet?.solde || 0).toLocaleString('fr-FR')} XOF
        </Text>
        <Text style={styles.hint}>Le reversement est effectué automatiquement toutes les 72h</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  walletCard: { margin: spacing.md, alignItems: 'center' },
  icon: {
    width: 44, height: 44, borderRadius: borderRadius.full,
    backgroundColor: colors.white + '22', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: { color: colors.white + 'CC', fontSize: fontSize.sm },
  solde: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.xs },
  hint: { color: colors.accent, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
});
