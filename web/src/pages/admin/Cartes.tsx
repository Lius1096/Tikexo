import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CreditCard, Lock, Unlock, X, Search, ChevronRight, MapPin, CheckCircle, Clock, Building2 } from 'lucide-react';
import api from '../../lib/api';
import { CarteVirtuelle, CartePhysique, type CarteData } from '../../components/CarteVisuelle';
import { fmtDate, fmtDateHeure } from '../../utils/format';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CarteItem extends CarteData {
  createdAt: string;
  expedie_at?: string | null;
  adresse_livraison?: string | null;
  user: {
    id: string; nom: string; prenom: string; telephone: string; statut: string;
    liensBeneficiaire?: { entreprise: { id: string; nom: string } }[];
  };
}

type MainTab = 'DEMANDES' | 'TOUTES' | 'ACTIVE' | 'BLOQUEE' | 'EXPEDIE';

// ── Helpers ───────────────────────────────────────────────────────────────────

const statutBadge: Record<string, string> = {
  COMMANDE: 'bg-[#FEF9C3] text-[#854D0E]',
  EXPEDIE : 'bg-[#DBEAFE] text-[#185FA5]',
  ACTIVE  : 'bg-[#EAF3DE] text-[#3B6D11]',
  BLOQUEE : 'bg-[#FCEBEB] text-[#A32D2D]',
  EXPIREE : 'bg-[#F1F5F9] text-[#64748B]',
  PERDUE  : 'bg-[#FEF3C7] text-[#92400E]',
};

const statutLabel: Record<string, string> = {
  COMMANDE: 'En attente', EXPEDIE: 'Expédiée', ACTIVE: 'Active',
  BLOQUEE: 'Bloquée', EXPIREE: 'Expirée', PERDUE: 'Perdue',
};

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];

// ── Page principale ───────────────────────────────────────────────────────────

