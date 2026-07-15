import React from 'react';

const STATS = [
  { val: '38', label: 'Entreprises actives' },
  { val: '1 247', label: 'Salariés bénéficiaires' },
  { val: '142', label: 'Restaurants partenaires' },
  { val: '47,3 M XOF', label: 'Volume mensuel' },
];

const OPERATORS = [
  { name: 'MTN Bénin', color: '#F59E0B' },
  { name: 'Moov Africa', color: '#0EA5E9' },
  { name: 'Celtis / SBIN', color: '#6366F1' },
  { name: 'FedaPay', color: '#10B981' },
];

export default function LandingSocialProof() {
  return (
    <div className="proof-band">
      <div className="proof-stats">
        {STATS.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="proof-stat">
              <div className="proof-stat-val">{s.val}</div>
              <div className="proof-stat-label">{s.label}</div>
            </div>
            {i < STATS.length - 1 && <div className="proof-sep" />}
          </React.Fragment>
        ))}
      </div>

      <div className="proof-ops">
        <span className="proof-ops-label">OPÉRATEURS PARTENAIRES</span>
        {OPERATORS.map((op) => (
          <div key={op.name} className="proof-op-chip">
            <span className="proof-op-dot" style={{ background: op.color }} />
            {op.name}
          </div>
        ))}
      </div>
    </div>
  );
}
