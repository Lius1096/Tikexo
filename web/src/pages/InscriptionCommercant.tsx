import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, Info, Loader2, Store, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';

const TYPES = [
  { value: 'RESTAURANT',   label: 'Restaurant' },
  { value: 'CAFETERIA',    label: 'Cafétéria / Snack' },
  { value: 'TRAITEUR',     label: 'Traiteur' },
  { value: 'BOULANGERIE',  label: 'Boulangerie / Pâtisserie' },
  { value: 'EPICERIE',     label: 'Épicerie / Alimentation' },
  { value: 'SUPERMARCHE',  label: 'Supermarché' },
  { value: 'LIVRAISON',    label: 'Livraison de repas' },
];

const VILLES = ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon', 'Natitingou', 'Autre'];
const OPERATEURS = ['MTN', 'MOOV', 'CELTIS'];

interface FormData {
  nom: string;
  type: string;
  email: string;
  mot_de_passe: string;
  confirmer_mot_de_passe: string;
  telephone: string;
  mobile_money_operateur: string;
  adresse: string;
  ville: string;
  ifu: string;
}

const EMPTY: FormData = {
  nom: '', type: '', email: '', mot_de_passe: '', confirmer_mot_de_passe: '',
  telephone: '', mobile_money_operateur: 'MTN', adresse: '', ville: '', ifu: '',
};

