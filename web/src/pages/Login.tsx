import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, Building2, Store, Lock, ArrowRight, UserCircle, AlertTriangle, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

type Step = 'credentials' | 'wrong_portal' | 'forgot' | 'reset';

interface WrongPortalInfo {
  prenom: string;
  nom: string;
  entrepriseNom?: string;
  role: string;
  correctLabel: string;
  correctHref: string;
}

function portalForRole(role: string): { label: string; href: string } | null {
  if (['ADMIN_RH', 'GESTIONNAIRE_RH'].includes(role)) return { label: 'Portail RH Employeur', href: '/entreprise/connexion' };
  if (['SUPER_ADMIN', 'ADMIN_OPS'].includes(role))    return { label: 'Administration',        href: '/admin/connexion' };
  if (role === 'BENEFICIAIRE')                         return { label: 'Espace Salarié',         href: '/login' };
  if (role === 'COMMERCANT')                           return { label: 'Espace Commerçant',      href: '/restaurant/connexion' };
  return null;
}

interface LoginProps {
  allowedRoles: string[];
  portalLabel: string;
  portalSub: string;
  redirectTo: string;
}

function iconForPortal(redirectTo: string) {
  if (redirectTo.startsWith('/admin'))      return <Lock size={32} className="text-tikexo-accent" />;
  if (redirectTo.startsWith('/employeur'))  return <Building2 size={32} className="text-tikexo-accent" />;
  if (redirectTo.startsWith('/commercant')) return <Store size={32} className="text-tikexo-accent" />;
  return <Wallet size={32} className="text-tikexo-accent" />;
}

