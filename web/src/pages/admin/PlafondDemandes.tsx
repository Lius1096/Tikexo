import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { TrendingUp, Clock, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import api from '../../lib/api';
import { fmtDate } from '../../utils/format';

interface DemandePlafond {
  id: string;
  type: 'SOLDE_WALLET' | 'RECHARGE_MENSUEL';
  montant_actuel: string | null;
  montant_demande: string;
  justification: string | null;
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REJETEE';
  note_admin: string | null;
  createdAt: string;
  entreprise: { id: string; nom: string };
}

const TYPE_LABEL: Record<string, string> = {
  SOLDE_WALLET: 'Plafond de solde wallet',
  RECHARGE_MENSUEL: 'Plafond de recharge mensuel',
};

const STATUT_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700', icon: <Clock size={11} /> },
  APPROUVEE:  { label: 'Approuvée',  cls: 'bg-green-50 text-green-700', icon: <CheckCircle2 size={11} /> },
  REJETEE:    { label: 'Rejetée',    cls: 'bg-red-50 text-red-500',     icon: <XCircle size={11} /> },
};

const FILTRES = [
  { key: 'EN_ATTENTE', label: 'En attente' },
  { key: 'APPROUVEE',  label: 'Approuvées' },
  { key: 'REJETEE',    label: 'Rejetées' },
  { key: '',           label: 'Toutes' },
] as const;

function fmtXof(v: string | null): string {
  if (!v) return '—';
  return `${Math.floor(parseFloat(v)).toLocaleString('fr-FR')} XOF`;
}

export default function AdminPlafondDemandes() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<typeof FILTRES[number]['key']>('EN_ATTENTE');
  const [noteParDemande, setNoteParDemande] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-demandes-plafond', filtre],
    queryFn: () => api.get('/admin/demandes-plafond', { params: filtre ? { statut: filtre } : {} }).then((r) => r.data.data as DemandePlafond[]),
  });

  const traiterMut = useMutation({
    mutationFn: ({ id, approuver }: { id: string; approuver: boolean }) =>
      api.post(`/admin/demandes-plafond/${id}/traiter`, { approuver, note: noteParDemande[id] ?? '' }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-demandes-plafond'] }),
  });

  const demandes = data ?? [];

  return (
    <div className="p-6">
      <div className="text-[15px] font-medium text-slate-900 mb-1">Demandes de plafond</div>
      <div className="text-xs text-slate-500 mb-4">Révisions de plafond wallet demandées par les entreprises</div>

      <div className="flex items-center gap-1 mb-4">
        {FILTRES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltre(key)}
            className={clsx(
              'text-[11px] px-3 py-1.5 rounded-lg border transition-colors',
              filtre === key
                ? 'bg-tikexo-primary text-white border-tikexo-primary'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-lg">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : demandes.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <TrendingUp size={20} className="text-slate-300" />
            Aucune demande {filtre ? STATUT_CFG[filtre]?.label.toLowerCase() : ''}
          </div>
        ) : (
          demandes.map((d) => {
            const cfg = STATUT_CFG[d.statut];
            const enAttente = d.statut === 'EN_ATTENTE';
            return (
              <div key={d.id} className="px-4 py-3.5 border-b border-slate-50 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-900 font-medium">
                      <Building2 size={12} className="text-slate-400" />
                      {d.entreprise.nom}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{TYPE_LABEL[d.type]}</div>
                    <div className="text-xs text-slate-900 mt-1">
                      {fmtXof(d.montant_actuel)} <span className="text-slate-400">→</span> <span className="font-medium">{fmtXof(d.montant_demande)}</span>
                    </div>
                    {d.justification && (
                      <div className="text-[11px] text-slate-500 mt-1 italic">« {d.justification} »</div>
                    )}
                    {d.note_admin && (
                      <div className="text-[11px] text-slate-500 mt-1">Note admin : {d.note_admin}</div>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">{fmtDate(d.createdAt)}</div>
                  </div>
                  <span className={clsx('flex items-center gap-1 text-[10px] px-2 py-1 rounded-full flex-shrink-0', cfg.cls)}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                {enAttente && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Note (optionnel)"
                      value={noteParDemande[d.id] ?? ''}
                      onChange={(e) => setNoteParDemande((n) => ({ ...n, [d.id]: e.target.value }))}
                      className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-tikexo-primary"
                    />
                    <button
                      onClick={() => traiterMut.mutate({ id: d.id, approuver: true })}
                      disabled={traiterMut.isPending}
                      className="text-[11px] bg-green-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      Approuver
                    </button>
                    <button
                      onClick={() => traiterMut.mutate({ id: d.id, approuver: false })}
                      disabled={traiterMut.isPending}
                      className="text-[11px] text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
