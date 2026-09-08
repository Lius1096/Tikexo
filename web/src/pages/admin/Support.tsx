import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { MessageCircle, X, Send, User, ShieldCheck } from 'lucide-react';
import api from '../../lib/api';
import { fmtDateHeure } from '../../utils/format';

interface Message {
  id: string;
  message: string;
  auteur_role: string;
  createdAt: string;
  auteur: { id: string; nom: string; prenom: string; role: string };
}

interface Ticket {
  id: string;
  sujet: string;
  categorie: string;
  statut: 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'FERME';
  updatedAt: string;
  createdAt: string;
  user: { id: string; nom: string; prenom: string; role: string; email_perso?: string; email_pro?: string };
  messages?: Message[];
}

const CATEGORIE_LABEL: Record<string, string> = {
  WALLET: 'Wallet', DOTATION: 'Dotation', KYB: 'KYB', PAIEMENT: 'Paiement',
  RETRAIT: 'Retrait', COMPTE: 'Compte', AUTRE: 'Autre',
};
const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  OUVERT:   { label: 'Ouvert',     cls: 'bg-blue-50 text-blue-700' },
  EN_COURS: { label: 'En cours',   cls: 'bg-amber-50 text-amber-700' },
  RESOLU:   { label: 'Résolu',     cls: 'bg-green-50 text-green-700' },
  FERME:    { label: 'Fermé',      cls: 'bg-slate-100 text-slate-500' },
};
const ROLES_ADMIN = ['SUPER_ADMIN', 'ADMIN_OPS'];
const FILTRES = [
  { key: 'OUVERT',   label: 'Ouverts' },
  { key: 'EN_COURS', label: 'En cours' },
  { key: 'RESOLU',   label: 'Résolus' },
  { key: 'FERME',    label: 'Fermés' },
  { key: '',         label: 'Tous' },
] as const;

export default function AdminSupport() {
  const qc = useQueryClient();
  const [filtre, setFiltre] = useState<typeof FILTRES[number]['key']>('OUVERT');
  const [ticketOuvertId, setTicketOuvertId] = useState<string | null>(null);
  const [reponse, setReponse] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-tickets', filtre],
    queryFn: () => api.get('/support/tickets/admin', { params: { statut: filtre || undefined, limit: 50 } }).then((r) => r.data.data.items as Ticket[]),
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['admin-support-ticket', ticketOuvertId],
    queryFn: () => api.get(`/support/tickets/${ticketOuvertId}`).then((r) => r.data.data as Ticket),
    enabled: !!ticketOuvertId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-support-tickets'] });
    qc.invalidateQueries({ queryKey: ['admin-support-ticket', ticketOuvertId] });
  };

  const repondreMut = useMutation({
    mutationFn: () => api.post(`/support/tickets/${ticketOuvertId}/messages`, { message: reponse }),
    onSuccess: () => { setReponse(''); invalidate(); },
  });

  const statutMut = useMutation({
    mutationFn: (statut: string) => api.patch(`/support/tickets/${ticketOuvertId}/statut`, { statut }),
    onSuccess: invalidate,
  });

  const tickets = data ?? [];

  return (
    <div className="p-4 sm:p-6">
      <div className="text-[15px] font-medium text-slate-900 mb-1">Support client</div>
      <div className="text-xs text-slate-500 mb-4">Demandes des entreprises, bénéficiaires et commerçants</div>

      <div className="flex flex-wrap items-center gap-1 mb-4">
        {FILTRES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFiltre(key)}
            className={clsx(
              'text-[11px] px-3 py-1.5 rounded-lg border transition-colors',
              filtre === key ? 'bg-tikexo-primary text-white border-tikexo-primary' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-full text-center text-sm text-slate-400 py-8">Chargement…</div>
        ) : tickets.length === 0 ? (
          <div className="col-span-full text-center text-sm text-slate-400 py-12 bg-white border border-slate-100 rounded-lg flex flex-col items-center gap-2">
            <MessageCircle size={20} className="text-slate-300" />
            Aucun ticket {filtre ? STATUT_CFG[filtre]?.label.toLowerCase() : ''}
          </div>
        ) : (
          tickets.map((t) => {
            const st = STATUT_CFG[t.statut] ?? { label: t.statut, cls: 'bg-slate-100 text-slate-600' };
            return (
              <button
                key={t.id}
                onClick={() => setTicketOuvertId(t.id)}
                className="text-left bg-white border border-slate-100 rounded-xl p-4 hover:border-tikexo-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-slate-900 truncate">{t.sujet}</span>
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', st.cls)}>{st.label}</span>
                </div>
                <div className="text-[11px] text-slate-500 mb-1">{CATEGORIE_LABEL[t.categorie] ?? t.categorie}</div>
                <div className="text-[11px] text-slate-400 truncate">{t.user.prenom} {t.user.nom} · {t.user.role}</div>
                <div className="text-[10px] text-slate-400 mt-1">{fmtDateHeure(t.updatedAt)}</div>
              </button>
            );
          })
        )}
      </div>

      {ticketOuvertId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate">{ticketDetail?.sujet ?? '…'}</div>
                <div className="text-[11px] text-slate-400 truncate">
                  {ticketDetail ? `${ticketDetail.user.prenom} ${ticketDetail.user.nom} · ${CATEGORIE_LABEL[ticketDetail.categorie] ?? ticketDetail.categorie}` : ''}
                </div>
              </div>
              <button onClick={() => { setTicketOuvertId(null); setReponse(''); }} className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {ticketDetail && (
              <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] text-slate-500">Statut</span>
                <select
                  value={ticketDetail.statut}
                  onChange={(e) => statutMut.mutate(e.target.value)}
                  disabled={statutMut.isPending}
                  className="text-[11px] border border-slate-200 rounded-md px-2 py-1 text-slate-600"
                >
                  <option value="OUVERT">Ouvert</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="RESOLU">Résolu</option>
                  <option value="FERME">Fermé</option>
                </select>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {!ticketDetail ? (
                <div className="text-center text-sm text-slate-400 py-8">Chargement…</div>
              ) : (
                ticketDetail.messages?.map((m) => {
                  const estAdmin = ROLES_ADMIN.includes(m.auteur_role);
                  return (
                    <div key={m.id} className={clsx('flex flex-col max-w-[85%]', estAdmin ? 'items-end ml-auto' : 'items-start')}>
                      <div className={clsx(
                        'rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words',
                        estAdmin ? 'bg-tikexo-primary text-white' : 'bg-slate-100 text-slate-800'
                      )}>
                        {m.message}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                        {estAdmin ? <ShieldCheck size={10} /> : <User size={10} />}
                        {estAdmin ? 'TIKEXO' : `${m.auteur.prenom} ${m.auteur.nom}`} · {fmtDateHeure(m.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {ticketDetail?.statut !== 'FERME' && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2 flex-shrink-0">
                <textarea
                  value={reponse}
                  onChange={(e) => setReponse(e.target.value)}
                  placeholder="Votre réponse…"
                  rows={1}
                  className="flex-1 resize-none text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-tikexo-primary"
                />
                <button
                  onClick={() => repondreMut.mutate()}
                  disabled={!reponse.trim() || repondreMut.isPending}
                  className="flex-shrink-0 bg-tikexo-primary text-white p-2.5 rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Send size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
