import React from 'react';

interface Props {
  etape: 1 | 2 | 3;
}

export default function StepsBar({ etape }: Props) {
  return (
    <div className="steps-bar">
      <div className="step-item">
        <div className={`step-circle ${etape > 1 ? 'done' : etape === 1 ? 'active' : 'todo'}`}>
          {etape > 1 ? <i className="ti ti-check" style={{ fontSize: '11px' }} aria-hidden="true"></i> : '1'}
        </div>
        <div className={`step-lbl ${etape === 1 ? 'active' : ''}`}>Entreprise</div>
      </div>
      <div className={`step-connector ${etape > 1 ? 'done' : ''}`}></div>
      <div className="step-item">
        <div className={`step-circle ${etape > 2 ? 'done' : etape === 2 ? 'active' : 'todo'}`}>
          {etape > 2 ? <i className="ti ti-check" style={{ fontSize: '11px' }} aria-hidden="true"></i> : '2'}
        </div>
        <div className={`step-lbl ${etape === 2 ? 'active' : ''}`}>Plan</div>
      </div>
      <div className={`step-connector ${etape > 2 ? 'done' : ''}`}></div>
      <div className="step-item">
        <div className={`step-circle ${etape === 3 ? 'active' : 'todo'}`}>3</div>
        <div className={`step-lbl ${etape === 3 ? 'active' : ''}`}>Rechargement</div>
      </div>
    </div>
  );
}
