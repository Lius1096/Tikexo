import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { clsx } from 'clsx';
import QRCodeSVG from 'react-qr-code';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, RefreshCw, Maximize2, X, TrendingUp, ShoppingBag, Clock, Delete, ShieldOff, Camera, CameraOff, AlertTriangle } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmt, fmtHeure } from '../../utils/format';

// QR carte bénéficiaire : "tikexo:<payloadStr>::<signature>" — cf. carte.service.js#getQRCode.
// Format distinct du QR marchand (tikexo://paiement/<base64>) construit par buildQRValue ci-dessous.
function decodeCardQR(raw: string): { payloadStr: string; signature: string } | null {
  const prefix = 'tikexo:';
  if (!raw.startsWith(prefix)) return null;
  const [payloadStr, signature] = raw.slice(prefix.length).split('::');
  return payloadStr && signature ? { payloadStr, signature } : null;
}

interface Transaction {
  id: string;
  montant_total: string;
  statut: string;
  createdAt: string;
  beneficiaire: { nom: string; prenom: string };
}

function buildQRValue(commercantId: string, montant: number): string {
  const data: Record<string, unknown> = {
    app: 'TIKEXO',
    type: 'PAIEMENT',
    commercant_id: commercantId,
    version: '1',
  };
  if (montant > 0) data.montant = montant;
  return `tikexo://paiement/${btoa(JSON.stringify(data))}`;
}

