import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, shadows, fontSize } from '../../design-system/tokens';

export default function Accueil() {
  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet-solde'],
    queryFn: () => axios.get('/api/v1/wallet/solde').then((r) => r.data.data),
  });

  const { data: segmente } = useQuery({
    queryKey: ['wallet-segmente'],
    queryFn: () => axios.get('/api/v1/wallet/solde/segmente').then((r) => r.data.data),
  });

  return (
    <ScrollView style={styles.container}>
      {/* Carte solde */}
      <View style={styles.walletCard}>
        <Text style={styles.walletLabel}>Votre solde TIKEXO</Text>
        <Text style={styles.walletSolde}>
          {isLoading ? '...' : Number(wallet?.solde || 0).toLocaleString('fr-FR')} XOF
        </Text>
        <Text style={styles.walletSubtitle}>"Ton repas, ton droit"</Text>
      </View>

      {/* Sources */}
      {segmente?.sources?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solde par employeur</Text>
          {segmente.sources.map((s: { entreprise_id: string; entreprise_nom: string; montant: number }) => (
            <View key={s.entreprise_id} style={styles.sourceRow}>
              <Text style={styles.sourceNom}>{s.entreprise_nom}</Text>
              <Text style={styles.sourceMontant}>
                {Number(s.montant).toLocaleString('fr-FR')} XOF
              </Text>
            </View>
          ))}
        </View>
      )}
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
  walletLabel: { color: colors.white + 'CC', fontSize: fontSize.sm },
  walletSolde: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.xs },
  walletSubtitle: { color: colors.accent, fontSize: fontSize.xs, marginTop: spacing.xs, fontStyle: 'italic' },
  section: {
    backgroundColor: colors.white,
    margin: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.card,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.dark, marginBottom: spacing.sm },
  sourceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  sourceNom: { color: colors.dark, fontSize: fontSize.base },
  sourceMontant: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600' },
});
