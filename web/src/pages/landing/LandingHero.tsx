import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingHero() {
  const navigate = useNavigate();
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-left">
          <div className="hero-eyebrow">TIKEXO.BJ — TITRE-RESTAURANT DIGITALISÉ</div>
          <h1 className="hero-title">Le repas de vos<br />salariés,<br /><strong>enfin digitalisé.</strong></h1>
          <p className="hero-sub">Dotations instantanées, paiements Mobile Money, zéro ticket papier. La plateforme SaaS de titre-restaurant conçue pour les entreprises du Bénin.</p>
          <div className="hero-ctas">
            <button className="hero-btn-p" onClick={() => navigate('/inscription')}>Créer un compte entreprise</button>
            <button className="hero-btn-s"><i className="ti ti-player-play" aria-hidden="true"></i> Voir la démo</button>
          </div>
        </div>

        <div className="hero-right">
          <div className="hero-wallet">
            <div className="hw-label">SOLDE WALLET SALARIÉ</div>
            <div style={{ display: 'flex', alignItems: 'baseline' }}>
              <div className="hw-amount">14 500</div>
              <span className="hw-currency">XOF</span>
            </div>
            <div className="hw-source">
              <div className="hw-source-dot"></div> Dotation juin · SIKA SARL
            </div>
            <div className="hw-bar"><div className="hw-bar-fill"></div></div>
          </div>

          <div className="flow-strip">
            <div className="flow-node">
              <div className="flow-node-val">1 200 000</div>
              <div className="flow-node-label">WALLET ENTREPRISE</div>
            </div>
            <div className="flow-arrow">
              <div className="flow-arrow-line"></div>
              <div className="flow-arrow-free">0 frais</div>
            </div>
            <div className="flow-node">
              <div className="flow-node-val accent">882 000</div>
              <div className="flow-node-label">DOTATIONS SALARIÉS</div>
            </div>
            <div className="flow-arrow">
              <div className="flow-arrow-line"></div>
              <div className="flow-arrow-free">0 frais</div>
            </div>
            <div className="flow-node">
              <div className="flow-node-val accent">647 500</div>
              <div className="flow-node-label">DÉPENSES CE MOIS</div>
            </div>
          </div>

          <div className="hero-txs">
            <div className="hero-tx">
              <div className="hero-tx-icon" style={{ background: 'rgba(26,60,94,0.4)' }}>
                <i className="ti ti-tools-kitchen-2" style={{ color: '#0EA5E9' }} aria-hidden="true"></i>
              </div>
              <div>
                <div className="hero-tx-name">Chez Brice</div>
                <div className="hero-tx-sub">Restaurant · 12h34 · Cotonou</div>
              </div>
              <div className="hero-tx-amt debit">−2 500 XOF</div>
            </div>
            <div className="hero-tx">
              <div className="hero-tx-icon" style={{ background: 'rgba(14,165,233,0.15)' }}>
                <i className="ti ti-arrow-down" style={{ color: '#0EA5E9' }} aria-hidden="true"></i>
              </div>
              <div>
                <div className="hero-tx-name">Dotation juin 2026</div>
                <div className="hero-tx-sub">SIKA SARL · 42 salariés</div>
              </div>
              <div className="hero-tx-amt credit">+21 000 XOF</div>
            </div>
            <div className="hero-tx">
              <div className="hero-tx-icon" style={{ background: 'rgba(26,60,94,0.4)' }}>
                <i className="ti ti-bread" style={{ color: '#0EA5E9' }} aria-hidden="true"></i>
              </div>
              <div>
                <div className="hero-tx-name">Boulangerie Espoir</div>
                <div className="hero-tx-sub">Boulangerie · 08h15</div>
              </div>
              <div className="hero-tx-amt debit">−1 200 XOF</div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="hero-stat"><div className="hero-stat-val">38</div><div className="hero-stat-label">ENTREPRISES</div></div>
            <div className="hero-stat"><div className="hero-stat-val">1 247</div><div className="hero-stat-label">SALARIÉS</div></div>
            <div className="hero-stat"><div className="hero-stat-val">47,3M</div><div className="hero-stat-label">XOF/MOIS</div></div>
            <div className="hero-stat"><div className="hero-stat-val">0</div><div className="hero-stat-label">FRAIS INTERNES</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
