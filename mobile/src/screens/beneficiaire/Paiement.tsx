import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Card, Button, LinkButton } from '../../design-system/components';

type Etape = 'scan' | 'confirm';

interface QRPayload {
  app: string;
  type: string;
  commercant_id: string;
  montant?: number;
  version: string;
}

// atob n'est pas garanti disponible sur Hermes selon la version — décodeur
// base64 autonome plutôt que de dépendre d'un polyfill global.
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function decodeBase64(input: string): string {
  let str = input.replace(/[^A-Za-z0-9+/]/g, '');
  let output = '';
  for (let i = 0; i < str.length; i += 4) {
    const enc1 = B64_CHARS.indexOf(str[i]);
    const enc2 = B64_CHARS.indexOf(str[i + 1]);
    const enc3 = B64_CHARS.indexOf(str[i + 2]);
    const enc4 = B64_CHARS.indexOf(str[i + 3]);
    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;
    output += String.fromCharCode(chr1);
    if (enc3 !== -1 && str[i + 2] !== undefined) output += String.fromCharCode(chr2);
    if (enc4 !== -1 && str[i + 3] !== undefined) output += String.fromCharCode(chr3);
  }
  return output;
}

// Même format que web/src/pages/beneficiaire/Scanner.tsx#decodeQR —
// tikexo://paiement/<base64 JSON {app,type,commercant_id,montant?,version}>
function decodeQR(raw: string): QRPayload | null {
  const prefix = 'tikexo://paiement/';
  if (!raw.startsWith(prefix)) return null;
  try {
    const data = JSON.parse(decodeBase64(raw.slice(prefix.length)));
    if (data.app !== 'TIKEXO' || data.type !== 'PAIEMENT') return null;
    return data;
  } catch {
    return null;
  }
}

export default function Paiement() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [etape, setEtape] = useState<Etape>('scan');
  const [payload, setPayload] = useState<QRPayload | null>(null);
  const [montant, setMontant] = useState('');
  const [scanned, setScanned] = useState(false);

  // Bug connu expo-camera (iOS) : onBarcodeScanned ne se déclenche jamais si la
  // CameraView est montée dans le même cycle que l'octroi de la permission —
  // https://github.com/expo/expo/issues/28758. On force un remontage juste après.
  const [cameraKey, setCameraKey] = useState(0);
  const permissionEtaitAccordee = useRef(permission?.granted ?? false);
  useEffect(() => {
    if (permission?.granted && !permissionEtaitAccordee.current) {
      const t = setTimeout(() => setCameraKey((k) => k + 1), 300);
      permissionEtaitAccordee.current = true;
      return () => clearTimeout(t);
    }
    permissionEtaitAccordee.current = permission?.granted ?? false;
  }, [permission?.granted]);

  const { data: commercant } = useQuery({
    queryKey: ['commercant-fiche', payload?.commercant_id],
    queryFn: () => api.get(`/commercants/${payload!.commercant_id}/fiche`).then((r) => r.data.data),
    enabled: !!payload?.commercant_id,
  });

  const payer = useMutation({
    mutationFn: () =>
      api.post('/transactions', {
        commercantId: payload!.commercant_id,
        montantTotal: parseFloat(montant),
      }),
    onSuccess: () => {
      Alert.alert('TIKEXO', 'Paiement effectué avec succès !');
      reset();
    },
    onError: (err: any) => {
      Alert.alert('TIKEXO — Erreur', err.response?.data?.error || 'Paiement impossible');
    },
  });

  function reset() {
    setEtape('scan');
    setPayload(null);
    setMontant('');
    setScanned(false);
  }

  function handleScan({ data }: { data: string }) {
    if (scanned) return;
    const p = decodeQR(data);
    if (!p) return; // QR non reconnu — on continue de scanner
    setScanned(true);
    setPayload(p);
    if (p.montant && p.montant > 0) setMontant(String(p.montant));
    setEtape('confirm');
  }

  if (etape === 'confirm') {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.iconeConfirm}>
            <Ionicons name="storefront" size={28} color={colors.white} />
          </View>
          <Text style={styles.titre}>Confirmer le paiement</Text>
          <Text style={styles.label}>COMMERÇANT</Text>
          <Text style={styles.nomCommercant}>{commercant?.nom ?? 'Chargement…'}</Text>

          <Text style={styles.label}>MONTANT (XOF)</Text>
          <TextInput
            style={[styles.input, styles.inputMontant]}
            value={montant}
            onChangeText={setMontant}
            keyboardType="numeric"
            editable={!(payload?.montant && payload.montant > 0)}
            placeholder="0"
            placeholderTextColor={colors.dark + '60'}
          />

          <Button
            title={payer.isPending ? 'Traitement…' : 'Payer avec TIKEXO'}
            onPress={() => payer.mutate()}
            loading={payer.isPending}
            disabled={!montant || !commercant}
          />

          <LinkButton title="Rescanner" onPress={reset} style={styles.rescannerWrap} />
        </Card>
      </View>
    );
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.iconeConfirm}>
            <Ionicons name="camera" size={28} color={colors.white} />
          </View>
          <Text style={styles.titre}>Autoriser la caméra</Text>
          <Text style={styles.label}>TIKEXO a besoin de la caméra pour scanner le QR code du commerçant.</Text>
          <Button title="Autoriser" onPress={requestPermission} />
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.scanContainer}>
      <CameraView
        key={cameraKey}
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      <TouchableOpacity style={styles.btnFermer} onPress={() => navigation.navigate('Accueil' as never)}>
        <Ionicons name="close" size={22} color={colors.white} />
      </TouchableOpacity>
      <View style={styles.overlay}>
        <Text style={styles.overlayTexte}>Pointez la caméra vers le QR code du commerçant</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray, padding: spacing.md, justifyContent: 'center' },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  btnFermer: { position: 'absolute', top: spacing.xl, right: spacing.md, width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', bottom: spacing.xl, left: 0, right: 0, alignItems: 'center' },
  overlayTexte: { color: colors.white, fontSize: fontSize.sm, backgroundColor: '#00000099', padding: spacing.sm, borderRadius: borderRadius.md },
  card: {},
  iconeConfirm: {
    width: 52, height: 52, borderRadius: borderRadius.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.md,
  },
  titre: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginBottom: spacing.lg, textAlign: 'center' },
  label: { fontSize: fontSize.sm, color: colors.dark + 'AA', marginBottom: spacing.xs },
  nomCommercant: { fontSize: fontSize.md, fontWeight: '600', color: colors.dark, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.lightGray,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.dark,
    marginBottom: spacing.md,
    backgroundColor: colors.lightGray,
  },
  inputMontant: { fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center' },
  rescannerWrap: { alignItems: 'center', marginTop: spacing.md },
});
