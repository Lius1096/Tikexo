import React from 'react';

const OPERATORS = [
  { name: 'MTN Bénin', color: '#F59E0B' },
  { name: 'Moov Africa', color: '#0EA5E9' },
  { name: 'Celtis / SBIN', color: '#6366F1' },
  { name: 'KKiaPay backup', color: '#B45309' },
];

const STATS = [
  { icon: 'ti-building', val: '38', label: 'entreprises\nactives à Cotonou' },
  { icon: 'ti-users', val: '1 247', label: 'salariés\nbénéficiaires actifs' },
  { icon: 'ti-tools-kitchen-2', val: '142', label: 'restaurants\npartenaires' },
  { icon: 'ti-chart-bar', val: '47,3M', label: 'XOF de\nvolume mensuel' },
];

export default function LandingBenin() {
  return (
    <section className="benin-section" id="restaurants">
      <div className="benin-grid">
        <div className="benin-left">
          <div className="benin-eyebrow">CONÇU POUR LE BÉNIN</div>
          <h2 className="benin-title">
            Mobile Money natif.<br />
            <strong>Pas une adaptation.</strong>
          </h2>
          <p className="benin-sub">
            TIKEXO n'est pas une plateforme européenne traduite. C'est une solution
            pensée dès le départ pour le marché béninois — MTN, Moov et Celtis
            intégrés nativement, jours fériés béninois automatiques, interface
            en français, localisation Cotonou.
          </p>
          <div className="benin-ops">
            {OPERATORS.map((op) => (
              <div key={op.name} className="benin-op">
                <div className="benin-op-dot" style={{ background: op.color }} />
                <span className="benin-op-name">{op.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="benin-right">
          {STATS.map((s) => (
            <div key={s.val} className="benin-stat-card">
              <div className="benin-stat-icon">
                <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: '#0EA5E9' }} aria-hidden="true" />
              </div>
              <div>
                <div className="benin-stat-val">{s.val}</div>
                <div className="benin-stat-label" style={{ whiteSpace: 'pre-line' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
