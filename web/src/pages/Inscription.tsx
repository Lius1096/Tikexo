import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { INSCRIPTION_CSS } from './inscription/styles';
import SidePanel from './inscription/SidePanel';
import Step1Entreprise from './inscription/Step1Entreprise';
import Step2Plan from './inscription/Step2Plan';
import Step3Kyb, { type KybFile } from './inscription/Step3Kyb';
import Step4Confirmation from './inscription/Step3Recharge';
import StepSuccess from './inscription/StepSuccess';
import { DEFAULT_DATA, type InscriptionData } from './inscription/types';
import api from '../lib/api';

type Etape = 1 | 2 | 3 | 4 | 'succes';

interface InscriptionResult {
  entreprise_id: string;
  user_id: string;
  plan: string;
}

const STORAGE_KEY = 'tikexo_inscription_draft';

function loadDraft(): { etape: Etape; data: InscriptionData } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { etape: 1, data: DEFAULT_DATA };
    const parsed = JSON.parse(raw);
    return {
      etape: parsed.etape ?? 1,
      data: { ...DEFAULT_DATA, ...parsed.data },
    };
  } catch {
    return { etape: 1, data: DEFAULT_DATA };
  }
}

export default function Inscription() {
  const navigate = useNavigate();

  const draft = loadDraft();
  const [etape, setEtapeRaw] = useState<Etape>(draft.etape);
  const [data, setData] = useState<InscriptionData>(draft.data);
  const [kybDocs, setKybDocs] = useState<KybFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [result, setResult] = useState<InscriptionResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'partial'>('idle');

  // Persiste l'étape et les champs texte à chaque changement
  useEffect(() => {
    if (etape === 'succes') {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ etape, data }));
    }
  }, [etape, data]);

  function setEtape(e: Etape) {
    setEtapeRaw(e);
    setErreur(null);
  }

  function patch(p: Partial<InscriptionData>) {
    setData((prev) => ({ ...prev, ...p }));
    setErreur(null);
  }

  async function soumettre() {
    setLoading(true);
    setErreur(null);
    try {
      // 1. Créer le compte entreprise
      const { data: res } = await api.post('/inscription', {
        entreprise: data.entreprise,
        admin: {
          prenom: data.admin.prenom,
          nom: data.admin.nom,
          telephone: data.admin.telephone,
          email_rh: data.admin.email_rh,
          mot_de_passe: data.admin.mot_de_passe,
        },
        plan: data.plan,
      });
      const inscriptionData: InscriptionResult = res.data;
      setResult(inscriptionData);

      // 2. Uploader les documents KYB via endpoint public (pas besoin d'auth)
      if (kybDocs.length > 0) {
        setUploadStatus('uploading');
        let ok = 0;
        for (const { type, file } of kybDocs) {
          try {
            const form = new FormData();
            form.append('entreprise_id', inscriptionData.entreprise_id);
            form.append('type', type);
            form.append('fichier', file);
            await api.post('/inscription/documents', form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            ok++;
          } catch {
            // Continuer — l'employeur pourra re-uploader depuis l'email d'invitation
          }
        }
        setUploadStatus(ok === kybDocs.length ? 'done' : 'partial');
      } else {
        setUploadStatus('done');
      }

      setEtapeRaw('succes');
    } catch (err: any) {
      setErreur(err?.response?.data?.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{INSCRIPTION_CSS}</style>

      {/* Barre de navigation */}
      <div style={{
        background: '#1A3C5E',
        padding: '0 32px',
        height: '52px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span
          onClick={() => navigate('/')}
          style={{ fontSize: '17px', fontWeight: 700, color: '#fff', letterSpacing: '2.5px', cursor: 'pointer' }}
        >
          TIKEXO
        </span>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif',
            transition: 'color .2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.9)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <ArrowLeft size={13} />
          Retour à l'accueil
        </button>
      </div>

      <div className="pg" style={{ minHeight: 'calc(100vh - 52px)', background: '#F1F5F9', padding: '32px 16px' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>

          {etape === 1 && (
            <div className="two">
              <SidePanel etapeActive={1} />
              <Step1Entreprise data={data} onChange={patch} onNext={() => setEtape(2)} />
            </div>
          )}

          {etape === 2 && (
            <Step2Plan data={data} onChange={patch} onNext={() => setEtape(3)} onBack={() => setEtape(1)} />
          )}

          {etape === 3 && (
            <Step3Kyb
              docs={kybDocs}
              plan={data.plan}
              onChangeDocs={setKybDocs}
              onNext={() => setEtape(4)}
              onBack={() => setEtape(2)}
            />
          )}

          {etape === 4 && (
            <Step4Confirmation
              data={data}
              onSubmit={soumettre}
              onBack={() => setEtape(3)}
              loading={loading}
              erreur={erreur}
            />
          )}

          {etape === 'succes' && result && (
            <StepSuccess
              data={data}
              entrepriseId={result.entreprise_id}
              uploadStatus={uploadStatus}
              nbDocs={kybDocs.length}
            />
          )}

        </div>
      </div>
    </>
  );
}