export default function Login({ allowedRoles, portalLabel, portalSub, redirectTo }: LoginProps) {
  const { login, logout, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]           = useState<Step>('credentials');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [wrongPortal, setWrongPortal] = useState<WrongPortalInfo | null>(null);

  // Forgot / reset password
  const [forgotEmail, setForgotEmail]   = useState('');
  const [resetCode, setResetCode]       = useState('');
  const [newPassword, setNewPassword]   = useState('');
  const [showNewPwd, setShowNewPwd]     = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Déjà authentifié au chargement
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      if (allowedRoles.includes(user.role)) {
        window.location.href = redirectTo;
      } else {
        const correct = portalForRole(user.role);
        setWrongPortal({
          prenom: user.prenom,
          nom: user.nom,
          entrepriseNom: user.entrepriseNom,
          role: user.role,
          correctLabel: correct?.label ?? 'votre espace',
          correctHref: correct?.href ?? '/',
        });
        setStep('wrong_portal');
      }
    }
  }, [isAuthenticated, isLoading, user]);

  async function handleRedirect(u: { role: string; prenom: string; nom: string; entrepriseNom?: string }) {
    if (!allowedRoles.includes(u.role)) {
      const correct = portalForRole(u.role);
      setWrongPortal({
        prenom: u.prenom,
        nom: u.nom,
        entrepriseNom: u.entrepriseNom,
        role: u.role,
        correctLabel: correct?.label ?? 'votre espace',
        correctHref: correct?.href ?? '/',
      });
      setStep('wrong_portal');
      return;
    }
    if (redirectTo === '/employeur') {
      try {
        const { data } = await import('../lib/api').then(m => m.default.get('/kyb/dossier'));
        if (data?.data?.statut !== 'VALIDE') {
          window.location.href = '/employeur/kyb';
          return;
        }
      } catch { /* le layout gère la gate */ }
    }
    window.location.href = redirectTo;
  }

  async function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setError('Entrez votre adresse email.'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/mot-de-passe/oublie', { email: forgotEmail.trim().toLowerCase() });
      setStep('reset');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Erreur lors de l\'envoi. Vérifiez votre email.');
    } finally { setLoading(false); }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resetCode.trim()) { setError('Entrez le code reçu par email.'); return; }
    if (newPassword.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    setError(''); setLoading(true);
    try {
      await api.post('/auth/mot-de-passe/reinitialiser', {
        email: forgotEmail.trim().toLowerCase(),
        code: resetCode.trim(),
        nouveau_mot_de_passe: newPassword,
      });
      setResetSuccess(true);
      setTimeout(() => { setStep('credentials'); setResetSuccess(false); setResetCode(''); setNewPassword(''); }, 2500);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Code incorrect ou expiré.');
    } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError('Entrez votre adresse email.'); return; }
    if (!password)     { setError('Entrez votre mot de passe.'); return; }

    setError(''); setLoading(true);
    try {
      const u = await login(email.trim().toLowerCase(), password);
      await handleRedirect(u);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Email ou mot de passe incorrect.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-tikexo-primary flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl">

        {/* Hero */}
        {step !== 'wrong_portal' && (
          <div className="bg-tikexo-primary px-6 py-8 flex flex-col items-center">
            <div className="text-2xl font-medium text-white tracking-[3px] mb-1">TIKEXO</div>
            <div className="text-[11px] text-white/50 tracking-[1px] mb-6">{portalSub}</div>
            <div className="w-16 h-16 bg-tikexo-accent/20 rounded-[20px] flex items-center justify-center">
              {iconForPortal(redirectTo)}
            </div>
            <div className="text-[11px] text-white/40 mt-3 tracking-[0.5px]">{portalLabel}</div>
          </div>
        )}

        {/* Bandeau compact mauvais portail */}
        {step === 'wrong_portal' && (
          <div className="bg-tikexo-primary px-6 py-4 flex items-center gap-3">
            <div className="text-lg font-medium text-white tracking-[3px]">TIKEXO</div>
            <div className="text-[10px] text-white/40 tracking-[1px]">MAUVAIS PORTAIL</div>
          </div>
        )}

        {/* ── Formulaire email + mot de passe ── */}
        {step === 'credentials' && (
          <form onSubmit={handleSubmit} className="px-6 py-6" noValidate>
            <div className="text-base font-medium text-slate-900 mb-1">Connexion</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-5">
              Entrez vos identifiants pour accéder à votre espace.
            </div>

            {/* Email */}
            <div className="mb-3">
              <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">ADRESSE EMAIL</div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus-within:border-tikexo-accent focus-within:bg-white transition-colors">
                <Mail size={15} className="text-slate-400 flex-shrink-0" />
                <input
                  type="email"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  autoFocus
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="mb-1">
              <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">MOT DE PASSE</div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus-within:border-tikexo-accent focus-within:bg-white transition-colors">
                <Lock size={15} className="text-slate-400 flex-shrink-0" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="text-slate-400 hover:text-slate-600 flex-shrink-0"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="text-right mb-4">
              <button
                type="button"
                onClick={() => { setForgotEmail(email); setStep('forgot'); setError(''); }}
                className="text-[11px] text-tikexo-accent hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {error && (
              <div className="text-[11px] text-tikexo-danger mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-tikexo-primary text-white rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-tikexo-accent transition-colors disabled:opacity-60"
            >
              {loading ? 'Connexion en cours…' : 'Se connecter'}
              {!loading && <ArrowRight size={16} />}
            </button>

            <div className="text-[10px] text-slate-400 text-center mt-4 leading-relaxed">
              En vous connectant, vous acceptez les conditions d'utilisation TIKEXO.
            </div>
            {redirectTo === '/commercant' && (
              <div className="text-[11px] text-slate-400 text-center mt-3">
                Pas encore inscrit ?{' '}
                <a href="/restaurant/inscription" className="text-tikexo-accent underline cursor-pointer">
                  Soumettre une demande
                </a>
              </div>
            )}
            {redirectTo === '/employeur' && (
              <div className="text-[11px] text-slate-400 text-center mt-3">
                Pas encore inscrit ?{' '}
                <a href="/inscription" className="text-tikexo-accent underline cursor-pointer">
                  Inscrire mon entreprise
                </a>
              </div>
            )}
          </form>
        )}

        {/* ── Écran mauvais portail ── */}
        {step === 'wrong_portal' && wrongPortal && (
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
              <UserCircle size={34} className="text-slate-400" />
            </div>
            <div className="text-[13px] font-medium text-slate-800 mb-1">
              Bonjour {wrongPortal.prenom} {wrongPortal.nom}
            </div>
            {wrongPortal.entrepriseNom && (
              <div className="text-[11px] text-slate-400 mb-3">
                Membre de <span className="font-medium text-slate-600">{wrongPortal.entrepriseNom}</span>
              </div>
            )}
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-5 text-left">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-[11px] text-amber-800 leading-relaxed">
                Vous êtes au <span className="font-semibold">mauvais portail</span>. Ce portail est réservé à <span className="font-semibold">{portalLabel}</span>.
              </span>
            </div>
            <a
              href={wrongPortal.correctHref}
              className="w-full flex items-center justify-center gap-2 bg-tikexo-primary text-white rounded-lg py-3 text-[13px] font-medium hover:bg-tikexo-accent transition-colors"
            >
              Accéder à <span className="font-semibold">{wrongPortal.correctLabel}</span>
              <ArrowRight size={15} />
            </a>
            <button
              type="button"
              onClick={() => { logout(); setStep('credentials'); setWrongPortal(null); setEmail(''); setPassword(''); setError(''); }}
              className="mt-3 text-[11px] text-slate-400 hover:text-slate-600 underline"
            >
              Se connecter avec un autre compte
            </button>
          </div>
        )}
        {/* ── Mot de passe oublié : saisie email ── */}
        {step === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="px-6 py-6" noValidate>
            <button type="button" onClick={() => { setStep('credentials'); setError(''); }} className="text-[11px] text-slate-400 hover:text-slate-600 mb-4">← Retour</button>
            <div className="text-base font-medium text-slate-900 mb-1">Mot de passe oublié</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-5">
              Entrez votre email. Vous recevrez un code à 6 chiffres pour réinitialiser votre mot de passe.
            </div>

            <div className="mb-5">
              <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">ADRESSE EMAIL</div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus-within:border-tikexo-accent focus-within:bg-white transition-colors">
                <Mail size={15} className="text-slate-400 flex-shrink-0" />
                <input
                  type="email" autoFocus autoComplete="email"
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                  placeholder="vous@exemple.com"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setError(''); }}
                />
              </div>
            </div>

            {error && <div className="text-[11px] text-tikexo-danger mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading} className="w-full bg-tikexo-primary text-white rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-tikexo-accent transition-colors disabled:opacity-60">
              {loading ? 'Envoi en cours…' : 'Envoyer le code'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* ── Réinitialisation : code + nouveau mot de passe ── */}
        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="px-6 py-6" noValidate>
            <button type="button" onClick={() => { setStep('forgot'); setError(''); }} className="text-[11px] text-slate-400 hover:text-slate-600 mb-4">← Retour</button>
            <div className="text-base font-medium text-slate-900 mb-1">Nouveau mot de passe</div>
            <div className="text-xs text-slate-500 leading-relaxed mb-5">
              Entrez le code reçu par email et choisissez un nouveau mot de passe (6 caractères min.).
            </div>

            {resetSuccess && (
              <div className="flex items-center gap-2 text-[12px] text-green-700 mb-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                <CheckCircle size={14} className="flex-shrink-0" />
                Mot de passe réinitialisé ! Redirection vers la connexion…
              </div>
            )}

            <div className="mb-3">
              <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">CODE REÇU PAR EMAIL</div>
              <input
                type="text" inputMode="numeric" autoFocus maxLength={6}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-tikexo-accent/20 focus:border-tikexo-accent tracking-[4px] text-center font-mono"
                placeholder="· · · · · ·"
                value={resetCode}
                onChange={(e) => { setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
              />
            </div>

            <div className="mb-5">
              <div className="text-[11px] text-slate-500 mb-1.5 tracking-[0.3px]">NOUVEAU MOT DE PASSE</div>
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2.5 bg-slate-50 focus-within:border-tikexo-accent focus-within:bg-white transition-colors">
                <Lock size={15} className="text-slate-400 flex-shrink-0" />
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder-slate-400"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowNewPwd(v => !v)} className="text-slate-400 hover:text-slate-600" tabIndex={-1}>
                  {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <div className="text-[11px] text-tikexo-danger mb-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" disabled={loading || resetSuccess} className="w-full bg-tikexo-primary text-white rounded-lg py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-tikexo-accent transition-colors disabled:opacity-60">
              {loading ? 'Réinitialisation…' : 'Réinitialiser le mot de passe'}
              {!loading && !resetSuccess && <ArrowRight size={16} />}
            </button>
          </form>
        )}

      </div>

      <div className="text-[10px] text-white/30 mt-6 text-center">
        TIKEXO · tikexo.bj
      </div>
    </div>
  );
}