export default function InscriptionCommercant() {
  const navigate = useNavigate();
  const [form, setForm]         = useState<FormData>(EMPTY);
  const [showPwd, setShowPwd]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [erreur, setErreur]     = useState('');
  const [succes, setSucces]     = useState(false);

  function patch(p: Partial<FormData>) {
    setForm(prev => ({ ...prev, ...p }));
    setErreur('');
  }

  const emailValide = form.email.includes('@') && form.email.includes('.');
  const pwdValide   = form.mot_de_passe.length >= 8;
  const pwdMatch    = form.mot_de_passe === form.confirmer_mot_de_passe && form.confirmer_mot_de_passe.length > 0;
  const telValide   = form.telephone.replace(/\D/g, '').length >= 8;

  const valide =
    form.nom.trim() && form.type && emailValide && pwdValide && pwdMatch &&
    telValide && form.adresse.trim() && form.ville;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valide) return;
    setLoading(true); setErreur('');
    try {
      await api.post('/inscription/commercant', {
        nom:                    form.nom,
        type:                   form.type,
        email:                  form.email.trim().toLowerCase(),
        mot_de_passe:           form.mot_de_passe,
        telephone:              `+229${form.telephone.replace(/\D/g, '')}`,
        mobile_money_operateur: form.mobile_money_operateur,
        adresse:                form.adresse,
        ville:                  form.ville,
        ifu:                    form.ifu || undefined,
      });
      setSucces(true);
    } catch (err: any) {
      setErreur(err?.response?.data?.error || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  if (succes) {
    return (
      <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px 32px', maxWidth: '420px', width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#EAF3DE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={26} color="#3B6D11" />
          </div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B', marginBottom: '8px' }}>Demande envoyée !</div>
          <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.7, marginBottom: '24px' }}>
            Votre dossier commerçant a bien été reçu.<br />
            Un email de confirmation a été envoyé à <strong style={{ color: '#1A3C5E' }}>{form.email}</strong>.<br /><br />
            L'équipe TIKEXO examinera votre demande sous <strong>48h ouvrées</strong>. Une fois validé, connectez-vous sur le portail commerçant avec votre email et mot de passe.
          </div>
          <button
            onClick={() => navigate('/restaurant/connexion')}
            style={{ width: '100%', background: '#1A3C5E', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}
          >
            <ArrowRight size={15} /> Accéder au portail commerçant
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ width: '100%', background: 'transparent', color: '#94A3B8', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '10px', fontSize: '12px', cursor: 'pointer' }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9', display: 'flex', flexDirection: 'column' }}>
      {/* Nav */}
      <div style={{ background: '#1A3C5E', padding: '0 32px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '2.5px', cursor: 'pointer' }} onClick={() => navigate('/')}>TIKEXO</span>
        <button
          onClick={() => navigate('/restaurant/connexion')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif' }}
        >
          <ArrowLeft size={13} /> Déjà inscrit ? Se connecter
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px' }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>

          {/* En-tête */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ width: '44px', height: '44px', background: '#1A3C5E', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Store size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: '#1E293B' }}>Inscrivez votre établissement</div>
              <div style={{ fontSize: '12px', color: '#64748B' }}>Rejoignez le réseau TIKEXO et acceptez les titres-repas digitaux</div>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Type */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>TYPE D'ÉTABLISSEMENT <span style={{ color: '#EF4444' }}>*</span></label>
              <select
                value={form.type}
                onChange={e => patch({ type: e.target.value })}
                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
              >
                <option value="">Sélectionner…</option>
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Nom */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>NOM DE L'ÉTABLISSEMENT <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                value={form.nom}
                onChange={e => patch({ nom: e.target.value })}
                placeholder="ex : Restaurant Le Bon Repas"
                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>EMAIL DE CONNEXION <span style={{ color: '#EF4444' }}>*</span></label>
              <input
                type="email"
                value={form.email}
                onChange={e => patch({ email: e.target.value })}
                placeholder="contact@restaurant.bj"
                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={11} /> Identifiant pour accéder au portail commerçant
              </div>
              {form.email.length > 3 && !emailValide && (
                <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px' }}>Adresse email invalide</div>
              )}
            </div>

            {/* Mot de passe */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>MOT DE PASSE <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={form.mot_de_passe}
                    onChange={e => patch({ mot_de_passe: e.target.value })}
                    placeholder="Min. 8 caractères"
                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 36px 9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
                    {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.mot_de_passe.length > 0 && !pwdValide && (
                  <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px' }}>Minimum 8 caractères</div>
                )}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>CONFIRMER <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={form.confirmer_mot_de_passe}
                    onChange={e => patch({ confirmer_mot_de_passe: e.target.value })}
                    placeholder="Répéter"
                    style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 36px 9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowConf(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}>
                    {showConf ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.confirmer_mot_de_passe.length > 0 && !pwdMatch && (
                  <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '3px' }}>Ne correspond pas</div>
                )}
                {pwdMatch && (
                  <div style={{ fontSize: '11px', color: '#3B6D11', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CheckCircle2 size={11} /> Identiques
                  </div>
                )}
              </div>
            </div>

            {/* Téléphone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>TÉLÉPHONE MOBILE MONEY <span style={{ color: '#EF4444' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E2E8F0', borderRadius: '8px', background: '#F8FAFC', overflow: 'hidden' }}>
                  <span style={{ padding: '9px 10px', fontSize: '12px', color: '#94A3B8', fontFamily: 'monospace', flexShrink: 0 }}>+229</span>
                  <input
                    type="tel"
                    value={form.telephone}
                    onChange={e => patch({ telephone: e.target.value })}
                    placeholder="01 97 00 00 00"
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: '9px 12px 9px 0', fontSize: '13px', color: '#1E293B', outline: 'none' }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>OPÉRATEUR</label>
                <select
                  value={form.mobile_money_operateur}
                  onChange={e => patch({ mobile_money_operateur: e.target.value })}
                  style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
                >
                  {OPERATEURS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Adresse + Ville */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>ADRESSE <span style={{ color: '#EF4444' }}>*</span></label>
                <input
                  value={form.adresse}
                  onChange={e => patch({ adresse: e.target.value })}
                  placeholder="ex : Rue de l'Industrie"
                  style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>VILLE <span style={{ color: '#EF4444' }}>*</span></label>
                <select
                  value={form.ville}
                  onChange={e => patch({ ville: e.target.value })}
                  style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none' }}
                >
                  <option value="">Ville…</option>
                  {VILLES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* IFU optionnel */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#475569', marginBottom: '6px', letterSpacing: '0.3px' }}>IFU <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optionnel)</span></label>
              <input
                value={form.ifu}
                onChange={e => patch({ ifu: e.target.value.toUpperCase() })}
                placeholder="ex : IFU-BJ-XXXXX"
                style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: '#1E293B', background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Info size={11} /> Permet d'obtenir le niveau "Vérifié" plus rapidement
              </div>
            </div>

            {erreur && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#DC2626' }}>
                {erreur}
              </div>
            )}

            <button
              type="submit"
              disabled={!valide || loading}
              style={{ background: !valide || loading ? '#94A3B8' : '#1A3C5E', color: '#fff', border: 'none', borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: 600, cursor: !valide || loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background .2s' }}
            >
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Envoi en cours…</>
                : <><Check size={16} /> Soumettre ma demande d'inscription</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
