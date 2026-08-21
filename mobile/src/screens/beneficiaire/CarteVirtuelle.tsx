import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCodeSVG from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, Button, LoadingState, CarteRecto, CarteVerso, CarteData } from '../../design-system/components';

// ─── Modal QR plein écran — même logique que web/beneficiaire/Carte.tsx#ModalQR ──
function ModalQR({ carteId, onClose }: { carteId: string; onClose: () => void }) {
  const [secondes, setSecondes] = useState(60);

  const { data, refetch } = useQuery({
    queryKey: ['carte-qr', carteId],
    queryFn: () => api.get(`/cartes/${carteId}/qrcode`).then((r) => r.data.data),
  });

  useEffect(() => {
    if (!data) return;
    setSecondes(Math.max(0, data.secondes_restantes ?? 60));
  }, [data]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondes((s) => {
        if (s <= 1) { refetch(); return 60; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalQrFond}>
        <TouchableOpacity onPress={onClose} style={styles.modalQrFermer}>
          <Ionicons name="close" size={18} color={colors.white} />
        </TouchableOpacity>

        <Text style={styles.modalQrTitre}>QR CODE DE PAIEMENT</Text>

        <View style={styles.modalQrZone}>
          {data?.qr_url ? (
            <QRCodeSVG value={data.qr_url} size={200} color="#1A3B8C" backgroundColor="#ffffff" />
          ) : (
            <Ionicons name="qr-code" size={80} color={colors.primary + '30'} />
          )}
        </View>

        <View style={styles.compteur}>
          <Text style={styles.compteurTexte}>{secondes}s</Text>
        </View>

        <Text style={styles.modalQrSous}>Code valide {secondes}s · Se régénère automatiquement</Text>
        <Text style={styles.modalQrSous2}>Présentez ce code au commerçant TIKEXO</Text>
      </View>
    </Modal>
  );
}

export default function CarteVirtuelle() {
  const qc = useQueryClient();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [cvv, setCvv] = useState<string | undefined>(undefined);
  const [cvvSecondes, setCvvSecondes] = useState(0);
  const [showVerso, setShowVerso] = useState(false);
  const [confirmBloquer, setConfirmBloquer] = useState(false);
  const [showDemandePhysique, setShowDemandePhysique] = useState(false);
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [copie, setCopie] = useState(false);

  const { data: carte, isLoading } = useQuery<CarteData | null>({
    queryKey: ['ma-carte'],
    queryFn: () => api.get('/cartes/moi').then((r) => r.data.data),
  });

  const creerMut = useMutation({
    mutationFn: () => api.post('/cartes/virtuelle'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ma-carte'] }),
    onError: (e: any) => Alert.alert('TIKEXO — Erreur', e?.response?.data?.error ?? 'Erreur création carte'),
  });

  const bloquerMut = useMutation({
    mutationFn: () => api.post(`/cartes/${carte?.id}/bloquer-moi`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ma-carte'] }); setConfirmBloquer(false); },
    onError: (e: any) => Alert.alert('TIKEXO — Erreur', e?.response?.data?.error ?? 'Erreur blocage carte'),
  });

  const demanderPhysiqueMut = useMutation({
    mutationFn: () => api.post('/cartes/physique/demande', { adresse_livraison: adresseLivraison }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ma-carte'] });
      setShowDemandePhysique(false);
      setAdresseLivraison('');
      Alert.alert('TIKEXO', 'Demande envoyée');
    },
    onError: (e: any) => Alert.alert('TIKEXO — Erreur', e?.response?.data?.error ?? 'Erreur lors de la demande'),
  });

  const getCVV = useCallback(async () => {
    if (!carte?.id) return;
    try {
      const r = await api.post(`/cartes/${carte.id}/cvv`);
      setCvv(r.data.data.cvv);
      setCvvSecondes(30);
      setShowCVV(true);
    } catch (e: any) {
      Alert.alert('TIKEXO — Erreur', e?.response?.data?.error ?? 'Erreur CVV');
    }
  }, [carte?.id]);

  useEffect(() => {
    if (!showCVV || cvvSecondes <= 0) return;
    const t = setInterval(() => setCvvSecondes((s) => {
      if (s <= 1) { setShowCVV(false); setCvv(undefined); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [showCVV, cvvSecondes]);

  async function copierNumero() {
    if (!carte) return;
    await Clipboard.setStringAsync(carte.numero_masque.replace(/\s/g, ''));
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  }

  if (isLoading) return <LoadingState />;

  if (!carte) {
    return (
      <Screen scroll contentContainerStyle={styles.videContainer}>
        <View style={styles.videIcone}>
          <Ionicons name="shield" size={28} color={colors.primary} />
        </View>
        <Text style={styles.videTitre}>Votre carte TIKEXO</Text>
        <Text style={styles.videSous}>Activez votre carte virtuelle pour payer dans les restaurants partenaires.</Text>
        <Button
          title={creerMut.isPending ? 'Création…' : 'Activer ma carte virtuelle'}
          onPress={() => creerMut.mutate()}
          loading={creerMut.isPending}
          style={styles.videBtn}
        />
      </Screen>
    );
  }

  return (
    <>
      {showQRModal && <ModalQR carteId={carte.id} onClose={() => setShowQRModal(false)} />}

      <Screen scroll contentContainerStyle={styles.container}>
        <View style={styles.carteWrap}>
          {showVerso ? <CarteVerso cvv={showCVV ? cvv : undefined} /> : <CarteRecto carte={carte} cvv={showCVV ? cvv : undefined} />}
        </View>

        {showCVV && (
          <View style={styles.cvvBar}>
            <View style={styles.cvvBarLigne}>
              <Text style={styles.cvvBarLabel}>CVV visible pendant</Text>
              <Text style={styles.cvvBarSecondes}>{cvvSecondes}s</Text>
            </View>
            <View style={styles.cvvProgressFond}>
              <View style={[styles.cvvProgress, { width: `${(cvvSecondes / 30) * 100}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimaire]}
            onPress={() => setShowQRModal(true)}
            disabled={carte.statut !== 'ACTIVE'}
          >
            <Ionicons name="qr-code" size={22} color={colors.white} />
            <Text style={styles.actionTextePrimaire}>Payer QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, showCVV ? styles.actionBtnAccent : styles.actionBtnSecondaire]}
            onPress={showCVV ? () => { setShowCVV(false); setCvv(undefined); } : getCVV}
            disabled={carte.statut !== 'ACTIVE'}
          >
            <Ionicons name={showCVV ? 'eye-off' : 'eye'} size={22} color={showCVV ? colors.white : colors.dark} />
            <Text style={showCVV ? styles.actionTextePrimaire : styles.actionTexteSecondaire}>{showCVV ? 'Masquer' : 'Voir CVV'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondaire]} onPress={() => setShowVerso((v) => !v)}>
            <Ionicons name="sync" size={22} color={colors.dark} />
            <Text style={styles.actionTexteSecondaire}>{showVerso ? 'Recto' : 'Verso'}</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Numéro</Text>
            <View style={styles.numeroLigne}>
              <Text style={styles.numeroValeur}>{carte.numero_masque}</Text>
              <TouchableOpacity onPress={copierNumero} style={styles.copierBtn}>
                <Ionicons name={copie ? 'checkmark' : 'copy-outline'} size={14} color={copie ? colors.success : colors.dark + '80'} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Type</Text>
            <Text style={styles.infoValeur}>{carte.type === 'VIRTUELLE' ? 'Carte virtuelle' : 'Carte physique'}</Text>
          </View>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Statut</Text>
            <Text style={[styles.infoValeur, { color: carte.statut === 'ACTIVE' ? colors.success : carte.statut === 'BLOQUEE' ? colors.danger : colors.dark + '99' }]}>
              {carte.statut}
            </Text>
          </View>
          <View style={styles.infoLigne}>
            <Text style={styles.infoLabel}>Expiration</Text>
            <Text style={styles.infoValeur}>
              {new Date(carte.date_expiration).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' })}
            </Text>
          </View>
        </Card>

        {carte.type === 'VIRTUELLE' && carte.statut === 'ACTIVE' && !showDemandePhysique && (
          <TouchableOpacity style={styles.demandeBtn} onPress={() => setShowDemandePhysique(true)}>
            <View style={styles.demandeIcone}>
              <Ionicons name="card" size={16} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.demandeTitre}>Demander une carte physique</Text>
              <Text style={styles.demandeSous}>NFC · EMV · ISO 7810</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.dark + '40'} />
          </TouchableOpacity>
        )}

        {showDemandePhysique && (
          <Card variant="info" style={styles.demandeForm}>
            <View style={styles.demandeFormHeader}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={styles.demandeFormTitre}>Adresse de livraison</Text>
            </View>
            <Text style={styles.demandeFormTexte}>
              TIKEXO Ops produira votre carte et vous l'enverra à cette adresse. Un code d'activation vous sera communiqué à réception.
            </Text>
            <TextInput
              style={styles.demandeInput}
              value={adresseLivraison}
              onChangeText={setAdresseLivraison}
              placeholder="Ex: Quartier Fidjrossè, Rue des Cocotiers, Cotonou, Bénin"
              multiline
              numberOfLines={3}
            />
            <View style={styles.demandeActions}>
              <Button
                title={demanderPhysiqueMut.isPending ? 'Envoi…' : 'Soumettre la demande'}
                onPress={() => demanderPhysiqueMut.mutate()}
                loading={demanderPhysiqueMut.isPending}
                disabled={!adresseLivraison.trim()}
                style={{ flex: 1 }}
              />
              <TouchableOpacity onPress={() => { setShowDemandePhysique(false); setAdresseLivraison(''); }} style={styles.demandeAnnuler}>
                <Text style={styles.demandeAnnulerTexte}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {carte.statut === 'ACTIVE' && !confirmBloquer && (
          <TouchableOpacity style={styles.bloquerBtn} onPress={() => setConfirmBloquer(true)}>
            <Ionicons name="lock-closed" size={13} color={colors.danger} />
            <Text style={styles.bloquerTexte}>Bloquer la carte</Text>
          </TouchableOpacity>
        )}

        {confirmBloquer && (
          <View style={styles.confirmBloquer}>
            <View style={styles.confirmBloquerLigne}>
              <Ionicons name="warning" size={14} color={colors.danger} />
              <Text style={styles.confirmBloquerTexte}>
                Bloquer la carte empêche tout paiement immédiatement. Vous pourrez la débloquer depuis votre employeur.
              </Text>
            </View>
            <View style={styles.demandeActions}>
              <Button
                title={bloquerMut.isPending ? 'Blocage…' : 'Confirmer le blocage'}
                variant="danger"
                onPress={() => bloquerMut.mutate()}
                loading={bloquerMut.isPending}
                style={{ flex: 1 }}
              />
              <TouchableOpacity onPress={() => setConfirmBloquer(false)} style={styles.demandeAnnuler}>
                <Text style={styles.demandeAnnulerTexte}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.md, paddingBottom: spacing.xl },
  videContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  videIcone: { width: 64, height: 64, borderRadius: borderRadius.lg, backgroundColor: colors.lightBlue, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  videTitre: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark, marginBottom: spacing.xs },
  videSous: { fontSize: fontSize.sm, color: colors.dark + '80', textAlign: 'center', marginBottom: spacing.lg, maxWidth: 260 },
  videBtn: { paddingHorizontal: spacing.xl },
  carteWrap: { marginBottom: spacing.md, marginTop: spacing.sm },
  cvvBar: { backgroundColor: colors.primary + '0D', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  cvvBarLigne: { flexDirection: 'row', justifyContent: 'space-between' },
  cvvBarLabel: { fontSize: fontSize.xs, color: colors.dark + '99' },
  cvvBarSecondes: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  cvvProgressFond: { height: 2, backgroundColor: colors.lightGray, borderRadius: 2, marginTop: spacing.xs, overflow: 'hidden' },
  cvvProgress: { height: '100%', backgroundColor: colors.accent },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.md, borderRadius: borderRadius.md },
  actionBtnPrimaire: { backgroundColor: colors.primary },
  actionBtnAccent: { backgroundColor: colors.accent },
  actionBtnSecondaire: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightGray },
  actionTextePrimaire: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },
  actionTexteSecondaire: { color: colors.dark, fontSize: fontSize.xs, fontWeight: '600' },
  infoCard: { marginBottom: spacing.md },
  infoLigne: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.lightGray },
  infoLabel: { fontSize: fontSize.xs, color: colors.dark + '80' },
  infoValeur: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  numeroLigne: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numeroValeur: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark, letterSpacing: 1 },
  copierBtn: { padding: 4 },
  demandeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md,
  },
  demandeIcone: { width: 36, height: 36, borderRadius: borderRadius.sm, backgroundColor: colors.lightBlue, alignItems: 'center', justifyContent: 'center' },
  demandeTitre: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  demandeSous: { fontSize: fontSize.xs, color: colors.dark + '60', marginTop: 2 },
  demandeForm: { marginBottom: spacing.md },
  demandeFormHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  demandeFormTitre: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  demandeFormTexte: { fontSize: fontSize.xs, color: colors.primary + 'CC', marginBottom: spacing.sm, lineHeight: 16 },
  demandeInput: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.lightBlue, borderRadius: borderRadius.sm,
    padding: spacing.sm, fontSize: fontSize.xs, minHeight: 60, textAlignVertical: 'top', marginBottom: spacing.sm,
  },
  demandeActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  demandeAnnuler: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  demandeAnnulerTexte: { fontSize: fontSize.xs, color: colors.dark + '80' },
  bloquerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    borderWidth: 1, borderColor: '#FEE2E2', borderRadius: borderRadius.md, paddingVertical: spacing.sm,
  },
  bloquerTexte: { fontSize: fontSize.xs, fontWeight: '600', color: colors.danger },
  confirmBloquer: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: borderRadius.md, padding: spacing.md },
  confirmBloquerLigne: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, marginBottom: spacing.sm },
  confirmBloquerTexte: { flex: 1, fontSize: fontSize.xs, color: colors.danger, lineHeight: 16 },
  modalQrFond: { flex: 1, backgroundColor: '#1A3B8C', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  modalQrFermer: { position: 'absolute', top: spacing.xl, right: spacing.lg, width: 36, height: 36, borderRadius: borderRadius.full, backgroundColor: '#FFFFFF1A', alignItems: 'center', justifyContent: 'center' },
  modalQrTitre: { color: '#FFFFFF99', fontSize: fontSize.xs, letterSpacing: 2, marginBottom: spacing.lg },
  modalQrZone: { width: 224, height: 224, backgroundColor: colors.white, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  compteur: { width: 56, height: 56, borderRadius: borderRadius.full, borderWidth: 3, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  compteurTexte: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600' },
  modalQrSous: { color: '#FFFFFF66', fontSize: fontSize.xs, marginTop: spacing.md, textAlign: 'center' },
  modalQrSous2: { color: '#FFFFFF40', fontSize: fontSize.xs, marginTop: 2 },
});
