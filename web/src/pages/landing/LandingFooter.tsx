import React from 'react';
import { Link } from 'react-router-dom';
import { RGPD } from '../../utils/rgpd';

const LINKS = [
  { label: 'CGU',              href: '/cgu',                      external: false },
  { label: 'Mentions légales', href: '/mentions-legales',         external: false },
  { label: 'Confidentialité',  href: '/cgu#donnees-personnelles', external: false },
  { label: 'APD Bénin',        href: 'https://apdp.bj',           external: true  },
  { label: 'Contact',          href: `mailto:${RGPD.contact_support}`, external: true },
  { label: 'DPO / RGPD',       href: `mailto:${RGPD.contact_dpo}`,    external: true },
];

export default function LandingFooter() {
  return (
    <footer className="bg-[#030810] px-6 md:px-20 py-8">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="text-base font-black text-sky-500 tracking-widest">TIKEXO</div>
          <div className="text-[10px] text-white/[0.18] tracking-widest mt-1">TITRE-RESTAURANT DIGITALISÉ · BÉNIN</div>
        </div>
        <div className="flex flex-wrap gap-6">
          {LINKS.map(({ label, href, external }) =>
            external ? (
              <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                className="text-xs text-white/[0.22] hover:text-white/60 transition-colors">
                {label}
              </a>
            ) : (
              <Link key={label} to={href}
                className="text-xs text-white/[0.22] hover:text-white/60 transition-colors">
                {label}
              </Link>
            )
          )}
        </div>
        <div className="text-[11px] text-white/[0.14]">© 2026 TIKEXO · tikexo.bj</div>
      </div>
      <div className="mt-5 pt-5 border-t border-white/[0.06] text-[10px] text-white/[0.12] leading-relaxed">
        Données financières conservées {RGPD.retention_donnees_financieres_ans} ans — {RGPD.reglementation_financiere}. Contact DPO : {RGPD.contact_dpo}
      </div>
    </footer>
  );
}
