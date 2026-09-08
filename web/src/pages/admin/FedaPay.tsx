import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Banknote } from 'lucide-react';
import api from '../../lib/api';

const statutBadge: Record<string, string> = {
  EN_ATTENTE: 'bg-[#FAEEDA] text-[#854F0B]',
  VALIDE: 'bg-[#EAF3DE] text-[#3B6D11]',
  ECHOUE: 'bg-[#FCEBEB] text-[#A32D2D]',
  REMBOURSE: 'bg-[#DBEAFE] text-[#185FA5]',
};

const LIMIT = 10;

export default function AdminFedaPay() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['fedapay-operations', page],
    queryFn: () => api.get('/fedapay/operations', { params: { page, limit: LIMIT } }).then((r) => r.data.data),
  });

  const items: Array<{
    id: string; type: string; statut: string; montant: string;
    fedapay_transaction_id: string; createdAt: string;
    entreprise?: { nom: string } | null;
    commercant?: { nom: string } | null;
  }> = data?.items || [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="p-[18px_20px]">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">FedaPay</div>
      <div className="text-xs text-slate-500 mb-4">Opérations de paiement via FedaPay · {total} au total</div>

      {isLoading ? (
        <div className="bg-white border border-slate-100 rounded-lg px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-lg px-4 py-12 text-center">
          <Banknote size={28} className="text-slate-300 mx-auto mb-2" />
          <div className="text-sm text-slate-400">Aucune opération FedaPay</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {items.map((op) => (
              <div key={op.id} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col gap-2 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{op.type}</span>
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium flex-shrink-0', statutBadge[op.statut] ?? 'bg-slate-100 text-slate-700')}>
                    {op.statut}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 truncate">{op.entreprise?.nom ?? op.commercant?.nom ?? '—'}</div>
                <div className="font-mono text-sm text-slate-900">{Number(op.montant).toLocaleString('fr-FR')} XOF</div>
                <div className="font-mono text-[10px] text-slate-400 truncate">{op.fedapay_transaction_id ?? '—'}</div>
                <div className="text-[10px] text-slate-400">{new Date(op.createdAt).toLocaleDateString('fr-FR')}</div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
              <span className="text-[11px] text-slate-400">Page {page} sur {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
