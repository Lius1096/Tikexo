import React, { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ScanLine, CheckCircle, XCircle, ChevronLeft, Utensils,
  AlertTriangle, Camera, CameraOff, ChevronDown,
} from 'lucide-react';
import api from '../../lib/api';
import { fmt } from '../../utils/format';

type Step = 'scan' | 'confirm' | 'success' | 'error';

interface CameraDevice { id: string; label: string }
interface QRPayload {
  app: string;
  type: string;
  commercant_id: string;
  montant?: number;
  version: string;
}

function decodeQR(raw: string): QRPayload | null {
  try {
    const prefix = 'tikexo://paiement/';
    if (!raw.startsWith(prefix)) return null;
    const data = JSON.parse(atob(raw.slice(prefix.length)));
    if (data.app !== 'TIKEXO' || data.type !== 'PAIEMENT') return null;
    return data;
  } catch { return null; }
}

function labelCamera(label: string, idx: number): string {
  if (!label) return `Caméra ${idx + 1}`;
  const l = label.toLowerCase();
  if (l.includes('back') || l.includes('arrière') || l.includes('environment')) return `Caméra arrière`;
  if (l.includes('front') || l.includes('frontale') || l.includes('user')) return `Caméra frontale`;
  return label.length > 30 ? label.slice(0, 30) + '…' : label;
}

