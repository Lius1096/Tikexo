import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingCTA() {
  const navigate = useNavigate();
  return (
    <section className="cta-section">
      <div className="cta-eyebrow">PRÊT À DÉMARRER ?</div>
      <h2 className="cta-title">
        Votre première dotation<br />
        <strong>en moins de 10 minutes.</strong>
      </h2>
      <p className="cta-sub">
        Aucune intégration bancaire. Aucun matériel. Juste un compte,<br />
        un virement Mobile Money, et vos salariés reçoivent leur wallet dès aujourd'hui.
      </p>
      <div className="cta-btns">
        <button
          className="cta-btn-main"
          onClick={() => navigate('/inscription')}
        >
          Créer mon compte entreprise
        </button>
        <button className="cta-btn-ghost">
          Parler à l'équipe
        </button>
      </div>
    </section>
  );
}
