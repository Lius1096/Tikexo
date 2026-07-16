import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, CheckCircle2, AlertTriangle, Info, Home, Smartphone, ArrowRight } from 'lucide-react';
import { calculerFraisGestion, type InscriptionData } from './types';

interface Props {
  data: InscriptionData;
  entrepriseId: string;
  uploadStatus?: 'idle' | 'uploading' | 'done' | 'partial';
  nbDocs?: number;
}

export default function StepSuccess({ data, entrepriseId, uploadStatus = 'idle', nbDocs = 0 }: Props) {
  const navigate = useNavigate();
  const ref = entrepriseId.slice(-4).toUpperCase();
  const dateRef = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const planInfo = calculerFraisGestion(data.entreprise.nb_salaries);

  return (
    <div className="full-card">
      <div className="mnav"><span className="mnav-logo">TIKEXO</span><div /></div>
      <div className="success-screen">
        <div className="success-icon">
          <Check size={24} color="#3B6D11" />
        </div>
        <div style={{ fontSize: '17px', fontWeight: 500, color: '#1E293B', marginBottom: '5px' }}>Dossier soumis avec succès !</div>
        <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.7, marginBottom: '14px', maxWidth: '340px', margin: '0 auto 14px' }}>
          {data.admin.email_rh && (
            <>Un email de confirmation a été envoyé à <strong style={{ color: '#1A3C5E' }}>{data.admin.email_rh}</strong><br /></>
          )}
          L'équipe TIKEXO examine votre dossier KYB (48h ouvrées). Une fois validé, connectez-vous avec votre email et mot de passe.
        </div>

        <div className="si-card">
          <div className="si-row"><span className="si-label">Entreprise</span><span className="si-val">{data.entreprise.nom}</span></div>
          <div className="si-row"><span className="si-label">NIF</span><span className="si-val mono">{data.entreprise.nif}</span></div>
          {data.entreprise.rccm && (
            <div className="si-row"><span className="si-label">RCCM</span><span className="si-val mono">{data.entreprise.rccm}</span></div>
          )}
          <div className="si-row"><span className="si-label">Adresse</span><span className="si-val">{data.entreprise.adresse}, {data.entreprise.ville}</span></div>
          <div className="si-row"><span className="si-label">Effectif</span><span className="si-val">{data.entreprise.nb_salaries} salarié(s)</span></div>
          <div className="si-row"><span className="si-label">Plan actif</span><span className="si-val">{planInfo.label} · {planInfo.frais.toLocaleString('fr-FR')} XOF/mois</span></div>
          {data.entreprise.dotation_max && (
            <div className="si-row"><span className="si-label">Dotation max</span><span className="si-val">{parseInt(data.entreprise.dotation_max).toLocaleString('fr-FR')} XOF/salarié</span></div>
          )}
          <div className="si-row"><span className="si-label">Identifiant TIKEXO</span><span className="si-val mono">ENT-{dateRef}-{ref}</span></div>
          <div className="si-row">
            <span className="si-label">KYB</span>
            <span style={{ fontSize: '11px', background: '#FAEEDA', color: '#854F0B', padding: '2px 8px', borderRadius: '7px', fontWeight: 500 }}>
              En attente · 48h ouvrées
            </span>
          </div>
        </div>

        {/* Statut upload KYB */}
        {uploadStatus === 'uploading' && (
          <div style={{ maxWidth: '340px', margin: '0 auto 12px', background: '#DBEAFE', border: '0.5px solid #B5D4F4', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Loader2 size={15} color="#185FA5" style={{ flexShrink: 0, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '11px', color: '#0C447C' }}>Envoi des documents KYB en cours…</div>
          </div>
        )}
        {uploadStatus === 'done' && (
          <div style={{ maxWidth: '340px', margin: '0 auto 12px', background: '#EAF3DE', border: '0.5px solid #C0DD97', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '8px' }}>
            <CheckCircle2 size={15} color="#3B6D11" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: '11px', color: '#27500A', lineHeight: 1.5 }}>
              {nbDocs} document{nbDocs > 1 ? 's' : ''} KYB envoyé{nbDocs > 1 ? 's' : ''} avec succès. L'équipe TIKEXO les examinera sous 48h ouvrées.
            </div>
          </div>
        )}
        {uploadStatus === 'partial' && (
          <div style={{ maxWidth: '340px', margin: '0 auto 12px', background: '#FAEEDA', border: '0.5px solid #F5C982', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '8px' }}>
            <AlertTriangle size={15} color="#854F0B" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: '11px', color: '#6B3D0A', lineHeight: 1.5 }}>
              Certains documents n'ont pas pu être envoyés. Rendez-vous dans{' '}
              <button
                type="button"
                onClick={() => navigate('/employeur/kyb')}
                style={{ background: 'none', border: 'none', padding: 0, color: '#854F0B', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: 11 }}
              >
                Mon dossier KYB
              </button>{' '}
              pour les re-téléverser.
            </div>
          </div>
        )}
        {(uploadStatus === 'idle' || uploadStatus === 'done') && (
          <div style={{ maxWidth: '340px', margin: '0 auto 12px', background: '#DBEAFE', border: '0.5px solid #B5D4F4', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '8px' }}>
            <Info size={15} color="#185FA5" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: '11px', color: '#0C447C', lineHeight: 1.5 }}>
              Le rechargement du wallet sera disponible dès validation de votre KYB par l'équipe TIKEXO (48h ouvrées).
            </div>
          </div>
        )}

        <div style={{ maxWidth: '340px', margin: '0 auto 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="btn-accent"
            style={{ fontSize: '12px', padding: '10px', width: '100%' }}
            onClick={() => navigate('/entreprise/connexion')}
          >
            <ArrowRight size={14} /> Accéder au portail RH
          </button>
          <button className="btn-primary" style={{ fontSize: '12px', padding: '10px', width: '100%' }} onClick={() => navigate('/')}>
            <Home size={14} /> Retour à l'accueil
          </button>
        </div>

        <div style={{ display: 'flex', gap: '18px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}>
            <Smartphone size={15} /> App iOS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}>
            <Smartphone size={15} /> App Android
          </div>
        </div>
      </div>
    </div>
  );
}
