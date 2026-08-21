import * as SecureStore from 'expo-secure-store';

const CLE_VERROU_BIOMETRIQUE = 'tikexo_verrou_biometrique_actif';

// Par défaut activé — l'utilisateur peut le désactiver depuis Profil > Sécurité.
export async function verrouBiometriqueActif(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(CLE_VERROU_BIOMETRIQUE);
  return v !== 'false';
}

export async function setVerrouBiometriqueActif(actif: boolean): Promise<void> {
  await SecureStore.setItemAsync(CLE_VERROU_BIOMETRIQUE, actif ? 'true' : 'false');
}

const CLE_ONBOARDING_VU = 'tikexo_onboarding_vu';

export async function onboardingVu(): Promise<boolean> {
  const v = await SecureStore.getItemAsync(CLE_ONBOARDING_VU);
  return v === 'true';
}

export async function setOnboardingVu(): Promise<void> {
  await SecureStore.setItemAsync(CLE_ONBOARDING_VU, 'true');
}
