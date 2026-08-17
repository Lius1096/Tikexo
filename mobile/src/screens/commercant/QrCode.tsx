import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeSVG from 'react-native-qrcode-svg';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Card, LoadingState } from '../../design-system/components';

// Même encodeur base64 « à la main » que le décodeur de Paiement.tsx —
// évite de dépendre de btoa, pas garanti disponible sur Hermes.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function encodeBase64(input: string): string {
  let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const c1 = input.charCodeAt(i);
    const c2 = input.charCodeAt(i + 1);
    const c3 = input.charCodeAt(i + 2);
    output += B64_CHARS[c1 >> 2];
    output += B64_CHARS[((c1 & 3) << 4) | (isNaN(c2) ? 0 : c2 >> 4)];
    output += isNaN(c2) ? '=' : B64_CHARS[((c2 & 15) << 2) | (isNaN(c3) ? 0 : c3 >> 6)];
    output += isNaN(c3) ? '=' : B64_CHARS[c3 & 63];
  }
  return output;
}

// Même format que web/src/pages/commercant/Caisse.tsx#buildQRValue — le
// montant est saisi PAR LE COMMERÇANT avant génération du QR, jamais par le
// client qui scanne. Sans ça, le client scannant un QR sans montant se
// retrouvait à saisir lui-même la somme à payer — faille de confiance/
// fraude, corrigée ici en repoussant la saisie côté commerçant, comme sur
// le web.
function buildQRValue(commercantId: string, montant: number): string {
  const data: Record<string, unknown> = { app: 'TIKEXO', type: 'PAIEMENT', commercant_id: commercantId, version: '1' };
  if (montant > 0) data.montant = montant;
  return `tikexo://paiement/${encodeBase64(JSON.stringify(data))}`;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

export default function QrCode() {
  const [montantSaisi, setMontantSaisi] = useState('');

  const { data: commercant, isLoading } = useQuery({
    queryKey: ['mon-commercant'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const montant = parseInt(montantSaisi, 10) || 0;

  function pressKey(k: string) {
    if (k === 'DEL') { setMontantSaisi((v) => v.slice(0, -1)); return; }
    if (k === 'CLR') { setMontantSaisi(''); return; }
    if (montantSaisi.length >= 7) return;
    setMontantSaisi((v) => v + k);
  }

  if (isLoading) return <LoadingState />;

  const qrValue = commercant ? buildQRValue(commercant.id, montant) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Encaisser par QR</Text>
      <Text style={styles.sous}>Saisissez le montant, puis présentez le QR au client</Text>

      <Card style={styles.qrCard}>
        <Text style={styles.montantLabel}>MONTANT À PAYER</Text>
        <Text style={montant > 0 ? styles.montant : styles.montantVide}>
          {montant > 0 ? `${montant.toLocaleString('fr-FR')} XOF` : '— — —'}
        </Text>

        <View style={styles.qrZone}>
          {montant > 0 && qrValue ? (
            <QRCodeSVG value={qrValue} size={200} color={colors.primary} backgroundColor="#ffffff" />
          ) : (
            <View style={styles.placeholderWrap}>
              <Ionicons name="qr-code-outline" size={48} color={colors.dark + '30'} />
              <Text style={styles.placeholder}>Saisissez un montant pour générer le QR</Text>
            </View>
          )}
        </View>
        {montant > 0 && <Text style={styles.nomCommercant}>{commercant?.nom}</Text>}
      </Card>

      <View style={styles.keypad}>
        {KEYS.map((k) => (
          <TouchableOpacity key={k} style={styles.key} onPress={() => pressKey(k)}>
            {k === 'DEL' ? (
              <Ionicons name="backspace-outline" size={18} color={colors.dark + '99'} />
            ) : (
              <Text style={styles.keyText}>{k === 'CLR' ? 'C' : k}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.lg, alignItems: 'center' },
  titre: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
  sous: { fontSize: fontSize.sm, color: colors.dark + '80', marginBottom: spacing.lg, textAlign: 'center' },
  qrCard: { alignItems: 'center', width: '100%' },
  montantLabel: { fontSize: fontSize.xs, color: colors.dark + '80', letterSpacing: 1 },
  montant: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.primary, marginTop: spacing.xs, marginBottom: spacing.md },
  montantVide: { fontSize: fontSize.xl, fontWeight: '700', color: colors.dark + '30', marginTop: spacing.xs, marginBottom: spacing.md },
  qrZone: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center' },
  placeholderWrap: { alignItems: 'center', padding: spacing.lg },
  placeholder: { color: colors.dark + '60', marginTop: spacing.sm, textAlign: 'center', fontSize: fontSize.xs },
  nomCommercant: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginTop: spacing.md },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', maxWidth: 280, justifyContent: 'space-between', marginTop: spacing.lg },
  key: {
    width: '31%', height: 52, borderRadius: borderRadius.md, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  keyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.dark },
});
