import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../lib/api';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<TikexoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    function onSessionExpired() { setUser(null); }
    window.addEventListener('tikexo:session-expired', onSessionExpired);
    return () => window.removeEventListener('tikexo:session-expired', onSessionExpired);
  }, []);

  // Vérification de session au montage via le cookie existant
  useEffect(() => {
    api.get('/auth/profil')
      .then(async ({ data }) => {
        const p = data.data;
        const u: TikexoUser = {
          id: p.id,
          nom: p.nom,
          prenom: p.prenom,
          telephone: p.telephone,
          email: p.email_perso,
          role: p.role,
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
        setUser(u);
      })
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function _enrichir(raw: { id: string; role: string; nom: string; prenom: string; email?: string }): Promise<TikexoUser> {
    const u: TikexoUser = { id: raw.id, nom: raw.nom, prenom: raw.prenom, telephone: '', email: raw.email, role: raw.role };

    try {
      const { data: profil } = await api.get('/auth/profil');
      const p = profil.data;
      u.telephone = p.telephone;
      u.email = p.email_perso;

      const lien = p.liensBeneficiaire?.[0];
      if (lien) {
        u.entrepriseId  = lien.entreprise_id;
        u.entrepriseNom = lien.entreprise?.nom;
      }
      if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(p.role) && p.entrepriseAdmin) {
        u.entrepriseId  = p.entrepriseAdmin.entreprise_id;
        u.entrepriseNom = p.entrepriseAdmin.entreprise?.nom;
      }
    } catch { /* enrichissement optionnel */ }

    if (raw.role === 'COMMERCANT') {
      try {
        const { data: cd } = await api.get('/commercants/moi');
        u.commercantId  = cd.data.id;
        u.commercantNom = cd.data.nom;
      } catch { /* enrichissement commerçant optionnel */ }
    }

    setUser(u);
    return u;
  }

  async function login(email: string, motDePasse: string): Promise<TikexoUser> {
    const { data } = await api.post('/auth/login', { email, mot_de_passe: motDePasse });
    const { user: raw } = data.data;
    return _enrichir(raw);
  }

  function logout() {
    api.post('/auth/logout').catch(() => {});
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

export const ROLES_ADMIN    = ['SUPER_ADMIN', 'ADMIN_OPS', 'ADMIN_RH', 'GESTIONNAIRE_RH'];
export const ROLES_EMPLOYEUR = ['ADMIN_RH', 'GESTIONNAIRE_RH'];
