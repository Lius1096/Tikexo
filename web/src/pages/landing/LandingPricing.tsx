import React from 'react';
import { Check } from 'lucide-react';
import { useLandingConfig } from '../../context/LandingConfigContext';

const DEFAULT_PLANS = [
  {
    name: 'Starter',
    price: '15 000',
    period: 'XOF / mois · 1 à 20 salariés',
    features: ['Portail RH + app salariés', 'Dotations automatiques', '2 % de commission par transaction', 'Support email'],
  },
  {
    name: 'Growth',
    price: '35 000',
    period: 'XOF / mois · 21 à 100 salariés',
    featured: true,
    badge: 'Le plus populaire',
    features: ['Tout Starter inclus', 'Gestion par niveaux hiérarchiques', 'Exports comptables + factures PDF', '1,8 % de commission par transaction'],
  },
  {
    name: 'Business',
    price: '75 000',
    period: 'XOF / mois · 101 à 300 salariés',
    features: ['Tout Growth inclus', 'Mutations inter-entreprises', 'KYC entreprise prioritaire', '1,5 % de commission + support dédié'],
    ctaLabel: "Contacter l'équipe",
  },
];

export default function LandingPricing() {
  const config = useLandingConfig();
  const pricingConfig = config?.pricing;
  const PLANS = pricingConfig?.plans ?? DEFAULT_PLANS;
  const title = pricingConfig?.title ?? 'Simple, transparent, rentable dès le 1er mois.';
  const subtitle = pricingConfig?.subtitle ?? "Aucun frais d'installation, aucun engagement annuel obligatoire. Résiliez à tout moment.";

  return (
    <section className="bg-[#060E18] py-16 md:py-20 px-6 md:px-20" id="tarifs">
      <div className="text-center mb-12">
        <div className="text-[11px] font-bold text-sky-500 tracking-[3px] uppercase mb-2.5">TARIFS</div>
        <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
          {title}
        </h2>
        <p className="text-base text-white/35 mt-3.5 mx-auto max-w-xl leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center max-w-4xl mx-auto">
        {PLANS.map((p: any) => (
          <div
            key={p.name}
            className={`rounded-2xl p-7 transition-all duration-200 ${
              p.featured
                ? 'bg-white shadow-[0_0_80px_rgba(14,165,233,0.15)] scale-[1.05]'
                : 'border border-white/[0.07] hover:border-white/[0.14] hover:bg-white/[0.04]'
            }`}
            style={!p.featured ? { background: 'rgba(255,255,255,0.03)' } : {}}
          >
            {p.badge && (
              <div className="inline-block text-[10px] font-bold text-white bg-sky-500 px-3.5 py-1 rounded-full mb-3.5 tracking-wide">
                {p.badge}
              </div>
            )}
            <div className={`text-[11px] font-extrabold tracking-[2.5px] uppercase mb-3 ${p.featured ? 'text-slate-400' : 'text-white/28'}`}>
              {p.name}
            </div>
            <div className={`text-[40px] font-black leading-none mb-1 ${p.featured ? 'text-slate-900' : 'text-white'}`}>
              {p.price}
            </div>
            <div className={`text-xs mb-6 ${p.featured ? 'text-slate-400' : 'text-white/25'}`}>
              {p.period}
            </div>
            <div className={`h-px mb-5 ${p.featured ? 'bg-slate-100' : 'bg-white/[0.06]'}`} />

            {p.features.map(f => (
              <div key={f} className="flex items-start gap-2.5 mb-3">
                <Check size={13} color="#0EA5E9" className="flex-shrink-0 mt-0.5" />
                <span className={`text-sm leading-snug ${p.featured ? 'text-slate-500' : 'text-white/45'}`}>{f}</span>
              </div>
            ))}

            <button
              className={`w-full py-3.5 rounded-xl text-sm font-bold mt-5 border-none cursor-pointer transition-all font-sans ${
                p.featured
                  ? 'bg-sky-500 text-white hover:bg-sky-600 shadow-[0_6px_20px_rgba(14,165,233,0.4)]'
                  : 'text-white hover:bg-white/10'
              }`}
              style={!p.featured ? { background: 'rgba(255,255,255,0.07)' } : {}}
            >
              {p.ctaLabel ?? 'Commencer'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
