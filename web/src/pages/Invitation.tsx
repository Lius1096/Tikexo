import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

type Step = 'loading' | 'form' | 'success' | 'error';

export default function Invitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<Step>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [userData, setUserData] = useState<{ prenom: string; nom: string; email_pro: string } | null>(null);

  const [emailPerso, setEmailPerso] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [cguAccepted, setCguAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formErr, setFormErr] = useState('');

  useEffect(() => {
    if (!token) {
      setErrMsg('Lien d\'invitation invalide ou expiré.');
      setStep('error');
      return;
    }
    api.get(`/auth/invitation/${token}`)
      .then(res => {
        setUserData(res.data.data);
        setStep('form');
      })
      .catch(err => {
        setErrMsg(err.response?.data?.error || 'Lien d\'invitation invalide ou expiré.');
        setStep('error');
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr('');

    if (!emailPerso.trim()) { setFormErr('Veuillez saisir votre email personnel.'); return; }
    if (motDePasse.length < 8) { setFormErr('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (motDePasse !== confirmation) { setFormErr('Les mots de passe ne correspondent pas.'); return; }
    if (!cguAccepted) { setFormErr('Vous devez accepter les Conditions Générales d\'Utilisation.'); return; }

    setSubmitting(true);
    const emailNorm = emailPerso.trim().toLowerCase();
    try {
      await api.post('/auth/invitation/complete', {
        token,
        email_perso: emailNorm,
        mot_de_passe: motDePasse,
      });
      // Invitation validée — login automatique avec les nouvelles credentials
      await login(emailNorm, motDePasse);
      setStep('success');
      setTimeout(() => navigate('/beneficiaire'), 2000);
    } catch (err: any) {
      setFormErr(err.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-white font-bold tracking-[4px] text-2xl mb-1">TIKEXO</div>
          <div className="text-white/60 text-xs tracking-widest">ESPACE SALARIÉ</div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="animate-spin text-[#4F46E5]" size={32} />
              <p className="text-slate-500 text-sm">Vérification du lien en cours…</p>
            </div>
          )}

          {step === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <AlertTriangle size={40} className="text-red-400" />
              <h2 className="text-slate-800 font-semibold text-lg">Lien invalide</h2>
              <p className="text-slate-500 text-sm">{errMsg}</p>
              <p className="text-slate-400 text-xs mt-2">Contactez votre employeur pour recevoir un nouveau lien.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <CheckCircle size={40} className="text-emerald-500" />
              <h2 className="text-slate-800 font-semibold text-lg">Compte activé !</h2>
              <p className="text-slate-500 text-sm">Votre compte TIKEXO est prêt. Redirection en cours…</p>
            </div>
          )}

          {step === 'form' && userData && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="text-center mb-2">
                <h2 className="text-slate-800 font-bold text-xl">Bienvenue, {userData.prenom} !</h2>
                <p className="text-slate-500 text-sm mt-1">Complétez votre profil pour accéder à votre wallet repas.</p>
              </div>

              {/* Email pro grisé */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email professionnel</label>
                <input
                  type="email"
                  value={userData.email_pro}
                  disabled
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* Email perso */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email personnel <span className="text-[#4F46E5] font-normal">(sera votre identifiant TIKEXO)</span>
                </label>
                <input
                  type="email"
                  value={emailPerso}
                  onChange={e => setEmailPerso(e.target.value)}
                  placeholder="ex : kofi@gmail.com"
                  required
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                />
              </div>

              {/* Mot de passe */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={motDePasse}
                    onChange={e => setMotDePasse(e.target.value)}
                    placeholder="8 caractères minimum"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirmation}
                    onChange={e => setConfirmation(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                    className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5]"
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {formErr && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-xs">{formErr}</p>
                </div>
              )}

              {/* Acceptation CGU */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={cguAccepted} onChange={e => setCguAccepted(e.target.checked)}
                  className="mt-0.5 accent-[#4F46E5]" />
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  J'accepte les{' '}
                  <Link to="/cgu" target="_blank" className="text-[#4F46E5] underline">
                    Conditions Générales d'Utilisation
                  </Link>{' '}
                  et la politique de traitement de mes données personnelles (RGPD).
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting || !cguAccepted}
                className="w-full bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-60 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                {submitting ? 'Activation en cours…' : 'Activer mon compte'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
