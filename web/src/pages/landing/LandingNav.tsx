import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingNav() {
  const navigate = useNavigate();
  return (
    <nav className="nav">
      <div className="nav-brand">
        <div className="nav-logo">TIKEXO</div>
        <div className="nav-badge">Bénin</div>
      </div>
      <div className="nav-links">
        <span className="nav-link">Employeurs</span>
        <span className="nav-link">Salariés</span>
        <span className="nav-link">Restaurants</span>
        <span className="nav-link">Tarifs</span>
      </div>
      <button className="nav-cta" onClick={() => navigate('/inscription')}>Démarrer gratuitement</button>
    </nav>
  );
}
