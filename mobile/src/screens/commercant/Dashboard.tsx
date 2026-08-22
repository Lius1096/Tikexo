import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { TYPE_COMMERCANT_LABELS } from '../../lib/commercantConstants';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, Button, ListRow, LoadingState } from '../../design-system/components';

const SEUIL_PAYOUT = 1000;

interface Fiche {
  id: string;
  nom: string;
  type: string;
  niveau: string;
  statut: string;
  ville: string;
  taux_commission: string;
  mode_reversement: string;
  wallet: { solde: string } | null;
  frais_payout_manuel_taux: number;
}

interface TransactionApercu {
  id: string;
  montant_total: string;
  commission_tikexo: string;
  createdAt: string;
  beneficiaire?: { nom: string; prenom: string };
}

export default function CommercantDashboard() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);

  const { data: fiche, isLoading, refetch } = useQuery<Fiche>({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['commercant-stats'],
    queryFn: () => api.get('/commercants/moi/stats').then((r) => r.data.data),
  });

  const { data: txData, refetch: refetchTx } = useQuery({
    queryKey: ['commercant-transactions-recentes'],
    queryFn: () => api.get('/transactions?limit=5').then((r) => r.data.data),
  });

  // Le solde/les stats changent à chaque encaissement (Scanner/Caisse) sans
  // que ce Dashboard soit forcément remonté — on revérifie à chaque focus.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchStats();
      refetchTx();
    }, [refetch, refetchStats, refetchTx])
  );

  const payoutMut = useMutation({
    mutationFn: () => api.post('/commercants/moi/payout'),
    onSuccess: (r) => {
      setConfirmationOuverte(false);
      qc.invalidateQueries({ queryKey: ['commercant-moi'] });
      const montant = Number(r.data?.data?.montant ?? 0);
      Alert.alert('TIKEXO', `Reversement envoyé, ${montant.toLocaleString('fr-FR')} XOF en route vers votre Mobile Money.`);
    },
    onError: (e: any) => {
      setConfirmationOuverte(false);
      Alert.alert('TIKEXO - Erreur', e?.response?.data?.error ?? 'Échec de la demande de reversement - réessayez.');
    },
  });

  if (isLoading) return <LoadingState />;

  const solde = Number(fiche?.wallet?.solde ?? 0);
  const estActif = fiche?.statut === 'ACTIF';
  const tauxFrais = fiche?.frais_payout_manuel_taux ?? 1.5;
  const frais = Math.round(solde * (tauxFrais / 100));
  const net = solde - frais;
  const transactions: TransactionApercu[] = txData?.items ?? [];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card variant="primary" style={styles.walletCard}>
        <View style={styles.icon}>
          <Ionicons name="cash" size={22} color={colors.white} />
        </View>
        <Text style={styles.label}>Solde à reverser</Text>
        <Text style={styles.solde}>{solde.toLocaleString('fr-FR')} XOF</Text>
        <Text style={styles.hint}>
          Reversement automatique chaque jour ouvré · Mode : {fiche?.mode_reversement?.replace(/_/g, ' ') ?? '—'}
        </Text>
        <Button
          title="Demander un reversement anticipé"
          variant="gold"
          onPress={() => setConfirmationOuverte(true)}
          disabled={solde < SEUIL_PAYOUT || !estActif}
          style={styles.btnPayout}
        />
      </Card>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="trending-up" size={14} color={colors.gold} />
            <Text style={styles.statLabel}>Volume aujourd'hui</Text>
          </View>
          <Text style={styles.statValeur}>{Number(stats?.volume_jour ?? 0).toLocaleString('fr-FR')} XOF</Text>
        </Card>
        <Card style={styles.statCard}>
          <View style={styles.statHeader}>
            <Ionicons name="bag-handle" size={14} color={colors.accent} />
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <Text style={styles.statValeur}>{stats?.transactions_jour ?? 0}</Text>
        </Card>
      </View>

      {!!fiche && (
        <Card style={styles.infoCard}>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValeur}>{TYPE_COMMERCANT_LABELS[fiche.type] ?? fiche.type}</Text>
          </View>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Niveau</Text>
            <Text style={styles.infoValeur}>{fiche.niveau}</Text>
          </View>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Commission</Text>
            <Text style={styles.infoValeur}>{fiche.taux_commission}%</Text>
          </View>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Ville</Text>
            <Text style={styles.infoValeur}>{fiche.ville}</Text>
          </View>
        </Card>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeaderLigne}>
          <Text style={styles.sectionTitre}>Derniers encaissements</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Historique' as never)}>
            <Text style={styles.voirTout}>Voir tout</Text>
          </TouchableOpacity>
        </View>
        {transactions.length === 0 ? (
          <Card style={styles.videCard}>
            <Text style={styles.videTexte}>Aucun encaissement pour l'instant</Text>
          </Card>
        ) : (
          transactions.map((t) => {
            const net = parseFloat(t.montant_total) - parseFloat(t.commission_tikexo ?? '0');
            return (
              <ListRow
                key={t.id}
                icon="checkmark-circle"
                iconColor={colors.success}
                iconBg="#dcfce7"
                title={t.beneficiaire ? `${t.beneficiaire.prenom} ${t.beneficiaire.nom}` : 'Client'}
                subtitle={new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                rightPrimary={`+${net.toLocaleString('fr-FR')} XOF`}
                rightPrimaryColor={colors.gold}
                style={styles.row}
              />
            );
          })
        )}
      </View>

      <Modal visible={confirmationOuverte} transparent animationType="fade" onRequestClose={() => setConfirmationOuverte(false)}>
        <View style={styles.modalFond}>
          <Card style={styles.modalCarte}>
            <View style={styles.modalHeader}>
              <Ionicons name="flash" size={20} color={colors.gold} />
              <Text style={styles.modalTitre}>Reversement anticipé</Text>
            </View>

            <Text style={styles.modalTexte}>
              Ce reversement est envoyé immédiatement, en dehors du passage automatique quotidien — des frais TIKEXO s'appliquent pour le couvrir.
            </Text>

            <View style={styles.recap}>
              <View style={styles.recapLigne}>
                <Text style={styles.recapLabel}>Solde actuel</Text>
                <Text style={styles.recapValeur}>{solde.toLocaleString('fr-FR')} XOF</Text>
              </View>
              <View style={styles.recapLigne}>
                <Text style={styles.recapLabel}>Frais TIKEXO ({tauxFrais}%)</Text>
                <Text style={[styles.recapValeur, { color: colors.danger }]}>-{frais.toLocaleString('fr-FR')} XOF</Text>
              </View>
              <View style={[styles.recapLigne, styles.recapLigneFinale]}>
                <Text style={styles.recapLabelFinal}>Vous recevrez</Text>
                <Text style={styles.recapValeurFinale}>{net.toLocaleString('fr-FR')} XOF</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button title="Annuler" variant="secondary" onPress={() => setConfirmationOuverte(false)} style={styles.modalBtn} />
              <Button
                title={payoutMut.isPending ? 'Envoi…' : 'Confirmer'}
                variant="gold"
                onPress={() => payoutMut.mutate()}
                loading={payoutMut.isPending}
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
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
  btnPayout: { marginTop: spacing.md, width: '100%' },
  statsGrid: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.md },
  statCard: { flex: 1 },
  statHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  statLabel: { fontSize: fontSize.xs, color: colors.dark + '80' },
  statValeur: { fontSize: fontSize.sm, fontWeight: '700', color: colors.dark },
  infoCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  infoLigne: { minWidth: '40%' },
  infoLabel: { fontSize: fontSize.xs, color: colors.dark + '60' },
  infoValeur: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark, marginTop: 2 },
  section: { marginBottom: spacing.md },
  sectionHeaderLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.xs },
  sectionTitre: { fontSize: fontSize.md, fontWeight: '600', color: colors.dark },
  voirTout: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600' },
  videCard: { marginHorizontal: spacing.md, alignItems: 'center', paddingVertical: spacing.lg },
  videTexte: { fontSize: fontSize.sm, color: colors.dark + '60' },
  row: { marginTop: spacing.xs },
  modalFond: { flex: 1, backgroundColor: '#00000080', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCarte: { width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  modalTitre: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  modalTexte: { fontSize: fontSize.xs, color: colors.dark + '80', lineHeight: 17, marginBottom: spacing.md },
  recap: { backgroundColor: colors.lightGray, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  recapLigne: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  recapLigneFinale: { borderTopWidth: 1, borderTopColor: colors.white, marginTop: spacing.xs, paddingTop: spacing.sm },
  recapLabel: { fontSize: fontSize.xs, color: colors.dark + '80' },
  recapValeur: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  recapLabelFinal: { fontSize: fontSize.sm, fontWeight: '700', color: colors.dark },
  recapValeurFinale: { fontSize: fontSize.md, fontWeight: '700', color: colors.success },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1 },
});
