import React from 'react';
import { ArrowLeft, Info, AlertCircle, Loader2, Check, CheckCircle2 } from 'lucide-react';
import StepsBar from './StepsBar';
import type { InscriptionData } from './types';

interface Props {
  data: InscriptionData;
  onSubmit: () => void;
  onBack: () => void;
  loading: boolean;
  erreur: string | null;
}

const prixPlan: Record<string, number> = { Starter: 15000, Growth: 35000, Business: 75000 };

export default function Step3Recharge({ data, onSubmit, onBack, loading, erreur }: Props) {
  const prixMensuel = prixPlan[data.plan] ?? 35000;

  return (
    <div className="full-card">
      <div className="mnav">
        <span className="mnav-logo">TIKEXO</span>
        <div className="mnav-back" onClick={onBack}>
          <ArrowLeft size={13} /> Documents KYB
        </div>
      </div>
      <div style={{ padding: '24px' }}>
        <StepsBar etape={4} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Gauche — résumé du process */}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#1E293B', marginBottom: '4px' }}>
              Confirmer votre inscription
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '24px' }}>
              Vérifiez les informations ci-contre, puis créez votre compte.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              {([
                { num: '1', titre: 'Compte créé',                desc: 'Vos identifiants (email + mot de passe) sont enregistrés. Vous recevez un email de confirmation.' },
                { num: '2', titre: 'Documents transmis à TIKEXO', desc: 'Vos documents KYB sont envoyés à l\'équipe TIKEXO pour vérification.' },
                { num: '3', titre: 'KYB validé → rechargement',   desc: 'Sous 48h ouvrées, votre compte est activé. Connectez-vous sur /entreprise/connexion avec votre email.' },
              ] as const).map(({ num, titre, desc }) => (
                <div key={num} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0, background: '#1A3C5E', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600 }}>
                    {num}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E293B' }}>{titre}</div>
                    <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.5, marginTop: '2px' }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#DBEAFE', border: '0.5px solid #B5D4F4', borderRadius: '8px', padding: '10px 12px', marginBottom: '20px', display: 'flex', gap: '8px' }}>
              <Info size={15} color="#185FA5" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '11px', color: '#0C447C', lineHeight: 1.5 }}>
                Le rechargement du wallet est disponible après validation KYB — cette règle protège votre entreprise et vos salariés.
              </div>
            </div>

            {erreur && (
              <div className="alert-error">
                <AlertCircle size={14} style={{ flexShrink: 0 }} /> {erreur}
              </div>
            )}

            <button className="btn-accent" disabled={loading} onClick={onSubmit}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Création en cours…</>
                : <><Check size={15} /> Créer mon compte TIKEXO</>}
            </button>
          </div>

          {/* Droite — récapitulatif */}
          <div>
            <div className="recap-card">
              <div className="rc-title">RÉCAPITULATIF</div>
              <div className="rc-row">
                <span className="rc-label">Entreprise</span>
                <span className="rc-val" style={{ fontSize: '10px' }}>{data.entreprise.nom || '—'}</span>
              </div>
              {data.entreprise.nif && (
                <div className="rc-row">
                  <span className="rc-label">NIF</span>
                  <span className="rc-val mono">{data.entreprise.nif}</span>
                </div>
              )}
              {data.entreprise.rccm && (
                <div className="rc-row">
                  <span className="rc-label">RCCM</span>
                  <span className="rc-val mono">{data.entreprise.rccm}</span>
                </div>
              )}
              {data.entreprise.adresse && (
                <div className="rc-row">
                  <span className="rc-label">Adresse</span>
                  <span className="rc-val" style={{ fontSize: '10px' }}>{data.entreprise.adresse}, {data.entreprise.ville}</span>
                </div>
              )}
              <div className="rc-row">
                <span className="rc-label">Plan</span>
                <span className="rc-val accent">{data.plan} · {prixMensuel.toLocaleString('fr-FR')} XOF/mois</span>
              </div>
              <div className="rc-row">
                <span className="rc-label">Contact RH</span>
                <span className="rc-val" style={{ fontSize: '10px' }}>{data.admin.prenom} {data.admin.nom}</span>
              </div>
              <div className="rc-row">
                <span className="rc-label">Téléphone</span>
                <span className="rc-val mono">{data.admin.telephone}</span>
              </div>
              <div className="rc-row">
                <span className="rc-label">Documents KYB</span>
                <span style={{ fontSize: '9px', background: '#EAF3DE', color: '#3B6D11', padding: '2px 8px', borderRadius: '7px', fontWeight: 500 }}>3 / 3 ✓</span>
              </div>
              <div className="rc-row">
                <span className="rc-label">KYB</span>
                <span style={{ fontSize: '9px', background: 'rgba(250,238,218,0.3)', color: '#FAC775', padding: '2px 8px', borderRadius: '7px' }}>En attente validation</span>
              </div>
            </div>

            <div style={{ background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '8px' }}>
              <CheckCircle2 size={15} color="#3B6D11" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: '11px', color: '#27500A', lineHeight: 1.5 }}>
                Un email de confirmation sera envoyé à{' '}
                <strong>{data.admin.email_rh || 'votre adresse'}</strong>. Une fois votre KYB validé, connectez-vous avec cet email sur le portail RH.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
