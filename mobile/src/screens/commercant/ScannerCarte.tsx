import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Card, Button, ListRow, EmptyState } from '../../design-system/components';

// QR carte bénéficiaire : "tikexo:<payloadStr>::<signature>" — format distinct
// du QR marchand affiché par QrCode.tsx (tikexo://paiement/<base64>).
// Même décodage que web/src/pages/commercant/Caisse.tsx#decodeCardQR.
function decodeCardQR(raw: string): { payloadStr: string; signature: string } | null {
  const prefix = 'tikexo:';
  if (!raw.startsWith(prefix)) return null;
  const [payloadStr, signature] = raw.slice(prefix.length).split('::');
  return payloadStr && signature ? { payloadStr, signature } : null;
}

interface Transaction {
  id: string;
  montant_total: string;
  statut: string;
  createdAt: string;
  beneficiaire?: { nom: string; prenom: string };
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', 'DEL'];

export default function ScannerCarte() {
  const qc = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [montantSaisi, setMontantSaisi] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  // Même correctif que beneficiaire/Paiement.tsx (bug expo-camera iOS #28758).
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

  const montant = parseInt(montantSaisi, 10) || 0;

  const payerCarte = useMutation({
    mutationFn: (body: { payload: string; signature: string; montantTotal: number }) =>
      api.post('/cartes/paiement/qr/payer', body).then((r) => r.data.data),
    onSuccess: () => {
      setMontantSaisi('');
      setScanning(false);
      qc.invalidateQueries({ queryKey: ['transactions-jour'] });
    },
    onError: (err: any) => {
      Alert.alert('TIKEXO — Erreur', err.response?.data?.error || 'Paiement refusé, réessayez.');
    },
  });

  function pressKey(k: string) {
    if (k === 'DEL') { setMontantSaisi((v) => v.slice(0, -1)); return; }
    if (k === 'CLR') { setMontantSaisi(''); return; }
    if (montantSaisi.length >= 7) return;
    setMontantSaisi((v) => v + k);
  }

  function handleScan({ data }: { data: string }) {
    if (scanned) return;
    const p = decodeCardQR(data);
    if (!p) return; // QR non reconnu — on continue de scanner
    setScanned(true);
    payerCarte.mutate({ payload: p.payloadStr, signature: p.signature, montantTotal: montant });
  }

  function ouvrirScan() {
    setScanned(false);
    setScanning(true);
  }

  const { data: txData } = useQuery({
    queryKey: ['transactions-jour'],
    queryFn: () => api.get('/transactions?limit=30').then((r) => r.data.data),
    refetchInterval: 8000,
  });

  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
  const transactions: Transaction[] = txData?.items ?? [];
  const validees = transactions.filter((t) => t.statut === 'VALIDEE' && new Date(t.createdAt) >= debutJour);
  const totalJour = validees.reduce((s, t) => s + parseFloat(t.montant_total), 0);

  if (scanning) {
    if (!permission?.granted) {
      return (
        <View style={styles.scanFallback}>
          <Ionicons name="camera" size={40} color={colors.white} />
          <Text style={styles.scanFallbackTexte}>Autorisation caméra requise</Text>
          <Button title="Autoriser" onPress={requestPermission} />
          <Button title="Annuler" variant="secondary" onPress={() => setScanning(false)} style={styles.btnAnnulerLight} />
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
        <TouchableOpacity style={styles.btnFermer} onPress={() => setScanning(false)}>
          <Ionicons name="close" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={styles.overlay}>
          <Text style={styles.overlayMontant}>{montant.toLocaleString('fr-FR')} XOF</Text>
          <Text style={styles.overlayTexte}>Pointez la caméra vers la carte TIKEXO du client</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Aujourd'hui</Text>
          <Text style={styles.headerValue}>{totalJour.toLocaleString('fr-FR')} XOF</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerLabel}>Transactions</Text>
          <Text style={styles.headerValue}>{validees.length}</Text>
        </View>
      </View>

      <Card style={styles.keypadCard}>
        <Text style={styles.montantLabel}>MONTANT À ENCAISSER</Text>
        <Text style={montant > 0 ? styles.montant : styles.montantVide}>
          {montant > 0 ? `${montant.toLocaleString('fr-FR')} XOF` : '— — —'}
        </Text>

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

        <Button
          title="Scanner la carte du client"
          onPress={ouvrirScan}
          disabled={montant === 0}
          style={styles.btnScanner}
        />
      </Card>

      <FlatList
        data={validees}
        keyExtractor={(item) => item.id}
        style={styles.feed}
        ListHeaderComponent={<Text style={styles.feedTitre}>Paiements du jour</Text>}
        ListEmptyComponent={<EmptyState icon="bag-handle-outline" title="Aucun paiement aujourd'hui" />}
        renderItem={({ item }) => (
          <ListRow
            icon="checkmark-circle"
            iconColor={colors.success}
            iconBg="#dcfce7"
            title={`${item.beneficiaire?.prenom ?? ''} ${item.beneficiaire?.nom ?? ''}`.trim() || 'Bénéficiaire'}
            subtitle={new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            rightPrimary={`+${Number(item.montant_total).toLocaleString('fr-FR')} XOF`}
            rightPrimaryColor={colors.success}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.primary, padding: spacing.md,
  },
  headerRight: { alignItems: 'flex-end' },
  headerLabel: { color: colors.white + '80', fontSize: fontSize.xs },
  headerValue: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700', marginTop: 2 },
  keypadCard: { margin: spacing.md, alignItems: 'center' },
  montantLabel: { color: colors.dark + '80', fontSize: fontSize.xs, letterSpacing: 1 },
  montant: { color: colors.primary, fontSize: fontSize.xxl, fontWeight: '700', marginTop: spacing.xs, marginBottom: spacing.md },
  montantVide: { color: colors.dark + '40', fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.xs, marginBottom: spacing.md },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' },
  key: {
    width: '31%', height: 48, borderRadius: borderRadius.md, backgroundColor: colors.lightGray,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  keyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.dark },
  btnScanner: { width: '100%', marginTop: spacing.sm },
  feed: { flex: 1, paddingBottom: spacing.md },
  feedTitre: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark + '99', marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  scanContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', bottom: spacing.xl, left: 0, right: 0, alignItems: 'center' },
  overlayMontant: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700', backgroundColor: '#00000099', paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  overlayTexte: { color: colors.white, fontSize: fontSize.sm, backgroundColor: '#00000099', padding: spacing.sm, borderRadius: borderRadius.md },
  btnFermer: { position: 'absolute', top: spacing.xl, right: spacing.md, width: 40, height: 40, borderRadius: borderRadius.full, backgroundColor: '#00000099', alignItems: 'center', justifyContent: 'center' },
  scanFallback: { flex: 1, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  scanFallbackTexte: { color: colors.white, fontSize: fontSize.base, textAlign: 'center' },
  btnAnnulerLight: { borderColor: colors.white },
});
