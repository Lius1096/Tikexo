import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { QrCode, Download, Loader2, Copy, Check, ExternalLink } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toaster';

export default function CommercantQRCode() {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const [pngUrl, setPngUrl] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);

  const { data: fiche, isLoading } = useQuery({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
    enabled: !!user,
  });

  const estActif = fiche?.statut === 'ACTIF';
  const vitrineUrl = fiche ? `${window.location.origin}/c/${fiche.id}` : null;

  // Génération PNG côté client — pas d'appel serveur nécessaire, le lien est déterministe.
  useEffect(() => {
    if (!vitrineUrl) return;
    QRCode.toDataURL(vitrineUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 640,
      color: { dark: '#1A3C5E', light: '#FFFFFF' },
    })
      .then(setPngUrl)
      .catch(() => toastError('Échec de la génération du QR code'));
  }, [vitrineUrl]);

  const handleDownload = () => {
    if (!pngUrl || !fiche) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `qr-vitrine-tikexo-${fiche.nom?.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  const handleCopier = async () => {
    if (!vitrineUrl) return;
    try {
      await navigator.clipboard.writeText(vitrineUrl);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      toastError('Impossible de copier le lien');
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mon QR Vitrine</div>
        <div className="text-xs text-slate-500">
          À afficher en vitrine ou à imprimer dans la rue : un passant qui scanne découvre votre établissement et son affiliation TIKEXO.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-6">
        {isLoading ? (
          <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-xl" />
        ) : pngUrl && estActif ? (
          <>
            <div className="p-3 bg-white border-2 border-slate-100 rounded-xl shadow-sm">
              <img src={pngUrl} alt="QR Code vitrine TIKEXO" className="w-44 h-44 object-contain" />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-slate-900">{fiche.nom}</div>
              <div className="text-xs text-slate-400 mt-0.5">{fiche.type} · {fiche.ville}</div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <QrCode size={28} className="text-slate-300" />
            </div>
            <div className="text-sm text-slate-500">
              {estActif ? 'Génération du QR code…' : 'Disponible une fois le compte actif'}
            </div>
          </div>
        )}

        {estActif && pngUrl && (
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={handleCopier}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {copie ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              {copie ? 'Copié' : 'Copier le lien'}
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-tikexo-gold text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={14} />
              Télécharger
            </button>
          </div>
        )}

        {estActif && vitrineUrl && (
          <a
            href={vitrineUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-[11px] text-tikexo-accent hover:underline"
          >
            <ExternalLink size={11} /> Voir ce que verront vos clients
          </a>
        )}
      </div>

      {!estActif && fiche && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
          Le QR code ne sera disponible qu'une fois votre compte actif.
        </div>
      )}

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
        <strong>À quoi sert ce QR code ?</strong> Contrairement au QR de la Caisse (qui sert à encaisser un paiement), celui-ci ouvre une page publique présentant votre établissement — idéal pour une affiche, un flyer ou une vitrine. Pour encaisser, utilisez la page <strong>Caisse</strong>.
      </div>
    </div>
  );
}
