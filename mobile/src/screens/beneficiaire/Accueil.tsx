import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, ListRow, LoadingState } from '../../design-system/components';

export default function Accueil() {
  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet-solde'],
    queryFn: () => api.get('/wallet/solde').then((r) => r.data.data),
  });

  const { data: segmente } = useQuery({
    queryKey: ['wallet-segmente'],
    queryFn: () => api.get('/wallet/solde/segmente').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState />;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card variant="primary" style={styles.walletCard}>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet" size={22} color={colors.white} />
        </View>
        <Text style={styles.walletLabel}>Votre solde TIKEXO</Text>
        <Text style={styles.walletSolde}>
          {Number(wallet?.solde || 0).toLocaleString('fr-FR')} XOF
        </Text>
        <Text style={styles.walletSubtitle}>"Ton repas, ton droit"</Text>
      </Card>

      {segmente?.sources?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solde par employeur</Text>
          {segmente.sources.map((s: { entreprise_id: string; entreprise_nom: string; montant: number }) => (
            <ListRow
              key={s.entreprise_id}
              icon="business"
              title={s.entreprise_nom}
              rightPrimary={`${Number(s.montant).toLocaleString('fr-FR')} XOF`}
              rightPrimaryColor={colors.primary}
              style={styles.row}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  walletCard: { margin: spacing.md, alignItems: 'center' },
  walletIcon: {
    width: 44, height: 44, borderRadius: borderRadius.full,
    backgroundColor: colors.white + '22', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  walletLabel: { color: colors.white + 'CC', fontSize: fontSize.sm },
  walletSolde: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.xs },
  walletSubtitle: { color: colors.accent, fontSize: fontSize.xs, marginTop: spacing.xs, fontStyle: 'italic' },
  section: { marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.dark, marginHorizontal: spacing.md, marginBottom: spacing.xs },
  row: { marginTop: spacing.xs },
});
