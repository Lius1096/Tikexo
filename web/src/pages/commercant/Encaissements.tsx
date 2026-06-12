import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../lib/api';

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  VALIDEE:    { label: 'Validée',    color: 'text-tikexo-success', icon: CheckCircle },
  EN_COURS:   { label: 'En cours',   color: 'text-tikexo-accent',  icon: Clock },
  ANNULEE:    { label: 'Annulée',    color: 'text-tikexo-danger',  icon: XCircle },
  REMBOURSEE: { label: 'Remboursée', color: 'text-slate-500',      icon: XCircle },
};

export default function CommercantEncaissements() {
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['commercant-transactions'],
    queryFn: () => api.get('/transactions?limit=100').then((r) => r.data.data),
  });

  const items: any[] = data?.items ?? [];

  const filtered = items.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.beneficiaire?.nom?.toLowerCase().includes(q) ||
      t.beneficiaire?.prenom?.toLowerCase().includes(q) ||
      t.statut?.toLowerCase().includes(q)
    );
  });

  const totalValide = items
    .filter((t) => t.statut === 'VALIDEE')
    .reduce((s, t) => s + parseFloat(t.montant_net ?? t.montant_total ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[15px] font-medium text-slate-900 mb-0.5">Encaissements</div>
          <div className="text-xs text-slate-500">Paiements reçus via TIKEXO</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Total validé</div>
          <div className="text-sm font-semibold text-tikexo-gold">{fmt(totalValide)}</div>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un client, statut…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-tikexo-accent"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded" />)}
          </div>
        ) : !filtered.length ? (
          <div className="py-12 text-center text-sm text-slate-400">Aucun encaissement trouvé</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((t: any) => {
              const cfg = STATUT_CONFIG[t.statut] ?? { label: t.statut, color: 'text-slate-500', icon: Clock };
              const Icon = cfg.icon;
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-slate-900 truncate">
                      {t.beneficiaire ? `${t.beneficiaire.prenom} ${t.beneficiaire.nom}` : 'Client'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-semibold text-tikexo-gold">
                      {fmt(parseFloat(t.montant_net ?? t.montant_total ?? 0))}
                    </div>
                    <div className={`text-[10px] ${cfg.color}`}>{cfg.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="text-[11px] text-slate-400 text-center">
          {filtered.length} encaissement{filtered.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
