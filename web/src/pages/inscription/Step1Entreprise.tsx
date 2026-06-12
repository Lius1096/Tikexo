import React from 'react';
import { useNavigate } from 'react-router-dom';
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

  const e = data.entreprise;
  const a = data.admin;

  function setE(patch: Partial<InscriptionData['entreprise']>) {
    onChange({ entreprise: { ...e, ...patch } });
  }
  function setA(patch: Partial<InscriptionData['admin']>) {
    onChange({ admin: { ...a, ...patch } });
  }

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
    data.cgu;

  return (
    <div className="light-panel">
      <StepsBar etape={1} />

      <div className="section-label">IDENTITÉ JURIDIQUE</div>

      <div className="form-group">
        <label className="form-label">Nom de l'entreprise <span className="form-required">*</span></label>
        <input
          className="form-input"
          placeholder="ex : SIKA SARL"
          value={e.nom}
          onChange={(ev) => setE({ nom: ev.target.value })}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">NIF <span className="form-required">*</span></label>
          <input
            className="form-input"
            placeholder="ex : NIF-BJ-XXXXX"
            value={e.nif}
            onChange={(ev) => setE({ nif: ev.target.value.toUpperCase() })}
          />
          {e.nif.length >= 5 && (
            <div className="form-success">
              <i className="ti ti-circle-check" aria-hidden="true"></i> NIF vérifié DGID Bénin
            </div>
          )}
        </div>
        <div className="form-group">
          <label className="form-label">RCCM <span className="form-optional">(optionnel)</span></label>
          <input
            className="form-input"
            placeholder="ex : RCCM-BJ-XXXXX"
            value={e.rccm}
            onChange={(ev) => setE({ rccm: ev.target.value.toUpperCase() })}
          />
          <div className="form-hint"><i className="ti ti-info-circle" aria-hidden="true"></i> Registre du Commerce</div>
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
        <input
          className="form-input"
          placeholder="ex : Avenue Jean Paul II, Cotonou"
          value={e.adresse}
          onChange={(ev) => setE({ adresse: ev.target.value })}
        />
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
          <input
            className="form-input"
            placeholder="Prénom"
            value={a.prenom}
            onChange={(ev) => setA({ prenom: ev.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Nom <span className="form-required">*</span></label>
          <input
            className="form-input"
            placeholder="Nom"
            value={a.nom}
            onChange={(ev) => setA({ nom: ev.target.value })}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email RH <span className="form-optional">(optionnel)</span></label>
        <input
          className="form-input"
          type="email"
          placeholder="rh@entreprise.bj"
          value={a.email_rh}
          onChange={(ev) => setA({ email_rh: ev.target.value })}
        />
        <div className="form-hint"><i className="ti ti-info-circle" aria-hidden="true"></i> Utilisé pour les notifications</div>
      </div>

      <div className="form-group">
        <label className="form-label">Téléphone Mobile Money <span className="form-required">*</span></label>
        <input
          className="form-input"
          type="tel"
          placeholder="+229 01 97 00 00 00"
          value={a.telephone}
          onChange={(ev) => setA({ telephone: ev.target.value })}
        />
        <div className="form-hint"><i className="ti ti-info-circle" aria-hidden="true"></i> Alertes rechargement + authentification OTP</div>
      </div>

      <div className="kyb-notice">
        <i className="ti ti-shield-check" aria-hidden="true"></i>
        <div className="kyb-notice-text">
          <strong style={{ fontWeight: 500 }}>Vérification KYB automatique.</strong> Votre NIF est vérifié en temps réel auprès de la DGID Bénin. La validation complète par l'équipe TIKEXO se fait sous 48h ouvrées.
        </div>
      </div>

      <div className="checkbox-row" onClick={() => onChange({ cgu: !data.cgu })}>
        <div className={`cb ${data.cgu ? 'checked' : ''}`}>
          {data.cgu && <i className="ti ti-check" aria-hidden="true"></i>}
        </div>
        <div className="cb-text">J'accepte les <a onClick={(ev) => ev.stopPropagation()}>conditions d'utilisation</a> et la <a onClick={(ev) => ev.stopPropagation()}>politique de confidentialité</a> TIKEXO conformément à la loi APD Bénin.</div>
      </div>

      <button className="btn-primary" disabled={!valide} onClick={onNext}>
        <i className="ti ti-arrow-right" aria-hidden="true"></i> Continuer — Choisir mon plan
      </button>
      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px', color: '#94A3B8' }}>
        Déjà un compte ? <span style={{ color: '#0EA5E9', cursor: 'pointer' }} onClick={() => navigate('/login')}>Se connecter</span>
      </div>
    </div>
  );
}
