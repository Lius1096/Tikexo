import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const ASSETS = import.meta.env.VITE_ASSETS_URL || 'http://localhost:9000/tikexo-documents';

const SLIDES = [
  {
    img: `${ASSETS}/landing/hero-1.jpg`,
    panelBg: '#1A3C5E', textColor: '#fff', eyebrowColor: 'rgba(255,255,255,0.45)', btnBg: '#0EA5E9', btnColor: '#fff',
    eyebrow: 'TIKEXO.BJ',
    title: "Offrez à vos salariés\nle déjeuner qu'ils méritent.",
    desc: 'Titre-restaurant 100% digital. Dotations automatiques, paiement QR code, zéro ticket papier.',
    cta: 'Créer mon compte', link: '/inscription',
  },
  {
    img: `${ASSETS}/landing/hero-2.jpg`,
    panelBg: 'rgba(133,253,150,1)', textColor: '#1A1A2E', eyebrowColor: 'rgba(26,60,94,0.55)', btnBg: '#1A3C5E', btnColor: '#fff',
    eyebrow: 'APP SALARIÉ',
    title: 'Payez en 3 secondes\nchez 142 restaurants.',
    desc: 'Scannez le QR code du restaurant et confirmez. Votre solde est débité instantanément depuis votre wallet.',
    cta: 'Découvrir le wallet', link: '/inscription',
  },
  {
    img: `${ASSETS}/landing/hero-3.jpg`,
    panelBg: 'rgba(136,221,251,1)', textColor: '#1A1A2E', eyebrowColor: 'rgba(26,60,94,0.55)', btnBg: '#1A3C5E', btnColor: '#fff',
    eyebrow: 'PORTAIL RH',
    title: "Gérez vos dotations\nd'une seule main.",
    desc: 'Rechargez, répartissez et suivez les dépenses de vos salariés depuis votre tableau de bord en temps réel.',
    cta: 'Demander une démo', link: '/inscription',
  },
  {
    img: `${ASSETS}/landing/hero-4.jpg`,
    panelBg: 'rgba(253,238,193,1)', textColor: '#1A1A2E', eyebrowColor: 'rgba(26,60,94,0.55)', btnBg: '#1A3C5E', btnColor: '#fff',
    eyebrow: 'COMMERÇANTS',
    title: 'Encaissez sans TPE,\nsans frais, sans attente.',
    desc: 'Un QR code suffit. Vos paiements TIKEXO sont reversés par Mobile Money chaque semaine automatiquement.',
    cta: 'Devenir partenaire', link: '/inscription',
  },
];

export default function LandingHero() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setCurrent(c => (c + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length);
      if (e.key === 'ArrowRight') setCurrent(c => (c + 1) % SLIDES.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section
      className="relative w-full overflow-hidden bg-[#060E18]"
      style={{ height: '85vh', minHeight: 520 }}
      onMouseEnter={() => setPlaying(false)}
      onMouseLeave={() => setPlaying(true)}
      role="region"
      aria-label="Bannière principale TIKEXO"
    >
      <div
        className="flex h-full will-change-transform"
        style={{ transform: `translateX(-${current * 100}%)`, transition: 'transform 0.55s cubic-bezier(.4,0,.2,1)' }}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="flex-none w-full relative overflow-hidden"
            role="group"
            aria-label={`Slide ${i + 1} sur ${SLIDES.length}`}
            aria-hidden={i !== current}
          >
            <img
              src={slide.img}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-top"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(105deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 65%)' }}
            />
            <div className="absolute inset-0 flex items-center px-6 md:px-20">
              <div
                className="max-w-lg rounded-2xl md:rounded-3xl p-7 md:p-10"
                style={{ background: slide.panelBg }}
              >
                <span
                  className="block text-[11px] font-bold tracking-[3px] uppercase mb-4"
                  style={{ color: slide.eyebrowColor }}
                >
                  {slide.eyebrow}
                </span>
                <h1
                  className="text-4xl md:text-5xl font-black leading-[1.05] mb-4 whitespace-pre-line"
                  style={{ color: slide.textColor }}
                >
                  {slide.title}
                </h1>
                <p
                  className="text-base leading-relaxed mb-7 opacity-75"
                  style={{ color: slide.textColor }}
                >
                  {slide.desc}
                </p>
                <button
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-[15px] font-bold border-none cursor-pointer font-sans transition-all hover:-translate-y-0.5 hover:opacity-90"
                  style={{ background: slide.btnBg, color: slide.btnColor }}
                  onClick={() => navigate(slide.link)}
                >
                  {slide.cta} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        onClick={() => setCurrent(c => (c - 1 + SLIDES.length) % SLIDES.length)}
        aria-label="Slide précédent"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        onClick={() => setCurrent(c => (c + 1) % SLIDES.length)}
        aria-label="Slide suivant"
      >
        <ChevronRight size={20} />
      </button>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10" role="tablist">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            role="tab"
            aria-selected={i === current}
            aria-label={`Aller au slide ${i + 1}`}
            className={`h-2 rounded-full border-none cursor-pointer p-0 transition-all duration-300 ${i === current ? 'w-7 bg-white' : 'w-2 bg-white/30'}`}
          />
        ))}
      </div>

      <button
        className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/10 border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10"
        onClick={() => setPlaying(p => !p)}
        aria-label={playing ? 'Mettre en pause' : 'Lire'}
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
    </section>
  );
}
