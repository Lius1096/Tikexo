import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, ListRow, Badge, statutTone, EmptyState, LoadingState } from '../../design-system/components';

export default function Reversements() {
  const { data: commercant } = useQuery({
    queryKey: ['mon-commercant'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  // Les retraits passent désormais par un ticket traité manuellement par
  // TIKEXO (preuve de virement à l'appui), en attendant l'intégration
  // FedaPay "checkout envoi multiple".
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['commercant-tickets-retrait'],
    queryFn: () => api.get('/commercants/moi/tickets-retrait').then((r) => r.data.data),
    enabled: !!commercant?.id,
  });

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Text style={styles.titre}>Mes retraits TIKEXO</Text>
      <Card variant="info" style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary} style={styles.infoIcon} />
        <Text style={styles.infoText}>
          Chaque demande de retrait est traitée manuellement par l'équipe TIKEXO, qui vous contacte pour le virement Mobile Money.
        </Text>
      </Card>

      {isLoading || !commercant ? (
        <LoadingState inline />
      ) : (tickets || []).length === 0 ? (
        <EmptyState icon="cash-outline" title="Aucune demande de retrait pour l'instant" />
      ) : (
        (tickets || []).map((t: { id: string; montant: string; statut: string; motif_rejet?: string; createdAt: string }) => (
          <ListRow
            key={t.id}
            icon="cash"
            title={`${Number(t.montant).toLocaleString('fr-FR')} XOF`}
            subtitle={t.statut === 'REJETE' && t.motif_rejet ? t.motif_rejet : new Date(t.createdAt).toLocaleDateString('fr-FR')}
            rightSecondary={<Badge label={t.statut} tone={statutTone(t.statut)} />}
            style={styles.row}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  titre: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  infoBox: { flexDirection: 'row', marginBottom: spacing.md, padding: spacing.md },
  infoIcon: { marginRight: spacing.sm, marginTop: 2 },
  infoText: { flex: 1, color: colors.primary, fontSize: fontSize.sm },
  row: { marginHorizontal: 0 },
});
