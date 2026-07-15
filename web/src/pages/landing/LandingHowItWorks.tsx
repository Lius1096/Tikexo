import React from 'react';
import { Building2, Users, QrCode } from 'lucide-react';

const Dot = () => (
  <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#0EA5E9', margin: '0 8px', verticalAlign: 'middle' }} />
);

const STEPS: { num: string; Icon: React.FC<{ size?: number; color?: string }>; title: string; desc: string; highlight?: boolean; tag?: string }[] = [
  { num: '01', Icon: Building2, title: "L'entreprise recharge son wallet", desc: "Le DRH effectue un virement Mobile Money (MTN, Moov, Celtis) vers le wallet TIKEXO de l'entreprise. L'argent est disponible immédiatement." },
  { num: '02', Icon: Users,     title: 'TIKEXO dote les salariés',        desc: 'En un clic, les dotations sont réparties selon les niveaux hiérarchiques. Chaque salarié reçoit son solde mensuel — sans aucun frais interne.', highlight: true, tag: '0 frais interne' },
  { num: '03', Icon: QrCode,    title: 'Le salarié paie avec son téléphone', desc: "Chez le restaurant partenaire, le salarié scanne le QR code et confirme. Le paiement est validé en 3 secondes, le commerçant est crédité." },
];

export default function LandingHowItWorks() {
  return (
    <section className="how-works" id="comment-ca-marche">
      <div className="how-title">
        Simple comme un déjeuner <Dot />
        <br /><strong>3 étapes, c'est tout.</strong>
      </div>
      <p className="how-sub">
        De la dotation au paiement, tout se passe dans l'écosystème TIKEXO. Pas de banque intermédiaire, pas de délais.
      </p>
      <div className="how-grid">
        {STEPS.map((s) => (
          <div key={s.num} className={`how-card${s.highlight ? ' how-highlight' : ''}`}>
            <div className="how-num">{s.num}</div>
            <div className="how-icon">
              <s.Icon size={20} color="#0EA5E9" />
            </div>
            <div className="how-card-title">{s.title}</div>
            <div className="how-card-desc">{s.desc}</div>
            {s.tag && <div className="how-tag">{s.tag}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
