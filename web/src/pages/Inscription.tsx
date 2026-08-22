import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { INSCRIPTION_CSS } from './inscription/styles';
import SidePanel from './inscription/SidePanel';
import Step1Entreprise from './inscription/Step1Entreprise';
import Step2Plan from './inscription/Step2Plan';
import Step3Kyb, { type KybFile } from './inscription/Step3Kyb';
import Step4Confirmation from './inscription/Step3Recharge';
import StepSuccess from './inscription/StepSuccess';
import { DEFAULT_DATA, type InscriptionData } from './inscription/types';
import { sauvegarderKybDocs, chargerKybDocs, effacerKybDocs } from './inscription/kybDocsStore';
import api from '../lib/api';

type Etape = 1 | 2 | 3 | 4 | 'succes';
type EtapeNumerique = 1 | 2 | 3 | 4;

// Un slug par étape dans l'URL (/inscription/Plan, etc.) — plus pratique
// pour partager un lien ou reprendre au bon endroit en débogage que de tout
// masquer derrière /inscription avec un état interne invisible dans l'URL.
const ETAPE_SLUGS: Record<EtapeNumerique, string> = {
  1: 'Entreprise',
  2: 'Plan',
  3: 'Documents-KYB',
  4: 'Confirmation',
};
const SLUG_VERS_ETAPE: Record<string, EtapeNumerique> = Object.entries(ETAPE_SLUGS)
  .reduce((acc, [n, slug]) => ({ ...acc, [slug.toLowerCase()]: Number(n) as EtapeNumerique }), {});

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
      // Fusion en profondeur des objets imbriqués — un brouillon plus ancien
      // que la forme actuelle de InscriptionData (ex : champ renommé/ajouté
      // depuis) ne doit jamais laisser une clé manquante à undefined.
      data: {
        ...DEFAULT_DATA,
        ...parsed.data,
        entreprise: { ...DEFAULT_DATA.entreprise, ...parsed.data?.entreprise },
        admin: { ...DEFAULT_DATA.admin, ...parsed.data?.admin },
      },
    };
  } catch {
    return { etape: 1, data: DEFAULT_DATA };
  }
}

export default function Inscription() {
  const navigate = useNavigate();
  const { etape: etapeUrl } = useParams<{ etape?: string }>();

  const draft = loadDraft();
  const etapeInitiale = (etapeUrl && SLUG_VERS_ETAPE[etapeUrl.toLowerCase()]) || draft.etape;
  const [etape, setEtapeRaw] = useState<Etape>(etapeInitiale);
  const [data, setData] = useState<InscriptionData>(draft.data);
  const [kybDocs, setKybDocs] = useState<KybFile[]>([]);
  const [kybDocsCharges, setKybDocsCharges] = useState(false);
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

  // Fichiers KYB (étape 3) — IndexedDB uniquement, voir kybDocsStore.ts
  useEffect(() => {
    chargerKybDocs().then((docs) => {
      setKybDocs(docs);
      setKybDocsCharges(true);
    });
  }, []);

  useEffect(() => {
    // Ne pas écraser le brouillon IndexedDB avec [] avant la fin du
    // chargement initial (sinon un refresh viderait les fichiers déjà là)
    if (!kybDocsCharges) return;
    sauvegarderKybDocs(kybDocs);
  }, [kybDocs, kybDocsCharges]);

  // Garde l'URL synchronisée avec l'étape : redirige /inscription vers
  // l'étape courante, et suit les navigations précédent/suivant du
  // navigateur (l'utilisateur change etapeUrl sans passer par setEtape).
  useEffect(() => {
    if (etape === 'succes') return;
    const slugAttendu = ETAPE_SLUGS[etape as EtapeNumerique];
    const parsed = etapeUrl ? SLUG_VERS_ETAPE[etapeUrl.toLowerCase()] : undefined;
    if (parsed && parsed !== etape) {
      setEtapeRaw(parsed);
    } else if (!parsed) {
      navigate(`/inscription/${slugAttendu}`, { replace: true });
    }
  }, [etapeUrl]);

  function setEtape(e: Etape) {
    setEtapeRaw(e);
    setErreur(null);
    if (e !== 'succes') {
      navigate(`/inscription/${ETAPE_SLUGS[e as EtapeNumerique]}`);
    }
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
          role_inscription: data.admin.role_inscription,
        },
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

      effacerKybDocs();
      setEtapeRaw('succes');
    } catch (err: any) {
      setErreur(err?.response?.data?.error || 'Échec de la création de votre compte entreprise — réessayez.');
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
              nbSalaries={data.entreprise.nb_salaries}
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
