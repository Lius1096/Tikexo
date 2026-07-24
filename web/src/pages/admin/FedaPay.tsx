import React from 'react';
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

export default function AdminFedaPay() {
  const { data, isLoading } = useQuery({
    queryKey: ['fedapay-operations'],
    queryFn: () => api.get('/fedapay/operations').then((r) => r.data.data),
  });

  const items: Array<{
    id: string; type: string; statut: string; montant: string;
    fedapay_transaction_id: string; createdAt: string;
    entreprise?: { nom: string } | null;
    commercant?: { nom: string } | null;
  }> = data?.items || data || [];

  return (
    <div className="p-[18px_20px]">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">FedaPay</div>
      <div className="text-xs text-slate-500 mb-4">Opérations de paiement via FedaPay</div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <div className="flex items-center gap-1.5 px-3.5 py-3 border-b border-slate-100">
          <Banknote size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-900">Opérations</span>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['TYPE', 'ENTREPRISE / COMMERÇANT', 'MONTANT', 'RÉFÉRENCE', 'STATUT', 'DATE'].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Banknote size={28} className="text-slate-300 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">Aucune opération FedaPay</div>
                </td>
              </tr>
            ) : (
              items.map((op) => (
                <tr key={op.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-700">{op.type}</td>
                  <td className="px-4 py-3 text-xs text-slate-900">{op.entreprise?.nom ?? op.commercant?.nom ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{Number(op.montant).toLocaleString('fr-FR')} XOF</td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-500">{op.fedapay_transaction_id ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium', statutBadge[op.statut] ?? 'bg-slate-100 text-slate-700')}>
                      {op.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{new Date(op.createdAt).toLocaleDateString('fr-FR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
