import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, RefreshCw, Download } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function CommercantQRCode() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: fiche, isLoading } = useQuery({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
    enabled: !!user,
  });

  const regen = useMutation({
    mutationFn: () => api.post(`/commercants/${fiche?.id}/qrcode`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commercant-moi'] }),
  });

  const handleDownload = () => {
    if (!fiche?.qr_code_url) return;
    const a = document.createElement('a');
    a.href = fiche.qr_code_url;
    a.download = `qr-tikexo-${fiche.nom?.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mon QR Code</div>
        <div className="text-xs text-slate-500">Présentez ce code à vos clients pour recevoir leurs paiements TIKEXO</div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center gap-6">
        {isLoading ? (
          <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-xl" />
        ) : fiche?.qr_code_url ? (
          <>
            <div className="p-3 bg-white border-2 border-slate-100 rounded-xl shadow-sm">
              <img
                src={fiche.qr_code_url}
                alt="QR Code TIKEXO"
                className="w-44 h-44 object-contain"
              />
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
            <div className="text-sm text-slate-500">Aucun QR code généré</div>
          </div>
        )}

        <div className="flex gap-3 w-full max-w-xs">
          <button
            onClick={() => regen.mutate()}
            disabled={regen.isPending || isLoading || !fiche}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={regen.isPending ? 'animate-spin' : ''} />
            {fiche?.qr_code_url ? 'Régénérer' : 'Générer'}
          </button>
          {fiche?.qr_code_url && (
            <button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-tikexo-gold text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Download size={14} />
              Télécharger
            </button>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
        <strong>Comment ça marche ?</strong> Le client scanne ce QR code depuis l'application mobile TIKEXO et confirme le montant à payer. Le paiement est instantané et sécurisé.
      </div>
    </div>
  );
}
