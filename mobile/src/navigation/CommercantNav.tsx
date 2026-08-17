import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../design-system/tokens';

import Dashboard from '../screens/commercant/Dashboard';
import QrCode from '../screens/commercant/QrCode';
import ScannerCarte from '../screens/commercant/ScannerCarte';
import Historique from '../screens/commercant/Historique';
import Reversements from '../screens/commercant/Reversements';
import Profil from '../screens/commercant/Profil';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home',
  QrCode: 'qr-code',
  ScannerCarte: 'scan',
  Historique: 'time',
  Reversements: 'cash',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.dark + '80',
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.lightGray, height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.getParent()?.navigate('Profil')} style={{ marginRight: 16 }}>
            <Ionicons name="person-circle-outline" size={26} color={colors.white} />
          </TouchableOpacity>
        ),
        tabBarIcon: ({ color, size, focused }) => (
          <Ionicons name={focused ? ICONS[route.name] : (`${ICONS[route.name]}-outline` as keyof typeof Ionicons.glyphMap)} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="QrCode" component={QrCode} options={{ tabBarLabel: 'QR Code' }} />
      <Tab.Screen name="ScannerCarte" component={ScannerCarte} options={{ tabBarLabel: 'Encaisser' }} />
      <Tab.Screen name="Historique" component={Historique} options={{ tabBarLabel: 'Historique' }} />
      <Tab.Screen name="Reversements" component={Reversements} options={{ tabBarLabel: 'Reversements' }} />
    </Tab.Navigator>
  );
}

export function CommercantNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="Profil"
        component={Profil}
        options={{
          headerShown: true,
          title: 'Mon profil',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />
    </Stack.Navigator>
  );
}
