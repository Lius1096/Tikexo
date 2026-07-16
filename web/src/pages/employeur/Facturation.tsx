import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Receipt, TrendingDown } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR').format(n) + ' XOF';
}

export default function EmployeurFacturation() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;

  const { data, isLoading } = useQuery({
    queryKey: ['facturation', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/facturation`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const items: any[] = data?.items ?? [];
  const totalAnnee = items
    .filter((i) => new Date(i.createdAt).getFullYear() === new Date().getFullYear())
    .reduce((s: number, i: any) => s + parseFloat(i.montant), 0);

  return (
    <div className="p-6">
      <div className="text-[15px] font-medium text-slate-900 mb-0.5">Facturation</div>
      <div className="text-xs text-slate-500 mb-4">Historique des frais de gestion TIKEXO prélevés mensuellement</div>

      {/* Carte récap année */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <TrendingDown size={14} className="text-red-400" />
            <span className="text-[11px] text-slate-500">Frais {new Date().getFullYear()}</span>
          </div>
          <div className="text-sm font-semibold text-slate-900">{fmt(totalAnnee)}</div>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Receipt size={14} className="text-slate-400" />
            <span className="text-[11px] text-slate-500">Nombre de factures</span>
          </div>
          <div className="text-sm font-semibold text-slate-900">{items.length}</div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg">
        <div className="flex items-center gap-1.5 px-4 py-3.5 border-b border-slate-100">
          <FileSpreadsheet size={14} className="text-slate-400" />
          <span className="text-[13px] font-medium text-slate-900">Historique des prélèvements</span>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}
          </div>
        ) : !items.length ? (
          <div className="py-16 text-center">
            <FileSpreadsheet size={28} className="text-slate-200 mx-auto mb-2" />
            <div className="text-sm text-slate-500">Aucun frais prélevé pour le moment</div>
            <div className="text-xs text-slate-400 mt-1">Les frais mensuels apparaîtront ici dès le 1er du mois</div>
          </div>
        ) : (
          <>
            <div className="hidden sm:grid grid-cols-4 gap-4 px-4 py-2 border-b border-slate-50 bg-slate-50/50">
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Période</div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Date de prélèvement</div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Montant</div>
              <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Statut</div>
            </div>
            <div className="divide-y divide-slate-50">
              {items.map((item: any) => {
                const d = new Date(item.createdAt);
                const periode = item.metadata?.mois ?? d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                return (
                  <div key={item.id} className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-3 items-center">
                    <div className="text-xs font-medium text-slate-800 capitalize">{periode}</div>
                    <div className="text-xs text-slate-500">
                      {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-xs font-semibold text-red-600">−{fmt(parseFloat(item.montant))}</div>
                    <div>
                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-100 px-2 py-0.5 rounded-full">Prélevé</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
