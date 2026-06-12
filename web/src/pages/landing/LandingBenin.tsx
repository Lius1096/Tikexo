import React from 'react';

export default function LandingBenin() {
  return (
    <section className="benin-section">
      <div className="benin-grid">
        <div className="benin-left">
          <div className="benin-eyebrow">CONÇU POUR LE BÉNIN</div>
          <h2 className="benin-title">Mobile Money natif.<br /><strong>Pas une adaptation.</strong></h2>
          <p className="benin-sub">TIKEXO n'est pas une plateforme européenne traduite. C'est une solution pensée dès le départ pour le marché béninois — MTN, Moov et Celtis intégrés nativement, jours fériés béninois automatiques, interface en français, localisation Cotonou.</p>
          <div className="benin-ops">
            <div className="benin-op"><div className="benin-op-dot"></div><span className="benin-op-name">MTN Bénin</span></div>
            <div className="benin-op"><div className="benin-op-dot"></div><span className="benin-op-name">Moov Africa</span></div>
            <div className="benin-op"><div className="benin-op-dot"></div><span className="benin-op-name">Celtis / SBIN</span></div>
            <div className="benin-op"><div className="benin-op-dot" style={{ background: '#B45309' }}></div><span className="benin-op-name">KKiaPay backup</span></div>
          </div>
        </div>

        <div className="benin-right">
          <div className="benin-stat-card">
            <div className="benin-stat-icon">
              <i className="ti ti-building" style={{ fontSize: '18px', color: '#0EA5E9' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="benin-stat-val">38</div>
              <div className="benin-stat-label">entreprises actives à Cotonou</div>
            </div>
          </div>
          <div className="benin-stat-card">
            <div className="benin-stat-icon">
              <i className="ti ti-users" style={{ fontSize: '18px', color: '#0EA5E9' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="benin-stat-val">1 247</div>
              <div className="benin-stat-label">salariés bénéficiaires actifs</div>
            </div>
          </div>
          <div className="benin-stat-card">
            <div className="benin-stat-icon">
              <i className="ti ti-tools-kitchen-2" style={{ fontSize: '18px', color: '#0EA5E9' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="benin-stat-val">142</div>
              <div className="benin-stat-label">restaurants partenaires</div>
            </div>
          </div>
          <div className="benin-stat-card">
            <div className="benin-stat-icon">
              <i className="ti ti-chart-bar" style={{ fontSize: '18px', color: '#0EA5E9' }} aria-hidden="true"></i>
            </div>
            <div>
              <div className="benin-stat-val">47,3M</div>
              <div className="benin-stat-label">XOF de volume mensuel</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
