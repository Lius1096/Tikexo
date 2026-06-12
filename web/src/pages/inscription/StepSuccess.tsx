import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { InscriptionData } from './types';

interface Props {
  data: InscriptionData;
  entrepriseId: string;
  walletSolde?: number;
  paymentUrl?: string | null;
}

const PRIX_PLAN: Record<string, string> = { Starter: '15 000', Growth: '35 000', Business: '75 000' };

export default function StepSuccess({ data, entrepriseId, walletSolde, paymentUrl }: Props) {
  const navigate = useNavigate();
  const ref = entrepriseId.slice(-4).toUpperCase();
  const dateRef = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return (
    <div className="full-card">
      <div className="mnav"><span className="mnav-logo">TIKEXO</span><div></div></div>
      <div className="success-screen">
        <div className="success-icon">
          <i className="ti ti-check" aria-hidden="true"></i>
        </div>
        <div style={{ fontSize: '17px', fontWeight: 500, color: '#1E293B', marginBottom: '5px' }}>Compte activé avec succès !</div>
        <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.7, marginBottom: '14px', maxWidth: '340px', margin: '0 auto 14px' }}>
          {data.admin.email_rh && (
            <>Un email de confirmation a été envoyé à <strong style={{ color: '#1A3C5E' }}>{data.admin.email_rh}</strong><br /></>
          )}
          Votre KYB sera validé sous 48h ouvrées.
        </div>

        <div className="si-card">
          <div className="si-row"><span className="si-label">Entreprise</span><span className="si-val">{data.entreprise.nom}</span></div>
          <div className="si-row"><span className="si-label">NIF</span><span className="si-val mono">{data.entreprise.nif}</span></div>
          {data.entreprise.rccm && (
            <div className="si-row"><span className="si-label">RCCM</span><span className="si-val mono">{data.entreprise.rccm}</span></div>
          )}
          <div className="si-row"><span className="si-label">Adresse</span><span className="si-val">{data.entreprise.adresse}, {data.entreprise.ville}</span></div>
          <div className="si-row"><span className="si-label">Plan actif</span><span className="si-val">{data.plan} · {PRIX_PLAN[data.plan]} XOF/mois</span></div>
          {walletSolde != null && walletSolde > 0 && (
            <div className="si-row"><span className="si-label">Wallet entreprise</span><span className="si-val mono green">{walletSolde.toLocaleString('fr-FR')} XOF crédités</span></div>
          )}
          {paymentUrl && (
            <div className="si-row"><span className="si-label">Wallet entreprise</span><span style={{ fontSize: '11px', background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: '7px', fontWeight: 500 }}>En attente de paiement</span></div>
          )}
          <div className="si-row"><span className="si-label">Identifiant TIKEXO</span><span className="si-val mono">ENT-{dateRef}-{ref}</span></div>
          <div className="si-row">
            <span className="si-label">KYB</span>
            <span style={{ fontSize: '11px', background: '#FAEEDA', color: '#854F0B', padding: '2px 8px', borderRadius: '7px', fontWeight: 500 }}>
              En attente · 48h ouvrées
            </span>
          </div>
        </div>

        {paymentUrl && (
          <div style={{ maxWidth: '340px', margin: '0 auto 12px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: '10px', padding: '12px 14px' }}>
            <div style={{ fontSize: '11px', color: '#92400E', fontWeight: 600, marginBottom: '6px' }}>
              Paiement en attente — Finalisez votre rechargement
            </div>
            <div style={{ fontSize: '11px', color: '#B45309', marginBottom: '10px', lineHeight: 1.5 }}>
              Votre wallet sera crédité automatiquement après confirmation FedaPay.
            </div>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', textAlign: 'center', background: '#1A3C5E', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '9px 14px', borderRadius: '8px', textDecoration: 'none', fontFamily: "'Inter',sans-serif" }}
            >
              Payer maintenant sur FedaPay
            </a>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', maxWidth: '340px', margin: '0 auto 14px' }}>
          <button
            className="btn-primary"
            style={{ fontSize: '12px', padding: '10px' }}
            onClick={() => navigate('/employeur')}
          >
            <i className="ti ti-layout-dashboard" aria-hidden="true"></i> Accéder au portail RH
          </button>
          <button
            onClick={() => navigate('/employeur/beneficiaires')}
            style={{ background: 'transparent', color: '#1A3C5E', fontSize: '12px', padding: '10px', borderRadius: '10px', border: '0.5px solid #CBD5E1', cursor: 'pointer', fontFamily: "'Inter',sans-serif" }}
          >
            Ajouter des salariés
          </button>
        </div>

        <div style={{ display: 'flex', gap: '18px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}>
            <i className="ti ti-brand-apple" style={{ fontSize: '15px' }} aria-hidden="true"></i> App iOS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}>
            <i className="ti ti-brand-android" style={{ fontSize: '15px' }} aria-hidden="true"></i> App Android
          </div>
        </div>
      </div>
    </div>
  );
}
