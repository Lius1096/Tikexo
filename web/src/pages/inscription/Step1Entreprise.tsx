import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Info, ShieldCheck, Check, Eye, EyeOff } from 'lucide-react';
import StepsBar from './StepsBar';
import type { InscriptionData } from './types';

const SECTEURS = ['Services', 'Commerce & Distribution', 'Finance & Banque', 'Santé', 'Éducation', 'Technologie', 'Industrie', 'Agriculture', 'Autre'];
const VILLES = ['Cotonou', 'Porto-Novo', 'Parakou', 'Abomey-Calavi', 'Bohicon', 'Natitingou', 'Autre'];
const NB_SALARIES = ['1 – 20', '21 – 100', '101 – 300', '300+'];

interface Props {
  data: InscriptionData;
  onChange: (patch: Partial<InscriptionData>) => void;
  onNext: () => void;
}

export default function Step1Entreprise({ data, onChange, onNext }: Props) {
  const navigate = useNavigate();
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const e = data.entreprise;
  const a = data.admin;

  function setE(patch: Partial<InscriptionData['entreprise']>) {
    onChange({ entreprise: { ...e, ...patch } });
  }
  function setA(patch: Partial<InscriptionData['admin']>) {
    onChange({ admin: { ...a, ...patch } });
  }

  const emailValide = a.email_rh.includes('@') && a.email_rh.includes('.');
  const pwdValide   = a.mot_de_passe.length >= 8;
  const pwdMatch    = a.mot_de_passe === a.confirmer_mot_de_passe && a.confirmer_mot_de_passe.length > 0;

  const valide =
    e.nom.trim() &&
    e.nif.trim() &&
    e.secteur &&
    e.adresse.trim() &&
    e.ville &&
    e.nb_salaries &&
    a.prenom.trim() &&
    a.nom.trim() &&
    a.telephone.trim().length >= 12 &&
    emailValide &&
    pwdValide &&
    pwdMatch &&
    data.cgu;

  return (
    <div className="light-panel">
      <StepsBar etape={1} />

      <div className="section-label">IDENTITÉ JURIDIQUE</div>

      <div className="form-group">
        <label className="form-label">Nom de l'entreprise <span className="form-required">*</span></label>
        <input className="form-input" placeholder="ex : SIKA SARL" value={e.nom} onChange={(ev) => setE({ nom: ev.target.value })} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">NIF <span className="form-required">*</span></label>
          <input className="form-input" placeholder="ex : NIF-BJ-XXXXX" value={e.nif} onChange={(ev) => setE({ nif: ev.target.value.toUpperCase() })} />
          {e.nif.length >= 5 && (
            <div className="form-success">
              <CheckCircle2 size={12} /> NIF vérifié DGID Bénin
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">RCCM <span className="form-optional">(optionnel)</span></label>
          <input className="form-input" placeholder="ex : RCCM-BJ-XXXXX" value={e.rccm} onChange={(ev) => setE({ rccm: ev.target.value.toUpperCase() })} />
          <div className="form-hint"><Info size={11} /> Registre du Commerce</div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Secteur d'activité <span className="form-required">*</span></label>
        <select className="form-select" value={e.secteur} onChange={(ev) => setE({ secteur: ev.target.value })}>
          <option value="">Sélectionner…</option>
          {SECTEURS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Adresse <span className="form-required">*</span></label>
        <input className="form-input" placeholder="ex : Avenue Jean Paul II, Cotonou" value={e.adresse} onChange={(ev) => setE({ adresse: ev.target.value })} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Ville <span className="form-required">*</span></label>
          <select className="form-select" value={e.ville} onChange={(ev) => setE({ ville: ev.target.value })}>
            <option value="">Sélectionner…</option>
            {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Nombre de salariés <span className="form-required">*</span></label>
          <select className="form-select" value={e.nb_salaries} onChange={(ev) => setE({ nb_salaries: ev.target.value })}>
            <option value="">Sélectionner…</option>
            {NB_SALARIES.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div className="section-label">CONTACT ADMINISTRATEUR RH</div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Prénom <span className="form-required">*</span></label>
          <input className="form-input" placeholder="Prénom" value={a.prenom} onChange={(ev) => setA({ prenom: ev.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Nom <span className="form-required">*</span></label>
          <input className="form-input" placeholder="Nom" value={a.nom} onChange={(ev) => setA({ nom: ev.target.value })} />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email de connexion <span className="form-required">*</span></label>
        <input
          className="form-input"
          type="email"
          placeholder="rh@entreprise.bj"
          value={a.email_rh}
          onChange={(ev) => setA({ email_rh: ev.target.value.toLowerCase() })}
        />
        <div className="form-hint"><Info size={11} /> Identifiant pour vous connecter au portail RH</div>
        {a.email_rh.length > 3 && !emailValide && (
          <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>Adresse email invalide</div>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Mot de passe <span className="form-required">*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showPwd ? 'text' : 'password'}
              placeholder="Min. 8 caractères"
              value={a.mot_de_passe}
              onChange={(ev) => setA({ mot_de_passe: ev.target.value })}
              style={{ paddingRight: '36px' }}
            />
            <button
              type="button"
              onClick={() => setShowPwd(v => !v)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}
            >
              {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {a.mot_de_passe.length > 0 && !pwdValide && (
            <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>Minimum 8 caractères</div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Confirmer <span className="form-required">*</span></label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Répéter le mot de passe"
              value={a.confirmer_mot_de_passe}
              onChange={(ev) => setA({ confirmer_mot_de_passe: ev.target.value })}
              style={{ paddingRight: '36px' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(v => !v)}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex' }}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {a.confirmer_mot_de_passe.length > 0 && !pwdMatch && (
            <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '4px' }}>Les mots de passe ne correspondent pas</div>
          )}
          {pwdMatch && a.confirmer_mot_de_passe.length > 0 && (
            <div style={{ fontSize: '11px', color: '#3B6D11', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle2 size={11} /> Mots de passe identiques
            </div>
          )}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Téléphone Mobile Money <span className="form-required">*</span></label>
        <input className="form-input" type="tel" placeholder="+229 01 97 00 00 00" value={a.telephone} onChange={(ev) => setA({ telephone: ev.target.value })} />
        <div className="form-hint"><Info size={11} /> Pour les alertes de rechargement et les paiements Mobile Money</div>
      </div>

      <div className="kyb-notice">
        <ShieldCheck size={15} color="#185FA5" style={{ flexShrink: 0, marginTop: 1 }} />
        <div className="kyb-notice-text">
          <strong style={{ fontWeight: 500 }}>Vérification KYB automatique.</strong> Votre NIF est vérifié en temps réel auprès de la DGID Bénin. La validation complète par l'équipe TIKEXO se fait sous 48h ouvrées.
        </div>
      </div>

      <div className="checkbox-row" onClick={() => onChange({ cgu: !data.cgu })}>
        <div className={`cb ${data.cgu ? 'checked' : ''}`}>
          {data.cgu && <Check size={11} color="#fff" />}
        </div>
        <div className="cb-text">J'accepte les <a onClick={(ev) => ev.stopPropagation()}>conditions d'utilisation</a> et la <a onClick={(ev) => ev.stopPropagation()}>politique de confidentialité</a> TIKEXO conformément à la loi APD Bénin.</div>
      </div>

      <button className="btn-primary" disabled={!valide} onClick={onNext}>
        <ArrowRight size={15} /> Continuer — Choisir mon plan
      </button>
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#94A3B8' }}>
        Déjà un compte ? <span style={{ color: '#0EA5E9', cursor: 'pointer' }} onClick={() => navigate('/login')}>Se connecter</span>
      </div>
    </div>
  );
}
