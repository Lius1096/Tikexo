import React from 'react';
import { View } from 'react-native';
import type { CommercantItem } from './Commercants';

// react-native-maps est un module natif pur — inutilisable côté web. Ce
// stub n'est de toute façon jamais monté : Commercants.tsx masque déjà le
// bouton bascule liste/carte quand Platform.OS === 'web'. Il existe
// uniquement pour que Metro ne tente jamais de résoudre react-native-maps
// en ciblant la plateforme web (ce qui casse le bundle à la compilation,
// pas seulement à l'exécution).
export default function CommercantsCarte(_props: {
  items: CommercantItem[];
  position: { lat: number; lng: number } | null;
}) {
  return <View />;
}
