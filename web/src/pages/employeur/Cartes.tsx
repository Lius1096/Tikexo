import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CreditCard, Lock, Unlock, X, ChevronRight, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];
const niveauLabel: Record<string, string> = {
  EMPLOYE: 'Employé', CADRE: 'Cadre', MANAGER: 'Manager', DIRECTEUR: 'Directeur',
};
const statutBadge: Record<string, string> = {
  ACTIVE:  'bg-[#EAF3DE] text-[#3B6D11]',
  BLOQUEE: 'bg-[#FCEBEB] text-[#A32D2D]',
  EXPIREE: 'bg-[#F1F5F9] text-[#64748B]',
  PERDUE:  'bg-[#FEF3C7] text-[#92400E]',
};
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface Carte {
  id: string;
  type: string;
  numero_masque: string;
  statut: string;
  date_expiration: string;
  createdAt: string;
}

interface BenefCartes {
  lien_id: string;
  niveau: string;
  user: { id: string; nom: string; prenom: string; telephone: string };
  cartes: Carte[];
}

export default function EmployeurCartes() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cartes-entreprise', entrepriseId],
    queryFn: () => api.get(`/cartes?entrepriseId=${entrepriseId}`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const items: BenefCartes[] = data || [];
  const selected = items.find((b) => b.lien_id === selectedId) ?? null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['cartes-entreprise', entrepriseId] });

  const bloquer = useMutation({
    mutationFn: (carteId: string) => api.post(`/cartes/${carteId}/bloquer`),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur blocage carte.'),
  });

  const debloquer = useMutation({
    mutationFn: (carteId: string) => api.post(`/cartes/${carteId}/debloquer`),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur déblocage carte.'),
  });

  const isPending = bloquer.isPending || debloquer.isPending;

  const totalActives  = items.reduce((n, b) => n + b.cartes.filter((c) => c.statut === 'ACTIVE').length, 0);
  const totalBloquees = items.reduce((n, b) => n + b.cartes.filter((c) => c.statut === 'BLOQUEE').length, 0);
  const sansCartes    = items.filter((b) => b.cartes.filter((c) => c.statut === 'ACTIVE').length === 0).length;

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-4">
        <div className="text-[15px] font-medium text-slate-900">Cartes TIKEXO</div>
        <div className="text-xs text-slate-500">Cartes virtuelles des bénéficiaires</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Actives" value={totalActives} color="text-[#3B6D11]" bg="bg-[#EAF3DE]" />
        <StatCard label="Bloquées" value={totalBloquees} color="text-[#A32D2D]" bg="bg-[#FCEBEB]" />
        <StatCard label="Sans carte" value={sansCartes} color="text-[#854F0B]" bg="bg-[#FAEEDA]" />
      </div>

      {actionError && (
        <div className="mb-3 px-4 py-2.5 rounded-md bg-[#FCEBEB] border border-[#F4B8B8] text-sm text-[#991B1B]">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['BÉNÉFICIAIRE', 'NIVEAU', 'NUMÉRO', 'TYPE', 'EXPIRE', 'STATUT', ''].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <CreditCard size={24} className="text-slate-300 mx-auto mb-2" />
                  <div className="text-sm text-slate-400">Aucun bénéficiaire</div>
                </td>
              </tr>
            ) : (
              items.map((b, idx) => {
                const [bg, fg] = PALETTE[idx % PALETTE.length];
                const initials = `${b.user.prenom[0] ?? ''}${b.user.nom[0] ?? ''}`.toUpperCase();
                const cartePrincipale = b.cartes.find((c) => c.statut === 'ACTIVE') ?? b.cartes[0] ?? null;

                return (
                  <tr
                    key={b.lien_id}
                    onClick={() => setSelectedId(b.lien_id === selectedId ? null : b.lien_id)}
                    className={clsx(
                      'border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
                      selectedId === b.lien_id ? 'bg-slate-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0" style={{ background: bg, color: fg }}>
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-900">{b.user.prenom} {b.user.nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{b.user.telephone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-[10px]">
                        {niveauLabel[b.niveau] ?? b.niveau}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-700">
                      {cartePrincipale ? cartePrincipale.numero_masque : (
                        <span className="text-slate-300 italic text-[11px]">Aucune carte</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {cartePrincipale ? 'Virtuelle' : '—'}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">
                      {cartePrincipale ? fmtDate(cartePrincipale.date_expiration) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {cartePrincipale ? (
                        <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium', statutBadge[cartePrincipale.statut])}>
                          {cartePrincipale.statut === 'ACTIVE' ? 'Active'
                            : cartePrincipale.statut === 'BLOQUEE' ? 'Bloquée'
                            : cartePrincipale.statut === 'EXPIREE' ? 'Expirée' : 'Perdue'}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Non émise</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight size={14} className={clsx('text-slate-300 transition-transform', selectedId === b.lien_id && 'rotate-90')} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <CarteDrawer
          benef={selected}
          onClose={() => setSelectedId(null)}
          onBloquer={(id) => bloquer.mutate(id)}
          onDebloquer={(id) => debloquer.mutate(id)}
          isPending={isPending}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
        <CreditCard size={14} className={color} />
      </div>
      <div>
        <div className={clsx('text-lg font-semibold', color)}>{value}</div>
        <div className="text-[10px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function CarteDrawer({
  benef, onClose, onBloquer, onDebloquer, isPending,
}: {
  benef: BenefCartes;
  onClose: () => void;
  onBloquer: (id: string) => void;
  onDebloquer: (id: string) => void;
  isPending: boolean;
}) {
  const u = benef.user;
  const initials = `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();
  const carteActive = benef.cartes.find((c) => c.statut === 'ACTIVE') ?? null;
  const historique  = benef.cartes.filter((c) => c.statut !== 'ACTIVE');

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[380px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full overflow-y-auto">

        {/* Header */}
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

        <div className="flex-1 px-5 py-4 space-y-5 overflow-y-auto">

          {/* Carte active */}
          {carteActive ? (
            <div>
              <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-3">CARTE ACTIVE</div>
              <CarteVisuelle carte={carteActive} nom={`${u.prenom} ${u.nom}`} />
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-5 flex flex-col items-center gap-2 text-center">
              <CreditCard size={24} className="text-slate-200" />
              <div className="text-sm text-slate-500">Aucune carte émise</div>
              <div className="text-[11px] text-slate-400">La carte est émise par TIKEXO Ops</div>
            </div>
          )}

          {/* Actions carte active */}
          {carteActive && (
            <div className="space-y-2">
              <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-3">ACTIONS</div>
              <button
                onClick={() => onBloquer(carteActive.id)}
                disabled={isPending}
                className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] text-sm hover:bg-[#FCEBEB] transition-colors disabled:opacity-60"
              >
                <Lock size={15} />
                <div className="text-left">
                  <div className="font-medium">Bloquer la carte</div>
                  <div className="text-[10px] opacity-70">Le bénéficiaire ne pourra plus payer</div>
                </div>
              </button>
            </div>
          )}

          {/* Cartes bloquées/expirées */}
          {historique.length > 0 && (
            <div>
              <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-3">HISTORIQUE</div>
              <div className="space-y-2">
                {historique.map((c) => (
                  <div key={c.id} className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-slate-600">{c.numero_masque}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Créée le {fmtDate(c.createdAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-[9px] px-1.5 py-0.5 rounded-full font-medium', statutBadge[c.statut])}>
                        {c.statut === 'BLOQUEE' ? 'Bloquée' : c.statut === 'EXPIREE' ? 'Expirée' : 'Perdue'}
                      </span>
                      {c.statut === 'BLOQUEE' && (
                        <button
                          onClick={() => onDebloquer(c.id)}
                          disabled={isPending}
                          className="flex items-center gap-1 text-[10px] text-tikexo-accent hover:underline disabled:opacity-60"
                        >
                          <Unlock size={10} /> Débloquer
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CarteVisuelle({ carte, nom }: { carte: Carte; nom: string }) {
  const isBloquee = carte.statut === 'BLOQUEE';
  return (
    <div className={clsx(
      'relative rounded-2xl p-5 text-white overflow-hidden',
      isBloquee ? 'bg-slate-400' : 'bg-tikexo-primary'
    )}>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 0%, transparent 60%)' }} />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] text-white/50 tracking-[1px]">TIKEXO VIRTUELLE</div>
            {isBloquee && (
              <div className="flex items-center gap-1 mt-1">
                <ShieldAlert size={11} className="text-red-300" />
                <span className="text-[10px] text-red-300">Bloquée</span>
              </div>
            )}
          </div>
          <CreditCard size={22} className="text-white/40" />
        </div>
        <div className="font-mono text-[15px] tracking-[2px] text-white/90">{carte.numero_masque}</div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[9px] text-white/40 mb-0.5">TITULAIRE</div>
            <div className="text-[12px] font-medium">{nom.toUpperCase()}</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-white/40 mb-0.5">EXPIRE</div>
            <div className="text-[12px] font-medium">
              {new Date(carte.date_expiration).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
