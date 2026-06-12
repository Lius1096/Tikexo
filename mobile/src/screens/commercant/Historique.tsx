import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';

type Transaction = {
  id: string; montant_total: string; commission_tikexo: string;
  statut: string; createdAt: string;
  beneficiaire?: { nom: string; prenom: string };
};

export default function CommercantHistorique() {
  const { data } = useQuery({
    queryKey: ['transactions-commercant'],
    queryFn: () => axios.get('/api/v1/transactions').then((r) => r.data.data),
  });

  return (
    <FlatList
      style={styles.container}
      data={data?.items || []}
      keyExtractor={(item) => item.id}
      renderItem={({ item }: { item: Transaction }) => {
        const net = parseFloat(item.montant_total) - parseFloat(item.commission_tikexo);
        return (
          <View style={styles.item}>
            <View>
              <Text style={styles.benef}>
                {item.beneficiaire?.prenom} {item.beneficiaire?.nom}
              </Text>
              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleDateString('fr-FR')}
              </Text>
              <Text style={styles.commission}>
                Commission TIKEXO : {Number(item.commission_tikexo).toLocaleString('fr-FR')} XOF
              </Text>
            </View>
            <View style={styles.montants}>
              <Text style={styles.montantTotal}>
                {Number(item.montant_total).toLocaleString('fr-FR')} XOF
              </Text>
              <Text style={styles.montantNet}>
                Net : {net.toLocaleString('fr-FR')} XOF
              </Text>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <Text style={styles.empty}>Aucune transaction TIKEXO</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  item: {
    backgroundColor: colors.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  benef: { fontSize: fontSize.base, fontWeight: '600', color: colors.dark },
  date: { fontSize: fontSize.xs, color: colors.dark + '60', marginTop: 2 },
  commission: { fontSize: fontSize.xs, color: colors.gold, marginTop: 2 },
  montants: { alignItems: 'flex-end' },
  montantTotal: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  montantNet: { fontSize: fontSize.xs, color: colors.success, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.dark + '60', padding: spacing.xl },
});
