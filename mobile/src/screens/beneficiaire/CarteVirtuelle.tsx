import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../design-system/tokens';

export default function CarteVirtuelle() {
  const { data: user } = useQuery({
    queryKey: ['profil'],
    queryFn: () => axios.get('/api/v1/auth/profil').then((r) => r.data.data),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet-solde'],
    queryFn: () => axios.get('/api/v1/wallet/solde').then((r) => r.data.data),
  });

  return (
    <View style={styles.container}>
      {/* Carte virtuelle TIKEXO */}
      <View style={styles.carte}>
        <View style={styles.carteHeader}>
          <Text style={styles.tikexoLabel}>TIKEXO</Text>
          <Text style={styles.carteType}>Carte Virtuelle</Text>
        </View>

        <Text style={styles.solde}>
          {Number(wallet?.solde || 0).toLocaleString('fr-FR')} XOF
        </Text>

        <View style={styles.carteFooter}>
          <View>
            <Text style={styles.titulaire}>TITULAIRE</Text>
            <Text style={styles.nom}>
              {user?.prenom?.toUpperCase()} {user?.nom?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.chip}>
            <View style={styles.chipInner} />
          </View>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Cette carte virtuelle TIKEXO est acceptée chez tous les commerçants partenaires. Votre solde provient uniquement des dotations de votre employeur.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.md },
  carte: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.card,
    shadowOpacity: 0.2,
  },
  carteHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xl },
  tikexoLabel: { color: colors.white, fontSize: fontSize.lg, fontWeight: '900', letterSpacing: 2 },
  carteType: { color: colors.accent, fontSize: fontSize.xs, fontWeight: '600' },
  solde: { color: colors.white, fontSize: fontSize.xxl, fontWeight: '700', fontVariant: ['tabular-nums'], marginBottom: spacing.xl },
  carteFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  titulaire: { color: colors.white + '80', fontSize: 9, letterSpacing: 1.5 },
  nom: { color: colors.white, fontSize: fontSize.sm, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  chip: { width: 40, height: 30, backgroundColor: colors.gold, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  chipInner: { width: 24, height: 18, backgroundColor: colors.gold + '80', borderRadius: 2 },
  infoBox: {
    backgroundColor: colors.lightBlue,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: { color: colors.primary, fontSize: fontSize.sm, lineHeight: 20 },
});
