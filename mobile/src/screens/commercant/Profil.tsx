import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Linking, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { RGPD } from '../../lib/rgpd';
import { verrouBiometriqueActif, setVerrouBiometriqueActif } from '../../lib/preferences';
import { TYPE_COMMERCANT_LABELS, DOC_TYPE_LABELS } from '../../lib/commercantConstants';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, Button, Badge, statutTone, LoadingState } from '../../design-system/components';

interface Fiche {
  id: string;
  nom: string;
  type: string;
  niveau: string;
  statut: string;
  mobile_money_numero: string;
  mobile_money_operateur: string;
  adresse?: string;
  ville: string;
  taux_commission: string;
  mode_reversement: string;
}

interface CommercantDocument {
  id: string;
  type: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  fichier_nom: string;
  fichier_url: string;
  motif_rejet?: string;
  createdAt: string;
}

const OPERATEURS = ['MTN', 'MOOV'] as const;
const TYPES_FICHIER_ACCEPTES = ['image/jpeg', 'image/png', 'application/pdf'];

export default function CommercantProfil() {
  const qc = useQueryClient();
  const { logout } = useAuth();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Fiche>>({});
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const [biometrieDisponible, setBiometrieDisponible] = useState(false);
  const [biometrieActive, setBiometrieActive] = useState(true);

  useEffect(() => {
    (async () => {
      const [materiel, enrole, preference] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        verrouBiometriqueActif(),
      ]);
      setBiometrieDisponible(materiel && enrole);
      setBiometrieActive(preference);
    })();
  }, []);

  async function basculerBiometrie(valeur: boolean) {
    setBiometrieActive(valeur);
    await setVerrouBiometriqueActif(valeur);
  }

  const { data: fiche, isLoading } = useQuery<Fiche>({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const { data: documents } = useQuery<CommercantDocument[]>({
    queryKey: ['commercant-documents', fiche?.id],
    queryFn: () => api.get(`/commercants/${fiche!.id}/documents`).then((r) => r.data.data),
    enabled: !!fiche?.id,
  });

  const modifierMut = useMutation({
    mutationFn: () => api.put(`/commercants/${fiche!.id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercant-moi'] }); setEditMode(false); },
    onError: (e: any) => Alert.alert('TIKEXO - Erreur', e?.response?.data?.error ?? "Échec de l'enregistrement du profil - réessayez."),
  });

  const uploadMut = useMutation({
    mutationFn: async ({ type, uri, name, mimeType }: { type: string; uri: string; name: string; mimeType: string }) => {
      const fd = new FormData();
      fd.append('type', type);
      // @ts-expect-error — forme attendue par React Native pour un fichier multipart
      fd.append('fichier', { uri, name, type: mimeType });
      return api.post('/commercants/moi/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commercant-documents', fiche?.id] }),
    onError: (e: any) => Alert.alert('TIKEXO - Erreur', e?.response?.data?.error ?? "Échec de l'envoi du document - réessayez."),
    onSettled: () => setUploadingType(null),
  });

  function startEdit() {
    if (!fiche) return;
    setForm({
      nom: fiche.nom, mobile_money_numero: fiche.mobile_money_numero,
      mobile_money_operateur: fiche.mobile_money_operateur, adresse: fiche.adresse, ville: fiche.ville,
    });
    setEditMode(true);
  }

  async function choisirDocument(type: string) {
    const res = await DocumentPicker.getDocumentAsync({ type: TYPES_FICHIER_ACCEPTES, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const f = res.assets[0];
    if (f.size && f.size > 10 * 1024 * 1024) { Alert.alert('TIKEXO', 'Fichier trop volumineux — 10 Mo maximum'); return; }
    setUploadingType(type);
    uploadMut.mutate({ type, uri: f.uri, name: f.name, mimeType: f.mimeType || 'application/octet-stream' });
  }

  if (isLoading) return <LoadingState />;

  if (!fiche) {
    return (
      <Screen style={styles.introuvable}>
        <Text style={styles.introuvableTexte}>Profil commerçant introuvable.</Text>
      </Screen>
    );
  }

  const rows = [
    { icon: 'storefront' as const, label: 'Nom', value: fiche.nom },
    { icon: 'pricetag' as const, label: 'Type', value: TYPE_COMMERCANT_LABELS[fiche.type] || fiche.type },
    { icon: 'call' as const, label: 'Mobile Money', value: `${fiche.mobile_money_numero} (${fiche.mobile_money_operateur})` },
    { icon: 'location' as const, label: 'Adresse', value: fiche.adresse ?? '—' },
    { icon: 'location' as const, label: 'Ville', value: fiche.ville },
    { icon: 'stats-chart' as const, label: 'Commission', value: `${fiche.taux_commission}%` },
    { icon: 'card' as const, label: 'Reversement', value: fiche.mode_reversement?.replace(/_/g, ' ') ?? '—' },
    { icon: 'shield-checkmark' as const, label: 'Niveau', value: fiche.niveau },
    { icon: 'shield-checkmark' as const, label: 'Statut', value: fiche.statut },
  ];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="storefront" size={18} color={colors.dark + '80'} />
          <Text style={styles.sectionTitre}>Informations boutique</Text>
          {!editMode && (
            <TouchableOpacity style={styles.btnModifier} onPress={startEdit}>
              <Ionicons name="pencil" size={13} color={colors.primary} />
              <Text style={styles.btnModifierTexte}>Modifier</Text>
            </TouchableOpacity>
          )}
        </View>

        {editMode ? (
          <>
            <Champ label="Nom du commerce" value={form.nom ?? ''} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} />
            <Champ label="Numéro Mobile Money" value={form.mobile_money_numero ?? ''} onChange={(v) => setForm((f) => ({ ...f, mobile_money_numero: v }))} keyboardType="phone-pad" />

            <Text style={styles.champLabel}>Opérateur Mobile Money</Text>
            <View style={styles.operateurs}>
              {OPERATEURS.map((op) => (
                <TouchableOpacity
                  key={op}
                  style={[styles.operateurChip, form.mobile_money_operateur === op && styles.operateurChipActif]}
                  onPress={() => setForm((f) => ({ ...f, mobile_money_operateur: op }))}
                >
                  <Text style={[styles.operateurTexte, form.mobile_money_operateur === op && styles.operateurTexteActif]}>{op}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Champ label="Adresse" value={form.adresse ?? ''} onChange={(v) => setForm((f) => ({ ...f, adresse: v }))} />
            <Champ label="Ville" value={form.ville ?? ''} onChange={(v) => setForm((f) => ({ ...f, ville: v }))} />

            <View style={styles.editActions}>
              <Button title="Annuler" variant="secondary" onPress={() => setEditMode(false)} style={styles.editBtn} />
              <Button title="Enregistrer" onPress={() => modifierMut.mutate()} loading={modifierMut.isPending} style={styles.editBtn} />
            </View>
          </>
        ) : (
          rows.map((r) => (
            <View key={r.label} style={styles.row}>
              <Ionicons name={r.icon} size={15} color={colors.dark + '60'} style={styles.rowIcon} />
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowValue}>{r.value}</Text>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="document-text" size={18} color={colors.dark + '80'} />
          <Text style={styles.sectionTitre}>Documents</Text>
          <Text style={styles.optionnel}>Optionnel</Text>
        </View>

        {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => {
          const doc = documents?.find((d) => d.type === type);
          return (
            <View key={type} style={styles.docRow}>
              <View style={styles.docInfo}>
                <Text style={styles.docLabel}>{label}</Text>
                {doc && <Text style={styles.docSous}>{doc.fichier_nom} · {new Date(doc.createdAt).toLocaleDateString('fr-FR')}</Text>}
                {doc?.statut === 'REJETE' && doc.motif_rejet && (
                  <Text style={styles.docRejet}>{doc.motif_rejet}</Text>
                )}
              </View>
              <View style={styles.docActions}>
                {doc && <Badge label={doc.statut} tone={statutTone(doc.statut)} />}
                {doc && (
                  <TouchableOpacity onPress={() => Linking.openURL(doc.fichier_url)} style={styles.docIconBtn}>
                    <Ionicons name="eye" size={16} color={colors.dark + '80'} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => choisirDocument(type)}
                  disabled={uploadingType === type}
                  style={styles.docIconBtn}
                >
                  <Ionicons name="cloud-upload" size={16} color={uploadingType === type ? colors.dark + '40' : colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed" size={18} color={colors.dark + '80'} />
          <Text style={styles.sectionTitre}>Sécurité</Text>
        </View>
        <View style={styles.toggleLigne}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowValue}>Verrou biométrique</Text>
            <Text style={styles.docSous}>
              {biometrieDisponible ? "Face ID / empreinte requis à l'ouverture de l'app" : 'Non configuré sur cet appareil'}
            </Text>
          </View>
          <Switch
            value={biometrieActive && biometrieDisponible}
            onValueChange={basculerBiometrie}
            disabled={!biometrieDisponible}
            trackColor={{ true: colors.accent, false: colors.lightGray }}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="help-circle" size={18} color={colors.dark + '80'} />
          <Text style={styles.sectionTitre}>Aide & support</Text>
        </View>
        <TouchableOpacity style={styles.docRow} onPress={() => Linking.openURL(`mailto:${RGPD.contact_support}`)}>
          <View style={styles.docInfo}>
            <Text style={styles.docLabel}>Contacter le support TIKEXO</Text>
            <Text style={styles.docSous}>{RGPD.contact_support}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.dark + '40'} />
        </TouchableOpacity>
      </Card>

      <TouchableOpacity style={styles.deconnexionBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={16} color={colors.dark + '99'} />
        <Text style={styles.deconnexionTexte}>Déconnexion</Text>
      </TouchableOpacity>
    </Screen>
  );
}

function Champ({ label, value, onChange, keyboardType }: { label: string; value: string; onChange: (v: string) => void; keyboardType?: 'default' | 'phone-pad' }) {
  return (
    <View style={styles.champWrap}>
      <Text style={styles.champLabel}>{label}</Text>
      <TextInput style={styles.input} value={value} onChangeText={onChange} keyboardType={keyboardType} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  introuvable: { alignItems: 'center', justifyContent: 'center' },
  introuvableTexte: { color: colors.dark + '60', fontSize: fontSize.sm },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitre: { fontSize: fontSize.base, fontWeight: '600', color: colors.dark, flex: 1 },
  optionnel: { fontSize: fontSize.xs, color: colors.dark + '60' },
  btnModifier: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  btnModifierTexte: { fontSize: fontSize.xs, fontWeight: '600', color: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  rowIcon: { marginRight: spacing.sm },
  rowLabel: { fontSize: fontSize.xs, color: colors.dark + '80', width: 100 },
  rowValue: { flex: 1, fontSize: fontSize.sm, color: colors.dark, fontWeight: '600' },
  champWrap: { marginBottom: spacing.sm },
  champLabel: { fontSize: fontSize.xs, color: colors.dark + '99', marginBottom: spacing.xs },
  input: {
    borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md,
    padding: spacing.sm, fontSize: fontSize.base, backgroundColor: colors.background, color: colors.dark,
  },
  operateurs: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  operateurChip: { flex: 1, borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md, paddingVertical: spacing.sm, alignItems: 'center' },
  operateurChipActif: { backgroundColor: colors.primary, borderColor: colors.primary },
  operateurTexte: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  operateurTexteActif: { color: colors.white },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  editBtn: { flex: 1 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.lightGray },
  docInfo: { flex: 1 },
  docLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  docSous: { fontSize: fontSize.xs, color: colors.dark + '60', marginTop: 2 },
  docRejet: { fontSize: fontSize.xs, color: colors.danger, backgroundColor: '#FEF2F2', borderRadius: borderRadius.sm, padding: spacing.xs, marginTop: spacing.xs },
  docActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginLeft: spacing.sm },
  docIconBtn: { padding: 4 },
  toggleLigne: { flexDirection: 'row', alignItems: 'center' },
  deconnexionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  deconnexionTexte: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark + '99' },
});
