import React from 'react';

const STATS = [
  { val: '38',        label: 'Entreprises actives' },
  { val: '1 247',     label: 'Salariés bénéficiaires' },
  { val: '142',       label: 'Restaurants partenaires' },
  { val: '47,3 M XOF', label: 'Volume mensuel' },
];

const OPERATORS = [
  { name: 'MTN Bénin',   color: '#F59E0B' },
  { name: 'Moov Africa', color: '#0EA5E9' },
  { name: 'Celtis / SBIN', color: '#6366F1' },
  { name: 'FedaPay',     color: '#10B981' },
];

export default function LandingSocialProof() {
  return (
    <div className="bg-[#060E18] px-6 md:px-20 py-6 flex flex-wrap gap-6 items-center justify-between border-b border-white/5">
      <div className="flex flex-wrap items-center gap-8 md:gap-14">
        {STATS.map((s, i) => (
          <React.Fragment key={s.label}>
            <div>
              <div className="text-3xl font-black text-white leading-none">{s.val}</div>
              <div className="text-[11px] text-white/30 mt-1 tracking-wide">{s.label}</div>
            </div>
            {i < STATS.length - 1 && (
              <div className="hidden md:block w-px h-11 bg-white/[0.08]" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-white/[0.22] tracking-widest uppercase mr-1.5 whitespace-nowrap">
          Opérateurs partenaires
        </span>
        {OPERATORS.map(op => (
          <div
            key={op.name}
            className="flex items-center gap-1.5 bg-white/[0.05] border border-white/[0.08] rounded-full px-4 py-1.5 text-xs font-medium text-white/50"
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: op.color }} />
            {op.name}
          </div>
        ))}
      </div>
    </div>
  );
}
