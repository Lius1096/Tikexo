import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingCTA() {
  const navigate = useNavigate();
  return (
    <section className="relative overflow-hidden bg-[#060E18] py-24 px-6 text-center">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(14,165,233,0.1) 0%, transparent 65%)' }}
      />
      <div className="relative">
        <div className="text-[11px] font-bold text-sky-500 tracking-[3px] uppercase mb-3.5">PRÊT À DÉMARRER ?</div>
        <h2 className="text-5xl md:text-6xl font-black text-white mb-4 leading-[1.05]">
          Votre première dotation<br />
          <span className="text-sky-500">en moins de 10 minutes.</span>
        </h2>
        <p className="text-base text-white/38 mb-10 leading-relaxed max-w-lg mx-auto">
          Aucune intégration bancaire. Aucun matériel. Juste un compte,
          un virement Mobile Money, et vos salariés reçoivent leur wallet dès aujourd'hui.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/inscription')}
            className="bg-sky-500 hover:bg-sky-600 text-white text-[15px] font-bold px-9 py-4 rounded-full border-none cursor-pointer font-sans transition-all hover:-translate-y-0.5 shadow-[0_8px_28px_rgba(14,165,233,0.35)]"
          >
            Créer mon compte entreprise
          </button>
          <button className="bg-white/[0.05] hover:bg-white/10 text-white/65 hover:text-white text-[15px] px-8 py-4 rounded-full border border-white/10 hover:border-white/25 cursor-pointer transition-all font-sans">
            Parler à l'équipe
          </button>
        </div>
      </div>
    </section>
  );
}
