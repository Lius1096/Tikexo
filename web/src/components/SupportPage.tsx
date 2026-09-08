import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { MessageCircle, Plus, X, Send, ShieldCheck, Paperclip } from 'lucide-react';
import api from '../lib/api';
import { fmtDateHeure } from '../utils/format';

interface Message {
  id: string;
  message: string;
  auteur_role: string;
  createdAt: string;
  piece_jointe_url: string | null;
  auteur: { id: string; nom: string; prenom: string; role: string };
}

interface Ticket {
  id: string;
  sujet: string;
  categorie: string;
  statut: 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'FERME';
  updatedAt: string;
  messages?: Message[];
}

const CATEGORIES = [
  { value: 'WALLET', label: 'Wallet' },
  { value: 'DOTATION', label: 'Dotation' },
  { value: 'KYB', label: 'KYB / documents' },
  { value: 'PAIEMENT', label: 'Paiement' },
  { value: 'RETRAIT', label: 'Retrait' },
  { value: 'COMPTE', label: 'Mon compte' },
  { value: 'AUTRE', label: 'Autre' },
];
const CATEGORIE_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const STATUT_CFG: Record<string, { label: string; cls: string }> = {
  OUVERT:   { label: 'Ouvert',   cls: 'bg-blue-50 text-blue-700' },
  EN_COURS: { label: 'En cours', cls: 'bg-amber-50 text-amber-700' },
  RESOLU:   { label: 'Résolu',   cls: 'bg-green-50 text-green-700' },
  FERME:    { label: 'Fermé',    cls: 'bg-slate-100 text-slate-500' },
};
const ROLES_ADMIN = ['SUPER_ADMIN', 'ADMIN_OPS'];

