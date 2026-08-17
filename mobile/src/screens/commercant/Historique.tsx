import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, fontSize } from '../../design-system/tokens';
import { ListRow, EmptyState, LoadingState } from '../../design-system/components';

type Transaction = {
  id: string; montant_total: string; commission_tikexo: string;
  statut: string; createdAt: string;
  beneficiaire?: { nom: string; prenom: string };
};

export default function CommercantHistorique() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions-commercant'],
    queryFn: () => api.get('/transactions').then((r) => r.data.data),
  });

  if (isLoading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.items || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        renderItem={({ item }: { item: Transaction }) => {
          const net = parseFloat(item.montant_total) - parseFloat(item.commission_tikexo);
          return (
            <ListRow
              icon="person"
              title={`${item.beneficiaire?.prenom ?? ''} ${item.beneficiaire?.nom ?? ''}`.trim() || 'Bénéficiaire'}
              subtitle={`${new Date(item.createdAt).toLocaleDateString('fr-FR')} · Commission ${Number(item.commission_tikexo).toLocaleString('fr-FR')} XOF`}
              rightPrimary={`${Number(item.montant_total).toLocaleString('fr-FR')} XOF`}
              rightPrimaryColor={colors.primary}
              rightSecondary={<Text style={styles.net}>Net : {net.toLocaleString('fr-FR')} XOF</Text>}
            />
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Aucune transaction TIKEXO" subtitle="Vos encaissements apparaîtront ici" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
  net: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },
});
