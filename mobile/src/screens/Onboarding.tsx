import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '../design-system/tokens';
import { Wordmark } from '../design-system/components';

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  titre: string;
  texte: string;
}

const SLIDES: Slide[] = [
  {
    icon: 'wallet',
    titre: 'Votre titre-restaurant,\ndans votre poche',
    texte: 'Recevez vos dotations chaque mois et payez en toute simplicité, sans ticket papier.',
  },
  {
    icon: 'qr-code',
    titre: "Scannez, payez,\nc'est réglé",
    texte: 'Un QR dynamique ou le NFC de votre téléphone suffisent chez tous les commerçants partenaires.',
  },
  {
    icon: 'storefront',
    titre: 'Un réseau qui\nvous entoure',
    texte: 'Retrouvez tous les restaurants, boulangeries et épiceries partenaires autour de vous.',
  },
];

export function Onboarding({ onTerminer }: { onTerminer: () => void }) {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const dernier = index === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.centre}>
        <View style={styles.haloExterne}>
          <View style={styles.haloInterne}>
            <Ionicons name={slide.icon} size={48} color={colors.accent} />
          </View>
        </View>
        <Text style={styles.titre}>{slide.titre}</Text>
        <Text style={styles.texte}>{slide.texte}</Text>
      </View>

      <View style={styles.bas}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActif]} />
          ))}
        </View>

        <TouchableOpacity
          style={styles.bouton}
          activeOpacity={0.85}
          onPress={() => (dernier ? onTerminer() : setIndex(index + 1))}
        >
          <Text style={styles.boutonTexte}>{dernier ? 'Commencer' : 'Suivant'}</Text>
        </TouchableOpacity>

        {!dernier && (
          <TouchableOpacity onPress={onTerminer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.passer}>Passer</Text>
          </TouchableOpacity>
        )}
      </View>

      <Wordmark size={16} style={styles.marque} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  haloExterne: {
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl,
  },
  haloInterne: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  titre: { color: colors.white, fontSize: fontSize.xl, fontWeight: '700', textAlign: 'center', marginBottom: spacing.md, lineHeight: 30 },
  texte: { color: colors.lightBlue, fontSize: fontSize.base, textAlign: 'center', lineHeight: 22 },
  bas: { alignItems: 'center', paddingHorizontal: spacing.xl },
  dots: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActif: { backgroundColor: colors.accent, width: 24 },
  bouton: { backgroundColor: colors.accent, borderRadius: borderRadius.md, paddingVertical: spacing.md, alignItems: 'center', width: '100%' },
  boutonTexte: { color: colors.primary, fontSize: fontSize.base, fontWeight: '700' },
  passer: { color: colors.lightBlue, marginTop: spacing.md, fontSize: fontSize.sm },
  marque: { alignSelf: 'center', marginTop: spacing.lg },
});
