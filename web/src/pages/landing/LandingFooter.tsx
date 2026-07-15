import React from 'react';

const LINKS = ['Mentions légales', 'Confidentialité', 'APD Bénin', 'Contact'];

export default function LandingFooter() {
  return (
    <footer className="bg-[#030810] px-6 md:px-20 py-7 flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="text-base font-black text-sky-500 tracking-widest">TIKEXO</div>
        <div className="text-[10px] text-white/[0.18] tracking-widest mt-1">TITRE-RESTAURANT DIGITALISÉ · BÉNIN</div>
      </div>
      <div className="flex flex-wrap gap-6">
        {LINKS.map(link => (
          <span key={link} className="text-xs text-white/[0.22] cursor-pointer hover:text-white/60 transition-colors">
            {link}
          </span>
        ))}
      </div>
      <div className="text-[11px] text-white/[0.14]">© 2026 TIKEXO · tikexo.bj</div>
    </footer>
  );
}
