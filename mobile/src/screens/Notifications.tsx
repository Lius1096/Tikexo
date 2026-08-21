import React, { useRef } from 'react';
import { FlatList, RefreshControl, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import api from '../lib/api';
import { colors, spacing, fontSize } from '../design-system/tokens';
import { Screen, ListRow, LinkButton, EmptyState, LoadingState } from '../design-system/components';

interface Notif {
  id: string;
  titre: string;
  corps: string;
  type: string;
  lu: boolean;
  createdAt: string;
}

const ICONE_PAR_TYPE: Record<string, keyof typeof Ionicons.glyphMap> = {
  TRANSACTION: 'card',
  DOTATION: 'gift',
  REVERSEMENT: 'cash',
  KYC: 'document-text',
  RECHARGEMENT: 'wallet',
  SOLDE_FAIBLE: 'alert-circle',
  SECURITE: 'shield-checkmark',
  SYSTEME: 'information-circle',
  MARKETING: 'megaphone',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const auj = new Date();
  const memeJour = d.toDateString() === auj.toDateString();
  const heure = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return memeJour ? `Aujourd'hui, ${heure}` : `${d.toLocaleDateString('fr-FR')}, ${heure}`;
}

interface RowProps {
  item: Notif;
  onMarquerLu: (id: string) => void;
  onSupprimer: (id: string) => void;
}

// Glisser à droite = marquer lu (masqué si déjà lu). Glisser à gauche =
// supprimer, toujours disponible.
function NotificationRow({ item, onMarquerLu, onSupprimer }: RowProps) {
  const swipeRef = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={swipeRef}
      overshootLeft={false}
      overshootRight={false}
      renderLeftActions={!item.lu ? () => (
        <TouchableOpacity
          style={[styles.action, styles.actionLu]}
          onPress={() => { onMarquerLu(item.id); swipeRef.current?.close(); }}
        >
          <Ionicons name="checkmark" size={20} color={colors.white} />
          <Text style={styles.actionTexte}>Lu</Text>
        </TouchableOpacity>
      ) : undefined}
      renderRightActions={() => (
        <TouchableOpacity style={[styles.action, styles.actionSupprimer]} onPress={() => onSupprimer(item.id)}>
          <Ionicons name="trash" size={20} color={colors.white} />
          <Text style={styles.actionTexte}>Supprimer</Text>
        </TouchableOpacity>
      )}
    >
      <ListRow
        icon={ICONE_PAR_TYPE[item.type] || 'notifications'}
        iconColor={item.lu ? colors.dark + '80' : colors.accent}
        iconBg={item.lu ? colors.lightGray : colors.lightBlue}
        title={item.titre}
        subtitle={`${item.corps}\n${formatDate(item.createdAt)}`}
        onPress={item.lu ? undefined : () => onMarquerLu(item.id)}
        style={item.lu ? undefined : { borderWidth: 1, borderColor: colors.accent + '30' }}
      />
    </Swipeable>
  );
}

export default function Notifications() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications', { params: { limit: 50 } }).then((r) => r.data.data as { items: Notif[]; non_lues: number }),
  });

  function invalider() {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['notifications-non-lues'] });
  }

  const marquerLuMut = useMutation({
    mutationFn: (id: string) => api.post(`/notifications/${id}/lu`),
    onSuccess: invalider,
  });

  const marquerToutLuMut = useMutation({
    mutationFn: () => api.post('/notifications/lu-tout'),
    onSuccess: invalider,
  });

  const supprimerMut = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: invalider,
  });

  if (isLoading) return <LoadingState />;

  const items = data?.items || [];

  return (
    <Screen>
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingVertical: spacing.sm }}
        ListHeaderComponent={
          (data?.non_lues || 0) > 0
            ? (
              <LinkButton
                title="Tout marquer comme lu"
                onPress={() => marquerToutLuMut.mutate()}
                style={{ alignSelf: 'flex-end', marginRight: spacing.md, marginBottom: spacing.xs }}
              />
              )
            : null
        }
        ListEmptyComponent={
          <EmptyState icon="notifications-outline" title="Aucune notification" subtitle="Vous serez prévenu ici pour chaque paiement, dotation ou reversement." />
        }
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onMarquerLu={(id) => marquerLuMut.mutate(id)}
            onSupprimer={(id) => supprimerMut.mutate(id)}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: { width: 88, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionLu: { backgroundColor: colors.success },
  actionSupprimer: { backgroundColor: colors.danger },
  actionTexte: { color: colors.white, fontSize: fontSize.xs, fontWeight: '600' },
});
