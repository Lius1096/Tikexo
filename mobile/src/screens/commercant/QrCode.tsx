import React from 'react';
import { View, Text, Image, StyleSheet, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Card, Button, LoadingState } from '../../design-system/components';

export default function QrCode() {
  const { data: commercant, isLoading } = useQuery({
    queryKey: ['mon-commercant'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const partager = async () => {
    if (commercant?.qr_code_url) {
      await Share.share({
        message: `Payez chez ${commercant.nom} avec TIKEXO : ${commercant.qr_code_url}`,
        url: commercant.qr_code_url,
      });
    }
  };

  if (isLoading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Mon QR Code TIKEXO</Text>
      <Text style={styles.sous}>Les clients scannent ce code pour vous payer</Text>

      <Card style={styles.qrCard}>
        {commercant?.qr_code_url ? (
          <>
            <Image source={{ uri: commercant.qr_code_url }} style={styles.qrImage} />
            <Text style={styles.nomCommercant}>{commercant.nom}</Text>
          </>
        ) : (
          <View style={styles.placeholderWrap}>
            <Ionicons name="qr-code-outline" size={48} color={colors.dark + '40'} />
            <Text style={styles.placeholder}>QR Code en cours de génération...</Text>
          </View>
        )}
      </Card>

      <Button title="Partager mon QR Code" onPress={partager} variant="gold" style={styles.btnPartager} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.lg, alignItems: 'center' },
  titre: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  sous: { fontSize: fontSize.sm, color: colors.dark + '80', marginBottom: spacing.xl },
  qrCard: { alignItems: 'center', width: 280 },
  qrImage: { width: 240, height: 240, borderRadius: borderRadius.sm },
  nomCommercant: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginTop: spacing.md },
  placeholderWrap: { alignItems: 'center', padding: spacing.xl },
  placeholder: { color: colors.dark + '60', marginTop: spacing.sm, textAlign: 'center' },
  btnPartager: { marginTop: spacing.lg, paddingHorizontal: spacing.xl },
});
