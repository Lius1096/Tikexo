import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../design-system/tokens';
import { useNotificationsNonLues } from '../hooks/useNotificationsNonLues';

// Cloche de notifications partagée entre BeneficiaireNav et CommercantNav —
// badge avec le nombre de notifications non lues (polling léger).
export function HeaderCloche({ onPress }: { onPress: () => void }) {
  const { data: nonLues } = useNotificationsNonLues();

  return (
    <TouchableOpacity onPress={onPress} style={styles.bouton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Ionicons name="notifications-outline" size={24} color={colors.white} />
      {!!nonLues && (
        <View style={styles.badge}>
          <Text style={styles.badgeTexte}>{nonLues > 9 ? '9+' : nonLues}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bouton: { marginRight: 16 },
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: colors.danger, borderRadius: 8,
    minWidth: 16, height: 16, paddingHorizontal: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTexte: { color: colors.white, fontSize: 9, fontWeight: '700' },
});
