import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api, { setAccessToken, setOnSessionExpired } from '../lib/api';
import * as authStorage from '../lib/authStorage';

export interface TikexoUser {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email?: string;
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
  login: (email: string, motDePasse: string) => Promise<TikexoUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

// Même enrichissement que web/src/context/AuthContext.tsx#_enrichir — un seul
// GET /auth/profil (+ /commercants/moi si commerçant) construit l'objet
// TikexoUser complet, que ce soit après connexion ou après restauration de
// session au démarrage.
async function chargerProfil(): Promise<TikexoUser> {
  const { data: profil } = await api.get('/auth/profil');
  const p = profil.data;

  const u: TikexoUser = {
    id: p.id, nom: p.nom, prenom: p.prenom,
    telephone: p.telephone, email: p.email_perso, role: p.role,
  };

  const lien = p.liensBeneficiaire?.[0];
  if (lien) {
    u.entrepriseId  = lien.entreprise_id;
    u.entrepriseNom = lien.entreprise?.nom;
  }
  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(p.role) && p.entrepriseAdmin) {
    u.entrepriseId  = p.entrepriseAdmin.entreprise_id;
    u.entrepriseNom = p.entrepriseAdmin.entreprise?.nom;
  }
  if (p.role === 'COMMERCANT') {
    try {
      const { data: cd } = await api.get('/commercants/moi');
      u.commercantId  = cd.data.id;
      u.commercantNom = cd.data.nom;
    } catch { /* enrichissement commerçant optionnel */ }
  }

  return u;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TikexoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setOnSessionExpired(() => setUser(null));
    return () => setOnSessionExpired(null);
  }, []);

  // Restauration de session au démarrage — lit les tokens stockés, hydrate le
  // client API, puis valide/reconstruit l'utilisateur via /auth/profil.
  useEffect(() => {
    (async () => {
      const tokens = await authStorage.getTokens();
      if (!tokens) { setIsLoading(false); return; }

      setAccessToken(tokens.accessToken);
      try {
        setUser(await chargerProfil());
      } catch {
        await authStorage.clearTokens();
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, motDePasse: string): Promise<TikexoUser> {
    const { data } = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
    const { accessToken, refreshToken } = data.data;

    await authStorage.setTokens({ accessToken, refreshToken });
    setAccessToken(accessToken);

    const u = await chargerProfil();
    setUser(u);
    return u;
  }

  async function logout() {
    api.post('/auth/logout').catch(() => {});
    await authStorage.clearTokens();
    setAccessToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
