import React from 'react';

function Check({ featured }: { featured?: boolean }) {
  return <i className="ti ti-check" style={{ color: '#0EA5E9', fontSize: '13px', flexShrink: 0, marginTop: '1px' }} aria-hidden="true"></i>;
}

export default function LandingPricing() {
  return (
    <section className="section pricing-section">
      <div className="section-header">
        <div className="section-eyebrow">TARIFS</div>
        <h2 className="section-title">Simple, transparent,<br /><strong>rentable dès le 1er mois</strong></h2>
      </div>
      <div className="pricing-grid">
        <div className="pricing-card">
          <div className="pricing-name">Starter</div>
          <div className="pricing-price">15 000</div>
          <div className="pricing-period">XOF / mois · 1 à 20 salariés</div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Portail RH + app salariés</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Dotations automatiques</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">2% de commission par transaction</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Support email</div></div>
          <button className="pricing-cta">Commencer</button>
        </div>

        <div className="pricing-card featured">
          <div className="pricing-badge">Le plus populaire</div>
          <div className="pricing-name">Growth</div>
          <div className="pricing-price">35 000</div>
          <div className="pricing-period">XOF / mois · 21 à 100 salariés</div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Tout Starter inclus</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Gestion par niveaux hiérarchiques</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Exports comptables + factures PDF</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">1,8% de commission par transaction</div></div>
          <button className="pricing-cta">Commencer</button>
        </div>

        <div className="pricing-card">
          <div className="pricing-name">Business</div>
          <div className="pricing-price">75 000</div>
          <div className="pricing-period">XOF / mois · 101 à 300 salariés</div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Tout Growth inclus</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">Mutations inter-entreprises</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">KYC entreprise prioritaire</div></div>
          <div className="pricing-feat"><Check /><div className="pricing-feat-text">1,5% de commission + support dédié</div></div>
          <button className="pricing-cta">Contacter l'équipe</button>
        </div>
      </div>
    </section>
  );
}
