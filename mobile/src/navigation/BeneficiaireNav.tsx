import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../design-system/tokens';

import Accueil from '../screens/beneficiaire/Accueil';
import Paiement from '../screens/beneficiaire/Paiement';
import Historique from '../screens/beneficiaire/Historique';
import CarteVirtuelle from '../screens/beneficiaire/CarteVirtuelle';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accueil: 'home',
  Paiement: 'qr-code',
  Historique: 'time',
  Carte: 'card',
};

export function BeneficiaireNav() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.dark + '80',
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.lightGray, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name] : (`${ICONS[route.name]}-outline` as keyof typeof Ionicons.glyphMap)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Accueil" component={Accueil} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Paiement" component={Paiement} options={{ tabBarLabel: 'Payer' }} />
      <Tab.Screen name="Historique" component={Historique} options={{ tabBarLabel: 'Historique' }} />
      <Tab.Screen name="Carte" component={CarteVirtuelle} options={{ tabBarLabel: 'Carte' }} />
    </Tab.Navigator>
  );
}
