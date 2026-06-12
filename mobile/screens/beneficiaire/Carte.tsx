// Écran carte commerçants — TIKEXO Mobile
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://api.tikexo.bj/api/v1';

// Cotonou centre (région initiale si GPS refusé)
const REGION_COTONOU: Region = {
  latitude: 6.3654,
  longitude: 2.4183,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

type TypeCommercant =
  | 'RESTAURANT' | 'BOULANGERIE' | 'EPICERIE'
  | 'TRAITEUR' | 'CAFETERIA' | 'LIVRAISON' | 'SUPERMARCHE';

interface Commercant {
  id: string;
  nom: string;
  type: TypeCommercant;
  niveau: 'VERIFIE' | 'SIMPLIFIE';
  adresse: string;
  ville: string;
  latitude: number;
  longitude: number;
  distance_metres: number;
  distance_label: string;
  duree_a_pied: string;
  note_moyenne: number;
  horaires: Record<string, { ouverture: string; fermeture: string } | null> | null;
  est_ouvert: boolean;
  photo_url: string | null;
  qr_code_url: string | null;
  taux_commission: number;
}

const COULEUR_PAR_TYPE: Record<TypeCommercant, string> = {
  RESTAURANT:   '#1A3C5E',
  BOULANGERIE:  '#B45309',
  EPICERIE:     '#166534',
  TRAITEUR:     '#0EA5E9',
  CAFETERIA:    '#0EA5E9',
  LIVRAISON:    '#0EA5E9',
  SUPERMARCHE:  '#0EA5E9',
};

const FILTRES: Array<{ label: string; value: TypeCommercant | 'TOUS' | 'OUVERT' }> = [
  { label: 'Tous', value: 'TOUS' },
  { label: 'Restaurant', value: 'RESTAURANT' },
  { label: 'Boulangerie', value: 'BOULANGERIE' },
  { label: 'Épicerie', value: 'EPICERIE' },
  { label: 'Ouvert maintenant', value: 'OUVERT' },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Carte() {
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const [commercants, setCommercants] = useState<Commercant[]>([]);
  const [commercantSelectionne, setCommercantSelectionne] = useState<Commercant | null>(null);
  const [filtreActif, setFiltreActif] = useState<string>('TOUS');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsRefuse, setGpsRefuse] = useState(false);
  const [chargement, setChargement] = useState(true);

  // Demande de permission GPS et chargement initial
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsRefuse(true);
        setChargement(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const pos = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setPosition(pos);
      chargerCommercants(pos);
    })();
  }, []);

  const chargerCommercants = useCallback(
    async (pos: { lat: number; lng: number }, categorie?: string, ouvert?: boolean) => {
      setChargement(true);
      try {
        const params = new URLSearchParams({
          lat: pos.lat.toString(),
          lng: pos.lng.toString(),
          rayon: '2000',
        });
        if (categorie && categorie !== 'TOUS' && categorie !== 'OUVERT') {
          params.append('categorie', categorie);
        }
        if (ouvert) params.append('ouvert', 'true');

        const res = await fetch(`${API_BASE}/commercants/nearby?${params}`, {
          headers: { Authorization: `Bearer ${global.__TOKEN__}` },
        });
        const json = await res.json();
        if (json.success) setCommercants(json.data);
      } catch {
        // Erreur réseau — conserver la liste actuelle
      } finally {
        setChargement(false);
      }
    },
    []
  );

  const appliquerFiltre = (valeur: string) => {
    setFiltreActif(valeur);
    if (!position) return;
    const estOuvert = valeur === 'OUVERT';
    const categorie = estOuvert ? undefined : valeur;
    chargerCommercants(position, categorie, estOuvert);
  };

  const selectionnerCommercant = (c: Commercant) => {
    setCommercantSelectionne(c);
    mapRef.current?.animateToRegion({
      latitude: c.latitude,
      longitude: c.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    }, 500);
    bottomSheetRef.current?.expand();
  };

  const recentrerSurMoi = async () => {
    if (!position) return;
    mapRef.current?.animateToRegion({
      latitude: position.lat,
      longitude: position.lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  };

  const ouvrirItineraire = (c: Commercant) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${c.latitude},${c.longitude}`,
      android: `geo:${c.latitude},${c.longitude}?q=${c.latitude},${c.longitude}(${encodeURIComponent(c.nom)})`,
    });
    if (url) Linking.openURL(url);
  };

  // Affichage si GPS refusé
  if (gpsRefuse) {
    return (
      <View style={styles.centreEcran}>
        <Text style={styles.messageGps}>
          Activez la localisation pour voir les commerçants proches
        </Text>
        <FlatList
          data={commercants}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <ItemCommercant item={item} onPress={selectionnerCommercant} />}
        />
      </View>
    );
  }

  return (
    <View style={styles.conteneur}>
      {/* ── Carte ─────────────────────────────────────────────── */}
      <MapView
        ref={mapRef}
        style={styles.carte}
        initialRegion={position
          ? { latitude: position.lat, longitude: position.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }
          : REGION_COTONOU}
        showsUserLocation
        followsUserLocation={false}
      >
        {commercants.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.latitude, longitude: c.longitude }}
            title={c.nom}
            description={`${c.distance_label} · ${c.est_ouvert ? 'Ouvert' : 'Fermé'}`}
            pinColor={COULEUR_PAR_TYPE[c.type] || '#0EA5E9'}
            onPress={() => selectionnerCommercant(c)}
          />
        ))}
      </MapView>

      {/* ── Barre de filtres ───────────────────────────────────── */}
      <View style={styles.barreFiltres}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtresContent}>
          {FILTRES.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[styles.filtre, filtreActif === f.value && styles.filtreActif]}
              onPress={() => appliquerFiltre(f.value)}
            >
              <Text style={[styles.filtreTexte, filtreActif === f.value && styles.filtreTexteActif]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Bouton recentrer ───────────────────────────────────── */}
      <TouchableOpacity style={styles.btnRecentrer} onPress={recentrerSurMoi} accessibilityLabel="Recentrer">
        <Text style={styles.btnRecentrerIcone}>⊕</Text>
      </TouchableOpacity>

      {/* ── Liste scrollable sous la carte ────────────────────── */}
      <View style={styles.liste}>
        {chargement ? (
          <ActivityIndicator color="#1A3C5E" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={commercants}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <ItemCommercant item={item} onPress={selectionnerCommercant} />
            )}
            ListEmptyComponent={
              <Text style={styles.listeVide}>Aucun commerçant dans ce rayon</Text>
            }
          />
        )}
      </View>

      {/* ── Bottom sheet fiche commerçant ──────────────────────── */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={['45%', '85%']}
        enablePanDownToClose
      >
        <BottomSheetScrollView contentContainerStyle={styles.ficheContenu}>
          {commercantSelectionne && (
            <FicheCommercant
              commercant={commercantSelectionne}
              onItineraire={ouvrirItineraire}
              onPayer={(id) => {
                bottomSheetRef.current?.close();
                navigation.navigate('Paiement', { commercantId: id });
              }}
            />
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </View>
  );
}

// ── Composant item liste ─────────────────────────────────────────────────────
function ItemCommercant({
  item, onPress,
}: { item: Commercant; onPress: (c: Commercant) => void }) {
  return (
    <TouchableOpacity style={styles.itemCommercant} onPress={() => onPress(item)}>
      <View style={[styles.itemIcone, { backgroundColor: COULEUR_PAR_TYPE[item.type] }]} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemNom} numberOfLines={1}>{item.nom}</Text>
        <Text style={styles.itemMeta}>
          {item.note_moyenne > 0 ? `★ ${item.note_moyenne.toFixed(1)}  ·  ` : ''}
          {item.distance_label}  ·  {item.est_ouvert ? 'Ouvert' : 'Fermé'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Composant fiche commerçant (bottom sheet) ────────────────────────────────
function FicheCommercant({
  commercant: c,
  onItineraire,
  onPayer,
}: {
  commercant: Commercant;
  onItineraire: (c: Commercant) => void;
  onPayer: (id: string) => void;
}) {
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase();
  const horairesAujourdHui = c.horaires?.[today];

  return (
    <View>
      <Text style={styles.ficheNom}>{c.nom}</Text>
      <Text style={styles.ficheType}>{c.type}  ·  {c.niveau}</Text>
      <Text style={styles.ficheAdresse}>{c.adresse}, {c.ville}</Text>

      <View style={styles.ficheDistanceRow}>
        <Text style={styles.ficheDistance}>{c.distance_label}</Text>
        <Text style={styles.ficheDuree}>{c.duree_a_pied} à pied</Text>
      </View>

      {c.note_moyenne > 0 && (
        <Text style={styles.ficheNote}>★ {c.note_moyenne.toFixed(1)} / 5</Text>
      )}

      {/* Horaires du jour */}
      <Text style={styles.ficheHorairesLabel}>Aujourd'hui :</Text>
      {horairesAujourdHui ? (
        <Text style={styles.ficheHoraires}>
          {horairesAujourdHui.ouverture} – {horairesAujourdHui.fermeture}
        </Text>
      ) : (
        <Text style={[styles.ficheHoraires, styles.ficheFerme]}>Fermé</Text>
      )}

      {/* RÈGLE TIKEXO : dimanche → message explicite */}
      {today === 'dimanche' && (
        <Text style={styles.ficheDimanche}>
          Fermé — paiements TIKEXO non disponibles le dimanche
        </Text>
      )}

      {/* Statut ouvert/fermé */}
      <View style={[styles.ficheStatut, { backgroundColor: c.est_ouvert ? '#166534' : '#991B1B' }]}>
        <Text style={styles.ficheStatutTexte}>{c.est_ouvert ? 'Ouvert maintenant' : 'Fermé maintenant'}</Text>
      </View>

      {/* Actions */}
      <View style={styles.ficheBoutons}>
        <TouchableOpacity style={styles.btnItineraire} onPress={() => onItineraire(c)}>
          <Text style={styles.btnItineraireTexte}>Itinéraire</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnPayer, !c.est_ouvert && styles.btnPayerDisabled]}
          onPress={() => c.est_ouvert && onPayer(c.id)}
          disabled={!c.est_ouvert}
        >
          <Text style={styles.btnPayerTexte}>Scanner et payer ici</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur:           { flex: 1 },
  centreEcran:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  carte:               { flex: 1, maxHeight: SCREEN_HEIGHT * 0.45 },
  messageGps:          { fontSize: 16, color: '#1A3C5E', textAlign: 'center', marginBottom: 16 },

  barreFiltres:        { position: 'absolute', top: 12, left: 0, right: 0, zIndex: 10 },
  filtresContent:      { paddingHorizontal: 12, gap: 8 },
  filtre:              { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff',
                         shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  filtreActif:         { backgroundColor: '#0EA5E9' },
  filtreTexte:         { fontSize: 13, color: '#1E293B', fontFamily: 'Inter' },
  filtreTexteActif:    { color: '#fff', fontWeight: '600' },

  btnRecentrer:        { position: 'absolute', bottom: SCREEN_HEIGHT * 0.55 + 16, right: 16,
                         width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
                         alignItems: 'center', justifyContent: 'center',
                         shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  btnRecentrerIcone:   { fontSize: 22, color: '#1A3C5E' },

  liste:               { flex: 1, backgroundColor: '#F1F5F9' },
  itemCommercant:      { flexDirection: 'row', alignItems: 'center', padding: 14,
                         borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  itemIcone:           { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  itemInfo:            { flex: 1 },
  itemNom:             { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  itemMeta:            { fontSize: 12, color: '#64748B', marginTop: 2 },
  listeVide:           { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 14 },

  ficheContenu:        { padding: 20 },
  ficheNom:            { fontSize: 20, fontWeight: '700', color: '#1A3C5E', marginBottom: 4 },
  ficheType:           { fontSize: 13, color: '#64748B', marginBottom: 4 },
  ficheAdresse:        { fontSize: 14, color: '#475569', marginBottom: 12 },
  ficheDistanceRow:    { flexDirection: 'row', gap: 16, marginBottom: 8 },
  ficheDistance:       { fontSize: 14, fontWeight: '600', color: '#0EA5E9' },
  ficheDuree:          { fontSize: 14, color: '#64748B' },
  ficheNote:           { fontSize: 14, color: '#B45309', marginBottom: 8 },
  ficheHorairesLabel:  { fontSize: 13, color: '#94A3B8', marginTop: 8 },
  ficheHoraires:       { fontSize: 14, color: '#1E293B', marginBottom: 4 },
  ficheFerme:          { color: '#991B1B' },
  ficheDimanche:       { fontSize: 13, color: '#991B1B', backgroundColor: '#FEF2F2',
                         padding: 10, borderRadius: 8, marginTop: 8, marginBottom: 8 },
  ficheStatut:         { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
                         alignSelf: 'flex-start', marginVertical: 10 },
  ficheStatutTexte:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  ficheBoutons:        { flexDirection: 'row', gap: 12, marginTop: 12 },
  btnItineraire:       { flex: 1, borderWidth: 2, borderColor: '#1A3C5E', borderRadius: 8,
                         paddingVertical: 12, alignItems: 'center' },
  btnItineraireTexte:  { color: '#1A3C5E', fontWeight: '600', fontSize: 14 },
  btnPayer:            { flex: 1, backgroundColor: '#1A3C5E', borderRadius: 8,
                         paddingVertical: 12, alignItems: 'center' },
  btnPayerDisabled:    { backgroundColor: '#CBD5E1' },
  btnPayerTexte:       { color: '#fff', fontWeight: '600', fontSize: 14 },
});
