import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Banknote, Clock, CheckCircle2, XCircle, Store, Paperclip } from 'lucide-react';
import api from '../../lib/api';
import { fmtDate } from '../../utils/format';

interface TicketRetrait {
  id: string;
  montant: string;
  statut: 'EN_ATTENTE' | 'TRAITE' | 'REJETE';
  motif_rejet: string | null;
  preuve_url: string | null;
  createdAt: string;
  commercant: { id: string; nom: string; mobile_money_numero: string; mobile_money_operateur: string };
}

const STATUT_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700', icon: <Clock size={11} /> },
  TRAITE:     { label: 'Traité',     cls: 'bg-green-50 text-green-700', icon: <CheckCircle2 size={11} /> },
  REJETE:     { label: 'Rejeté',     cls: 'bg-red-50 text-red-500',     icon: <XCircle size={11} /> },
};

const FILTRES = [
  { key: 'EN_ATTENTE', label: 'En attente' },
  { key: 'TRAITE',     label: 'Traités' },
  { key: 'REJETE',     label: 'Rejetés' },
  { key: '',           label: 'Tous' },
] as const;

function fmtXof(v: string): string {
  return `${Math.floor(parseFloat(v)).toLocaleString('fr-FR')} XOF`;
}

export default function AdminTicketsRetrait() {
  const queryClient = useQueryClient();
  const [filtre, setFiltre] = useState<typeof FILTRES[number]['key']>('EN_ATTENTE');
  const [motifParTicket, setMotifParTicket] = useState<Record<string, string>>({});
  const [preuveParTicket, setPreuveParTicket] = useState<Record<string, File | undefined>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tickets-retrait', filtre],
    queryFn: () => api.get('/commercants/tickets-retrait', { params: filtre ? { statut: filtre } : {} }).then((r) => r.data.data as TicketRetrait[]),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-tickets-retrait'] });

  const validerMut = useMutation({
    mutationFn: ({ id }: { id: string }) => {
      const fichier = preuveParTicket[id];
      const form = new FormData();
      if (fichier) form.append('preuve', fichier);
      return api.patch(`/commercants/tickets-retrait/${id}/valider`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: invalidate,
  });

  const rejeterMut = useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.patch(`/commercants/tickets-retrait/${id}/rejeter`, { motif: motifParTicket[id] ?? '' }),
    onSuccess: invalidate,
  });

  async function voirPreuve(ticketId: string) {
    const fenetre = window.open('', '_blank');
    try {
      const { data } = await api.get(`/commercants/tickets-retrait/${ticketId}/preuve-url`);
      if (fenetre) fenetre.location.href = data.data.url;
    } catch {
      fenetre?.close();
      window.alert("Impossible d'ouvrir la preuve");
    }
  }

  const tickets = data ?? [];

  return (
    <div className="p-6">
      <div className="text-[15px] font-medium text-slate-900 mb-1">Retraits commerçants</div>
      <div className="text-xs text-slate-500 mb-4">
        Demandes de retrait manuel — traitement par virement Mobile Money, preuve obligatoire pour valider
      </div>

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
        ) : tickets.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <Banknote size={20} className="text-slate-300" />
            Aucune demande {filtre ? STATUT_CFG[filtre]?.label.toLowerCase() : ''}
          </div>
        ) : (
          tickets.map((t) => {
            const cfg = STATUT_CFG[t.statut];
            const enAttente = t.statut === 'EN_ATTENTE';
            return (
              <div key={t.id} className="px-4 py-3.5 border-b border-slate-50 last:border-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-900 font-medium">
                      <Store size={12} className="text-slate-400" />
                      {t.commercant.nom}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {t.commercant.mobile_money_operateur} · {t.commercant.mobile_money_numero}
                    </div>
                    <div className="text-sm text-slate-900 font-semibold mt-1">{fmtXof(t.montant)}</div>
                    {t.statut === 'REJETE' && t.motif_rejet && (
                      <div className="text-[11px] text-red-600 mt-1">Motif : {t.motif_rejet}</div>
                    )}
                    {t.statut === 'TRAITE' && t.preuve_url && (
                      <button onClick={() => voirPreuve(t.id)} className="flex items-center gap-1 text-[11px] text-tikexo-primary mt-1 hover:underline">
                        <Paperclip size={11} /> Voir la preuve
                      </button>
                    )}
                    <div className="text-[10px] text-slate-400 mt-1">{fmtDate(t.createdAt)}</div>
                  </div>
                  <span className={clsx('flex items-center gap-1 text-[10px] px-2 py-1 rounded-full flex-shrink-0', cfg.cls)}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>

                {enAttente && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="flex-1 text-[11px] border border-slate-200 rounded-md px-2 py-1.5 text-slate-500 cursor-pointer hover:bg-slate-50 truncate">
                        {preuveParTicket[t.id]?.name ?? 'Choisir la preuve de virement (image ou PDF)'}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          className="hidden"
                          onChange={(e) => setPreuveParTicket((m) => ({ ...m, [t.id]: e.target.files?.[0] }))}
                        />
                      </label>
                      <button
                        onClick={() => validerMut.mutate({ id: t.id })}
                        disabled={validerMut.isPending || !preuveParTicket[t.id]}
                        className="text-[11px] bg-green-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
                      >
                        Valider le virement
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Motif de rejet (10 caractères minimum)"
                        value={motifParTicket[t.id] ?? ''}
                        onChange={(e) => setMotifParTicket((m) => ({ ...m, [t.id]: e.target.value }))}
                        className="flex-1 text-xs border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-tikexo-primary"
                      />
                      <button
                        onClick={() => rejeterMut.mutate({ id: t.id })}
                        disabled={rejeterMut.isPending || (motifParTicket[t.id] ?? '').trim().length < 10}
                        className="text-[11px] text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors flex-shrink-0"
                      >
                        Rejeter
                      </button>
                    </div>
                    {(validerMut.isError || rejeterMut.isError) && (
                      <div className="text-[11px] text-red-600">
                        {((validerMut.error as any)?.response?.data?.error) || ((rejeterMut.error as any)?.response?.data?.error) || 'Échec du traitement — réessayez.'}
                      </div>
                    )}
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
