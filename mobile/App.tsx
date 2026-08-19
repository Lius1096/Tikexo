import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

import { verrouBiometriqueActif, onboardingVu, setOnboardingVu } from './src/lib/preferences';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { BeneficiaireNav } from './src/navigation/BeneficiaireNav';
import { CommercantNav } from './src/navigation/CommercantNav';
import LoginScreen from './src/screens/Login';
import LockScreen from './src/screens/Lock';
import { Onboarding } from './src/screens/Onboarding';
import { enregistrerPushToken } from './src/lib/notifications';
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
      const [materiel, enrole, preference] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        verrouBiometriqueActif(),
      ]);
      if (!materiel || !enrole || !preference) { setVerification(false); setVerrouille(false); return; }
      setVerification(false);
      setVerrouille(true);
      await tenter();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actif]);

  return { verification, verrouille, echec, tenter };
}

// Écran d'accueil (3 slides) affiché une seule fois avant la première connexion.
function useOnboarding() {
  const [chargement, setChargement] = useState(true);
  const [vu, setVu] = useState(true);

  useEffect(() => {
    (async () => setVu(await onboardingVu()))().finally(() => setChargement(false));
  }, []);

  async function marquerVu() {
    await setOnboardingVu();
    setVu(true);
  }

  return { chargement, vu, marquerVu };
}

function Root() {
  const { isLoading, user } = useAuth();
  const { verification, verrouille, echec, tenter } = useVerrouBiometrique(!!user);
  const { chargement: chargementOnboarding, vu: onboardingDejaVu, marquerVu: marquerOnboardingVu } = useOnboarding();

  if (isLoading || chargementOnboarding || verification) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    if (!onboardingDejaVu) return <Onboarding onTerminer={marquerOnboardingVu} />;
    return <LoginScreen />;
  }

  if (verrouille) return <LockScreen onRetry={tenter} echec={echec} />;

  return <NavigationApresConnexion user={user} />;
}

// Séparé de Root() pour n'appeler enregistrerPushToken() qu'une fois la
// session pleinement établie (post-verrou biométrique), pas à chaque
// changement d'état de chargement.
function NavigationApresConnexion({ user }: { user: NonNullable<ReturnType<typeof useAuth>['user']> }) {
  useEffect(() => {
    enregistrerPushToken();
  }, []);

  if (user.role === 'COMMERCANT') return <CommercantNav />;
  // L'app mobile n'a pas d'interface RH/employeur — un admin/RH qui a
  // inscrit son entreprise a aussi un wallet salarié personnel (créé
  // automatiquement à l'inscription, cf. la même bascule ajoutée côté web) :
  // on l'amène directement sur son espace bénéficiaire, seule expérience
  // mobile pertinente pour lui.
  const ROLES_ACCES_BENEFICIAIRE = ['BENEFICIAIRE', 'ADMIN_RH', 'ADMIN_DIRECTEUR', 'GESTIONNAIRE_RH'];
  if (ROLES_ACCES_BENEFICIAIRE.includes(user.role)) return <BeneficiaireNav />;

  return (
    <View style={styles.centre}>
      <Text style={styles.texte}>Ce rôle n'est pas pris en charge sur l'app mobile TIKEXO.</Text>
    </View>
  );
}

export default function App() {
  // Sans cet appel, la police Ionicons peut ne pas être prête au premier
  // rendu (surtout sur web) et chaque icône s'affiche comme un carré vide.
  const [iconesChargees] = useFonts(Ionicons.font);

  if (!iconesChargees) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.white} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: 24 },
  texte: { color: colors.white, textAlign: 'center', fontSize: 14 },
});
