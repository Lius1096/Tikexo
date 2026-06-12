import React from 'react';

export default function LandingWallet() {
  return (
    <section className="wallet-section">
      <div className="wallet-grid">
        <div className="wallet-left">
          <div className="section-eyebrow">LA VRAIE INTELLIGENCE</div>
          <h2 className="section-title" style={{ marginBottom: '10px' }}>Le wallet interne :<br /><strong>zéro frais sur les échanges</strong></h2>
          <p className="section-sub" style={{ marginBottom: '16px' }}>TIKEXO ne déclenche un appel FedaPay que quand l'argent entre ou sort du système. Tout le reste — dotations, paiements, commissions — est un mouvement interne gratuit et instantané.</p>
          <p className="section-sub">Résultat : 6 appels FedaPay au lieu de 211 pour 10 salariés et 5 restaurants sur un mois. Les frais sont divisés par 35.</p>
        </div>
        <div className="wallet-right">
          <div className="wallet-example-title">MOUVEMENTS D'ARGENT — EXEMPLE 10 SALARIÉS</div>
          <div className="wallet-ex-row">
            <div className="wallet-ex-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>
              <i className="ti ti-arrow-down" style={{ color: '#0EA5E9', fontSize: '13px' }} aria-hidden="true"></i>
            </div>
            <div className="wallet-ex-label">Rechargement employeur → wallet</div>
            <div className="wallet-ex-tag paid">1 appel FedaPay</div>
          </div>
          <div className="wallet-ex-row">
            <div className="wallet-ex-icon" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <i className="ti ti-users" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }} aria-hidden="true"></i>
            </div>
            <div className="wallet-ex-label">Dotation 10 salariés</div>
            <div className="wallet-ex-tag free">0 frais interne</div>
          </div>
          <div className="wallet-ex-row">
            <div className="wallet-ex-icon" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <i className="ti ti-qrcode" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }} aria-hidden="true"></i>
            </div>
            <div className="wallet-ex-label">200 paiements chez les restaurants</div>
            <div className="wallet-ex-tag free">0 frais interne</div>
          </div>
          <div className="wallet-ex-row">
            <div className="wallet-ex-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>
              <i className="ti ti-arrow-up" style={{ color: '#0EA5E9', fontSize: '13px' }} aria-hidden="true"></i>
            </div>
            <div className="wallet-ex-label">Reversement 5 restaurants</div>
            <div className="wallet-ex-tag paid">5 appels FedaPay</div>
          </div>
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Total appels FedaPay</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '18px', fontWeight: 500, color: '#0EA5E9' }}>6</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>au lieu de 211</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
