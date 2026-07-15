import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, QrCode, Shield, Lock, Wifi, ChevronRight, X, AlertTriangle, RefreshCw, MapPin, Send, Copy, Check } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../lib/api';
import CarteVisuelle, { CarteVirtuelle, CarteVersо } from '../../components/CarteVisuelle';
import { useToast } from '../../components/Toaster';

// ─── Countdown circulaire QR ──────────────────────────────────────────────────
function CountdownCircle({ seconds, total }: { seconds: number; total: number }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const progress = circ * (1 - seconds / total);
  const color = seconds <= 10 ? '#EF4444' : '#0EA5E9';

  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="56" height="56">
        <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
        <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circ} strokeDashoffset={progress}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }} />
      </svg>
      <span className="text-white text-xs font-mono font-semibold">{seconds}s</span>
    </div>
  );
}

// ─── Modal QR plein écran ──────────────────────────────────────────────────────
function ModalQR({ carteId, onClose }: { carteId: string; onClose: () => void }) {
  const [secondes, setSecondes] = useState(60);

  const { data, refetch } = useQuery({
    queryKey : ['carte-qr', carteId],
    queryFn  : () => api.get(`/cartes/${carteId}/qrcode`).then((r) => r.data.data),
    refetchInterval: false,
  });

  useEffect(() => {
    if (!data) return;
    setSecondes(Math.max(0, data.secondes_restantes ?? 60));
  }, [data]);

  useEffect(() => {
    const t = setInterval(() => {
      setSecondes((s) => {
        if (s <= 1) { refetch(); return 60; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div className="fixed inset-0 z-50 bg-[#1A3B8C] flex flex-col items-center justify-center p-8">
      <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white">
        <X size={16} />
      </button>

      <div className="text-white/60 text-xs tracking-widest mb-6">QR CODE DE PAIEMENT</div>

      {/* Zone QR */}
      <div className="w-56 h-56 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6">
        <div className="text-[#1A3B8C] text-xs text-center px-4">
          <QrCode size={80} className="mx-auto mb-2 text-[#1A3B8C]/30" />
          <p className="text-[10px] text-slate-400">QR dynamique</p>
          <p className="text-[9px] text-slate-300">(Cloudinary en prod)</p>
        </div>
      </div>

      <CountdownCircle seconds={secondes} total={60} />

      <p className="text-white/40 text-[11px] mt-4 text-center">
        Code valide {secondes}s · Se régénère automatiquement
      </p>
      <p className="text-white/25 text-[10px] mt-1">Présentez ce code au commerçant TIKEXO</p>
    </div>
  );
}

// ─── Timer CVV ────────────────────────────────────────────────────────────────
function TimerBar({ secondes }: { secondes: number }) {
  return (
    <div className="h-0.5 bg-white/10 rounded-full overflow-hidden mt-2">
      <div
        className="h-full bg-[#0EA5E9] rounded-full"
        style={{ width: `${(secondes / 30) * 100}%`, transition: 'width 1s linear' }}
      />
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function BeneficiaireCarte() {
  const qc = useQueryClient();
  const { error: toastError, success: toastSuccess } = useToast();
  const [showQRModal, setShowQRModal]   = useState(false);
  const [copie, setCopie]               = useState(false);
  const [showCVV, setShowCVV]           = useState(false);
  const [cvvData, setCvvData]           = useState<{ cvv: string; expire: number } | null>(null);
  const [cvvSecondes, setCvvSecondes]   = useState(0);
  const [showVersо, setShowVersо]       = useState(false);
  const [confirmBloquer, setConfirmBloquer]     = useState(false);
  const [showDemandePhysique, setShowDemandePhysique] = useState(false);
  const [adresseLivraison, setAdresseLivraison]       = useState('');

  const { data: carte, isLoading } = useQuery({
    queryKey: ['ma-carte'],
    queryFn : () => api.get('/cartes/moi').then((r) => r.data.data),
  });

  const creerMut = useMutation({
    mutationFn: () => api.post('/cartes/virtuelle'),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['ma-carte'] }); toastSuccess('Carte virtuelle activée'); },
    onError   : (e: any) => toastError(e?.response?.data?.message ?? 'Erreur création carte'),
  });

  const bloquerMut = useMutation({
    mutationFn: () => api.post(`/cartes/${carte?.id}/bloquer-moi`),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['ma-carte'] }); setConfirmBloquer(false); toastSuccess('Carte bloquée'); },
    onError   : (e: any) => toastError(e?.response?.data?.message ?? 'Erreur blocage carte'),
  });

  const demanderPhysiqueMut = useMutation({
    mutationFn: () => api.post('/cartes/physique/demande', { adresse_livraison: adresseLivraison }),
    onSuccess : () => { qc.invalidateQueries({ queryKey: ['ma-carte'] }); setShowDemandePhysique(false); setAdresseLivraison(''); toastSuccess('Demande envoyée'); },
    onError   : (e: any) => toastError(e?.response?.data?.message ?? 'Erreur lors de la demande'),
  });

  const getCVV = useCallback(async () => {
    if (!carte?.id) return;
    try {
      const r = await api.post(`/cartes/${carte.id}/cvv`);
      const { cvv } = r.data.data;
      setCvvData({ cvv, expire: Date.now() + 30_000 });
      setCvvSecondes(30);
      setShowCVV(true);
    } catch (e: any) {
      toastError(e?.response?.data?.message ?? 'Erreur CVV');
    }
  }, [carte?.id]);

  useEffect(() => {
    if (!showCVV || cvvSecondes <= 0) return;
    const t = setInterval(() => setCvvSecondes((s) => {
      if (s <= 1) { setShowCVV(false); setCvvData(null); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [showCVV, cvvSecondes]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-[214px] w-[340px] mx-auto bg-slate-200 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!carte) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-16 h-16 rounded-2xl bg-[#DBEAFE] flex items-center justify-center">
          <Shield size={28} className="text-[#185FA5]" />
        </div>
        <div className="text-center">
          <div className="text-[15px] font-semibold text-slate-900 mb-1">Votre carte TIKEXO</div>
          <div className="text-xs text-slate-400 max-w-xs">
            Activez votre carte virtuelle pour payer dans les restaurants partenaires.
          </div>
        </div>
        <button
          onClick={() => creerMut.mutate()}
          disabled={creerMut.isPending}
          className="bg-[#1A3B8C] text-white text-sm font-medium px-8 py-3 rounded-xl disabled:opacity-50 hover:bg-[#15306e] transition-colors"
        >
          {creerMut.isPending ? 'Création…' : 'Activer ma carte virtuelle'}
        </button>
      </div>
    );
  }

  return (
    <>
      {showQRModal && <ModalQR carteId={carte.id} onClose={() => setShowQRModal(false)} />}

      <div className="p-6 space-y-6 max-w-md mx-auto">

        {/* ── Carte visuelle ── */}
        <div className="flex justify-center">
          <div style={{ width: 340, height: 214 }}>
            {showVersо
              ? <CarteVersо cvv={showCVV ? cvvData?.cvv : undefined} />
              : <CarteVirtuelle
                  carte={carte}
                  showQR={false}
                  cvv={showCVV ? cvvData?.cvv : undefined}
                />
            }
          </div>
        </div>

        {/* CVV timer bar */}
        {showCVV && (
          <div className="bg-[#1A3B8C]/5 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">CVV visible pendant</span>
              <span className="font-mono font-semibold text-[#1A3B8C]">{cvvSecondes}s</span>
            </div>
            <TimerBar secondes={cvvSecondes} />
          </div>
        )}

        {/* ── Actions principales ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowQRModal(true)}
            disabled={carte.statut !== 'ACTIVE'}
            className="flex flex-col items-center gap-2 bg-[#1A3B8C] text-white rounded-xl py-4 disabled:opacity-40 hover:bg-[#15306e] transition-colors"
          >
            <QrCode size={22} />
            <span className="text-[11px] font-medium">Payer QR</span>
          </button>

          <button
            onClick={showCVV ? () => { setShowCVV(false); setCvvData(null); } : getCVV}
            disabled={carte.statut !== 'ACTIVE'}
            className={clsx(
              'flex flex-col items-center gap-2 rounded-xl py-4 transition-colors disabled:opacity-40',
              showCVV
                ? 'bg-[#0EA5E9] text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            {showCVV ? <EyeOff size={22} /> : <Eye size={22} />}
            <span className="text-[11px] font-medium">{showCVV ? 'Masquer' : 'Voir CVV'}</span>
          </button>

          <button
            onClick={() => setShowVersо((v) => !v)}
            className="flex flex-col items-center gap-2 bg-white border border-slate-200 text-slate-700 rounded-xl py-4 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={22} />
            <span className="text-[11px] font-medium">{showVersо ? 'Recto' : 'Verso'}</span>
          </button>
        </div>

        {/* ── Infos carte ── */}
        <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-50">

          {/* Numéro — ligne dédiée avec copie */}
          <div className="flex justify-between items-center px-4 py-3">
            <span className="text-xs text-slate-400">Numéro</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium font-mono text-slate-800 tracking-widest">
                {carte.numero_masque}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(carte.numero_masque.replace(/\s/g, ''));
                  setCopie(true);
                  toastSuccess('Numéro copié');
                  setTimeout(() => setCopie(false), 2000);
                }}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                title="Copier le numéro"
              >
                {copie ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Autres infos */}
          {[
            { label: 'Type',       value: carte.type === 'VIRTUELLE' ? 'Carte virtuelle' : 'Carte physique' },
            {
              label: 'Statut',
              value: carte.statut,
              cls  : carte.statut === 'ACTIVE' ? 'text-[#3B6D11]' : carte.statut === 'BLOQUEE' ? 'text-[#A32D2D]' : 'text-slate-500',
            },
            {
              label: 'Expiration',
              value: new Date(carte.date_expiration).toLocaleDateString('fr-FR', { month: '2-digit', year: 'numeric' }),
            },
          ].map(({ label, value, cls }) => (
            <div key={label} className="flex justify-between items-center px-4 py-3">
              <span className="text-xs text-slate-400">{label}</span>
              <span className={clsx('text-xs font-medium', cls ?? 'text-slate-800 font-mono')}>{value}</span>
            </div>
          ))}
        </div>

        {/* ── Carte physique ── */}
        {carte.type === 'VIRTUELLE' && carte.statut === 'ACTIVE' && !showDemandePhysique && (
          <button
            onClick={() => setShowDemandePhysique(true)}
            className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] flex items-center justify-center">
                <Wifi size={16} className="text-[#185FA5]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-medium text-slate-900">Demander une carte physique</div>
                <div className="text-[10px] text-slate-400">NFC · EMV · ISO 7810</div>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-300" />
          </button>
        )}

        {/* Formulaire demande physique */}
        {showDemandePhysique && (
          <div className="bg-[#F0F6FF] border border-[#BFDBFE] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[#185FA5]" />
              <span className="text-xs font-semibold text-[#185FA5]">Adresse de livraison</span>
            </div>
            <p className="text-[11px] text-[#185FA5]/70">
              TIKEXO Ops produira votre carte et vous l'enverra à cette adresse. Un code d'activation vous sera communiqué à réception.
            </p>
            <textarea
              value={adresseLivraison}
              onChange={(e) => setAdresseLivraison(e.target.value)}
              placeholder="Ex: Quartier Fidjrossè, Rue des Cocotiers, Cotonou, Bénin"
              rows={3}
              className="w-full text-xs border border-[#BFDBFE] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1A3B8C] resize-none bg-white"
            />
            <div className="flex gap-2">
              <button
                onClick={() => demanderPhysiqueMut.mutate()}
                disabled={!adresseLivraison.trim() || demanderPhysiqueMut.isPending}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1A3B8C] text-white text-xs font-medium py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#15306e] transition-colors"
              >
                <Send size={13} />
                {demanderPhysiqueMut.isPending ? 'Envoi…' : 'Soumettre la demande'}
              </button>
              <button
                onClick={() => { setShowDemandePhysique(false); setAdresseLivraison(''); }}
                className="px-3 text-xs text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* ── Blocage ── */}
        {carte.statut === 'ACTIVE' && !confirmBloquer && (
          <button
            onClick={() => setConfirmBloquer(true)}
            className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 text-xs font-medium py-2.5 rounded-xl hover:bg-red-50 transition-colors"
          >
            <Lock size={13} />
            Bloquer la carte
          </button>
        )}

        {confirmBloquer && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">
                Bloquer la carte empêche tout paiement immédiatement. Vous pourrez la débloquer depuis votre employeur.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => bloquerMut.mutate()}
                disabled={bloquerMut.isPending}
                className="flex-1 bg-red-600 text-white text-xs font-medium py-2 rounded-lg disabled:opacity-50"
              >
                {bloquerMut.isPending ? 'Blocage…' : 'Confirmer le blocage'}
              </button>
              <button onClick={() => setConfirmBloquer(false)} className="flex-1 text-slate-500 text-xs py-2 rounded-lg border border-slate-200">
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
