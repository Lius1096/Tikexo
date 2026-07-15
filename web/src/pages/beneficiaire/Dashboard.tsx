import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, TrendingUp, Clock, ArrowDownLeft } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmt } from '../../utils/format';

export default function BeneficiaireDashboard() {
  const { user } = useAuth();

  const { data: solde, isLoading: loadSolde } = useQuery({
    queryKey: ['beneficiaire-solde'],
    queryFn: () => api.get('/wallet/solde').then((r) => r.data.data),
  });

  const { data: historique, isLoading: loadHisto } = useQuery({
    queryKey: ['beneficiaire-historique', { limit: 5 }],
    queryFn: () => api.get('/wallet/historique?limit=5').then((r) => r.data.data),
    staleTime: 0,
  });

  const soldeVal = parseFloat(solde?.solde ?? 0);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <div className="text-[15px] font-medium text-slate-900">
          Bonjour, {user?.prenom} 👋
        </div>
        <div className="text-xs text-slate-500">Votre espace repas TIKEXO</div>
      </div>

      {/* Carte solde */}
      <div className="bg-tikexo-primary rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
        <div className="flex items-start justify-between relative">
          <div>
            <div className="text-xs text-white/50 mb-1">Solde disponible</div>
            {loadSolde ? (
              <div className="h-8 w-32 bg-white/10 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-semibold tracking-tight">{fmt(soldeVal)}</div>
            )}
            <div className="text-[10px] text-white/40 mt-1 tracking-widest">
              {solde?.currency ?? 'XOF'}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
            <Wallet size={22} className="text-white/80" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-white/50">Wallet {solde?.statut ?? '—'}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-tikexo-success" />
            <span className="text-[11px] text-slate-500">Reçu ce mois</span>
          </div>
          {loadSolde ? (
            <div className="h-5 w-20 bg-slate-100 animate-pulse rounded" />
          ) : (
            <div className="text-sm font-semibold text-tikexo-success">{fmt(solde?.recu_ce_mois ?? 0)}</div>
          )}
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft size={14} className="text-tikexo-accent" />
            <span className="text-[11px] text-slate-500">Dépensé ce mois</span>
          </div>
          {loadSolde ? (
            <div className="h-5 w-20 bg-slate-100 animate-pulse rounded" />
          ) : (
            <div className="text-sm font-semibold text-tikexo-danger">{fmt(solde?.depense_ce_mois ?? 0)}</div>
          )}
        </div>
      </div>

      {/* Dernières transactions */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Clock size={14} className="text-slate-400" />
          <span className="text-[13px] font-medium text-slate-900">Dernières transactions</span>
        </div>
        {loadHisto ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />
            ))}
          </div>
        ) : !historique?.entries?.length ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Aucune transaction</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {historique.entries.map((e: any) => {
              const isCredit = e.wallet_destination_id === solde?.id;
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-xs font-medium text-slate-800">{e.type.replace(/_/g, ' ')}</div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(e.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <div className={isCredit ? 'text-tikexo-success text-sm font-semibold' : 'text-tikexo-danger text-sm font-semibold'}>
                    {isCredit ? '+' : '-'}{fmt(parseFloat(e.montant))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