export default function AdminCartes() {
  const qc = useQueryClient();
  const [tab, setTab]               = useState<MainTab>('DEMANDES');
  const [search, setSearch]         = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const TABS: { key: MainTab; label: string }[] = [
    { key: 'DEMANDES', label: 'Demandes physiques' },
    { key: 'TOUTES',   label: 'Toutes les cartes' },
    { key: 'ACTIVE',   label: 'Actives' },
    { key: 'EXPEDIE',  label: 'Expédiées' },
    { key: 'BLOQUEE',  label: 'Bloquées' },
  ];

  // ── Query demandes ──────────────────────────────────────────────────────────
  const { data: demandesData, isLoading: demandesLoading } = useQuery({
    queryKey: ['admin-cartes-demandes'],
    queryFn : () => api.get('/cartes/demandes').then((r) => r.data.data),
    enabled : tab === 'DEMANDES',
    refetchInterval: tab === 'DEMANDES' ? 30_000 : false,
  });

  // ── Query cartes ────────────────────────────────────────────────────────────
  const params = new URLSearchParams();
  if (tab !== 'TOUTES' && tab !== 'DEMANDES') params.set('statut', tab);

  const { data: cartesData, isLoading: cartesLoading } = useQuery({
    queryKey: ['admin-cartes', tab],
    queryFn : () => api.get(`/cartes?${params}`).then((r) => r.data.data),
    enabled : tab !== 'DEMANDES',
  });

  const invalidateDemandes = () => qc.invalidateQueries({ queryKey: ['admin-cartes-demandes'] });
  const invalidateCartes   = () => qc.invalidateQueries({ queryKey: ['admin-cartes', tab] });

  const validerMut = useMutation({
    mutationFn: (carteId: string) => api.post(`/cartes/${carteId}/valider-demande`),
    onSuccess : () => { invalidateDemandes(); invalidateCartes(); setSelectedId(null); },
  });

  const bloquerMut = useMutation({
    mutationFn: (id: string) => api.post(`/cartes/${id}/bloquer`),
    onSuccess : () => invalidateCartes(),
  });

  const debloquerMut = useMutation({
    mutationFn: (id: string) => api.post(`/cartes/${id}/debloquer`),
    onSuccess : () => invalidateCartes(),
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  const demandes: CarteItem[] = demandesData?.items ?? [];
  const nbDemandes = demandesData?.total ?? 0;

  const cartes: CarteItem[] = (cartesData?.items ?? []).filter((c: CarteItem) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.user.nom.toLowerCase().includes(q) ||
      c.user.prenom.toLowerCase().includes(q) ||
      c.user.telephone.includes(q) ||
      c.numero_masque.includes(q)
    );
  });

  const selectedCarte = (cartesData?.items ?? []).find((c: CarteItem) => c.id === selectedId) ?? null;

  return (
    <div className="p-6">

      {/* Header */}
      <div className="mb-5">
        <div className="text-[15px] font-medium text-slate-900">Cartes TIKEXO</div>
        <div className="text-xs text-slate-500">Gestion des cartes et demandes physiques</div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5 mb-5 w-fit">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSelectedId(null); }}
            className={clsx(
              'px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1.5',
              tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {label}
            {key === 'DEMANDES' && nbDemandes > 0 && (
              <span className="bg-[#854D0E] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {nbDemandes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Onglet Demandes ── */}
      {tab === 'DEMANDES' && (
        <DemandesView
          demandes={demandes}
          isLoading={demandesLoading}
          onValider={(id) => validerMut.mutate(id)}
          isPending={validerMut.isPending}
          pendingId={validerMut.variables as string | undefined}
        />
      )}

      {/* ── Onglet Cartes ── */}
      {tab !== 'DEMANDES' && (
        <>
          {/* Search */}
          <div className="relative mb-4 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom, téléphone, numéro…"
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-[#1A3B8C]"
            />
          </div>

          <CartesTable
            items={cartes}
            isLoading={cartesLoading}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          />

          {selectedCarte && (
            <AdminCarteDrawer
              carte={selectedCarte}
              onClose={() => setSelectedId(null)}
              onBloquer={() => bloquerMut.mutate(selectedCarte.id)}
              onDebloquer={() => debloquerMut.mutate(selectedCarte.id)}
              isPending={bloquerMut.isPending || debloquerMut.isPending}
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Vue demandes ──────────────────────────────────────────────────────────────

function DemandesView({ demandes, isLoading, onValider, isPending, pendingId }: {
  demandes : CarteItem[];
  isLoading: boolean;
  onValider: (id: string) => void;
  isPending: boolean;
  pendingId?: string;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (demandes.length === 0) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl py-16 flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#EAF3DE] flex items-center justify-center">
          <CheckCircle size={24} className="text-[#3B6D11]" />
        </div>
        <div className="text-sm font-medium text-slate-700">Aucune demande en attente</div>
        <div className="text-xs text-slate-400">
          Les demandes de cartes physiques apparaissent ici dès qu'un bénéficiaire ou employeur en fait la demande.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Explication workflow */}
      <div className="bg-[#DBEAFE] border border-[#BFDBFE] rounded-xl px-4 py-3 flex items-start gap-3 mb-2">
        <Clock size={14} className="text-[#185FA5] flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#185FA5]">
          Ces demandes ont été soumises par les bénéficiaires ou leurs employeurs. Validez pour confirmer la production et l'expédition. Le code d'activation sera communiqué au bénéficiaire à réception.
        </p>
      </div>

      {demandes.map((d, idx) => {
        const [bg, fg] = PALETTE[idx % PALETTE.length];
        const initials = `${d.user.prenom[0] ?? ''}${d.user.nom[0] ?? ''}`.toUpperCase();
        const entreprise = d.user.liensBeneficiaire?.[0]?.entreprise?.nom;
        const isThisPending = isPending && pendingId === d.id;

        return (
          <div key={d.id} className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-start gap-4">

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold flex-shrink-0"
                style={{ background: bg, color: fg }}>
                {initials}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-slate-900">{d.user.prenom} {d.user.nom}</span>
                  <span className="font-mono text-[10px] text-slate-400">{d.user.telephone}</span>
                </div>

                {entreprise && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Building2 size={10} className="text-slate-400" />
                    <span className="text-[11px] text-slate-500">{entreprise}</span>
                  </div>
                )}

                <div className="flex items-start gap-1 mt-2">
                  <MapPin size={11} className="text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-600">{d.adresse_livraison || '—'}</span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[10px] text-slate-400">Demandée le {fmtDateHeure(d.createdAt)}</span>
                  <span className="font-mono text-[10px] text-slate-300">{d.numero_masque}</span>
                </div>
              </div>

              {/* Action */}
              <div className="flex-shrink-0">
                {confirmId === d.id ? (
                  <div className="flex flex-col gap-2 items-end">
                    <p className="text-[10px] text-slate-500 text-right max-w-[140px]">
                      Confirmer la mise en production ?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-[11px] text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={() => { onValider(d.id); setConfirmId(null); }}
                        disabled={isThisPending}
                        className="text-[11px] font-medium bg-[#1A3B8C] text-white px-3 py-1.5 rounded-lg hover:bg-[#15306e] disabled:opacity-50"
                      >
                        {isThisPending ? 'En cours…' : 'Confirmer'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(d.id)}
                    className="flex items-center gap-1.5 bg-[#1A3B8C] text-white text-[11px] font-medium px-4 py-2 rounded-lg hover:bg-[#15306e] transition-colors"
                  >
                    <CheckCircle size={13} />
                    Valider et expédier
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Table cartes ──────────────────────────────────────────────────────────────

function CartesTable({ items, isLoading, selectedId, onSelect }: {
  items     : CarteItem[];
  isLoading : boolean;
  selectedId: string | null;
  onSelect  : (id: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-100">
            {['TITULAIRE', 'NUMÉRO', 'TYPE', 'STATUT', 'EXPIRE', 'CRÉÉE', ''].map((h) => (
              <th key={h} className="text-[10px] text-slate-400 text-left px-4 py-3 font-normal tracking-[0.5px]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-50">
                {Array.from({ length: 7 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-3 bg-slate-100 animate-pulse rounded" />
                  </td>
                ))}
              </tr>
            ))
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center">
                <CreditCard size={24} className="text-slate-200 mx-auto mb-2" />
                <div className="text-sm text-slate-400">Aucune carte</div>
              </td>
            </tr>
          ) : (
            items.map((c, idx) => {
              const [bg, fg] = PALETTE[idx % PALETTE.length];
              const initials = `${c.user.prenom[0] ?? ''}${c.user.nom[0] ?? ''}`.toUpperCase();
              return (
                <tr
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={clsx(
                    'border-b border-slate-50 last:border-0 cursor-pointer transition-colors',
                    selectedId === c.id ? 'bg-blue-50/30' : 'hover:bg-slate-50/60'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
                        style={{ background: bg, color: fg }}>
                        {initials}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-900">{c.user.prenom} {c.user.nom}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{c.user.telephone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{c.numero_masque}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                      {c.type === 'VIRTUELLE' ? 'Virtuelle' : 'Physique'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', statutBadge[c.statut])}>
                      {statutLabel[c.statut] ?? c.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{fmtDate(c.date_expiration)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{fmtDate(c.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className={clsx('text-slate-300 transition-transform', selectedId === c.id && 'rotate-90')} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Drawer admin ──────────────────────────────────────────────────────────────

function AdminCarteDrawer({ carte, onClose, onBloquer, onDebloquer, isPending }: {
  carte      : CarteItem;
  onClose    : () => void;
  onBloquer  : () => void;
  onDebloquer: () => void;
  isPending  : boolean;
}) {
  const u        = carte.user;
  const initials = `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();

  const carteAvecUser: CarteData = { ...carte, user: { nom: u.nom, prenom: u.prenom } };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[400px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[13px] font-medium text-[#185FA5]">
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-slate-900">{u.prenom} {u.nom}</div>
              <div className="text-[11px] text-slate-400 font-mono">{u.telephone}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">

          <div>
            <div className="text-[10px] text-slate-400 tracking-[0.5px] uppercase mb-3">Carte</div>
            <div style={{ width: 340 }}>
              {carte.type === 'PHYSIQUE'
                ? <CartePhysique carte={carteAvecUser} />
                : <CarteVirtuelle carte={carteAvecUser} />
              }
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl divide-y divide-white">
            {[
              { label: 'ID carte',    value: carte.id,              mono: true },
              { label: 'ID user',     value: carte.user.id,         mono: true },
              { label: 'Préfixe',     value: carte.prefixe ?? '4782' },
              { label: 'Type',        value: carte.type === 'VIRTUELLE' ? 'Virtuelle' : 'Physique' },
              { label: 'Statut',      value: statutLabel[carte.statut] ?? carte.statut },
              { label: 'NFC',         value: carte.nfc_active ? 'Activé' : 'Désactivé' },
              { label: 'Expédié le',  value: fmtDate(carte.expedie_at) },
              { label: 'Statut user', value: u.statut },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex justify-between items-center px-4 py-2.5">
                <span className="text-[11px] text-slate-400">{label}</span>
                <span className={clsx('text-[11px] text-slate-700 truncate max-w-[180px]', mono && 'font-mono text-[10px]')}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="text-[10px] text-slate-400 tracking-[0.5px] uppercase mb-2">Actions admin</div>
            {carte.statut === 'ACTIVE' && (
              <button
                onClick={onBloquer}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Lock size={15} />
                <span className="font-medium">Bloquer la carte</span>
              </button>
            )}
            {carte.statut === 'BLOQUEE' && (
              <button
                onClick={onDebloquer}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm hover:bg-green-100 transition-colors disabled:opacity-50"
              >
                <Unlock size={15} />
                <span className="font-medium">Débloquer la carte</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
