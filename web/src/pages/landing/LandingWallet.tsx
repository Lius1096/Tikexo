import React from 'react';

const ROWS = [
  {
    bg: 'rgba(14,165,233,0.15)',
    color: '#0EA5E9',
    icon: 'ti-arrow-down',
    label: 'Rechargement employeur → wallet',
    tag: 'paid',
    tagLabel: '1 appel FedaPay',
  },
  {
    bg: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.4)',
    icon: 'ti-users',
    label: 'Dotation 10 salariés',
    tag: 'free',
    tagLabel: '0 frais interne',
  },
  {
    bg: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.4)',
    icon: 'ti-qrcode',
    label: '200 paiements chez les restaurants',
    tag: 'free',
    tagLabel: '0 frais interne',
  },
  {
    bg: 'rgba(14,165,233,0.15)',
    color: '#0EA5E9',
    icon: 'ti-arrow-up',
    label: 'Reversement 5 restaurants',
    tag: 'paid',
    tagLabel: '5 appels FedaPay',
  },
];

export default function LandingWallet() {
  return (
    <section className="wallet-section">
      <div className="wallet-grid">
        <div className="wallet-left">
          <div className="section-eyebrow">L'INTELLIGENCE TIKEXO</div>
          <h2 className="section-title" style={{ marginBottom: '12px' }}>
            Le wallet interne :<br />
            <strong>zéro frais sur les échanges</strong>
          </h2>
          <p className="section-sub" style={{ marginBottom: '16px' }}>
            TIKEXO ne déclenche un appel FedaPay que quand l'argent entre ou sort
            du système. Tout le reste — dotations, paiements, commissions — est un
            mouvement interne gratuit et instantané.
          </p>
          <p className="section-sub">
            Résultat : <strong style={{ color: '#1A3C5E' }}>6 appels FedaPay</strong> au lieu
            de 211 pour 10 salariés et 5 restaurants sur un mois.
            Les frais sont divisés par 35.
          </p>
        </div>

        <div className="wallet-right">
          <div className="wallet-example-title">
            MOUVEMENTS D'ARGENT — EXEMPLE 10 SALARIÉS
          </div>

          {ROWS.map((r) => (
            <div key={r.label} className="wallet-ex-row">
              <div className="wallet-ex-icon" style={{ background: r.bg }}>
                <i className={`ti ${r.icon}`} style={{ color: r.color, fontSize: '13px' }} aria-hidden="true" />
              </div>
              <div className="wallet-ex-label">{r.label}</div>
              <div className={`wallet-ex-tag ${r.tag}`}>{r.tagLabel}</div>
            </div>
          ))}

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              Total appels FedaPay
            </span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '22px', fontWeight: 500, color: '#0EA5E9' }}>6</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>au lieu de 211</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
