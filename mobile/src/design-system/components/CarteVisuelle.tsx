import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { fontSize } from '../tokens';

export interface CarteData {
  id: string;
  type: 'VIRTUELLE' | 'PHYSIQUE';
  numero_masque: string;
  statut: 'COMMANDE' | 'EXPEDIE' | 'ACTIVE' | 'BLOQUEE' | 'EXPIREE' | 'PERDUE';
  date_expiration: string;
  user?: { nom: string; prenom: string; liensBeneficiaire?: { entreprise: { nom: string } }[] };
}

const NAVY = '#1A3B8C';
const NAVY_BLOQUEE = '#2d3748';
const ACCENT = '#0EA5E9';

interface Props {
  carte: CarteData;
  qrValue?: string;
  cvv?: string;
}

export function CarteRecto({ carte, qrValue, cvv }: Props) {
  const exp = carte.date_expiration
    ? new Date(carte.date_expiration).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })
    : '—';
  const nomTitulaire = carte.user
    ? `${carte.user.prenom?.toUpperCase() ?? ''} ${carte.user.nom?.toUpperCase() ?? ''}`.trim()
    : '• • • •';
  const entreprise = carte.user?.liensBeneficiaire?.[0]?.entreprise?.nom ?? '';
  const bloquee = carte.statut === 'BLOQUEE';
  const groupes = carte.numero_masque.split(' ');

  return (
    <View style={[styles.carte, { backgroundColor: bloquee ? NAVY_BLOQUEE : NAVY, opacity: bloquee ? 0.85 : 1 }]}>
      <View style={[styles.cercle1]} />
      <View style={[styles.cercle2]} />

      <View style={styles.contenu}>
        <View style={styles.rangee}>
          <View style={styles.logoLigne}>
            <Ionicons name="shield-checkmark" size={22} color="#fff" />
            <Text style={styles.marque}>Tikexo</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.badgeLabel}>TITRE-RESTAURANT</Text>
            <Text style={[styles.badgeType, { color: bloquee ? '#FC8181' : ACCENT }]}>
              {bloquee ? 'BLOQUÉE' : `${carte.type === 'PHYSIQUE' ? 'PHYSIQUE' : 'VIRTUELLE'} · BÉNIN`}
            </Text>
          </View>
        </View>

        <View style={[styles.rangee, { alignItems: 'center' }]}>
          <View style={styles.numeroLigne}>
            {groupes.map((g, i) => (
              <Text key={i} style={[styles.numeroGroupe, { color: i === 0 || i === 3 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.55)' }]}>
                {g}
              </Text>
            ))}
          </View>
          {qrValue ? (
            <View style={styles.qrBox}>
              <QRCode value={qrValue} size={50} color={NAVY} backgroundColor="#fff" />
            </View>
          ) : (
            <View style={[styles.qrBox, styles.qrPlaceholder]}>
              <Ionicons name="qr-code-outline" size={26} color="rgba(255,255,255,0.4)" />
            </View>
          )}
        </View>

        <View style={[styles.rangee, { alignItems: 'flex-end' }]}>
          <View>
            <Text style={styles.champLabel}>TITULAIRE</Text>
            <Text style={styles.titulaire}>{nomTitulaire}</Text>
            {!!entreprise && <Text style={styles.entreprise}>{entreprise}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {!!cvv && (
              <View style={{ marginBottom: 6, alignItems: 'flex-end' }}>
                <Text style={styles.champLabel}>CVV</Text>
                <Text style={styles.cvv}>{cvv}</Text>
              </View>
            )}
            <Text style={styles.champLabel}>EXPIRE</Text>
            <Text style={styles.expire}>{exp}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.barreBas, { backgroundColor: bloquee ? '#FC8181' : ACCENT }]} />
    </View>
  );
}

export function CarteVerso({ cvv }: { cvv?: string }) {
  return (
    <View style={[styles.carte, { backgroundColor: '#0f2660' }]}>
      <View style={styles.bandeMagnetique} />
      <View style={styles.bandeSignature}>
        <View style={styles.signatureLignes}>
          {[0, 1, 2].map((i) => <View key={i} style={styles.signatureLigne} />)}
        </View>
        <View style={styles.cvvBox}>
          <Text style={styles.cvvVersoTexte}>{cvv ?? '•••'}</Text>
        </View>
      </View>
      <View style={styles.versoBas}>
        <Text style={styles.versoTexte}>
          Propriété de TIKEXO · tikexo.kete.fr{'\n'}
          Utilisation : restaurants partenaires uniquement{'\n'}
          Perte ou vol : support@tikexo.kete.fr
        </Text>
      </View>
      <View style={[styles.barreBas, { backgroundColor: ACCENT }]} />
    </View>
  );
}

const LARGEUR = 340;
const HAUTEUR = 214;

const styles = StyleSheet.create({
  carte: {
    width: LARGEUR, height: HAUTEUR, borderRadius: 16,
    overflow: 'hidden', alignSelf: 'center',
  },
  cercle1: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(14,165,233,0.08)', top: -60, right: -60 },
  cercle2: { position: 'absolute', width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -50, left: -30 },
  contenu: { flex: 1, padding: 18, paddingBottom: 16, justifyContent: 'space-between' },
  rangee: { flexDirection: 'row', justifyContent: 'space-between' },
  logoLigne: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  marque: { fontSize: fontSize.md, fontWeight: '500', color: '#fff', letterSpacing: 0.5 },
  badgeLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5 },
  badgeType: { fontSize: 9, letterSpacing: 1, marginTop: 1 },
  numeroLigne: { flexDirection: 'row', gap: 10, flex: 1, alignItems: 'center' },
  numeroGroupe: { fontSize: 15, fontWeight: '500', letterSpacing: 2 },
  qrBox: { width: 60, height: 60, backgroundColor: '#fff', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  qrPlaceholder: { backgroundColor: 'rgba(255,255,255,0.08)' },
  champLabel: { fontSize: 8, color: 'rgba(255,255,255,0.38)', letterSpacing: 1.5, marginBottom: 3 },
  titulaire: { fontSize: 12, fontWeight: '500', color: '#fff', letterSpacing: 0.8 },
  entreprise: { fontSize: 9, color: ACCENT, marginTop: 3 },
  cvv: { fontSize: 14, fontWeight: '700', color: ACCENT },
  expire: { fontSize: 12, fontWeight: '500', color: '#fff' },
  barreBas: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3 },
  bandeMagnetique: { position: 'absolute', top: 32, left: 0, right: 0, height: 38, backgroundColor: '#111' },
  bandeSignature: {
    position: 'absolute', top: 98, left: 22, right: 22, height: 30,
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 3,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8,
  },
  signatureLignes: { flex: 1, gap: 5 },
  signatureLigne: { height: 1, backgroundColor: '#ddd' },
  cvvBox: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#ccc', borderRadius: 3, paddingHorizontal: 8, paddingVertical: 2 },
  cvvVersoTexte: { fontSize: 13, fontWeight: '500', color: NAVY },
  versoBas: { flex: 1, justifyContent: 'flex-end' },
  versoTexte: { fontSize: 9, color: 'rgba(255,255,255,0.28)', lineHeight: 15 },
});
