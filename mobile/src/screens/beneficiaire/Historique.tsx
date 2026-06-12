import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';

type Transaction = {
  id: string; montant_total: string; statut: string; createdAt: string;
  commercant?: { nom: string; type: string };
};

export default function Historique() {
  const { data, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => axios.get('/api/v1/transactions').then((r) => r.data.data),
  });

  return (
    <View style={styles.container}>
      {isLoading ? (
        <Text style={styles.loading}>Chargement...</Text>
      ) : (
        <FlatList
          data={data?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: Transaction }) => (
            <View style={styles.item}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemNom}>{item.commercant?.nom || 'Commerçant'}</Text>
                <Text style={styles.itemDate}>
                  {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <View style={styles.itemRight}>
                <Text style={styles.itemMontant}>
                  -{Number(item.montant_total).toLocaleString('fr-FR')} XOF
                </Text>
                <Text style={[
                  styles.itemStatut,
                  item.statut === 'VALIDEE' ? styles.statutOk : styles.statutKo
                ]}>
                  {item.statut}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>Aucune transaction TIKEXO</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  loading: { textAlign: 'center', marginTop: spacing.xl, color: colors.primary },
  item: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  itemLeft: { flex: 1 },
  itemNom: { fontSize: fontSize.base, fontWeight: '600', color: colors.dark },
  itemDate: { fontSize: fontSize.xs, color: colors.dark + '80', marginTop: 2 },
  itemRight: { alignItems: 'flex-end' },
  itemMontant: { fontSize: fontSize.md, fontWeight: '700', color: colors.danger },
  itemStatut: { fontSize: fontSize.xs, marginTop: 2 },
  statutOk: { color: colors.success },
  statutKo: { color: colors.danger },
  empty: { textAlign: 'center', color: colors.dark + '60', padding: spacing.xl },
});