export default function CommercantCaisse() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullscreen, setFullscreen] = useState(false);
  const [montantSaisi, setMontantSaisi] = useState('');
  const [lastTxId, setLastTxId] = useState<string | null>(null);
  const [nouveauPaiement, setNouveauPaiement] = useState<Transaction | null>(null);
  const prevCountRef = useRef(0);

  // ── Mode "Scanner la carte du client" ──
  const [mode, setMode] = useState<'afficher' | 'scanner'>('afficher');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [camError, setCamError]     = useState('');
  const [scanErr, setScanErr]       = useState('');
  const [selectedCam, setSelectedCam] = useState('');
  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const scanningRef = useRef(false);

  const montant = parseInt(montantSaisi.replace(/\s/g, ''), 10) || 0;

  const payerCarteMut = useMutation({
    mutationFn: (body: { payload: string; signature: string; montantTotal: number }) =>
      api.post('/cartes/paiement/qr/payer', body).then((r) => r.data.data),
    onSuccess: () => {
      setMontantSaisi('');
      setScanErr('');
      qc.invalidateQueries({ queryKey: ['commercant-transactions-jour'] });
    },
    onError: (e: any) => setScanErr(e?.response?.data?.error ?? 'Paiement refusé — réessayez'),
  });

  useEffect(() => {
    if (mode !== 'scanner') return;
    Html5Qrcode.getCameras()
      .then((cams) => { if (cams.length > 0) setSelectedCam(cams[cams.length - 1].id); })
      .catch(() => setCamError('Impossible de détecter les caméras.'));
  }, [mode]);

  useEffect(() => {
    if (!cameraOpen || !selectedCam) return;
    const el = document.getElementById('caisse-qr-reader');
    if (el) el.innerHTML = '';
    const scanner = new Html5Qrcode('caisse-qr-reader');
    scannerRef.current = scanner;
    scanningRef.current = false;
    setScanActive(false);
    setCamError('');

    scanner
      .start(
        selectedCam,
        { fps: 10, qrbox: { width: 200, height: 200 } },
        (decoded) => {
          const p = decodeCardQR(decoded);
          if (!p) { setCamError('QR carte non reconnu.'); return; }
          scanningRef.current = false;
          scanner.stop().catch(() => {});
          setCameraOpen(false);
          setScanActive(false);
          payerCarteMut.mutate({ payload: p.payloadStr, signature: p.signature, montantTotal: montant });
        },
        () => {}
      )
      .then(() => { scanningRef.current = true; setScanActive(true); })
      .catch((e: Error) => { setCamError(e?.message ?? "Impossible d'accéder à la caméra."); setCameraOpen(false); });

    return () => {
      if (scanningRef.current) { scanningRef.current = false; scanner.stop().catch(() => {}); }
      setScanActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, selectedCam]);

  function fermerCamera() {
    if (scanningRef.current && scannerRef.current) { scanningRef.current = false; scannerRef.current.stop().catch(() => {}); }
    setCameraOpen(false);
    setScanActive(false);
  }

  // Coupe la caméra si le commerçant quitte le mode scanner
  useEffect(() => {
    if (mode !== 'scanner') fermerCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* ── Fiche commerçant ── */
  const { data: fiche, isLoading: loadFiche } = useQuery({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
    enabled: !!user,
    staleTime: 60_000,
  });

  const qrValue = fiche ? buildQRValue(fiche.id, montant) : null;

  /* ── Transactions du jour (polling 8s) ── */
  const { data: txData } = useQuery({
    queryKey: ['commercant-transactions-jour'],
    queryFn: () => api.get('/transactions?limit=30').then((r) => r.data.data),
    enabled: !!user,
    refetchInterval: 8000,
    staleTime: 0,
  });

  const transactions: Transaction[] = txData?.items ?? [];
  const debutJour = new Date(); debutJour.setHours(0, 0, 0, 0);
  const validees = transactions.filter(
    (t) => t.statut === 'VALIDEE' && new Date(t.createdAt) >= debutJour
  );
  const totalJour = validees.reduce((s, t) => s + parseFloat(t.montant_total), 0);

  /* ── Détecter un nouveau paiement ── */
  useEffect(() => {
    if (validees.length > prevCountRef.current && prevCountRef.current > 0) {
      const derniere = validees[0];
      if (derniere.id !== lastTxId) {
        setNouveauPaiement(derniere);
        setLastTxId(derniere.id);
        setMontantSaisi('');
        setTimeout(() => setNouveauPaiement(null), 6000);
      }
    }
    prevCountRef.current = validees.length;
  }, [validees.length]);

  /* ── Clavier numérique ── */
  function pressKey(k: string) {
    if (k === 'DEL') { setMontantSaisi((v) => v.slice(0, -1)); return; }
    if (k === 'CLR') { setMontantSaisi(''); return; }
    if (montantSaisi.length >= 7) return;
    setMontantSaisi((v) => v + k);
  }

  const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['CLR','0','DEL']];

  if (fiche && fiche.statut !== 'ACTIF') {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center gap-3 text-center">
        <ShieldOff size={32} className="text-slate-300" />
        <div className="text-sm font-medium text-slate-600">Caisse indisponible</div>
        <div className="text-xs text-slate-400 max-w-xs">
          L'encaissement est désactivé tant que votre compte n'est pas actif. Voir le bandeau en haut de page pour plus de détails.
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 h-full flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Caisse TIKEXO</div>
          <div className="text-xs text-slate-500">
            {fiche?.nom ?? '—'} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Aujourd'hui</div>
            <div className="text-[15px] font-semibold text-tikexo-primary">{fmt(totalJour)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Transactions</div>
            <div className="text-[15px] font-semibold text-slate-700">{validees.length}</div>
          </div>
        </div>
      </div>

      {/* Notification nouveau paiement */}
      {nouveauPaiement && (
        <div className="flex items-center gap-3 bg-[#EAF3DE] border border-[#B6D7A8] rounded-xl px-4 py-3 flex-shrink-0">
          <CheckCircle size={20} className="text-[#166534] flex-shrink-0" />
          <div>
            <div className="text-[13px] font-medium text-[#166534]">
              Paiement reçu — {fmt(parseFloat(nouveauPaiement.montant_total))}
            </div>
            <div className="text-[11px] text-[#3B6D11]">
              {nouveauPaiement.beneficiaire.prenom} {nouveauPaiement.beneficiaire.nom} · {fmtHeure(nouveauPaiement.createdAt)}
            </div>
          </div>
          <button onClick={() => setNouveauPaiement(null)} className="ml-auto">
            <X size={14} className="text-[#3B6D11]" />
          </button>
        </div>
      )}

      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Panneau gauche : saisie + QR ── */}
        <div className="flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden w-[300px] flex-shrink-0">

          {/* Affichage montant */}
          <div className="bg-tikexo-primary px-5 py-4 flex flex-col items-center gap-1">
            <div className="text-[10px] text-white/40 tracking-[1px]">MONTANT À PAYER</div>
            <div className={clsx('font-semibold tabular-nums transition-all', montant > 0 ? 'text-[28px] text-white' : 'text-[20px] text-white/30')}>
              {montant > 0 ? fmt(montant) : '— — —'}
            </div>
            {montant > 0 && (
              <div className="text-[10px] text-white/50">Le client saisira ce montant sur son téléphone</div>
            )}
          </div>

          {/* Onglets mode paiement */}
          <div className="flex border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setMode('afficher')}
              className={clsx(
                'flex-1 text-[11px] font-medium py-2.5 transition-colors',
                mode === 'afficher' ? 'text-tikexo-primary border-b-2 border-tikexo-primary' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              Afficher mon QR
            </button>
            <button
              onClick={() => setMode('scanner')}
              className={clsx(
                'flex-1 text-[11px] font-medium py-2.5 transition-colors',
                mode === 'scanner' ? 'text-tikexo-primary border-b-2 border-tikexo-primary' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              Scanner la carte client
            </button>
          </div>

          {mode === 'afficher' ? (
            /* QR marchand — le client scanne */
            <div className="flex flex-col items-center py-4 gap-2 border-b border-slate-100">
              {loadFiche ? (
                <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-lg" />
              ) : qrValue ? (
                <div
                  className="p-3 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-tikexo-accent transition-colors"
                  onClick={() => setFullscreen(true)}
                  title="Agrandir"
                >
                  <QRCodeSVG value={qrValue} size={120} fgColor="#1A3C5E" bgColor="#ffffff" />
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center">
                  <div className="text-[11px] text-slate-300">Chargement…</div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setFullscreen(true)}
                  disabled={!qrValue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tikexo-primary text-white text-[11px] hover:bg-tikexo-accent transition-colors disabled:opacity-40"
                >
                  <Maximize2 size={11} /> Agrandir
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-[11px] text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En attente
                </div>
              </div>
            </div>
          ) : (
            /* Scan de la carte du client */
            <div className="flex flex-col items-center py-4 gap-2 border-b border-slate-100 px-3">
              <div
                id="caisse-qr-reader"
                className={clsx('w-full rounded-lg overflow-hidden bg-black transition-all', cameraOpen ? 'min-h-[180px]' : 'h-0')}
              />

              {!cameraOpen && (
                <div className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5">
                  <CameraOff size={20} className="text-slate-300" />
                  <div className="text-[10px] text-slate-400 text-center px-3">
                    {montant === 0 ? 'Saisissez un montant avant de scanner' : 'Prêt à scanner'}
                  </div>
                </div>
              )}

              {camError && (
                <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 w-full">
                  <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-600">{camError}</p>
                </div>
              )}
              {scanErr && (
                <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-2.5 py-2 w-full">
                  <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-red-600">{scanErr}</p>
                </div>
              )}
              {payerCarteMut.isSuccess && !cameraOpen && (
                <div className="flex items-center gap-1.5 bg-[#EAF3DE] border border-[#B6D7A8] rounded-lg px-2.5 py-2 w-full">
                  <CheckCircle size={12} className="text-[#166534] flex-shrink-0" />
                  <p className="text-[10px] text-[#166534]">Paiement carte accepté</p>
                </div>
              )}

              <button
                onClick={() => { if (cameraOpen) { fermerCamera(); } else { setCamError(''); setScanErr(''); setCameraOpen(true); } }}
                disabled={montant === 0 || payerCarteMut.isPending}
                className={clsx(
                  'w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                  cameraOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-tikexo-primary text-white hover:bg-tikexo-accent'
                )}
              >
                {payerCarteMut.isPending
                  ? 'Traitement…'
                  : cameraOpen ? <><CameraOff size={12} /> Fermer</> : <><Camera size={12} /> Scanner la carte</>}
              </button>
            </div>
          )}

          {/* Clavier numérique */}
          <div className="p-3 flex-1 flex flex-col justify-center">
            <div className="grid grid-cols-3 gap-1.5">
              {KEYS.flat().map((k) => (
                <button
                  key={k}
                  onClick={() => pressKey(k)}
                  className={clsx(
                    'h-10 rounded-lg text-sm font-medium transition-colors flex items-center justify-center',
                    k === 'CLR'
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : k === 'DEL'
                      ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-800 hover:bg-slate-100 active:bg-slate-200'
                  )}
                >
                  {k === 'DEL' ? <Delete size={14} /> : k === 'CLR' ? 'C' : k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Feed transactions ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <Clock size={13} className="text-slate-400" />
            <span className="text-[11px] text-slate-500 tracking-[0.5px]">PAIEMENTS DU JOUR</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {validees.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-xl py-12 flex flex-col items-center gap-2">
                <ShoppingBag size={24} className="text-slate-200" />
                <div className="text-sm text-slate-400">Aucun paiement aujourd'hui</div>
                <div className="text-[11px] text-slate-300">Les paiements apparaîtront ici en temps réel</div>
              </div>
            ) : (
              validees.map((t, idx) => (
                <div
                  key={t.id}
                  className={clsx(
                    'flex items-center gap-3 bg-white border rounded-xl px-4 py-3',
                    idx === 0 && lastTxId === t.id
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-slate-100'
                  )}
                >
                  <div className="w-8 h-8 rounded-full bg-[#EAF3DE] flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={14} className="text-[#166534]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-900">
                      {t.beneficiaire.prenom} {t.beneficiaire.nom}
                    </div>
                    <div className="text-[10px] text-slate-400">{fmtHeure(t.createdAt)}</div>
                  </div>
                  <div className="text-[14px] font-semibold text-[#166534]">
                    +{fmt(parseFloat(t.montant_total))}
                  </div>
                </div>
              ))
            )}
          </div>

          {validees.length > 0 && (
            <div className="mt-3 flex items-center justify-between bg-tikexo-primary rounded-xl px-4 py-3 text-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} />
                <span className="text-[13px]">Total encaissé aujourd'hui</span>
              </div>
              <span className="text-[15px] font-semibold">{fmt(totalJour)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Mode plein écran ── */}
      {fullscreen && qrValue && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6">
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <X size={18} className="text-slate-600" />
          </button>

          <div className="text-[11px] text-slate-400 tracking-[2px] uppercase">Scanner pour payer</div>

          <div className="p-6 border-4 border-tikexo-primary rounded-3xl shadow-xl">
            <QRCodeSVG value={qrValue} size={260} fgColor="#1A3C5E" bgColor="#ffffff" />
          </div>

          <div className="text-center">
            <div className="text-[20px] font-semibold text-slate-900">{fiche?.nom}</div>
            {montant > 0 ? (
              <div className="mt-2 px-6 py-2 bg-tikexo-primary rounded-full">
                <span className="text-[24px] font-bold text-white">{fmt(montant)}</span>
              </div>
            ) : (
              <div className="text-[13px] text-slate-400 mt-1">Paiement TIKEXO accepté</div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] text-slate-500">En attente de paiement…</span>
          </div>
        </div>
      )}
    </div>
  );
}
