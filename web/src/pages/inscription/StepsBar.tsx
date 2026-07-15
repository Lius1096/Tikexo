import React from 'react';
import { Check } from 'lucide-react';

interface Props {
  etape: 1 | 2 | 3 | 4;
}

export default function StepsBar({ etape }: Props) {
  const steps = [
    { n: 1, label: 'Entreprise' },
    { n: 2, label: 'Plan' },
    { n: 3, label: 'Documents KYB' },
    { n: 4, label: 'Confirmation' },
  ];

  return (
    <div className="steps-bar">
      {steps.map((s, i) => (
        <React.Fragment key={s.n}>
          {i > 0 && <div className={`step-connector ${etape > s.n - 1 ? 'done' : ''}`} />}
          <div className="step-item">
            <div className={`step-circle ${etape > s.n ? 'done' : etape === s.n ? 'active' : 'todo'}`}>
              {etape > s.n ? <Check size={11} /> : s.n}
            </div>
            <div className={`step-lbl ${etape === s.n ? 'active' : ''}`}>{s.label}</div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
