import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, fontSize } from '../../design-system/tokens';
import { ListRow, Badge, statutTone, EmptyState, LoadingState } from '../../design-system/components';

type Transaction = {
  id: string; montant_total: string; statut: string; createdAt: string;
  commercant?: { nom: string; type: string };
};

export default function Historique() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['transactions'],
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
        renderItem={({ item }: { item: Transaction }) => (
          <ListRow
            icon="receipt"
            title={item.commercant?.nom || 'Commerçant'}
            subtitle={new Date(item.createdAt).toLocaleDateString('fr-FR')}
            rightPrimary={`-${Number(item.montant_total).toLocaleString('fr-FR')} XOF`}
            rightPrimaryColor={colors.danger}
            rightSecondary={<Badge label={item.statut} tone={statutTone(item.statut)} />}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="Aucune transaction TIKEXO" subtitle="Vos paiements apparaîtront ici" />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
});
