import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../design-system/tokens';

import Dashboard from '../screens/commercant/Dashboard';
import QrCode from '../screens/commercant/QrCode';
import Historique from '../screens/commercant/Historique';
import Reversements from '../screens/commercant/Reversements';

const Tab = createBottomTabNavigator();

export function CommercantNav() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.dark + '80',
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.lightGray },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="QrCode" component={QrCode} options={{ tabBarLabel: 'QR Code' }} />
      <Tab.Screen name="Historique" component={Historique} options={{ tabBarLabel: 'Historique' }} />
      <Tab.Screen name="Reversements" component={Reversements} options={{ tabBarLabel: 'Reversements' }} />
    </Tab.Navigator>
  );
}
