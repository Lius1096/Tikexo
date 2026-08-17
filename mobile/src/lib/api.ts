import axios from 'axios';
import * as authStorage from './authStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tikexo.bj/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Miroir synchrone du token en mémoire — l'intercepteur de requête doit rester
// synchrone ; on ne peut pas attendre SecureStore (async) à chaque appel.
// AuthContext appelle setAccessToken() une fois au démarrage (après lecture de
// SecureStore) puis à chaque login/refresh/logout.
let accessTokenMemoire: string | null = null;
export function setAccessToken(token: string | null) {
  accessTokenMemoire = token;
}

api.interceptors.request.use((config) => {
  if (accessTokenMemoire) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${accessTokenMemoire}`;
  }
  return config;
});

let onSessionExpiredCallback: (() => void) | null = null;
export function setOnSessionExpired(cb: (() => void) | null) {
  onSessionExpiredCallback = cb;
}

// Auto-refresh sur 401 — même motif que web/src/lib/api.ts (file d'attente
// pour éviter plusieurs refresh concurrents), adapté pour un refreshToken
// transmis dans le corps (pas de cookie jar sur React Native).
let isRefreshing = false;
let queue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

function flush(err: unknown) {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve()));
  queue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/profil') ||
      original.url?.includes('/auth/pin/statut') ||
      original.url?.includes('/auth/pin/verifier') ||
      original.url?.includes('/auth/pin/oublie') ||
      original.url?.includes('/auth/login') ||
      original.url?.includes('/auth/otp/') ||
      original.url?.includes('/auth/mot-de-passe/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve: () => resolve(api(original)), reject });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const tokens = await authStorage.getTokens();
      if (!tokens) throw new Error('Pas de refresh token stocké');

      const { data } = await api.post('/auth/refresh', { refreshToken: tokens.refreshToken });
      const nouveaux = { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken };
      await authStorage.setTokens(nouveaux);
      setAccessToken(nouveaux.accessToken);

      flush(null);
      return api(original);
    } catch (e) {
      flush(e);
      await authStorage.clearTokens();
      setAccessToken(null);
      onSessionExpiredCallback?.();
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
