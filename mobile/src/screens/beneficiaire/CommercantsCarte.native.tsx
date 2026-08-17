import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '../../design-system/tokens';
import { Card, Badge } from '../../design-system/components';
import type { CommercantItem } from './Commercants';

// Cotonou, Bénin — centre par défaut si la géolocalisation est indisponible.
const CENTRE_DEFAUT = { latitude: 6.3703, longitude: 2.3912 };

export default function CommercantsCarte({
  items, position,
}: {
  items: CommercantItem[];
  position: { lat: number; lng: number } | null;
}) {
  const [selection, setSelection] = useState<CommercantItem | null>(null);

  const avecCoordonnees = items.filter((c) => c.latitude != null && c.longitude != null);

  const centre = position
    ? { latitude: position.lat, longitude: position.lng }
    : avecCoordonnees[0]
    ? { latitude: avecCoordonnees[0].latitude!, longitude: avecCoordonnees[0].longitude! }
    : CENTRE_DEFAUT;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.carte}
        initialRegion={{ ...centre, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        showsUserLocation
        showsMyLocationButton
      >
        {avecCoordonnees.map((c) => (
          <Marker
            key={c.id}
            coordinate={{ latitude: c.latitude!, longitude: c.longitude! }}
            title={c.nom}
            description={c.type}
            pinColor={c.est_ouvert === false ? '#94A3B8' : '#1A3C5E'}
            onPress={() => setSelection(c)}
          />
        ))}
      </MapView>

      {selection && (
        <Card style={styles.fiche}>
          <TouchableOpacity style={styles.ficheFermer} onPress={() => setSelection(null)}>
            <Ionicons name="close" size={16} color={colors.dark + '80'} />
          </TouchableOpacity>
          <View style={styles.ficheHeader}>
            <View style={styles.ficheIcone}>
              <Ionicons name="storefront" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ficheNom}>{selection.nom}</Text>
              <Text style={styles.ficheSous}>
                {[selection.type, selection.distance_label, selection.duree_a_pied].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {selection.est_ouvert !== undefined && (
              <Badge label={selection.est_ouvert ? 'Ouvert' : 'Fermé'} tone={selection.est_ouvert ? 'success' : 'neutral'} />
            )}
          </View>
          {!!selection.adresse && <Text style={styles.ficheAdresse}>{selection.adresse}</Text>}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  carte: { flex: 1 },
  fiche: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md },
  ficheFermer: { position: 'absolute', top: spacing.sm, right: spacing.sm, padding: 4, zIndex: 1 },
  ficheHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ficheIcone: { width: 36, height: 36, borderRadius: borderRadius.full, backgroundColor: colors.lightBlue, alignItems: 'center', justifyContent: 'center' },
  ficheNom: { fontSize: fontSize.sm, fontWeight: '700', color: colors.dark, paddingRight: spacing.lg },
  ficheSous: { fontSize: fontSize.xs, color: colors.dark + '80', marginTop: 2 },
  ficheAdresse: { fontSize: fontSize.xs, color: colors.dark + '99', marginTop: spacing.sm },
});
