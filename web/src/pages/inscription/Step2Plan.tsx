import React from 'react';
import { ArrowLeft, ArrowRight, Check, Info } from 'lucide-react';
import StepsBar from './StepsBar';
import { calculerFraisGestion, PLAN_TIERS, type InscriptionData } from './types';

interface Props {
  data: InscriptionData;
  onChange: (patch: Partial<InscriptionData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Plan({ data, onNext, onBack }: Props) {
  const nb = parseInt(data.entreprise.nb_salaries, 10) || 0;
  const planInfo = calculerFraisGestion(data.entreprise.nb_salaries);
  const activePlan = planInfo.plan;

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
          <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '3px' }}>
            Votre tarification TIKEXO
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Calculée automatiquement selon votre effectif de {nb > 0 ? nb : '—'} salarié{nb > 1 ? 's' : ''}.
          </div>
        </div>

        {/* Grille des 4 paliers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {PLAN_TIERS.map((tier) => {
            const isActive = tier.plan === activePlan;
            return (
              <div
                key={tier.plan}
                style={{
                  borderRadius: '10px',
                  padding: '14px',
                  border: isActive ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                  background: isActive ? '#EFF8FF' : '#F8FAFC',
                  position: 'relative',
                  transition: 'all .15s',
                }}
              >
                {isActive && (
                  <div style={{
                    position: 'absolute', top: '-9px', left: '12px',
                    background: '#0EA5E9', color: '#fff',
                    fontSize: '9px', fontWeight: 700, letterSpacing: '1px',
                    padding: '2px 8px', borderRadius: '10px',
                  }}>
                    VOTRE PLAN
                  </div>
                )}
                <div style={{ fontSize: '11px', fontWeight: 700, color: isActive ? '#0369A1' : '#64748B', letterSpacing: '1px', marginBottom: '3px' }}>
                  {tier.label}
                </div>
                <div style={{ fontSize: '10px', color: isActive ? '#0EA5E9' : '#94A3B8', marginBottom: '8px' }}>
                  {tier.range}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? '#0369A1' : '#1E293B', marginBottom: '2px' }}>
                  {isActive
                    ? `${planInfo.frais.toLocaleString('fr-FR')} XOF`
                    : tier.frais}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginBottom: '10px' }}>/ mois</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {tier.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', fontSize: '10px', color: isActive ? '#0C447C' : '#64748B', lineHeight: 1.4 }}>
                      <Check size={10} color={isActive ? '#0EA5E9' : '#94A3B8'} style={{ flexShrink: 0, marginTop: 1 }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Commission fixe */}
        <div style={{ background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Info size={15} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: '11px', color: '#14532D', lineHeight: 1.5 }}>
            <strong>Commission transactions (tous plans) :</strong> 5 % prélevé côté salarié + 5 % côté commerçant = 10 % total plateforme TIKEXO. Aucun frais caché.
          </div>
        </div>

        {/* Prix calculé récap */}
        <div style={{ background: '#DBEAFE', border: '0.5px solid #B5D4F4', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
          <Info size={15} color="#185FA5" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: '11px', color: '#0C447C', lineHeight: 1.5 }}>
            Frais mensuel de gestion : <strong>{planInfo.frais.toLocaleString('fr-FR')} XOF/mois</strong> (plan {planInfo.label}, {nb} salarié{nb > 1 ? 's' : ''}). Résiliable à tout moment.
          </div>
        </div>

        <button className="btn-primary" onClick={onNext}>
          <ArrowRight size={15} /> Continuer — Documents KYB
        </button>
      </div>
    </div>
  );
}
