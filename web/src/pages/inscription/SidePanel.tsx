import React from 'react';

interface Props {
  etapeActive: 1 | 2 | 3;
}

const STEPS = [
  { num: 1, label: 'Identité entreprise', sub: 'NIF, RCCM, adresse, contact RH' },
  { num: 2, label: 'Choisir votre plan', sub: 'Starter, Growth ou Business' },
  { num: 3, label: 'Premier rechargement', sub: 'Mobile Money MTN / Moov / Celtis' },
];

export default function SidePanel({ etapeActive }: Props) {
  return (
    <div className="dark-panel">
      <div>
        <div className="dp-eye">TIKEXO · INSCRIPTION</div>
        <h2 className="dp-title">Votre entreprise<br /><strong>en ligne en 10 min.</strong></h2>
        <p className="dp-sub">Trois étapes. Aucune banque nécessaire. Vos salariés reçoivent leur wallet dès aujourd'hui.</p>
        <div className="dp-steps">
          {STEPS.map((s) => (
            <div className="dp-step" key={s.num}>
              <div
                className="dp-step-num"
                style={{ background: s.num === etapeActive ? '#0EA5E9' : s.num < etapeActive ? '#0EA5E9' : 'rgba(255,255,255,0.12)' }}
              >
                {s.num < etapeActive
                  ? <i className="ti ti-check" style={{ fontSize: '11px', color: '#fff' }} aria-hidden="true"></i>
                  : s.num}
              </div>
              <div>
                <div
                  className="dp-step-title"
                  style={{ color: s.num <= etapeActive ? '#fff' : 'rgba(255,255,255,0.35)' }}
                >
                  {s.label}
                </div>
                <div className="dp-step-sub">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="auto-fields">
          <div className="auto-fields-title">CHAMPS GÉRÉS AUTOMATIQUEMENT</div>
          <div className="auto-row">
            <span className="auto-label">Statut compte</span>
            <span className="auto-badge auto">Système</span>
          </div>
          <div className="auto-row">
            <span className="auto-label">KYB validé</span>
            <span className="auto-badge admin">Admin TIKEXO</span>
          </div>
          <div className="auto-row">
            <span className="auto-label">Date inscription</span>
            <span className="auto-badge auto">Automatique</span>
          </div>
        </div>
        <div className="dp-badges">
          <div className="dp-badge"><i className="ti ti-lock" aria-hidden="true"></i><span className="dp-badge-txt">APD Bénin</span></div>
          <div className="dp-badge"><i className="ti ti-shield-check" aria-hidden="true"></i><span className="dp-badge-txt">Chiffré</span></div>
          <div className="dp-badge"><i className="ti ti-device-mobile" aria-hidden="true"></i><span className="dp-badge-txt">iOS & Android</span></div>
        </div>
      </div>
    </div>
  );
}
