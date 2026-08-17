import * as SecureStore from 'expo-secure-store';

const KEY_ACCESS = 'tikexo_access_token';
const KEY_REFRESH = 'tikexo_refresh_token';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function getTokens(): Promise<Tokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(KEY_ACCESS),
    SecureStore.getItemAsync(KEY_REFRESH),
  ]);
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setTokens(tokens: Tokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken),
    SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(KEY_ACCESS),
    SecureStore.deleteItemAsync(KEY_REFRESH),
  ]);
}