export default function BeneficiaireScanner() {
  const qc = useQueryClient();
  const scannerRef   = useRef<Html5Qrcode | null>(null);
  const scanningRef  = useRef(false); // true uniquement si start() a réussi

  const [step, setStep]           = useState<Step>('scan');
  const [payload, setPayload]     = useState<QRPayload | null>(null);
  const [montant, setMontant]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  // Caméra
  const [cameras, setCameras]         = useState<CameraDevice[]>([]);
  const [selectedCam, setSelectedCam] = useState<string>('');
  const [cameraOpen, setCameraOpen]   = useState(false);
  const [scanActive, setScanActive]   = useState(false);
  const [camError, setCamError]       = useState('');
  const [showCamPicker, setShowCamPicker] = useState(false);

  /* ── Détecter les caméras disponibles au montage ── */
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((cams) => {
        setCameras(cams);
        // Priorité caméra arrière (dernière dans la liste sur mobile)
        if (cams.length > 0) setSelectedCam(cams[cams.length - 1].id);
      })
      .catch(() => setCamError('Impossible de détecter les caméras.'));
  }, []);

  /* ── Démarrer/arrêter la caméra selon cameraOpen + selectedCam ── */
  useEffect(() => {
    if (!cameraOpen || !selectedCam) return;

    // Vider le conteneur avant de créer une nouvelle instance
    const el = document.getElementById('qr-reader');
    if (el) el.innerHTML = '';

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    scanningRef.current = false;
    setScanActive(false);
    setCamError('');

    scanner
      .start(
        selectedCam,
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          const p = decodeQR(decoded);
          if (!p) {
            setCamError('QR code non reconnu. Scannez un QR code TIKEXO.');
            return;
          }
          // Stopper proprement avant de changer d'étape
          scanningRef.current = false;
          scanner.stop().catch(() => {});
          setCameraOpen(false);
          setScanActive(false);
          setPayload(p);
          if (p.montant && p.montant > 0) setMontant(String(p.montant));
          setStep('confirm');
        },
        () => {} // erreur de décodage image par image — ignorée
      )
      .then(() => {
        scanningRef.current = true;
        setScanActive(true);
      })
      .catch((e: Error) => {
        setCamError(e?.message ?? 'Impossible d\'accéder à la caméra.');
        setCameraOpen(false);
      });

    return () => {
      if (scanningRef.current) {
        scanningRef.current = false;
        scanner.stop().catch(() => {});
      }
      setScanActive(false);
    };
  }, [cameraOpen, selectedCam]);

  function fermerCamera() {
    if (scanningRef.current && scannerRef.current) {
      scanningRef.current = false;
      scannerRef.current.stop().catch(() => {});
    }
    setCameraOpen(false);
    setScanActive(false);
  }

  function changerCamera(id: string) {
    setShowCamPicker(false);
    if (id === selectedCam) return;
    // Fermer l'actuelle proprement, puis changer → le useEffect repart
    fermerCamera();
    setSelectedCam(id);
    // Rouvrir après le changement (le useEffect se déclenche sur selectedCam)
    setTimeout(() => setCameraOpen(true), 150);
  }

  function reset() {
    fermerCamera();
    setStep('scan');
    setPayload(null);
    setMontant('');
    setErrMsg('');
    setCamError('');
  }

  /* ── Requêtes ── */
  const { data: commercant } = useQuery({
    queryKey: ['commercant-fiche', payload?.commercant_id],
    queryFn: () => api.get(`/commercants/${payload!.commercant_id}/fiche`).then((r) => r.data.data),
    enabled: !!payload?.commercant_id,
    staleTime: 60_000,
  });

  const { data: soldeData, isLoading: loadSolde } = useQuery({
    queryKey: ['beneficiaire-solde'],
    queryFn: () => api.get('/wallet/solde').then((r) => r.data.data),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  // null = données pas encore reçues — distinct d'un solde réel de 0
  const solde: number | null = soldeData != null
    ? parseFloat(String(soldeData.solde))
    : null;

  const payer = useMutation({
    mutationFn: ({ commercantId, montantTotal }: { commercantId: string; montantTotal: number }) =>
      api.post('/transactions', { commercantId, montantTotal }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['beneficiaire-solde'] });
      // Invalide toutes les variantes de l'historique (Dashboard limit:5 + Transactions limit:100)
      qc.invalidateQueries({ queryKey: ['beneficiaire-historique'] });
      setStep('success');
    },
    onError: (e: any) => {
      setErrMsg(e?.response?.data?.error ?? 'Paiement refusé.');
      setStep('error');
    },
  });

  const montantNum  = parseFloat(montant.replace(',', '.')) || 0;
  const insuffisant = solde !== null && montantNum > solde;
  const camLabel    = cameras.find((c) => c.id === selectedCam);

  /* ════════════════ SCAN ════════════════ */
  if (step === 'scan') {
    return (
      <div className="flex flex-col h-full bg-slate-900">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 flex-shrink-0">
          <ScanLine size={18} className="text-tikexo-accent" />
          <div>
            <div className="text-[14px] font-medium text-white">Scanner un QR Code</div>
            <div className="text-[11px] text-white/40">Pointez la caméra vers le QR Code TIKEXO du commerçant</div>
          </div>
        </div>

        {/* Sélecteur caméra + bouton */}
        <div className="px-5 pb-4 flex items-center gap-2 flex-shrink-0">
          {/* Dropdown caméra */}
          {cameras.length > 0 && (
            <div className="relative flex-1">
              <button
                onClick={() => setShowCamPicker((v) => !v)}
                className="w-full flex items-center gap-2 bg-white/[0.08] border border-white/10 rounded-xl px-3 py-2.5 text-left"
              >
                <Camera size={14} className="text-white/50 flex-shrink-0" />
                <span className="flex-1 text-[12px] text-white/80 truncate">
                  {camLabel ? labelCamera(camLabel.label, cameras.indexOf(camLabel)) : 'Sélectionner…'}
                </span>
                <ChevronDown size={13} className="text-white/40 flex-shrink-0" />
              </button>

              {showCamPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e2d40] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                  {cameras.map((cam, i) => (
                    <button
                      key={cam.id}
                      onClick={() => changerCamera(cam.id)}
                      className={clsx(
                        'w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.08] transition-colors',
                        cam.id === selectedCam && 'bg-tikexo-accent/20'
                      )}
                    >
                      <Camera size={13} className={cam.id === selectedCam ? 'text-tikexo-accent' : 'text-white/40'} />
                      <span className={clsx('text-[12px]', cam.id === selectedCam ? 'text-white' : 'text-white/60')}>
                        {labelCamera(cam.label, i)}
                      </span>
                      {cam.id === selectedCam && (
                        <CheckCircle size={12} className="text-tikexo-accent ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bouton ouvrir/fermer */}
          <button
            onClick={() => {
              if (cameraOpen) { fermerCamera(); } else { setCamError(''); setCameraOpen(true); }
            }}
            disabled={cameras.length === 0}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-medium transition-colors flex-shrink-0',
              cameraOpen
                ? 'bg-red-600/80 hover:bg-red-600 text-white'
                : 'bg-tikexo-accent hover:bg-tikexo-accent/80 text-white disabled:opacity-40 disabled:cursor-not-allowed'
            )}
          >
            {cameraOpen ? <><CameraOff size={14} /> Fermer</> : <><Camera size={14} /> Ouvrir</>}
          </button>
        </div>

        {/* Zone caméra */}
        <div className="flex-1 flex flex-col items-center justify-start px-5 gap-3 overflow-hidden">
          <div className="relative w-full max-w-sm">
            {/* Le div doit toujours être dans le DOM pour Html5Qrcode */}
            <div
              id="qr-reader"
              className={clsx(
                'w-full rounded-2xl overflow-hidden bg-black transition-all',
                cameraOpen ? 'min-h-[260px]' : 'h-0'
              )}
            />

            {/* Placeholder quand caméra fermée */}
            {!cameraOpen && (
              <div className="h-48 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3">
                <CameraOff size={28} className="text-white/20" />
                <div className="text-[12px] text-white/30 text-center">
                  {cameras.length === 0 ? 'Aucune caméra détectée' : 'Appuyez sur "Ouvrir" pour démarrer'}
                </div>
              </div>
            )}

            {/* Coins du cadre */}
            {scanActive && (
              <>
                <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-tikexo-accent rounded-tl-md pointer-events-none" />
                <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-tikexo-accent rounded-tr-md pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-tikexo-accent rounded-bl-md pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-tikexo-accent rounded-br-md pointer-events-none" />
              </>
            )}

            {/* Indicateur activation */}
            {cameraOpen && !scanActive && !camError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl pointer-events-none">
                <div className="text-white/40 text-sm">Activation…</div>
              </div>
            )}
          </div>

          {/* Erreur */}
          {camError && (
            <div className="flex items-start gap-2 bg-red-900/40 border border-red-700/40 rounded-xl px-4 py-3 w-full max-w-sm">
              <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-red-300">{camError}</div>
            </div>
          )}

          {scanActive && (
            <div className="text-[11px] text-white/25 text-center">
              Le QR Code est affiché à la caisse du restaurant
            </div>
          )}
        </div>

        {/* Solde en bas */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/30">Solde disponible</span>
            {loadSolde
              ? <div className="h-4 w-20 bg-white/10 animate-pulse rounded" />
              : <span className="text-[13px] font-medium text-white">{solde !== null ? fmt(solde) : '—'}</span>
            }
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════ CONFIRM ════════════════ */
  if (step === 'confirm') {
    const montantFixe = !!(payload?.montant && payload.montant > 0);

    return (
      <div className="p-6 space-y-5">
        <button onClick={reset} className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-700">
          <ChevronLeft size={14} /> Rescanner
        </button>

        <div>
          <div className="text-[15px] font-medium text-slate-900">Confirmer le paiement</div>
          <div className="text-xs text-slate-500">Vérifiez les informations avant de payer</div>
        </div>

        {/* Infos commerçant */}
        <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#FEF3C7] flex items-center justify-center flex-shrink-0">
            <Utensils size={20} className="text-[#92400E]" />
          </div>
          <div>
            <div className="text-[13px] font-medium text-slate-900">{commercant?.nom ?? 'Chargement…'}</div>
            <div className="text-[11px] text-slate-400">{commercant?.type ?? ''} · {commercant?.ville ?? ''}</div>
          </div>
        </div>

        {/* Montant */}
        {montantFixe ? (
          <div className="bg-tikexo-primary/5 border border-tikexo-primary/20 rounded-xl p-4 text-center">
            <div className="text-[10px] text-slate-400 mb-1">Montant demandé par le commerçant</div>
            <div className="text-[28px] font-bold text-tikexo-primary">{fmt(montantNum)}</div>
            {loadSolde ? (
              <div className="text-[11px] text-slate-400 mt-1">Vérification du solde…</div>
            ) : insuffisant ? (
              <div className="text-[11px] text-red-500 mt-1">Solde insuffisant — disponible : {fmt(solde!)}</div>
            ) : null}
          </div>
        ) : (
          <div>
            <label className="text-[11px] text-slate-500 mb-1.5 block">Montant à payer (XOF)</label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ex : 2 500"
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                className={clsx(
                  'w-full px-4 py-3 text-lg font-semibold border rounded-xl outline-none transition-colors bg-white',
                  insuffisant ? 'border-red-300 focus:border-red-400' : 'border-slate-200 focus:border-tikexo-accent'
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">XOF</span>
            </div>
            {loadSolde ? (
              <div className="text-[11px] text-slate-400 mt-1">Vérification du solde…</div>
            ) : insuffisant && montantNum > 0 ? (
              <div className="text-[11px] text-red-500 mt-1">Solde insuffisant — disponible : {fmt(solde!)}</div>
            ) : null}
          </div>
        )}

        {/* Résumé */}
        {montantNum > 0 && !insuffisant && solde !== null && (
          <div className="bg-tikexo-primary rounded-xl p-4 text-white space-y-2">
            <div className="flex justify-between text-[12px]">
              <span className="text-white/50">Commerçant</span>
              <span>{commercant?.nom ?? '—'}</span>
            </div>
            <div className="flex justify-between text-[12px]">
              <span className="text-white/50">Montant</span>
              <span className="font-semibold">{fmt(montantNum)}</span>
            </div>
            <div className="border-t border-white/10 pt-2 flex justify-between text-[12px]">
              <span className="text-white/50">Solde après</span>
              <span>{fmt(solde - montantNum)}</span>
            </div>
          </div>
        )}

        <button
          onClick={() => payer.mutate({ commercantId: payload!.commercant_id, montantTotal: montantNum })}
          disabled={!montantNum || insuffisant || loadSolde || solde === null || payer.isPending || !commercant}
          className="w-full py-3.5 rounded-xl text-sm font-medium bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {payer.isPending ? 'Paiement en cours…' : `Payer ${montantNum ? fmt(montantNum) : ''}`}
        </button>
      </div>
    );
  }

  /* ════════════════ SUCCESS ════════════════ */
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-5 text-center">
        <div className="w-20 h-20 rounded-full bg-[#EAF3DE] flex items-center justify-center">
          <CheckCircle size={40} className="text-[#166534]" />
        </div>
        <div>
          <div className="text-[16px] font-semibold text-slate-900">Paiement réussi !</div>
          <div className="text-sm text-slate-500 mt-1">{fmt(montantNum)} débités chez {commercant?.nom}</div>
          <div className="text-[11px] text-slate-400 mt-1">
            {solde !== null ? `Nouveau solde : ${fmt(solde - montantNum)}` : ''}
          </div>
        </div>
        <button onClick={reset} className="px-6 py-2.5 rounded-xl text-sm bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors">
          Nouveau paiement
        </button>
      </div>
    );
  }

  /* ════════════════ ERROR ════════════════ */
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 gap-5 text-center">
      <div className="w-20 h-20 rounded-full bg-[#FCEBEB] flex items-center justify-center">
        <XCircle size={40} className="text-[#991B1B]" />
      </div>
      <div>
        <div className="text-[16px] font-semibold text-slate-900">Paiement refusé</div>
        <div className="text-sm text-slate-500 mt-1">{errMsg}</div>
      </div>
      <button onClick={reset} className="px-6 py-2.5 rounded-xl text-sm bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors">
        Réessayer
      </button>
    </div>
  );
}
