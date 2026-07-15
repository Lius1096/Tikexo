import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { clsx } from 'clsx';
import api from '../../lib/api';
import { fmt } from '../../utils/format';

const TYPE_LABELS: Record<string, string> = {
  DOTATION: 'Dotation employeur',
  PAIEMENT: 'Paiement commerçant',
  COMPLEMENT: 'Complément',
  REMBOURSEMENT: 'Remboursement',
  RECHARGE: 'Recharge',
};

function libelleEntree(e: any): string {
  if (e.type === 'PAIEMENT' && e.commercant_nom) return `Paiement — ${e.commercant_nom}`;
  return TYPE_LABELS[e.type] ?? e.type.replace(/_/g, ' ');
}

export default function BeneficiaireTransactions() {
  const [search, setSearch] = useState('');

  const { data: histoData, isLoading: loadHisto } = useQuery({
    queryKey: ['beneficiaire-historique'],
    queryFn: () => api.get('/wallet/historique?limit=100').then((r) => r.data.data),
  });

  const entries: any[] = histoData?.entries ?? [];
  const walletId: string | undefined = histoData?.walletId;

  const filtered = entries.filter((e) =>
    !search || (TYPE_LABELS[e.type] ?? e.type).toLowerCase().includes(search.toLowerCase())
  );

  const totalCredits  = entries.filter((e) => e.wallet_destination_id === walletId).reduce((s, e) => s + parseFloat(e.montant), 0);
  const totalDebits   = entries.filter((e) => e.wallet_destination_id !== walletId).reduce((s, e) => s + parseFloat(e.montant), 0);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mes transactions</div>
        <div className="text-xs text-slate-500">Historique de votre wallet TIKEXO</div>
      </div>

      {/* Résumé crédits/débits */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft size={14} className="text-tikexo-success" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Total reçu</div>
              <div className="text-xs font-semibold text-tikexo-success">{fmt(totalCredits)}</div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <ArrowUpRight size={14} className="text-tikexo-danger" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Total dépensé</div>
              <div className="text-xs font-semibold text-tikexo-danger">{fmt(totalDebits)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filtrer par type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-tikexo-accent"
        />
      </div>

      {/* Liste */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loadHisto ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="py-12 text-center text-sm text-slate-400">Aucune transaction trouvée</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((e: any) => {
              const isCredit = e.wallet_destination_id === walletId;
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className={clsx('w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0', isCredit ? 'bg-emerald-50' : 'bg-red-50')}>
                    {isCredit
                      ? <ArrowDownLeft size={16} className="text-tikexo-success" />
                      : <ArrowUpRight size={16} className="text-tikexo-danger" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-900 truncate">
                      {libelleEntree(e)}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(e.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className={clsx('text-sm font-semibold flex-shrink-0', isCredit ? 'text-tikexo-success' : 'text-tikexo-danger')}>
                    {isCredit ? '+' : '-'}{fmt(parseFloat(e.montant))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loadHisto && (
        <div className="text-[11px] text-slate-400 text-center">
          {filtered.length} transaction{filtered.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

