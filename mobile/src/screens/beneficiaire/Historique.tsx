import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Card, ListRow, EmptyState, LoadingState } from '../../design-system/components';

// Miroir de web/src/pages/beneficiaire/Transactions.tsx — le wallet ledger
// (dotations, paiements, compléments, remboursements, commission) est distinct
// du module /transactions (paiements uniquement). Utiliser /transactions ici
// faisait disparaître les dotations de l'historique du bénéficiaire.
const TYPE_LABELS: Record<string, string> = {
  DOTATION: 'Dotation employeur',
  PAIEMENT: 'Paiement commerçant',
  COMPLEMENT: 'Complément',
  REMBOURSEMENT: 'Remboursement',
  RECHARGE: 'Recharge',
  COMMISSION_DOTATION: 'Frais de service TIKEXO',
};

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  DOTATION: 'gift',
  PAIEMENT: 'storefront',
  COMPLEMENT: 'add-circle',
  REMBOURSEMENT: 'arrow-undo',
  RECHARGE: 'wallet',
  COMMISSION_DOTATION: 'shield',
};

interface EntreeLedger {
  id: string;
  type: string;
  montant: string;
  createdAt: string;
  wallet_destination_id: string;
  commercant_nom?: string;
  metadata?: { taux?: number };
}

function libelleEntree(e: EntreeLedger): string {
  if (e.type === 'PAIEMENT' && e.commercant_nom) return `Paiement — ${e.commercant_nom}`;
  if (e.type === 'COMMISSION_DOTATION' && e.metadata?.taux != null) {
    return `${TYPE_LABELS[e.type]} (${e.metadata.taux}%)`;
  }
  return TYPE_LABELS[e.type] ?? e.type.replace(/_/g, ' ');
}

export default function Historique() {
  const [recherche, setRecherche] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['beneficiaire-historique'],
    queryFn: () => api.get('/wallet/historique?limit=100').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState />;

  const entries: EntreeLedger[] = data?.entries ?? [];
  const walletId: string | undefined = data?.walletId;

  const filtrees = entries.filter((e) =>
    !recherche || libelleEntree(e).toLowerCase().includes(recherche.toLowerCase())
  );

  // "Total dépensé" ne doit compter que les vrais achats (PAIEMENT) — y
  // mélanger les frais de service prélevés automatiquement à la dotation
  // (COMMISSION_DOTATION) donnait l'impression trompeuse d'avoir "dépensé"
  // un montant que le bénéficiaire n'a pourtant jamais choisi de dépenser.
  const totalCredits = entries.filter((e) => e.wallet_destination_id === walletId).reduce((s, e) => s + parseFloat(e.montant), 0);
  const totalDepense = entries.filter((e) => e.wallet_destination_id !== walletId && e.type === 'PAIEMENT').reduce((s, e) => s + parseFloat(e.montant), 0);
  const totalFrais = entries.filter((e) => e.wallet_destination_id !== walletId && e.type === 'COMMISSION_DOTATION').reduce((s, e) => s + parseFloat(e.montant), 0);

  return (
    <View style={styles.container}>
      <FlatList
        data={filtrees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            {entries.length > 0 && (
              <View style={styles.resume}>
                <Card style={styles.resumeCard}>
                  <View style={[styles.resumeIcone, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="arrow-down" size={14} color={colors.success} />
                  </View>
                  <View>
                    <Text style={styles.resumeLabel}>Total reçu</Text>
                    <Text style={[styles.resumeValeur, { color: colors.success }]}>{totalCredits.toLocaleString('fr-FR')} XOF</Text>
                  </View>
                </Card>
                <Card style={styles.resumeCard}>
                  <View style={[styles.resumeIcone, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="arrow-up" size={14} color={colors.danger} />
                  </View>
                  <View>
                    <Text style={styles.resumeLabel}>Total dépensé</Text>
                    <Text style={[styles.resumeValeur, { color: colors.danger }]}>{totalDepense.toLocaleString('fr-FR')} XOF</Text>
                  </View>
                </Card>
              </View>
            )}
            {totalFrais > 0 && (
              <View style={styles.fraisBox}>
                <Ionicons name="information-circle" size={14} color={colors.dark + '80'} />
                <Text style={styles.fraisTexte}>
                  Dont {totalFrais.toLocaleString('fr-FR')} XOF de frais de service TIKEXO, prélevés automatiquement à chaque dotation — hors de vos achats.
                </Text>
              </View>
            )}
            <View style={styles.rechercheWrap}>
              <Ionicons name="search" size={14} color={colors.dark + '60'} style={styles.rechercheIcone} />
              <TextInput
                style={styles.recherche}
                placeholder="Filtrer par type…"
                value={recherche}
                onChangeText={setRecherche}
              />
            </View>
          </>
        }
        renderItem={({ item }) => {
          const isCredit = item.wallet_destination_id === walletId;
          return (
            <ListRow
              icon={TYPE_ICONS[item.type] ?? 'ellipse'}
              iconColor={isCredit ? colors.success : colors.danger}
              iconBg={isCredit ? '#dcfce7' : '#fee2e2'}
              title={libelleEntree(item)}
              subtitle={new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              rightPrimary={`${isCredit ? '+' : '-'}${Number(item.montant).toLocaleString('fr-FR')} XOF`}
              rightPrimaryColor={isCredit ? colors.success : colors.danger}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Aucune transaction TIKEXO" subtitle="Vos dotations et paiements apparaîtront ici" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
  resume: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  resumeCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  resumeIcone: { width: 32, height: 32, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  resumeLabel: { fontSize: fontSize.xs, color: colors.dark + '60' },
  resumeValeur: { fontSize: fontSize.sm, fontWeight: '700' },
  fraisBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginHorizontal: spacing.md, marginBottom: spacing.sm, padding: spacing.sm,
    backgroundColor: colors.lightGray, borderRadius: borderRadius.sm,
  },
  fraisTexte: { flex: 1, fontSize: fontSize.xs, color: colors.dark + '80', lineHeight: 16 },
  rechercheWrap: { marginHorizontal: spacing.md, marginBottom: spacing.xs, position: 'relative', justifyContent: 'center' },
  rechercheIcone: { position: 'absolute', left: spacing.sm, zIndex: 1 },
  recherche: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, paddingLeft: spacing.xl + spacing.xs, paddingRight: spacing.sm, fontSize: fontSize.sm,
  },
});
