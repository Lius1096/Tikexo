import React from 'react';
import StepsBar from './StepsBar';
import type { InscriptionData, Operateur } from './types';

const OPERATEURS: { id: Operateur; label: string; sub: string; color: string }[] = [
  { id: 'MTN',   label: 'MTN',   sub: 'Bénin',  color: '#FFD700' },
  { id: 'MOOV',  label: 'Moov',  sub: 'Africa', color: '#0075C9' },
  { id: 'CELTIS',label: 'Celtis',sub: 'SBIN',   color: '#1A3C5E' },
];

const MONTANTS_RAPIDES = [50000, 100000, 150000, 300000, 500000];

interface Props {
  data: InscriptionData;
  onChange: (patch: Partial<InscriptionData>) => void;
  onSubmit: () => void;
  onSkip: () => void;
  onBack: () => void;
  loading: boolean;
  erreur: string | null;
}

function formatNum(v: string) {
  const n = v.replace(/\D/g, '');
  return n ? parseInt(n, 10).toLocaleString('fr-FR') : '';
}

export default function Step3Recharge({ data, onChange, onSubmit, onSkip, onBack, loading, erreur }: Props) {
  const r = data.recharge;
  const montantNum = parseInt(r.montant.replace(/\D/g, '') || '0', 10);

  function setR(patch: Partial<InscriptionData['recharge']>) {
    onChange({ recharge: { ...r, ...patch } });
  }

  const prixPlan: Record<string, number> = { Starter: 15000, Growth: 35000, Business: 75000 };
  const prixMensuel = prixPlan[data.plan] || 35000;

  return (
    <div className="full-card">
      <div className="mnav">
        <span className="mnav-logo">TIKEXO</span>
        <div className="mnav-back" onClick={onBack}>
          <i className="ti ti-arrow-left" aria-hidden="true"></i> Modifier le plan
        </div>
      </div>
      <div style={{ padding: '24px' }}>
        <StepsBar etape={3} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Formulaire gauche */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '3px' }}>Premier rechargement wallet</div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '18px' }}>Minimum 10 000 XOF. Vous pouvez passer cette étape.</div>

            <div className="form-group">
              <label className="form-label">Montant à recharger (XOF) <span className="form-required">*</span></label>
              <input
                className="form-input"
                style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '16px', fontWeight: 500 }}
                placeholder="ex : 300 000"
                value={formatNum(r.montant)}
                onChange={(ev) => setR({ montant: ev.target.value.replace(/\D/g, '') })}
              />
              <div className="form-hint">
                <i className="ti ti-info-circle" aria-hidden="true"></i>
                {montantNum >= 10000 ? `Pour ~${Math.floor(montantNum / 7000)} salariés × 7 000 XOF / mois` : 'Minimum 10 000 XOF'}
              </div>
            </div>

            {/* Montants rapides */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {MONTANTS_RAPIDES.map((v) => (
                <button
                  key={v}
                  onClick={() => setR({ montant: String(v) })}
                  style={{
                    fontSize: '10px', fontWeight: 500, padding: '4px 10px', borderRadius: '20px', border: '0.5px solid',
                    borderColor: montantNum === v ? '#1A3C5E' : '#E2E8F0',
                    background: montantNum === v ? '#1A3C5E' : '#F8FAFC',
                    color: montantNum === v ? '#fff' : '#64748B',
                    cursor: 'pointer', fontFamily: "'Inter',sans-serif",
                  }}
                >
                  {v.toLocaleString('fr-FR')}
                </button>
              ))}
            </div>

            <div className="form-group">
              <label className="form-label">Opérateur Mobile Money <span className="form-required">*</span></label>
              <div className="op-grid">
                {OPERATEURS.map((op) => (
                  <div
                    key={op.id}
                    className={`op-card ${r.operateur === op.id ? 'selected' : ''}`}
                    onClick={() => setR({ operateur: op.id })}
                  >
                    <div className="op-dot" style={{ background: op.color }}></div>
                    <div className="op-name">{op.label}</div>
                    <div className="op-num">{op.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Numéro {r.operateur || 'Mobile Money'} <span className="form-required">*</span></label>
              <input
                className="form-input"
                type="tel"
                placeholder={`+229 01 ${r.operateur === 'MTN' ? '97' : r.operateur === 'MOOV' ? '95' : '61'} 00 00 00`}
                value={data.admin.telephone}
                readOnly
                style={{ background: '#F8FAFC', color: '#64748B' }}
              />
              <div className="form-hint">
                <i className="ti ti-device-mobile" aria-hidden="true"></i> Vous recevrez une notification USSD à confirmer
              </div>
            </div>

            {erreur && (
              <div className="alert-error">
                <i className="ti ti-alert-circle" aria-hidden="true"></i> {erreur}
              </div>
            )}

            <button
              className="btn-accent"
              style={{ marginBottom: '8px' }}
              disabled={loading || montantNum < 10000 || !r.operateur}
              onClick={onSubmit}
            >
              {loading
                ? <><i className="ti ti-loader-2" aria-hidden="true"></i> Création en cours…</>
                : <><i className="ti ti-send" aria-hidden="true"></i> Envoyer la demande de paiement</>}
            </button>
            <button className="btn-ghost" onClick={onSkip} disabled={loading}>
              Passer — je rechargerai plus tard
            </button>
          </div>

          {/* Récapitulatif droite */}
          <div>
            <div className="recap-card">
              <div className="rc-title">RÉCAPITULATIF INSCRIPTION</div>
              <div className="rc-row"><span className="rc-label">Entreprise</span><span className="rc-val" style={{ fontSize: '10px' }}>{data.entreprise.nom || '—'}</span></div>
              <div className="rc-row"><span className="rc-label">NIF</span><span className="rc-val mono">{data.entreprise.nif || '—'}</span></div>
              {data.entreprise.rccm && (
                <div className="rc-row"><span className="rc-label">RCCM</span><span className="rc-val mono">{data.entreprise.rccm}</span></div>
              )}
              <div className="rc-row"><span className="rc-label">Adresse</span><span className="rc-val" style={{ fontSize: '10px' }}>{data.entreprise.adresse}, {data.entreprise.ville}</span></div>
              <div className="rc-row"><span className="rc-label">Plan</span><span className="rc-val accent">{data.plan} · {prixMensuel.toLocaleString('fr-FR')} XOF/mois</span></div>
              {montantNum >= 10000 && (
                <div className="rc-row"><span className="rc-label">Rechargement</span><span className="rc-val mono">{montantNum.toLocaleString('fr-FR')} XOF</span></div>
              )}
              {r.operateur && (
                <div className="rc-row"><span className="rc-label">Opérateur</span><span className="rc-val">{r.operateur === 'MTN' ? 'MTN Bénin' : r.operateur === 'MOOV' ? 'Moov Africa' : 'Celtis SBIN'}</span></div>
              )}
              <div className="rc-row">
                <span className="rc-label">KYB</span>
                <span style={{ fontSize: '9px', background: 'rgba(250,238,218,0.3)', color: '#FAC775', padding: '2px 8px', borderRadius: '7px' }}>
                  En attente validation
                </span>
              </div>
            </div>

            <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', display: 'flex', gap: '8px' }}>
              <i className="ti ti-circle-check" style={{ fontSize: '15px', color: '#3B6D11', flexShrink: 0, marginTop: '1px' }} aria-hidden="true"></i>
              <div style={{ fontSize: '11px', color: '#27500A', lineHeight: 1.5 }}>
                {data.entreprise.nif || 'NIF'} vérifié. Votre KYB sera validé par l'équipe TIKEXO sous 48h ouvrées.
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '0.5px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '8px' }}>
              <i className="ti ti-info-circle" style={{ fontSize: '15px', color: '#185FA5', flexShrink: 0, marginTop: '1px' }} aria-hidden="true"></i>
              <div style={{ fontSize: '11px', color: '#0C447C', lineHeight: 1.5 }}>
                Après confirmation Mobile Money, votre portail RH est immédiatement accessible. Les salariés peuvent être ajoutés et dotés sans attendre la validation KYB.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
