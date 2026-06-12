import React from 'react';

export default function LandingHowItWorks() {
  return (
    <section className="how-works">
      <div className="how-title">Comment <strong>TIKEXO</strong> fonctionne</div>
      <div className="how-sub">Trois acteurs, un seul système, zéro friction.</div>
      <div className="how-grid">
        <div className="how-card">
          <div className="how-num">01</div>
          <div className="how-card-title">L'entreprise recharge</div>
          <div className="how-card-desc">L'Admin RH alimente le wallet entreprise via Mobile Money MTN, Moov ou Celtis. Un seul virement pour tous les salariés du mois.</div>
          <div className="how-tag">1 appel FedaPay</div>
        </div>
        <div className="how-card how-highlight">
          <div className="how-num">02</div>
          <div className="how-card-title">TIKEXO dote les salariés</div>
          <div className="how-card-desc">Le système calcule automatiquement les dotations selon les jours travaillés et crédite chaque wallet salarié instantanément.</div>
          <div className="how-tag">0 frais · Ledger interne</div>
        </div>
        <div className="how-card">
          <div className="how-num">03</div>
          <div className="how-card-title">Le salarié paie en QR code</div>
          <div className="how-card-desc">Scan du QR code du restaurant depuis l'app. Débit instantané. Le commerçant reçoit son reversement automatiquement toutes les 72h.</div>
          <div className="how-tag">MTN · Moov · Celtis</div>
        </div>
      </div>
    </section>
  );
}
