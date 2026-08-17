import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { ListRow, Badge, EmptyState, LoadingState } from '../../design-system/components';
import CommercantsCarte from './CommercantsCarte';

type TypeCommercant = 'RESTAURANT' | 'BOULANGERIE' | 'EPICERIE' | 'TRAITEUR' | 'CAFETERIA' | 'LIVRAISON' | 'SUPERMARCHE';

const TYPES: { value: TypeCommercant | ''; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'BOULANGERIE', label: 'Boulangerie' },
  { value: 'EPICERIE', label: 'Épicerie' },
  { value: 'TRAITEUR', label: 'Traiteur' },
  { value: 'CAFETERIA', label: 'Cafétéria' },
  { value: 'LIVRAISON', label: 'Livraison' },
  { value: 'SUPERMARCHE', label: 'Supermarché' },
];

export interface CommercantItem {
  id: string;
  nom: string;
  type: string;
  adresse?: string;
  latitude?: number;
  longitude?: number;
  distance_label?: string;
  duree_a_pied?: string;
  est_ouvert?: boolean;
  note_moyenne?: number;
}

export default function Commercants() {
  const navigation = useNavigation();
  const [recherche, setRecherche] = useState('');
  const [typeFiltre, setTypeFiltre] = useState<TypeCommercant | ''>('');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locRefusee, setLocRefusee] = useState(false);
  const [vue, setVue] = useState<'liste' | 'carte'>('liste');

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocRefusee(true); return; }
      try {
        const pos = await Location.getCurrentPositionAsync({});
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        setLocRefusee(true);
      }
    })();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['commercants', position, typeFiltre],
    queryFn: async () => {
      if (position) {
        const r = await api.get('/commercants/nearby', {
          params: { lat: position.lat, lng: position.lng, rayon: 5000, categorie: typeFiltre || undefined },
        });
        // Le contrôleur backend fait res.json({ success: true, ...result }) où
        // result = { data, meta } — donc pas de double imbrication comme sur
        // /commercants (qui fait res.json({ success, data: {...} })).
        return (r.data.data ?? []) as CommercantItem[];
      }
      const r = await api.get('/commercants', {
        params: { statut: 'ACTIF', type: typeFiltre || undefined, limit: 50 },
      });
      return r.data.data.items as CommercantItem[];
    },
    enabled: position !== null || locRefusee,
  });

  const items = (data || []).filter((c) =>
    !recherche
    || c.nom.toLowerCase().includes(recherche.toLowerCase())
    || c.adresse?.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.rechercheWrap}>
        <Ionicons name="search" size={14} color={colors.dark + '60'} style={styles.rechercheIcone} />
        <TextInput
          style={styles.recherche}
          placeholder="Rechercher un restaurant…"
          value={recherche}
          onChangeText={setRecherche}
        />
      </View>

      <View style={styles.entete}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtres} contentContainerStyle={styles.filtresContent}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value || 'tous'}
              style={[styles.chip, typeFiltre === t.value && styles.chipActif]}
              onPress={() => setTypeFiltre(t.value)}
            >
              <Text style={[styles.chipTexte, typeFiltre === t.value && styles.chipTexteActif]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {Platform.OS !== 'web' && (
          <View style={styles.toggleVue}>
            <TouchableOpacity
              style={[styles.toggleBtn, vue === 'liste' && styles.toggleBtnActif]}
              onPress={() => setVue('liste')}
            >
              <Ionicons name="list" size={16} color={vue === 'liste' ? colors.white : colors.dark + '80'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, vue === 'carte' && styles.toggleBtnActif]}
              onPress={() => setVue('carte')}
            >
              <Ionicons name="map" size={16} color={vue === 'carte' ? colors.white : colors.dark + '80'} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {locRefusee && (
        <View style={styles.infoLoc}>
          <Ionicons name="location-outline" size={16} color={colors.dark + '80'} />
          <Text style={styles.infoLocTexte}>Localisation désactivée — liste sans tri par distance</Text>
        </View>
      )}

      {isLoading ? (
        <LoadingState />
      ) : vue === 'carte' && Platform.OS !== 'web' ? (
        <CommercantsCarte
          items={items}
          position={position}
          onVoirFiche={(item) => (navigation.getParent() as any)?.navigate('CommercantFiche', { id: item.id, nom: item.nom })}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ListRow
              icon="storefront"
              title={item.nom}
              subtitle={[item.type, item.distance_label, item.duree_a_pied].filter(Boolean).join(' · ')}
              rightSecondary={
                item.est_ouvert !== undefined
                  ? <Badge label={item.est_ouvert ? 'Ouvert' : 'Fermé'} tone={item.est_ouvert ? 'success' : 'neutral'} />
                  : undefined
              }
              onPress={() => (navigation.getParent() as any)?.navigate('CommercantFiche', { id: item.id, nom: item.nom })}
            />
          )}
          ListEmptyComponent={
            <EmptyState icon="storefront-outline" title="Aucun commerçant trouvé" subtitle="Essayez un autre filtre" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.lightGray },
  rechercheWrap: { backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingTop: spacing.sm, position: 'relative', justifyContent: 'center' },
  rechercheIcone: { position: 'absolute', left: spacing.md + spacing.sm, top: spacing.sm + 10, zIndex: 1 },
  recherche: {
    backgroundColor: colors.lightGray, borderRadius: borderRadius.md,
    paddingVertical: spacing.sm, paddingLeft: spacing.xl + spacing.xs, paddingRight: spacing.sm, fontSize: fontSize.sm,
  },
  entete: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, paddingRight: spacing.md },
  filtres: { flexGrow: 0, flex: 1 },
  filtresContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    backgroundColor: colors.lightGray, marginRight: spacing.xs,
  },
  chipActif: { backgroundColor: colors.primary },
  chipTexte: { fontSize: fontSize.xs, color: colors.dark + '99', fontWeight: '600' },
  chipTexteActif: { color: colors.white },
  toggleVue: { flexDirection: 'row', backgroundColor: colors.lightGray, borderRadius: borderRadius.sm, padding: 2, gap: 2 },
  toggleBtn: { width: 30, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm - 2 },
  toggleBtnActif: { backgroundColor: colors.primary },
  infoLoc: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, paddingHorizontal: spacing.md },
  infoLocTexte: { fontSize: fontSize.xs, color: colors.dark + '80' },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
});
