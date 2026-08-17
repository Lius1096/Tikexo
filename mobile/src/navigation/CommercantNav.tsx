import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../design-system/tokens';

import Dashboard from '../screens/commercant/Dashboard';
import QrCode from '../screens/commercant/QrCode';
import Historique from '../screens/commercant/Historique';
import Reversements from '../screens/commercant/Reversements';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home',
  QrCode: 'qr-code',
  Historique: 'time',
  Reversements: 'cash',
};

export function CommercantNav() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: colors.gold,
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
      <Tab.Screen name="Dashboard" component={Dashboard} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="QrCode" component={QrCode} options={{ tabBarLabel: 'QR Code' }} />
      <Tab.Screen name="Historique" component={Historique} options={{ tabBarLabel: 'Historique' }} />
      <Tab.Screen name="Reversements" component={Reversements} options={{ tabBarLabel: 'Reversements' }} />
    </Tab.Navigator>
  );
}
