import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, Badge, LoadingState } from '../../design-system/components';

interface FichePublique {
  id: string;
  nom: string;
  type: string;
  ville: string;
  adresse?: string;
  photo_url?: string;
  note_moyenne: number;
  est_ouvert: boolean;
}

// Fiche publique — même endpoint que le QR vitrine imprimé en rue
// (GET /commercants/:id/public, aucune authentification requise, cf.
// commercant.service.js#getFichePublique). Champs volontairement limités
// aux informations non sensibles.
export default function CommercantFiche() {
  const route = useRoute<any>();
  const { id, nom: nomApercu } = route.params ?? {};

  const { data: fiche, isLoading } = useQuery<FichePublique>({
    queryKey: ['commercant-fiche-publique', id],
    queryFn: () => api.get(`/commercants/${id}/public`).then((r) => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return <LoadingState />;

  if (!fiche) {
    return (
      <Screen style={styles.introuvable}>
        <Ionicons name="storefront-outline" size={40} color={colors.dark + '30'} />
        <Text style={styles.introuvableTexte}>{nomApercu ?? 'Commerçant'} introuvable ou inactif</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {fiche.photo_url ? (
          <Image source={{ uri: fiche.photo_url }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="storefront" size={32} color={colors.primary} />
          </View>
        )}
        <Text style={styles.nom}>{fiche.nom}</Text>
        <View style={styles.badges}>
          <Badge label={fiche.est_ouvert ? 'Ouvert' : 'Fermé'} tone={fiche.est_ouvert ? 'success' : 'neutral'} />
          {fiche.note_moyenne > 0 && (
            <View style={styles.note}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <Text style={styles.noteTexte}>{fiche.note_moyenne.toFixed(1)} / 5</Text>
            </View>
          )}
        </View>
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoLigne}>
          <Ionicons name="pricetag" size={14} color={colors.dark + '60'} style={styles.infoIcone} />
          <Text style={styles.infoTexte}>{fiche.type}</Text>
        </View>
        {!!fiche.adresse && (
          <View style={styles.infoLigne}>
            <Ionicons name="location" size={14} color={colors.dark + '60'} style={styles.infoIcone} />
            <View>
              <Text style={styles.infoTexte}>{fiche.adresse}</Text>
              <Text style={styles.infoSous}>{fiche.ville}</Text>
            </View>
          </View>
        )}
        <View style={styles.infoLigne}>
          <Ionicons name="shield-checkmark" size={14} color={colors.accent} style={styles.infoIcone} />
          <Text style={styles.infoTexte}>Paiement TIKEXO accepté</Text>
        </View>
      </Card>

      <Card variant="primary" style={styles.commentCard}>
        <Text style={styles.commentLabel}>COMMENT PAYER</Text>
        <Text style={styles.commentTitre}>Scanner le QR Code TIKEXO</Text>
        <Text style={styles.commentTexte}>
          Présentez-vous à la caisse de {fiche.nom} et demandez à scanner le QR Code TIKEXO affiché en caisse, ou ouvrez l'onglet Payer pour scanner le vôtre.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  introuvable: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  introuvableTexte: { color: colors.dark + '60', fontSize: fontSize.sm, textAlign: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.md },
  photo: { width: 88, height: 88, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
  photoPlaceholder: {
    width: 88, height: 88, borderRadius: borderRadius.lg, backgroundColor: colors.lightBlue,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  nom: { fontSize: fontSize.lg, fontWeight: '700', color: colors.dark, textAlign: 'center' },
  badges: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  noteTexte: { fontSize: fontSize.xs, color: colors.dark + '99', fontWeight: '600' },
  infoCard: { marginBottom: spacing.md, gap: spacing.sm },
  infoLigne: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoIcone: { marginTop: 2 },
  infoTexte: { fontSize: fontSize.sm, color: colors.dark, flex: 1 },
  infoSous: { fontSize: fontSize.xs, color: colors.dark + '60', marginTop: 2 },
  commentCard: {},
  commentLabel: { fontSize: 10, color: colors.white + '80', letterSpacing: 1.5, marginBottom: spacing.xs },
  commentTitre: { fontSize: fontSize.base, fontWeight: '700', color: colors.white, marginBottom: spacing.xs },
  commentTexte: { fontSize: fontSize.xs, color: colors.white + '99', lineHeight: 18 },
});
