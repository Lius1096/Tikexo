import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tikexo_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function flush(err: unknown, token: string | null) {
  queue.forEach(({ resolve, reject }) => (err ? reject(err) : resolve(token!)));
  queue = [];
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    const refreshToken = localStorage.getItem('tikexo_refresh_token');
    if (!refreshToken) {
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (t) => { original.headers.Authorization = `Bearer ${t}`; resolve(api(original)); },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;
    try {
      const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
      const { accessToken: at, refreshToken: rt } = data.data;
      localStorage.setItem('tikexo_access_token', at);
      localStorage.setItem('tikexo_refresh_token', rt);
      flush(null, at);
      original.headers.Authorization = `Bearer ${at}`;
      return api(original);
    } catch (e) {
      flush(e, null);
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(e);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
