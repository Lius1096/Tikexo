import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BeneficiaireNav } from './src/navigation/BeneficiaireNav';
import { CommercantNav } from './src/navigation/CommercantNav';
import LoginScreen from './src/screens/Login';
import { colors } from './src/design-system/tokens';

const queryClient = new QueryClient();

function Root() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (user.role === 'COMMERCANT') return <CommercantNav />;
  if (user.role === 'BENEFICIAIRE') return <BeneficiaireNav />;

  return (
    <View style={styles.centre}>
      <Text style={styles.texte}>Ce rôle n'est pas pris en charge sur l'app mobile TIKEXO.</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationContainer>
            <StatusBar style="light" />
            <Root />
          </NavigationContainer>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 24 },
  texte: { color: colors.white, textAlign: 'center', fontSize: 14 },
});
