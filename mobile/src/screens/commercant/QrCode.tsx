import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { colors, spacing, borderRadius, fontSize, shadows } from '../../design-system/tokens';

export default function QrCode() {
  const { data: profil } = useQuery({
    queryKey: ['profil'],
    queryFn: () => axios.get('/api/v1/auth/profil').then((r) => r.data.data),
  });

  const { data: commercant } = useQuery({
    queryKey: ['mon-commercant'],
    queryFn: () =>
      profil ? axios.get(`/api/v1/commercants/${profil.commercant?.id}`).then((r) => r.data.data) : null,
    enabled: !!profil,
  });

  const partager = async () => {
    if (commercant?.qr_code_url) {
      await Share.share({
        message: `Payez chez ${commercant.nom} avec TIKEXO : ${commercant.qr_code_url}`,
        url: commercant.qr_code_url,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Mon QR Code TIKEXO</Text>
      <Text style={styles.sous}>Les clients scannent ce code pour vous payer</Text>

      {commercant?.qr_code_url ? (
        <View style={styles.qrCard}>
          <Image source={{ uri: commercant.qr_code_url }} style={styles.qrImage} />
          <Text style={styles.nomCommercant}>{commercant.nom}</Text>
        </View>
      ) : (
        <View style={styles.qrCard}>
          <Text style={styles.placeholder}>QR Code en cours de génération...</Text>
        </View>
      )}

      <TouchableOpacity style={styles.btnPartager} onPress={partager}>
        <Text style={styles.btnTexte}>Partager mon QR Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.lg, alignItems: 'center' },
  titre: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  sous: { fontSize: fontSize.sm, color: colors.dark + '80', marginBottom: spacing.xl },
  qrCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.card,
    width: 280,
  },
  qrImage: { width: 240, height: 240, borderRadius: borderRadius.sm },
  nomCommercant: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginTop: spacing.md },
  placeholder: { color: colors.dark + '60', padding: spacing.xl },
  btnPartager: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  btnTexte: { color: colors.white, fontSize: fontSize.base, fontWeight: '600' },
});
