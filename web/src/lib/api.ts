import axios from 'axios';

// En production (Vercel), VITE_API_URL pointe vers le backend Render.
// En dev, on utilise le proxy Vite (baseURL relative).
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Empêche le navigateur de servir des 304 avec les anciennes données
    // (problème observable sur /dotations après /calculer)
    'Cache-Control': 'no-cache',
  },
  withCredentials: true,
});

// Auto-refresh on 401 — le cookie tikexo_refresh est envoyé automatiquement
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

    // Ne pas retry : la route refresh elle-même, la sonde de session /auth/profil,
    // et /auth/pin/statut (appelée avant login — utilisateur non authentifié par définition)
    if (
      error.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh') ||
      original.url?.includes('/auth/profil') ||
      original.url?.includes('/auth/pin/statut') ||
      original.url?.includes('/auth/login')
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
      // Le cookie tikexo_refresh est envoyé automatiquement via withCredentials
      await api.post('/auth/refresh');
      flush(null);
      return api(original);
    } catch (e) {
      flush(e);
      // Émettre un événement global — AuthContext l'écoute et déconnecte proprement
      window.dispatchEvent(new CustomEvent('tikexo:session-expired'));
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
