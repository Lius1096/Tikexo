import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, ListRow, Badge, statutTone, EmptyState, LoadingState } from '../../design-system/components';

export default function Reversements() {
  // /fedapay/operations est réservé aux admins TIKEXO côté backend — un
  // commerçant recevait 403. /commercants/:id/payouts est le bon endpoint,
  // protégé par checkCommercantProprietaire (le commerçant ne voit que les
  // siens).
  const { data: commercant } = useQuery({
    queryKey: ['mon-commercant'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const { data: operations, isLoading } = useQuery({
    queryKey: ['commercant-payouts', commercant?.id],
    queryFn: () => api.get(`/commercants/${commercant.id}/payouts`).then((r) => r.data.data),
    enabled: !!commercant?.id,
  });

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Text style={styles.titre}>Mes Reversements TIKEXO</Text>
      <Card variant="info" style={styles.infoBox}>
        <Ionicons name="information-circle" size={20} color={colors.primary} style={styles.infoIcon} />
        <Text style={styles.infoText}>
          TIKEXO effectue les reversements automatiquement sur votre Mobile Money selon votre mode choisi.
        </Text>
      </Card>

      {isLoading || !commercant ? (
        <LoadingState inline />
      ) : (operations || []).length === 0 ? (
        <EmptyState icon="cash-outline" title="Aucun reversement pour l'instant" />
      ) : (
        (operations || []).map((op: { id: string; montant: string; statut: string; createdAt: string }) => (
          <ListRow
            key={op.id}
            icon="cash"
            title={`${Number(op.montant).toLocaleString('fr-FR')} XOF`}
            subtitle={new Date(op.createdAt).toLocaleDateString('fr-FR')}
            rightSecondary={<Badge label={op.statut} tone={statutTone(op.statut)} />}
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
