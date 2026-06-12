import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

export interface TikexoUser {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  role: string;
  entrepriseId?: string;
  entrepriseNom?: string;
  commercantId?: string;
  commercantNom?: string;
}

interface AuthCtx {
  user: TikexoUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requestOtp: (telephone: string) => Promise<void>;
  verifierOtp: (telephone: string, code: string) => Promise<TikexoUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TikexoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('tikexo_user');
    if (raw && localStorage.getItem('tikexo_access_token')) {
      try { setUser(JSON.parse(raw)); } catch { localStorage.clear(); }
    }
    setIsLoading(false);
  }, []);

  async function requestOtp(telephone: string) {
    await api.post('/auth/otp/demander', { telephone });
  }

  async function verifierOtp(telephone: string, code: string): Promise<TikexoUser> {
    const { data } = await api.post('/auth/otp/verifier', { telephone, code });
    const { accessToken, refreshToken, user: u } = data.data;
    localStorage.setItem('tikexo_access_token', accessToken);
    localStorage.setItem('tikexo_refresh_token', refreshToken);

    let enriched: TikexoUser = { ...u };
    try {
      const { data: profil } = await api.get('/auth/profil');
      const p = profil.data;
      const lien = p.liensBeneficiaire?.[0];
      if (lien) {
        enriched.entrepriseId = lien.entreprise_id;
        enriched.entrepriseNom = lien.entreprise?.nom;
      }
    } catch { /* profil enrichissement échoué, on continue */ }

    if (u.role === 'COMMERCANT') {
      try {
        const { data: commData } = await api.get('/commercants/moi');
        enriched.commercantId = commData.data.id;
        enriched.commercantNom = commData.data.nom;
      } catch { /* enrichissement commerçant échoué */ }
    }

    localStorage.setItem('tikexo_user', JSON.stringify(enriched));
    setUser(enriched);
    return enriched;
  }

  function logout() {
    api.post('/auth/logout').catch(() => {});
    localStorage.clear();
    setUser(null);
    window.location.href = '/login';
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, requestOtp, verifierOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

export const ROLES_ADMIN = ['SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'];
export const ROLES_EMPLOYEUR = ['ADMIN_RH', 'GESTIONNAIRE_RH'];
