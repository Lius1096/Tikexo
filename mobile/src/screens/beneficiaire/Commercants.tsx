import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { ListRow, Badge, EmptyState, LoadingState } from '../../design-system/components';

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

interface CommercantItem {
  id: string;
  nom: string;
  type: string;
  distance_label?: string;
  duree_a_pied?: string;
  est_ouvert?: boolean;
  note_moyenne?: number;
}

export default function Commercants() {
  const [typeFiltre, setTypeFiltre] = useState<TypeCommercant | ''>('');
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locRefusee, setLocRefusee] = useState(false);

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

  return (
    <View style={styles.container}>
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

      {locRefusee && (
        <View style={styles.infoLoc}>
          <Ionicons name="location-outline" size={16} color={colors.dark + '80'} />
          <Text style={styles.infoLocTexte}>Localisation désactivée — liste sans tri par distance</Text>
        </View>
      )}

      {isLoading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={data || []}
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
  filtres: { flexGrow: 0, backgroundColor: colors.white },
  filtresContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full,
    backgroundColor: colors.lightGray, marginRight: spacing.xs,
  },
  chipActif: { backgroundColor: colors.primary },
  chipTexte: { fontSize: fontSize.xs, color: colors.dark + '99', fontWeight: '600' },
  chipTexteActif: { color: colors.white },
  infoLoc: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, paddingHorizontal: spacing.md },
  infoLocTexte: { fontSize: fontSize.xs, color: colors.dark + '80' },
  list: { paddingVertical: spacing.sm, flexGrow: 1 },
});
