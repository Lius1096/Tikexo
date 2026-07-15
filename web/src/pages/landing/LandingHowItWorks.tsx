import React from 'react';
import { Building2, Users, QrCode } from 'lucide-react';

const STEPS = [
  {
    num: '01', Icon: Building2,
    title: "L'entreprise recharge son wallet",
    desc: "Le DRH effectue un virement Mobile Money (MTN, Moov, Celtis) vers le wallet TIKEXO de l'entreprise. L'argent est disponible immédiatement.",
  },
  {
    num: '02', Icon: Users,
    title: 'TIKEXO dote les salariés',
    desc: 'En un clic, les dotations sont réparties selon les niveaux hiérarchiques. Chaque salarié reçoit son solde mensuel — sans aucun frais interne.',
    highlight: true, tag: '0 frais interne',
  },
  {
    num: '03', Icon: QrCode,
    title: 'Le salarié paie avec son téléphone',
    desc: "Chez le restaurant partenaire, le salarié scanne le QR code et confirme. Le paiement est validé en 3 secondes, le commerçant est crédité.",
  },
];

export default function LandingHowItWorks() {
  return (
    <section className="bg-[#060E18] py-16 md:py-20 px-6 md:px-20" id="comment-ca-marche">
      <h2 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
        Simple comme un déjeuner{' '}
        <span className="inline-block w-2 h-2 rounded-full bg-sky-500 align-middle mx-2" />
        <br />
        <span className="text-sky-500">3 étapes, c'est tout.</span>
      </h2>
      <p className="text-base text-white/30 mb-12 leading-relaxed max-w-xl">
        De la dotation au paiement, tout se passe dans l'écosystème TIKEXO. Pas de banque intermédiaire, pas de délais.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map(s => (
          <div
            key={s.num}
            className={`rounded-2xl p-7 border transition-all duration-200 ${
              s.highlight
                ? 'border-sky-500/25 bg-sky-500/[0.18]'
                : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] hover:border-sky-500/35'
            }`}
          >
            <div className={`text-[52px] font-black mb-5 leading-none select-none ${s.highlight ? 'text-sky-500/15' : 'text-white/[0.04]'}`}>
              {s.num}
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${s.highlight ? 'bg-sky-500/22' : 'bg-sky-500/12'}`}>
              <s.Icon size={20} color="#0EA5E9" />
            </div>
            <div className="text-[17px] font-extrabold text-white mb-2.5">{s.title}</div>
            <div className={`text-sm leading-relaxed ${s.highlight ? 'text-white/50' : 'text-white/30'}`}>{s.desc}</div>
            {s.tag && (
              <div className="mt-3.5 inline-block text-[10px] font-bold text-sky-300 bg-sky-500/15 px-3 py-1 rounded-full tracking-wide">
                {s.tag}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
