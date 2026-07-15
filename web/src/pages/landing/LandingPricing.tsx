import React from 'react';
import { Check } from 'lucide-react';

const PLANS = [
  { name: 'Starter',  price: '15 000', period: 'XOF / mois · 1 à 20 salariés',    features: ['Portail RH + app salariés', 'Dotations automatiques', '2 % de commission par transaction', 'Support email'] },
  { name: 'Growth',   price: '35 000', period: 'XOF / mois · 21 à 100 salariés',  featured: true, badge: 'Le plus populaire', features: ['Tout Starter inclus', 'Gestion par niveaux hiérarchiques', 'Exports comptables + factures PDF', '1,8 % de commission par transaction'] },
  { name: 'Business', price: '75 000', period: 'XOF / mois · 101 à 300 salariés', features: ['Tout Growth inclus', 'Mutations inter-entreprises', 'KYC entreprise prioritaire', '1,5 % de commission + support dédié'], ctaLabel: "Contacter l'équipe" },
];

export default function LandingPricing() {
  return (
    <section className="section pricing-section" id="tarifs">
      <div className="section-header center">
        <div className="section-eyebrow">TARIFS</div>
        <h2 className="section-title">Simple, transparent,<br /><strong>rentable dès le 1er mois.</strong></h2>
        <p className="section-sub">Aucun frais d'installation, aucun engagement annuel obligatoire. Résiliez à tout moment.</p>
      </div>
      <div className="pricing-grid">
        {PLANS.map((p) => (
          <div key={p.name} className={`pricing-card${p.featured ? ' featured' : ''}`}>
            {p.badge && <div className="pricing-badge">{p.badge}</div>}
            <div className="pricing-name">{p.name}</div>
            <div className="pricing-price">{p.price}</div>
            <div className="pricing-period">{p.period}</div>
            <div className="pricing-divider" />
            {p.features.map((f) => (
              <div key={f} className="pricing-feat">
                <Check size={13} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 1 }} />
                <div className="pricing-feat-text">{f}</div>
              </div>
            ))}
            <button className="pricing-cta">{p.ctaLabel ?? 'Commencer'}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
