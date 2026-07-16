import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, TrendingUp, ShoppingBag, Clock, ArrowUpRight, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { fmt } from '../../utils/format';

const SEUIL_PAYOUT = 1000;

export default function CommercantDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);

  const payoutMutation = useMutation({
    mutationFn: () => api.post('/commercants/moi/payout').then((r) => r.data),
    onSuccess: () => {
      setPayoutMsg('Reversement initié — vous recevrez les fonds sur votre Mobile Money.');
      queryClient.invalidateQueries({ queryKey: ['commercant-moi'] });
    },
    onError: (err: any) => {
      setPayoutMsg(err?.response?.data?.message ?? 'Erreur lors de la demande de reversement.');
    },
  });

  const { data: fiche, isLoading: loadFiche } = useQuery({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
    enabled: !!user,
  });

  const { data: txData, isLoading: loadTx } = useQuery({
    queryKey: ['commercant-transactions-recent'],
    queryFn: () => api.get('/transactions?limit=5').then((r) => r.data.data),
    enabled: !!user,
  });

  const solde = parseFloat(fiche?.wallet?.solde ?? 0);
  const transactions: any[] = txData?.items ?? [];

  const volumeJour = transactions
    .filter((t) => {
      const d = new Date(t.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString() && t.statut === 'VALIDEE';
    })
    .reduce((s, t) => s + parseFloat(t.montant_net ?? t.montant_total ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="text-[15px] font-medium text-slate-900">
          {loadFiche ? '…' : fiche?.nom ?? user?.prenom}
        </div>
        <div className="text-xs text-slate-500">Espace commerçant TIKEXO</div>
      </div>

      {/* Carte solde */}
      <div className="bg-tikexo-primary rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
        <div className="flex items-start justify-between relative">
          <div>
            <div className="text-xs text-white/50 mb-1">Solde à reverser</div>
            {loadFiche ? (
              <div className="h-8 w-32 bg-white/10 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-semibold tracking-tight">{fmt(solde)}</div>
            )}
            <div className="text-[10px] text-white/40 mt-1 tracking-widest">XOF</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-tikexo-gold/30 flex items-center justify-center">
            <Wallet size={22} className="text-tikexo-gold" />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-tikexo-gold" />
            <span className="text-[11px] text-white/50">
              Mode : {fiche?.mode_reversement?.replace(/_/g, ' ') ?? '—'}
            </span>
          </div>
          <button
            onClick={() => { setPayoutMsg(null); payoutMutation.mutate(); }}
            disabled={payoutMutation.isPending || solde < SEUIL_PAYOUT}
            className="flex items-center gap-1.5 bg-tikexo-gold/90 hover:bg-tikexo-gold disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            {payoutMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpRight size={12} />}
            Demander reversement
          </button>
        </div>
        {payoutMsg && (
          <div className="mt-3 text-[11px] text-white/70 bg-white/10 rounded-lg px-3 py-2">{payoutMsg}</div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-tikexo-gold" />
            <span className="text-[11px] text-slate-500">Volume aujourd'hui</span>
          </div>
          <div className="text-sm font-semibold text-slate-900">{fmt(volumeJour)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={14} className="text-tikexo-accent" />
            <span className="text-[11px] text-slate-500">Transactions</span>
          </div>
          <div className="text-sm font-semibold text-slate-900">{transactions.length}</div>
        </div>
      </div>

      {/* Infos boutique */}
      {!loadFiche && fiche && (
        <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex flex-wrap gap-4">
          <div>
            <div className="text-[10px] text-slate-400">Type</div>
            <div className="text-xs font-medium text-slate-800">{fiche.type}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Niveau</div>
            <div className="text-xs font-medium text-slate-800">{fiche.niveau}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Commission</div>
            <div className="text-xs font-medium text-slate-800">{fiche.taux_commission}%</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Ville</div>
            <div className="text-xs font-medium text-slate-800">{fiche.ville}</div>
          </div>
        </div>
      )}

      {/* Derniers encaissements */}
      <div className="bg-white rounded-xl border border-slate-100">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
          <Clock size={14} className="text-slate-400" />
          <span className="text-[13px] font-medium text-slate-900">Derniers encaissements</span>
        </div>
        {loadTx ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-100 animate-pulse rounded" />)}
          </div>
        ) : !transactions.length ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Aucun encaissement</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {transactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-xs font-medium text-slate-800">
                    {t.beneficiaire ? `${t.beneficiaire.prenom} ${t.beneficiaire.nom}` : 'Client'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {new Date(t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <div className="text-sm font-semibold text-tikexo-gold">
                  +{fmt(parseFloat(t.montant_net ?? t.montant_total ?? 0))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
