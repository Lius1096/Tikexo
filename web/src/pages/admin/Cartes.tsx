import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CreditCard, Plus, Lock, Unlock, X, Search, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';

const statutBadge: Record<string, string> = {
  ACTIVE:  'bg-[#EAF3DE] text-[#3B6D11]',
  BLOQUEE: 'bg-[#FCEBEB] text-[#A32D2D]',
  EXPIREE: 'bg-[#F1F5F9] text-[#64748B]',
  PERDUE:  'bg-[#FEF3C7] text-[#92400E]',
};
const statutLabel: Record<string, string> = {
  ACTIVE: 'Active', BLOQUEE: 'Bloquée', EXPIREE: 'Expirée', PERDUE: 'Perdue',
};
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];

interface CarteItem {
  id: string;
  type: string;
  numero_masque: string;
  statut: string;
  date_expiration: string;
  createdAt: string;
  user: { id: string; nom: string; prenom: string; telephone: string; statut: string };
}

export default function AdminCartes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreerForm, setShowCreerForm] = useState(false);
  const [telephone, setTelephone] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cartes', filtreStatut],
    queryFn: () =>
      api.get(`/cartes${filtreStatut ? `?statut=${filtreStatut}` : ''}`)
        .then((r) => r.data.data),
    staleTime: 30_000,
  });

  const items: CarteItem[] = data?.items ?? [];
  const selected = items.find((c) => c.id === selectedId) ?? null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-cartes'] });

  const bloquer = useMutation({
    mutationFn: (id: string) => api.post(`/cartes/${id}/bloquer`),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur blocage.'),
  });

  const debloquer = useMutation({
    mutationFn: (id: string) => api.post(`/cartes/${id}/debloquer`),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur déblocage.'),
  });

  const creerManuel = useMutation({
    mutationFn: (userId: string) => api.post('/cartes', { userId }),
    onSuccess: () => { setActionError(null); setShowCreerForm(false); setTelephone(''); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur création.'),
  });

  const rechercherUser = useMutation({
    mutationFn: (tel: string) => api.get(`/beneficiaires?telephone=${tel}`).then((r) => r.data.data?.items?.[0] ?? null),
  });

  const isPending = bloquer.isPending || debloquer.isPending || creerManuel.isPending;

  const filtered = items.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.user.nom.toLowerCase().includes(q) ||
      c.user.prenom.toLowerCase().includes(q) ||
      c.user.telephone.includes(q) ||
      c.numero_masque.includes(q)
    );
  });

  const stats = {
    total:    items.length,
    actives:  items.filter((c) => c.statut === 'ACTIVE').length,
    bloquees: items.filter((c) => c.statut === 'BLOQUEE').length,
    expirees: items.filter((c) => c.statut === 'EXPIREE').length,
  };

  return (
    <div className="p-[18px_20px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Cartes virtuelles</div>
          <div className="text-xs text-slate-500">Émises et gérées par TIKEXO Ops</div>
        </div>
        <button
          onClick={() => setShowCreerForm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors"
        >
          <Plus size={14} /> Émettre une carte
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total', value: stats.total, cls: 'text-slate-700' },
          { label: 'Actives', value: stats.actives, cls: 'text-[#3B6D11]' },
          { label: 'Bloquées', value: stats.bloquees, cls: 'text-[#A32D2D]' },
          { label: 'Expirées', value: stats.expirees, cls: 'text-slate-400' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-100 rounded-xl px-4 py-3">
            <div className={clsx('text-lg font-semibold', s.cls)}>{s.value}</div>
            <div className="text-[10px] text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {actionError && (
        <div className="mb-3 px-4 py-2.5 rounded-md bg-[#FCEBEB] border border-[#F4B8B8] text-sm text-[#991B1B]">
          {actionError}
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Nom, téléphone, numéro…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-tikexo-accent"
          />
        </div>
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-tikexo-accent text-slate-700"
        >
          <option value="">Tous statuts</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOQUEE">Bloquée</option>
          <option value="EXPIREE">Expirée</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['TITULAIRE', 'NUMÉRO', 'TYPE', 'ÉMISE LE', 'EXPIRE', 'STATUT', 'ACTIONS'].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <CreditCard size={24} className="text-slate-200 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">Aucune carte</div>
                </td>
              </tr>
            ) : (
              filtered.map((c, idx) => {
                const [bg, fg] = PALETTE[idx % PALETTE.length];
                const initials = `${c.user.prenom[0] ?? ''}${c.user.nom[0] ?? ''}`.toUpperCase();
                return (
                  <tr key={c.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0" style={{ background: bg, color: fg }}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-900">{c.user.prenom} {c.user.nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{c.user.telephone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.numero_masque}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">Virtuelle</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(c.createdAt)}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(c.date_expiration)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium', statutBadge[c.statut])}>
                        {statutLabel[c.statut] ?? c.statut}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.statut === 'ACTIVE' && (
                          <button
                            onClick={() => { setSelectedId(c.id); }}
                            disabled={isPending}
                            className="flex items-center gap-1 text-[11px] text-[#A32D2D] hover:underline disabled:opacity-50"
                          >
                            <Lock size={11} /> Bloquer
                          </button>
                        )}
                        {c.statut === 'BLOQUEE' && (
                          <button
                            onClick={() => debloquer.mutate(c.id)}
                            disabled={isPending}
                            className="flex items-center gap-1 text-[11px] text-tikexo-accent hover:underline disabled:opacity-50"
                          >
                            <Unlock size={11} /> Débloquer
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal confirmation blocage */}
      {selectedId && !showCreerForm && (
        <ConfirmModal
          titre="Bloquer cette carte ?"
          message="Le titulaire ne pourra plus effectuer de paiements TIKEXO."
          onConfirm={() => { bloquer.mutate(selectedId); setSelectedId(null); }}
          onCancel={() => setSelectedId(null)}
          isPending={bloquer.isPending}
          danger
        />
      )}

      {/* Modal création manuelle */}
      {showCreerForm && (
        <CreerCarteModal
          onClose={() => { setShowCreerForm(false); setTelephone(''); rechercherUser.reset(); }}
          onCreer={(userId) => creerManuel.mutate(userId)}
          isPending={creerManuel.isPending}
          telephone={telephone}
          setTelephone={setTelephone}
          onRechercher={() => rechercherUser.mutate(telephone)}
          userTrouve={rechercherUser.data}
          recherchePending={rechercherUser.isPending}
        />
      )}
    </div>
  );
}

function ConfirmModal({ titre, message, onConfirm, onCancel, isPending, danger }: {
  titre: string; message: string;
  onConfirm: () => void; onCancel: () => void;
  isPending: boolean; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[360px] p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-[14px] font-medium text-slate-900">{titre}</div>
            <div className="text-[12px] text-slate-500 mt-1">{message}</div>
          </div>
          <button onClick={onCancel} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X size={13} className="text-slate-400" />
          </button>
        </div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={clsx(
              'px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-60',
              danger ? 'bg-[#B91C1C] hover:bg-[#991B1B]' : 'bg-tikexo-primary hover:bg-tikexo-accent'
            )}
          >
            {isPending ? 'En cours…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreerCarteModal({ onClose, onCreer, isPending, telephone, setTelephone, onRechercher, userTrouve, recherchePending }: {
  onClose: () => void;
  onCreer: (userId: string) => void;
  isPending: boolean;
  telephone: string;
  setTelephone: (v: string) => void;
  onRechercher: () => void;
  userTrouve: any;
  recherchePending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-xl shadow-xl w-[400px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[14px] font-medium text-slate-900">Émettre une carte virtuelle</div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X size={13} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-[11px] text-slate-500">Recherchez le bénéficiaire par numéro de téléphone</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: 97000001"
              value={telephone}
              onChange={(e) => setTelephone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onRechercher()}
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-tikexo-accent font-mono"
            />
            <button
              onClick={onRechercher}
              disabled={!telephone || recherchePending}
              className="px-3 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              {recherchePending ? '…' : 'Chercher'}
            </button>
          </div>

          {userTrouve === null && !recherchePending && telephone && (
            <div className="text-[12px] text-[#A32D2D] bg-[#FCEBEB] px-3 py-2 rounded-lg">
              Aucun bénéficiaire trouvé avec ce numéro.
            </div>
          )}

          {userTrouve && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[12px] font-medium text-[#185FA5]">
                  {userTrouve.prenom?.[0]}{userTrouve.nom?.[0]}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-slate-900">{userTrouve.prenom} {userTrouve.nom}</div>
                  <div className="text-[11px] text-slate-400 font-mono">{userTrouve.telephone}</div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200">
                <button
                  onClick={() => onCreer(userTrouve.id)}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors disabled:opacity-60"
                >
                  <CreditCard size={15} />
                  {isPending ? 'Émission…' : 'Émettre la carte'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
