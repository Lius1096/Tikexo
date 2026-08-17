import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, ListRow, Badge, LoadingState } from '../../design-system/components';

interface CommercantApercu {
  id: string;
  nom: string;
  type: string;
  est_ouvert?: boolean;
}

export default function Accueil() {
  const navigation = useNavigation();

  const { data: wallet, isLoading, refetch: refetchSolde } = useQuery({
    queryKey: ['wallet-solde'],
    queryFn: () => api.get('/wallet/solde').then((r) => r.data.data),
  });

  const { data: segmente, refetch: refetchSegmente } = useQuery({
    queryKey: ['wallet-segmente'],
    queryFn: () => api.get('/wallet/solde/segmente').then((r) => r.data.data),
  });

  // Le solde peut changer sans action de ce côté de l'app (dotation reçue,
  // carte scannée par un commerçant pendant que l'app était en arrière-plan)
  // — on revérifie à chaque fois que l'onglet Accueil regagne le focus.
  useFocusEffect(
    useCallback(() => {
      refetchSolde();
      refetchSegmente();
    }, [refetchSolde, refetchSegmente])
  );

  const { data: commercants } = useQuery({
    queryKey: ['commercants-apercu'],
    queryFn: () => api.get('/commercants', { params: { statut: 'ACTIF', limit: 4 } }).then((r) => r.data.data.items as CommercantApercu[]),
  });

  if (isLoading) return <LoadingState />;

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card variant="primary" style={styles.walletCard}>
        <View style={styles.walletIcon}>
          <Ionicons name="wallet" size={22} color={colors.white} />
        </View>
        <Text style={styles.walletLabel}>Votre solde TIKEXO</Text>
        <Text style={styles.walletSolde}>
          {Number(wallet?.solde || 0).toLocaleString('fr-FR')} XOF
        </Text>
        <Text style={styles.walletSubtitle}>"Ton repas, ton droit"</Text>
      </Card>

      {segmente?.sources?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solde par employeur</Text>
          {segmente.sources.map((s: { entreprise_id: string; entreprise_nom: string; montant: number }) => (
            <ListRow
              key={s.entreprise_id}
              icon="business"
              title={s.entreprise_nom}
              rightPrimary={`${Number(s.montant).toLocaleString('fr-FR')} XOF`}
              rightPrimaryColor={colors.primary}
              style={styles.row}
            />
          ))}
        </View>
      )}

      {commercants && commercants.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderLigne}>
            <Text style={styles.sectionTitleInline}>Commerçants près de vous</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Commercants' as never)}>
              <Text style={styles.voirTout}>Voir tout</Text>
            </TouchableOpacity>
          </View>
          {commercants.map((c) => (
            <ListRow
              key={c.id}
              icon="storefront"
              title={c.nom}
              subtitle={c.type}
              rightSecondary={
                c.est_ouvert !== undefined
                  ? <Badge label={c.est_ouvert ? 'Ouvert' : 'Fermé'} tone={c.est_ouvert ? 'success' : 'neutral'} />
                  : undefined
              }
              style={styles.row}
              onPress={() => (navigation.getParent() as any)?.navigate('CommercantFiche', { id: c.id, nom: c.nom })}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  walletCard: { margin: spacing.md, alignItems: 'center' },
  walletIcon: {
    width: 44, height: 44, borderRadius: borderRadius.full,
    backgroundColor: colors.white + '22', alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  walletLabel: { color: colors.white + 'CC', fontSize: fontSize.sm },
  walletSolde: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.xs },
  walletSubtitle: { color: colors.accent, fontSize: fontSize.xs, marginTop: spacing.xs, fontStyle: 'italic' },
  section: { marginTop: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.dark, marginHorizontal: spacing.md, marginBottom: spacing.xs },
  sectionTitleInline: { fontSize: fontSize.md, fontWeight: '600', color: colors.dark },
  sectionHeaderLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: spacing.md, marginBottom: spacing.xs },
  voirTout: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600' },
  row: { marginTop: spacing.xs },
});