// Composant générique de support client, monté à l'identique dans les
// espaces employeur, bénéficiaire et commerçant — seule l'authentification
// (donc les tickets renvoyés par l'API) change selon le portail.
export default function SupportPage() {
  const qc = useQueryClient();
  const [creationOuverte, setCreationOuverte] = useState(false);
  const [nouveauForm, setNouveauForm] = useState({ categorie: 'AUTRE', sujet: '', message: '' });
  const [erreurCreation, setErreurCreation] = useState<string | null>(null);
  const [ticketOuvertId, setTicketOuvertId] = useState<string | null>(null);
  const [reponse, setReponse] = useState('');
  const [fichierCreation, setFichierCreation] = useState<File | null>(null);
  const [fichierReponse, setFichierReponse] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mes-tickets-support'],
    queryFn: () => api.get('/support/tickets/mes').then((r) => r.data.data as Ticket[]),
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['mon-ticket-support', ticketOuvertId],
    queryFn: () => api.get(`/support/tickets/${ticketOuvertId}`).then((r) => r.data.data as Ticket),
    enabled: !!ticketOuvertId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['mes-tickets-support'] });
    qc.invalidateQueries({ queryKey: ['mon-ticket-support', ticketOuvertId] });
  };

  const creerMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('categorie', nouveauForm.categorie);
      fd.append('sujet', nouveauForm.sujet);
      fd.append('message', nouveauForm.message);
      if (fichierCreation) fd.append('piece_jointe', fichierCreation);
      return api.post('/support/tickets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (r) => {
      setCreationOuverte(false);
      setNouveauForm({ categorie: 'AUTRE', sujet: '', message: '' });
      setFichierCreation(null);
      setErreurCreation(null);
      qc.invalidateQueries({ queryKey: ['mes-tickets-support'] });
      setTicketOuvertId(r.data.data.id);
    },
    onError: (err: any) => setErreurCreation(err?.response?.data?.error ?? 'Échec de l\'envoi, réessayez.'),
  });

  const repondreMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('message', reponse);
      if (fichierReponse) fd.append('piece_jointe', fichierReponse);
      return api.post(`/support/tickets/${ticketOuvertId}/messages`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { setReponse(''); setFichierReponse(null); invalidate(); },
  });

  function voirPieceJointe(messageId: string) {
    window.open(`${api.defaults.baseURL}/support/messages/${messageId}/fichier`, '_blank');
  }

  const tickets = data ?? [];
  const formValide = !!nouveauForm.sujet.trim() && !!nouveauForm.message.trim();

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Support</div>
          <div className="text-xs text-slate-500">Une question, un problème ? Contactez l'équipe TIKEXO ici</div>
        </div>
        <button
          onClick={() => { setNouveauForm({ categorie: 'AUTRE', sujet: '', message: '' }); setErreurCreation(null); setCreationOuverte(true); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-tikexo-primary text-white text-xs font-medium hover:opacity-90 transition-opacity flex-shrink-0"
        >
          <Plus size={14} /> Nouvelle demande
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</div>
        ) : tickets.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
            <MessageCircle size={20} className="text-slate-300" />
            Aucune demande pour l'instant
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {tickets.map((t) => {
              const st = STATUT_CFG[t.statut] ?? { label: t.statut, cls: 'bg-slate-100 text-slate-600' };
              return (
                <button
                  key={t.id}
                  onClick={() => setTicketOuvertId(t.id)}
                  className="w-full text-left flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-slate-900 truncate">{t.sujet}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {CATEGORIE_LABEL[t.categorie] ?? t.categorie} · {fmtDateHeure(t.updatedAt)}
                    </div>
                  </div>
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', st.cls)}>{st.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {creationOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="text-[13px] font-semibold text-slate-900">Nouvelle demande</div>
              <button onClick={() => setCreationOuverte(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Catégorie</label>
                <select
                  value={nouveauForm.categorie}
                  onChange={(e) => setNouveauForm((f) => ({ ...f, categorie: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Sujet</label>
                <input
                  type="text"
                  value={nouveauForm.sujet}
                  onChange={(e) => setNouveauForm((f) => ({ ...f, sujet: e.target.value }))}
                  placeholder="ex : Dotation non reçue ce mois-ci"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">Message</label>
                <textarea
                  value={nouveauForm.message}
                  onChange={(e) => setNouveauForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Décrivez votre problème en détail…"
                  rows={4}
                  className="w-full resize-none border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20 focus:border-tikexo-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  Pièce jointe <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-500 border border-dashed border-slate-300 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                  <Paperclip size={14} />
                  {fichierCreation ? fichierCreation.name : 'Joindre une capture ou un document'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={(e) => setFichierCreation(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              {erreurCreation && <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{erreurCreation}</div>}
              <button
                onClick={() => creerMut.mutate()}
                disabled={!formValide || creerMut.isPending}
                className="w-full bg-tikexo-primary text-white text-sm font-medium py-3 rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
              >
                {creerMut.isPending ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {ticketOuvertId && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg h-[85vh] sm:h-[80vh] rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-slate-900 truncate">{ticketDetail?.sujet ?? '…'}</div>
                {ticketDetail && (
                  <span className={clsx('inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium', STATUT_CFG[ticketDetail.statut]?.cls)}>
                    {STATUT_CFG[ticketDetail.statut]?.label}
                  </span>
                )}
              </div>
              <button onClick={() => { setTicketOuvertId(null); setReponse(''); }} className="text-slate-400 hover:text-slate-600 p-1 flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {!ticketDetail ? (
                <div className="text-center text-sm text-slate-400 py-8">Chargement…</div>
              ) : (
                ticketDetail.messages?.map((m) => {
                  const estAdmin = ROLES_ADMIN.includes(m.auteur_role);
                  return (
                    <div key={m.id} className={clsx('flex flex-col max-w-[85%]', estAdmin ? 'items-start' : 'items-end ml-auto')}>
                      <div className={clsx(
                        'rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words',
                        estAdmin ? 'bg-slate-100 text-slate-800' : 'bg-tikexo-primary text-white'
                      )}>
                        {m.message}
                        {m.piece_jointe_url && (
                          <button
                            onClick={() => voirPieceJointe(m.id)}
                            className={clsx(
                              'flex items-center gap-1 mt-1.5 text-[11px] underline',
                              estAdmin ? 'text-slate-500' : 'text-white/80'
                            )}
                          >
                            <Paperclip size={11} /> Pièce jointe
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1 px-1">
                        {estAdmin && <ShieldCheck size={10} />}
                        {estAdmin ? 'TIKEXO' : 'Vous'} · {fmtDateHeure(m.createdAt)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {ticketDetail?.statut !== 'FERME' && (
              <div className="px-4 py-3 border-t border-slate-100 flex-shrink-0">
                {fichierReponse && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1.5">
                    <Paperclip size={11} /> {fichierReponse.name}
                    <button onClick={() => setFichierReponse(null)} className="text-slate-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="flex-shrink-0 text-slate-400 hover:text-tikexo-primary p-2 cursor-pointer">
                    <Paperclip size={16} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                      className="hidden"
                      onChange={(e) => setFichierReponse(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <textarea
                    value={reponse}
                    onChange={(e) => setReponse(e.target.value)}
                    placeholder="Votre message…"
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
