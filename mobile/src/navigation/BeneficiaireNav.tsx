import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../design-system/tokens';

import Accueil from '../screens/beneficiaire/Accueil';
import Paiement from '../screens/beneficiaire/Paiement';
import Historique from '../screens/beneficiaire/Historique';
import CarteVirtuelle from '../screens/beneficiaire/CarteVirtuelle';

const Tab = createBottomTabNavigator();

export function BeneficiaireNav() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.dark + '80',
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.lightGray },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Accueil" component={Accueil} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Paiement" component={Paiement} options={{ tabBarLabel: 'Payer' }} />
      <Tab.Screen name="Historique" component={Historique} options={{ tabBarLabel: 'Historique' }} />
      <Tab.Screen name="Carte" component={CarteVirtuelle} options={{ tabBarLabel: 'Carte' }} />
    </Tab.Navigator>
  );
}
