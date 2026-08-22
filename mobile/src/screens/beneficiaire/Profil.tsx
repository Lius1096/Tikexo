import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Linking, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { RGPD, texteRetentionPersonnelles, texteRetentionFinancieres } from '../../lib/rgpd';
import { verrouBiometriqueActif, setVerrouBiometriqueActif } from '../../lib/preferences';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Screen, Card, Button, LoadingState } from '../../design-system/components';

export default function BeneficiaireProfil() {
  const { logout } = useAuth();
  const [exportLoading, setExportLoading] = useState(false);
  const [cloturerOpen, setCloturerOpen] = useState(false);
  const [confirmCloture, setConfirmCloture] = useState('');
  const [cloturerLoading, setCloturerLoading] = useState(false);
  const [cloturerErr, setCloturerErr] = useState('');

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

  const { data: profil, isLoading } = useQuery({
    queryKey: ['beneficiaire-profil'],
    queryFn: () => api.get('/auth/profil').then((r) => r.data.data),
  });

  const lien = profil?.liensBeneficiaire?.[0];

  async function handleExport() {
    setExportLoading(true);
    try {
      const { data } = await api.get('/auth/mes-donnees');
      const nomFichier = `tikexo-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      const file = new File(Paths.cache, nomFichier);
      file.write(JSON.stringify(data, null, 2));
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Mes données TIKEXO' });
      } else {
        Alert.alert('TIKEXO', `Fichier enregistré : ${file.uri}`);
      }
    } catch {
      Alert.alert('TIKEXO - Erreur', "Impossible d'exporter vos données pour le moment.");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleCloturer() {
    if (confirmCloture !== 'CLOTURER') return;
    setCloturerLoading(true);
    setCloturerErr('');
    try {
      await api.post('/auth/cloturer-compte');
      logout();
    } catch (err: any) {
      setCloturerErr(err.response?.data?.error || 'Échec de la clôture du compte - réessayez.');
    } finally {
      setCloturerLoading(false);
    }
  }

  if (isLoading || !profil) return <LoadingState />;

  const rows = [
    { icon: 'person' as const, label: 'Nom complet', value: `${profil.prenom} ${profil.nom}` },
    { icon: 'call' as const, label: 'Téléphone', value: profil.telephone },
    { icon: 'mail' as const, label: 'Email perso', value: profil.email_perso ?? '—' },
    { icon: 'mail' as const, label: 'Email pro', value: profil.email_pro ?? '—' },
    { icon: 'shield-checkmark' as const, label: 'Statut', value: profil.statut },
    { icon: 'shield-checkmark' as const, label: 'KYC', value: profil.kyc_niveau },
  ];

  return (
    <Screen scroll contentContainerStyle={styles.content}>
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle" size={18} color={colors.dark + '80'} />
          <Text style={styles.sectionTitre}>Informations personnelles</Text>
        </View>
        {rows.map((r) => (
          <View key={r.label} style={styles.row}>
            <Ionicons name={r.icon} size={15} color={colors.dark + '60'} style={styles.rowIcon} />
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowValue}>{r.value}</Text>
          </View>
        ))}
      </Card>

      {lien && (
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={18} color={colors.dark + '80'} />
            <Text style={styles.sectionTitre}>Entreprise</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Nom</Text>
            <Text style={styles.rowValue}>{lien.entreprise?.nom}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Niveau</Text>
            <Text style={styles.rowValue}>{lien.niveau}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Statut lien</Text>
            <Text style={styles.rowValue}>{lien.statut}</Text>
          </View>
        </Card>
      )}

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="shield" size={18} color={colors.accent} />
          <Text style={styles.sectionTitre}>Mes droits RGPD</Text>
        </View>

        <View style={styles.retentionBox}>
          <Text style={styles.retentionTexte}>
            Vos données personnelles sont conservées <Text style={styles.gras}>{texteRetentionPersonnelles}</Text>. Vos transactions financières sont conservées <Text style={styles.gras}>{texteRetentionFinancieres}</Text>.
          </Text>
        </View>

        <TouchableOpacity style={styles.action} onPress={handleExport} disabled={exportLoading}>
          <View style={[styles.actionIcon, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="download" size={16} color="#4F46E5" />
          </View>
          <View style={styles.actionTexte}>
            <Text style={styles.actionTitre}>{exportLoading ? 'Préparation…' : 'Télécharger mes données'}</Text>
            <Text style={styles.actionSous}>Fichier JSON — profil, wallet, transactions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.action} onPress={() => Linking.openURL(`mailto:${RGPD.contact_dpo}`)}>
          <View style={styles.actionIcon}>
            <Ionicons name="mail" size={16} color={colors.dark + '99'} />
          </View>
          <View style={styles.actionTexte}>
            <Text style={styles.actionTitre}>Contacter le DPO</Text>
            <Text style={styles.actionSous}>{RGPD.contact_dpo} — rectification, opposition, suppression</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.action, styles.actionDanger]}
          onPress={() => { setCloturerOpen(true); setConfirmCloture(''); setCloturerErr(''); }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="close-circle" size={16} color={colors.danger} />
          </View>
          <View style={styles.actionTexte}>
            <Text style={[styles.actionTitre, { color: colors.danger }]}>Clôturer mon compte</Text>
            <Text style={styles.actionSous}>Anonymise vos données personnelles — irréversible</Text>
          </View>
        </TouchableOpacity>
      </Card>

      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="lock-closed" size={18} color={colors.dark + '80'} />
          <Text style={styles.sectionTitre}>Sécurité</Text>
        </View>
        <View style={styles.toggleLigne}>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitre}>Verrou biométrique</Text>
            <Text style={styles.actionSous}>
              {biometrieDisponible ? 'Face ID / empreinte requis à l\'ouverture de l\'app' : 'Non configuré sur cet appareil'}
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
        <TouchableOpacity style={styles.action} onPress={() => Linking.openURL(`mailto:${RGPD.contact_support}`)}>
          <View style={styles.actionIcon}>
            <Ionicons name="chatbubble-ellipses" size={16} color={colors.dark + '99'} />
          </View>
          <View style={styles.actionTexte}>
            <Text style={styles.actionTitre}>Contacter le support TIKEXO</Text>
            <Text style={styles.actionSous}>{RGPD.contact_support}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.dark + '40'} />
        </TouchableOpacity>
      </Card>

      <TouchableOpacity style={styles.deconnexionBtn} onPress={logout}>
        <Ionicons name="log-out-outline" size={16} color={colors.dark + '99'} />
        <Text style={styles.deconnexionTexte}>Déconnexion</Text>
      </TouchableOpacity>

      <Modal visible={cloturerOpen} transparent animationType="fade" onRequestClose={() => setCloturerOpen(false)}>
        <View style={styles.modalFond}>
          <Card style={styles.modalCarte}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={20} color={colors.danger} />
              <Text style={styles.modalTitre}>Clôturer mon compte</Text>
            </View>

            <View style={styles.avertBox}>
              <Text style={styles.avertTitre}>Avant de continuer :</Text>
              <Text style={styles.avertLigne}>• Votre nom, email et téléphone seront anonymisés.</Text>
              <Text style={styles.avertLigne}>• Votre wallet et carte seront fermés.</Text>
              <Text style={styles.avertLigne}>• Vos transactions sont conservées {RGPD.retention_donnees_financieres_ans} ans (obligation légale UEMOA/BCEAO).</Text>
              <Text style={styles.avertLigne}>• Cette action est irréversible.</Text>
            </View>

            <Text style={styles.champLabel}>Tapez CLOTURER pour confirmer</Text>
            <TextInput
              style={styles.input}
              value={confirmCloture}
              onChangeText={setConfirmCloture}
              placeholder="CLOTURER"
              autoCapitalize="characters"
            />

            {!!cloturerErr && <Text style={styles.erreur}>{cloturerErr}</Text>}

            <View style={styles.modalActions}>
              <Button title="Annuler" variant="secondary" onPress={() => setCloturerOpen(false)} style={styles.modalBtn} />
              <Button
                title={cloturerLoading ? 'Traitement…' : 'Clôturer'}
                variant="danger"
                onPress={handleCloturer}
                disabled={confirmCloture !== 'CLOTURER' || cloturerLoading}
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  sectionTitre: { fontSize: fontSize.base, fontWeight: '600', color: colors.dark },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  rowIcon: { marginRight: spacing.sm },
  rowLabel: { fontSize: fontSize.xs, color: colors.dark + '80', width: 100 },
  rowValue: { flex: 1, fontSize: fontSize.sm, color: colors.dark, fontWeight: '600' },
  retentionBox: { backgroundColor: colors.lightGray, borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  retentionTexte: { fontSize: fontSize.xs, color: colors.dark + '99', lineHeight: 18 },
  gras: { fontWeight: '700', color: colors.dark },
  action: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.lightGray,
    borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.sm,
  },
  actionDanger: { borderColor: '#FEE2E2' },
  actionIcon: {
    width: 32, height: 32, borderRadius: borderRadius.full, backgroundColor: colors.lightGray,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  actionTexte: { flex: 1 },
  actionTitre: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark },
  actionSous: { fontSize: fontSize.xs, color: colors.dark + '60', marginTop: 2 },
  toggleLigne: { flexDirection: 'row', alignItems: 'center' },
  deconnexionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    borderWidth: 1, borderColor: colors.lightGray, borderRadius: borderRadius.md,
    paddingVertical: spacing.md, marginBottom: spacing.md,
  },
  deconnexionTexte: { fontSize: fontSize.sm, fontWeight: '600', color: colors.dark + '99' },
  modalFond: { flex: 1, backgroundColor: '#00000080', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCarte: { width: '100%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  modalTitre: { fontSize: fontSize.md, fontWeight: '700', color: colors.dark },
  avertBox: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  avertTitre: { fontSize: fontSize.xs, fontWeight: '700', color: '#92400E', marginBottom: spacing.xs },
  avertLigne: { fontSize: fontSize.xs, color: '#92400E', marginBottom: 2 },
  champLabel: { fontSize: fontSize.xs, color: colors.dark + '99', marginBottom: spacing.xs },
  input: {
    borderWidth: 2, borderColor: '#FECACA', borderRadius: borderRadius.md,
    padding: spacing.sm, fontSize: fontSize.base, marginBottom: spacing.sm,
  },
  erreur: { color: colors.danger, fontSize: fontSize.xs, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  modalBtn: { flex: 1 },
});
