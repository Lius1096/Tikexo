import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../design-system/tokens';

import Accueil from '../screens/beneficiaire/Accueil';
import Paiement from '../screens/beneficiaire/Paiement';
import Historique from '../screens/beneficiaire/Historique';
import CarteVirtuelle from '../screens/beneficiaire/CarteVirtuelle';
import Commercants from '../screens/beneficiaire/Commercants';
import CommercantFiche from '../screens/beneficiaire/CommercantFiche';
import Profil from '../screens/beneficiaire/Profil';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Accueil: 'home',
  Paiement: 'qr-code',
  Historique: 'time',
  Carte: 'card',
  Commercants: 'storefront',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route, navigation }) => ({
        tabBarActiveTintColor: colors.accent,
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
      <Tab.Screen name="Accueil" component={Accueil} options={{ tabBarLabel: 'Accueil' }} />
      <Tab.Screen name="Paiement" component={Paiement} options={{ tabBarLabel: 'Payer' }} />
      <Tab.Screen name="Historique" component={Historique} options={{ tabBarLabel: 'Historique' }} />
      <Tab.Screen name="Carte" component={CarteVirtuelle} options={{ tabBarLabel: 'Carte' }} />
      <Tab.Screen name="Commercants" component={Commercants} options={{ tabBarLabel: 'Commerçants' }} />
    </Tab.Navigator>
  );
}

export function BeneficiaireNav() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen
        name="CommercantFiche"
        component={CommercantFiche}
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
        }}
      />
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
