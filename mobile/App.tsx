import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BeneficiaireNav } from './src/navigation/BeneficiaireNav';
import { CommercantNav } from './src/navigation/CommercantNav';
import LoginScreen from './src/screens/Login';
import LockScreen from './src/screens/Lock';
import { colors } from './src/design-system/tokens';

const queryClient = new QueryClient();

// Verrou biométrique : déclenché une fois par session, juste après la
// restauration/connexion. Si l'appareil n'a pas de biométrie configurée,
// on ne bloque pas l'accès (pas de PIN de repli dans cette phase).
function useVerrouBiometrique(actif: boolean) {
  const [verification, setVerification] = useState(true);
  const [verrouille, setVerrouille] = useState(false);
  const [echec, setEchec] = useState(false);

  async function tenter() {
    setEchec(false);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouillez TIKEXO',
      cancelLabel: 'Annuler',
    });
    setVerrouille(!result.success);
    if (!result.success) setEchec(true);
  }

  useEffect(() => {
    if (!actif) { setVerification(false); setVerrouille(false); return; }
    (async () => {
      const [materiel, enrole] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ]);
      if (!materiel || !enrole) { setVerification(false); setVerrouille(false); return; }
      setVerification(false);
      setVerrouille(true);
      await tenter();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif]);

  return { verification, verrouille, echec, tenter };
}

function Root() {
  const { isLoading, user } = useAuth();
  const { verification, verrouille, echec, tenter } = useVerrouBiometrique(!!user);

  if (isLoading || verification) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  if (verrouille) return <LockScreen onRetry={tenter} echec={echec} />;

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
