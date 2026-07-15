import React from 'react';
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react';
import StepsBar from './StepsBar';
import { PLANS, PLAN_FEATURES, type Plan, type InscriptionData } from './types';

interface Props {
  data: InscriptionData;
  onChange: (patch: Partial<InscriptionData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const PLAN_PRIX: Record<Plan, string> = {
  Starter:  '15 000',
  Growth:   '35 000',
  Business: '75 000',
};

export default function Step2Plan({ data, onChange, onNext, onBack }: Props) {
  const plan = data.plan;

  return (
    <div className="full-card">
      <div className="mnav">
        <span className="mnav-logo">TIKEXO</span>
        <div className="mnav-back" onClick={onBack}>
          <ArrowLeft size={13} /> Modifier les infos
        </div>
      </div>
      <div style={{ padding: '24px' }}>
        <StepsBar etape={2} />

        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '3px' }}>Choisissez votre plan</div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>Changeable à tout moment depuis votre espace admin.</div>
        </div>

        <div className="plan-grid">
          {(Object.keys(PLANS) as Plan[]).map((p) => {
            const meta = PLANS[p];
            return (
              <div
                key={p}
                className={`plan-card ${plan === p ? 'selected' : ''} ${meta.populaire ? 'popular' : ''}`}
                onClick={() => onChange({ plan: p })}
              >
                {meta.populaire && <div className="plan-pop-badge">Recommandé</div>}
                <div className="plan-name">{p}</div>
                <div className="plan-price">{PLAN_PRIX[p]}</div>
                <div className="plan-period">XOF / mois · {meta.salaries}</div>
                <div className="plan-commission">{meta.commission}</div>
              </div>
            );
          })}
        </div>

        <div style={{ background: '#F8FAFC', border: '0.5px solid #E2E8F0', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#1E293B', marginBottom: '10px' }}>Plan {plan} — ce qui est inclus</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {PLAN_FEATURES[plan].map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#475569' }}>
                <Check size={13} color="#0EA5E9" strokeWidth={2.5} /> {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#DBEAFE', border: '0.5px solid #B5D4F4', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Info size={15} color="#185FA5" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: '11px', color: '#0C447C', lineHeight: 1.5 }}>
            L'abonnement mensuel ({PLAN_PRIX[plan]} XOF) sera prélevé automatiquement via Mobile Money à chaque renouvellement. Résiliable à tout moment.
          </div>
        </div>

        <button className="btn-primary" onClick={onNext}>
          <ArrowRight size={15} /> Continuer — Documents KYB
        </button>
      </div>
    </div>
  );
}
