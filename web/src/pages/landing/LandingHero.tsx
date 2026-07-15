import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

const ASSETS = import.meta.env.VITE_ASSETS_URL || 'http://localhost:9000/tikexo-documents';

const SLIDES = [
  { img: `${ASSETS}/landing/hero-1.jpg`, panelBg: '#1A3C5E', textColor: '#fff', eyebrowColor: 'rgba(255,255,255,0.45)', btnBg: '#0EA5E9', btnColor: '#fff', eyebrow: 'TIKEXO.BJ', title: "Offrez à vos salariés\nle déjeuner qu'ils méritent.", desc: 'Titre-restaurant 100% digital. Dotations automatiques, paiement QR code, zéro ticket papier.', cta: 'Créer mon compte', link: '/inscription' },
  { img: `${ASSETS}/landing/hero-2.jpg`, panelBg: 'rgba(133,253,150,1)', textColor: '#1A1A2E', eyebrowColor: 'rgba(26,60,94,0.55)', btnBg: '#1A3C5E', btnColor: '#fff', eyebrow: 'APP SALARIÉ', title: 'Payez en 3 secondes\nchez 142 restaurants.', desc: 'Scannez le QR code du restaurant et confirmez. Votre solde est débité instantanément depuis votre wallet.', cta: 'Découvrir le wallet', link: '/inscription' },
  { img: `${ASSETS}/landing/hero-3.jpg`, panelBg: 'rgba(136,221,251,1)', textColor: '#1A1A2E', eyebrowColor: 'rgba(26,60,94,0.55)', btnBg: '#1A3C5E', btnColor: '#fff', eyebrow: 'PORTAIL RH', title: "Gérez vos dotations\nd'une seule main.", desc: 'Rechargez, répartissez et suivez les dépenses de vos salariés depuis votre tableau de bord en temps réel.', cta: 'Demander une démo', link: '/inscription' },
  { img: `${ASSETS}/landing/hero-4.jpg`, panelBg: 'rgba(253,238,193,1)', textColor: '#1A1A2E', eyebrowColor: 'rgba(26,60,94,0.55)', btnBg: '#1A3C5E', btnColor: '#fff', eyebrow: 'COMMERÇANTS', title: 'Encaissez sans TPE,\nsans frais, sans attente.', desc: 'Un QR code suffit. Vos paiements TIKEXO sont reversés par Mobile Money chaque semaine automatiquement.', cta: 'Devenir partenaire', link: '/inscription' },
];

export default function LandingHero() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % SLIDES.length), 5000);
    return () => clearInterval(id);
  }, [playing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length);
      if (e.key === 'ArrowRight') setCurrent((c) => (c + 1) % SLIDES.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <section className="hero-slider" onMouseEnter={() => setPlaying(false)} onMouseLeave={() => setPlaying(true)} role="region" aria-label="Bannière principale TIKEXO">
      <div className="hs-track" style={{ transform: `translateX(-${current * 100}%)` }}>
        {SLIDES.map((slide, i) => (
          <div key={i} className="hs-slide" role="group" aria-label={`Slide ${i + 1} sur ${SLIDES.length}`} aria-hidden={i !== current}>
            <img src={slide.img} alt="" className="hs-bg" loading={i === 0 ? 'eager' : 'lazy'} />
            <div className="hs-dim" />
            <div className="hs-content-wrap">
              <div className="hs-panel" style={{ background: slide.panelBg }}>
                <span className="hs-eyebrow" style={{ color: slide.eyebrowColor }}>{slide.eyebrow}</span>
                <h2 className="hs-title" style={{ color: slide.textColor }}>{slide.title}</h2>
                <p className="hs-desc" style={{ color: slide.textColor }}>{slide.desc}</p>
                <button className="hs-cta" style={{ background: slide.btnBg, color: slide.btnColor }} onClick={() => navigate(slide.link)}>
                  {slide.cta} <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="hs-arrow hs-prev" onClick={() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length)} aria-label="Slide précédent">
        <ChevronLeft size={20} />
      </button>
      <button className="hs-arrow hs-next" onClick={() => setCurrent((c) => (c + 1) % SLIDES.length)} aria-label="Slide suivant">
        <ChevronRight size={20} />
      </button>

      <div className="hs-dots" role="tablist">
        {SLIDES.map((_, i) => (
          <button key={i} className={`hs-dot${i === current ? ' hs-dot-active' : ''}`} onClick={() => setCurrent(i)} role="tab" aria-selected={i === current} aria-label={`Aller au slide ${i + 1}`} />
        ))}
      </div>

      <button className="hs-playpause" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Mettre en pause' : 'Lire'}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
    </section>
  );
}
