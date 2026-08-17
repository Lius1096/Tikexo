import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../design-system/tokens';

export default function Reversements() {
  // /fedapay/operations est réservé aux admins TIKEXO côté backend — un
  // commerçant recevait 403. /commercants/:id/payouts est le bon endpoint,
  // protégé par checkCommercantProprietaire (le commerçant ne voit que les
  // siens).
  const { data: commercant } = useQuery({
    queryKey: ['mon-commercant'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const { data: operations } = useQuery({
    queryKey: ['commercant-payouts', commercant?.id],
    queryFn: () => api.get(`/commercants/${commercant.id}/payouts`).then((r) => r.data.data),
    enabled: !!commercant?.id,
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.titre}>Mes Reversements TIKEXO</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          TIKEXO effectue les reversements automatiquement sur votre Mobile Money selon votre mode choisi.
        </Text>
      </View>

      {(operations || []).map((op: { id: string; montant: string; statut: string; createdAt: string }) => (
        <View key={op.id} style={styles.item}>
          <View>
            <Text style={styles.montant}>
              {Number(op.montant).toLocaleString('fr-FR')} XOF
            </Text>
            <Text style={styles.date}>
              {new Date(op.createdAt).toLocaleDateString('fr-FR')}
            </Text>
          </View>
          <View style={[styles.badge, op.statut === 'APPROUVE' ? styles.badgeOk : styles.badgeEn]}>
            <Text style={styles.badgeText}>{op.statut}</Text>
          </View>
        </View>
      ))}

      {(operations || []).length === 0 && (
        <Text style={styles.empty}>Aucun reversement pour l'instant</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.md },
  titre: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
  infoBox: {
    backgroundColor: colors.lightBlue,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { color: colors.primary, fontSize: fontSize.sm },
  item: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  montant: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  date: { fontSize: fontSize.xs, color: colors.dark + '60', marginTop: 2 },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeOk: { backgroundColor: '#dcfce7' },
  badgeEn: { backgroundColor: '#fef9c3' },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.dark + '60', padding: spacing.xl },
});
