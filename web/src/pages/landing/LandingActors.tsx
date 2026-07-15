import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, UtensilsCrossed, LogIn } from 'lucide-react';

const ASSETS = import.meta.env.VITE_ASSETS_URL || 'http://localhost:9000/tikexo-documents';

const Dot = () => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#0EA5E9', margin: '0 8px', verticalAlign: 'middle' }} />
);

const ACTORS: {
  img: string; imgAlt: string; accentFrom: string; accentTo: string; dotColor: string;
  Icon: React.FC<{ size?: number; color?: string }>;
  name: string; role: string; tag: string; tagBg: string; tagColor: string;
  loginHref: string; loginLabel: string; features: string[];
}[] = [
  {
    img: `${ASSETS}/landing/actor-1.jpg`, imgAlt: 'Équipe RH en réunion',
    accentFrom: '#1A3C5E', accentTo: '#0EA5E9', dotColor: '#0EA5E9',
    Icon: Building2,
    name: 'Employeur', role: 'Direction RH / Finance', tag: 'Portail web',
    tagBg: 'rgba(14,165,233,0.08)', tagColor: '#0EA5E9',
    loginHref: '/entreprise/connexion', loginLabel: 'Accéder au portail RH',
    features: ['Rechargement wallet en 1 clic via Mobile Money', 'Dotation automatique par niveau hiérarchique', 'Dashboard temps réel : dépenses, soldes, historique', 'Exports comptables et factures PDF mensuelles', 'Gestion des membres RH avec permissions granulaires'],
  },
  {
    img: `${ASSETS}/landing/actor-2.jpg`, imgAlt: 'Salariés au déjeuner',
    accentFrom: '#065F46', accentTo: '#34d399', dotColor: '#34d399',
    Icon: User,
    name: 'Salarié bénéficiaire', role: 'Application mobile & web', tag: 'App mobile',
    tagBg: 'rgba(52,211,153,0.10)', tagColor: '#059669',
    loginHref: '/login', loginLabel: 'Accéder à mon wallet',
    features: ['Wallet personnel rechargé automatiquement chaque mois', 'Paiement QR code en moins de 5 secondes', 'Solde et historique consultables à tout moment', 'Réseau de 142 restaurants partenaires à Cotonou', 'Aucune carte physique, aucun ticket papier'],
  },
  {
    img: `${ASSETS}/landing/actor-3.jpg`, imgAlt: 'Commerçante partenaire TIKEXO',
    accentFrom: '#78350F', accentTo: '#F59E0B', dotColor: '#F59E0B',
    Icon: UtensilsCrossed,
    name: 'Commerçant partenaire', role: 'Caisse numérique TIKEXO', tag: 'Caisse TIKEXO',
    tagBg: 'rgba(245,158,11,0.10)', tagColor: '#B45309',
    loginHref: '/restaurant/connexion', loginLabel: 'Accéder à ma caisse',
    features: ['QR code statique ou montant prédéfini par transaction', 'Paiements validés instantanément, sans lecteur de carte', 'Reversement Mobile Money hebdomadaire automatique', "Historique des encaissements TIKEXO en temps réel", 'Commission réduite vs transactions Mobile Money classiques'],
  },
];

export default function LandingActors() {
  const navigate = useNavigate();
  return (
    <section className="section actors-section">
      <div className="section-header center">
        <div className="section-eyebrow">LA PLATEFORME</div>
        <h2 className="section-title">
          Une solution pour chacun <Dot />
          <br /><strong>trois rôles, un seul écosystème.</strong>
        </h2>
        <p className="section-sub">
          TIKEXO connecte employeurs, salariés et commerçants dans un système unifié où chaque partie y trouve son compte.
        </p>
      </div>

      <div className="actors-grid">
        {ACTORS.map((a) => (
          <div key={a.name} className="actor-card">
            <div className="actor-accent" style={{ background: `linear-gradient(90deg, ${a.accentFrom}, ${a.accentTo})` }} />
            <div className="actor-img-wrap">
              <img src={a.img} alt={a.imgAlt} className="actor-card-img" loading="lazy" />
              <div className="actor-img-gradient" />
              <span className="actor-img-tag" style={{ background: a.tagBg, color: a.tagColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                <a.Icon size={11} />
                {a.tag}
              </span>
            </div>
            <div className="actor-card-header">
              <div>
                <div className="actor-name">{a.name}</div>
                <div className="actor-role">{a.role}</div>
              </div>
            </div>
            <ul className="actor-features">
              {a.features.map((f) => (
                <li key={f} className="actor-feat">
                  <span className="actor-feat-dot" style={{ background: a.dotColor }} />
                  <span className="actor-feat-text">{f}</span>
                </li>
              ))}
            </ul>
            <div className="actor-card-footer">
              <button className="actor-login-btn" style={{ borderColor: a.accentTo, color: a.accentTo, display: 'flex', alignItems: 'center', gap: 5 }} onClick={() => navigate(a.loginHref)}>
                <LogIn size={13} />
                {a.loginLabel}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
