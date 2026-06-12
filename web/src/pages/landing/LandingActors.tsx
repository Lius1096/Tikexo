import React from 'react';

function CheckIcon() {
  return <i className="ti ti-check" style={{ color: '#0EA5E9', fontSize: '13px', flexShrink: 0, marginTop: '1px' }} aria-hidden="true"></i>;
}

export default function LandingActors() {
  return (
    <section className="section">
      <div className="section-header">
        <div className="section-eyebrow">LES ACTEURS</div>
        <h2 className="section-title">Une plateforme,<br /><strong>trois interfaces dédiées</strong></h2>
        <p className="section-sub">Chaque acteur a exactement ce dont il a besoin, rien de plus. L'employeur gère, le salarié consomme, le commerçant encaisse.</p>
      </div>
      <div className="actors-grid">
        <div className="actor-card">
          <div className="actor-header">
            <div className="actor-avatar" style={{ background: '#DBEAFE' }}>
              <i className="ti ti-building" style={{ color: '#185FA5', fontSize: '19px' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="actor-name">Employeur</div>
              <div className="actor-role">Portail web RH</div>
            </div>
          </div>
          <div className="actor-features">
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Wallet entreprise + rechargement Mobile Money</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Gestion salariés par niveau hiérarchique</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Dotations automatiques ou manuelles</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Acompte configurable 0% à 100%</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Exports comptables + factures mensuelles</div></div>
          </div>
        </div>

        <div className="actor-card" style={{ borderColor: '#1A3C5E' }}>
          <div className="actor-header">
            <div className="actor-avatar" style={{ background: '#DBEAFE' }}>
              <i className="ti ti-user" style={{ color: '#185FA5', fontSize: '19px' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="actor-name">Salarié bénéficiaire</div>
              <div className="actor-role">App mobile iOS & Android</div>
            </div>
          </div>
          <div className="actor-features">
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Solde en temps réel après chaque transaction</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Paiement QR code chez les commerçants</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Carte virtuelle NFC + carte physique</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Carte interactive des restaurants partenaires</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Wallet portable entre employeurs</div></div>
          </div>
        </div>

        <div className="actor-card">
          <div className="actor-header">
            <div className="actor-avatar" style={{ background: '#EAF3DE' }}>
              <i className="ti ti-tools-kitchen-2" style={{ color: '#3B6D11', fontSize: '19px' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="actor-name">Commerçant partenaire</div>
              <div className="actor-role">App mobile caisse</div>
            </div>
          </div>
          <div className="actor-features">
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">QR code unique affiché en caisse</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Wallet du jour + reversement 72h</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Historique transactions en temps réel</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Visible sur la carte bénéficiaires TIKEXO</div></div>
            <div className="actor-feat"><CheckIcon /><div className="actor-feat-text">Commission déduite automatiquement</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
