import React from 'react';

const ASSETS = import.meta.env.VITE_ASSETS_URL || 'http://localhost:9000/tikexo-documents';

const TESTIMONIALS = [
  { quote: "Avant, on gérait les tickets papier à la main — perte de temps, erreurs, mécontentement. Avec TIKEXO, nos 85 salariés ont leur wallet en 5 minutes. Le bilan RH est automatique.", name: 'Adjoavi Mensah',  role: 'DRH · Groupe Atlantique',     avatar: `${ASSETS}/landing/avatar-1.jpg` },
  { quote: "Je scanne le QR code depuis mon téléphone et le paiement part instantanément. Pas de monnaie, pas d'attente. Mes clients TIKEXO dépensent plus et reviennent plus souvent.",          name: 'Razak Idrissou', role: 'Gérant · Restaurant Béninois', avatar: `${ASSETS}/landing/avatar-2.jpg` },
  { quote: "Mon solde est disponible dès le 1er du mois. Je peux déjeuner dans 142 restaurants sans sortir d'argent. C'est vraiment pratique pour le quotidien.",                                  name: 'Céleste Agossou', role: 'Chargée de mission · SONEB',  avatar: `${ASSETS}/landing/avatar-3.jpg` },
];

const Dot = () => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#0EA5E9', margin: '0 8px', verticalAlign: 'middle' }} />
);

function Stars() {
  return (
    <div className="testi-stars">
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className="testi-star">★</span>)}
    </div>
  );
}

export default function LandingTestimonials() {
  return (
    <section className="testimonials-section">
      <div className="section-header center">
        <div className="section-eyebrow">TÉMOIGNAGES</div>
        <h2 className="section-title">
          Ils ont adopté TIKEXO <Dot />
          <br /><strong>voici ce qu'ils en disent.</strong>
        </h2>
      </div>
      <div className="testimonials-grid">
        {TESTIMONIALS.map((t) => (
          <div key={t.name} className="testi-card">
            <Stars />
            <p className="testi-quote">{t.quote}</p>
            <div className="testi-author">
              <img src={t.avatar} alt={t.name} className="testi-avatar" loading="lazy" />
              <div>
                <div className="testi-name">{t.name}</div>
                <div className="testi-role">{t.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
