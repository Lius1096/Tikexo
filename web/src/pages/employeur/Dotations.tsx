import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { CalendarDays, Play, CheckSquare, Send, X, CheckCircle, Clock, Banknote } from 'lucide-react';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const statutBadge: Record<string, string> = {
  CALCULE: 'bg-[#FAEEDA] text-[#854F0B]',
  VALIDE:  'bg-[#EAF3DE] text-[#3B6D11]',
  DISTRIBUE: 'bg-[#DBEAFE] text-[#185FA5]',
};
const statutLabel: Record<string, string> = {
  CALCULE: 'À valider', VALIDE: 'Validé', DISTRIBUE: 'Distribué',
};
const niveauLabel: Record<string, string> = {
  EMPLOYE: 'Employé', CADRE: 'Cadre', MANAGER: 'Manager', DIRECTEUR: 'Directeur',
};
const PALETTE = [
  ['#DBEAFE', '#185FA5'], ['#EAF3DE', '#3B6D11'],
  ['#FAEEDA', '#854F0B'], ['#FCEBEB', '#A32D2D'],
];
const fmtXOF = (n: number | string) =>
  `${new Intl.NumberFormat('fr-FR').format(Math.round(Number(n)))} XOF`;
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface DotationItem {
  id: string;
  statut: string;
  montant_total: string;
  part_employeur: string;
  part_salarie: string;
  nb_titres: number;
  mois_concerne: string;
  valide_at?: string | null;
  distribue_at?: string | null;
  createdAt: string;
  beneficiaire_id: string;
  lien: {
    niveau: string;
    user: { id: string; nom: string; prenom: string; telephone: string };
  };
}

export default function EmployeurDotations() {
  const { user } = useAuth();
  const entrepriseId = user?.entrepriseId;
  const qc = useQueryClient();
  const moisCourant = new Date().toISOString().slice(0, 7) + '-01';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dotations-employeur', entrepriseId],
    queryFn: () =>
      api.get(`/dotations?entrepriseId=${entrepriseId}&limit=50`).then((r) => r.data.data),
    enabled: !!entrepriseId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['dotations-employeur', entrepriseId] });
    qc.invalidateQueries({ queryKey: ['employeur-wallet', entrepriseId] });
  };

  const calculer = useMutation({
    mutationFn: () => api.post('/dotations/calculer', { entrepriseId, moisConcerne: moisCourant }),
    onSuccess: invalidate,
  });

  const valider = useMutation({
    mutationFn: (ids: string[]) => api.post('/dotations/valider', { dotationIds: ids }),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur lors de la validation.'),
  });

  const distribuer = useMutation({
    mutationFn: (ids: string[]) => api.post('/dotations/distribuer', { dotationIds: ids }),
    onSuccess: () => { setActionError(null); invalidate(); },
    onError: (e: any) => setActionError(e?.response?.data?.error ?? 'Erreur lors de la distribution.'),
  });

  const items: DotationItem[] = data?.items || [];
  const calculees = items.filter((d) => d.statut === 'CALCULE');
  const validees  = items.filter((d) => d.statut === 'VALIDE');
  const selected  = items.find((d) => d.id === selectedId) ?? null;

  if (!entrepriseId) {
    return <div className="p-6 text-center text-sm text-slate-500">Profil non rattaché à une entreprise.</div>;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Dotations</div>
          <div className="text-xs text-slate-500">{items.length} dotation{items.length > 1 ? 's' : ''}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => calculer.mutate()}
            disabled={calculer.isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            <Play size={14} />
            {calculer.isPending ? 'Calcul…' : 'Calculer le mois'}
          </button>
          {calculees.length > 0 && (
            <button
              onClick={() => valider.mutate(calculees.map((d) => d.id))}
              disabled={valider.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] bg-[#B45309] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              <CheckSquare size={14} />
              {valider.isPending ? 'Validation…' : `Valider tout (${calculees.length})`}
            </button>
          )}
          {validees.length > 0 && (
            <button
              onClick={() => distribuer.mutate(validees.map((d) => d.id))}
              disabled={distribuer.isPending}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-[13px] bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors disabled:opacity-60"
            >
              <Send size={14} />
              {distribuer.isPending ? 'Distribution…' : `Distribuer (${validees.length})`}
            </button>
          )}
        </div>
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
              {['BÉNÉFICIAIRE', 'NIVEAU', 'TITRES', 'PART EMPLOYEUR', 'MOIS', 'STATUT'].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays size={24} className="text-slate-300" />
                    <div className="text-sm text-slate-400">Aucune dotation. Lancez le calcul du mois.</div>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((d, idx) => {
                const [bg, fg] = PALETTE[idx % PALETTE.length];
                const initials = `${d.lien.user.prenom[0] ?? ''}${d.lien.user.nom[0] ?? ''}`.toUpperCase();
                const mois = new Date(d.mois_concerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelectedId(d.id === selectedId ? null : d.id)}
                    className={clsx(
                      'border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
                      selectedId === d.id ? 'bg-slate-50' : 'hover:bg-slate-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0" style={{ background: bg, color: fg }}>
                          {initials}
                        </div>
                        <span className="text-xs font-medium text-slate-900">{d.lien.user.prenom} {d.lien.user.nom}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded-[10px]">{niveauLabel[d.lien.niveau] ?? d.lien.niveau}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{d.nb_titres} jours</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-900">{Number(d.part_employeur).toLocaleString('fr-FR')} XOF</td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{mois}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-[10px] px-2 py-0.5 rounded-[10px] font-medium', statutBadge[d.statut] ?? 'bg-slate-100 text-slate-700')}>
                        {statutLabel[d.statut] ?? d.statut}
                      </span>
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
        <Drawer
          dotation={selected}
          onClose={() => setSelectedId(null)}
          onValider={() => valider.mutate([selected.id])}
          onDistribuer={() => distribuer.mutate([selected.id])}
          isPending={valider.isPending || distribuer.isPending}
        />
      )}
    </div>
  );
}

function Drawer({
  dotation, onClose, onValider, onDistribuer, isPending,
}: {
  dotation: DotationItem;
  onClose: () => void;
  onValider: () => void;
  onDistribuer: () => void;
  isPending: boolean;
}) {
  const u = dotation.lien.user;
  const initials = `${u.prenom[0] ?? ''}${u.nom[0] ?? ''}`.toUpperCase();
  const mois = new Date(dotation.mois_concerne).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const steps = [
    { key: 'CALCULE',   label: 'Calculé',   date: fmtDate(dotation.createdAt) },
    { key: 'VALIDE',    label: 'Validé',    date: fmtDate(dotation.valide_at) },
    { key: 'DISTRIBUE', label: 'Distribué', date: fmtDate(dotation.distribue_at) },
  ];
  const stepIdx = steps.findIndex((s) => s.key === dotation.statut);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[380px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full overflow-y-auto">

        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[12px] font-medium text-[#185FA5]">
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-slate-900">{u.prenom} {u.nom}</div>
              <div className="text-[11px] text-slate-400">{u.telephone}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 px-5 py-4 space-y-5">
          {/* Statut */}
          <span className={clsx('text-[11px] px-2.5 py-1 rounded-full font-medium', statutBadge[dotation.statut])}>
            {statutLabel[dotation.statut]}
          </span>

          {/* Montants */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Mois concerné</span>
              <span className="text-xs font-medium text-slate-900 capitalize">{mois}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Jours ouvrés</span>
              <span className="text-xs font-medium text-slate-900">{dotation.nb_titres} titres</span>
            </div>
            <div className="border-t border-slate-200 pt-2.5 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Part employeur</span>
                <span className="font-mono text-xs font-semibold text-tikexo-primary">{fmtXOF(dotation.part_employeur)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-500">Part salarié</span>
                <span className="font-mono text-xs text-slate-600">{fmtXOF(dotation.part_salarie)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-200 pt-1.5">
                <span className="text-[11px] text-slate-700 font-medium">Total dotation</span>
                <span className="font-mono text-xs font-semibold text-slate-900">{fmtXOF(dotation.montant_total)}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="text-[10px] text-slate-400 tracking-[0.5px] mb-3">PROGRESSION</div>
            <div className="space-y-0">
              {steps.map((step, i) => {
                const done = i <= stepIdx;
                const active = i === stepIdx;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={clsx(
                        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                        done ? 'bg-tikexo-primary' : 'bg-slate-100'
                      )}>
                        {done ? <CheckCircle size={12} className="text-white" /> : <Clock size={10} className="text-slate-300" />}
                      </div>
                      {i < steps.length - 1 && (
                        <div className={clsx('w-px h-6 mt-0.5', done && i < stepIdx ? 'bg-tikexo-primary' : 'bg-slate-100')} />
                      )}
                    </div>
                    <div className="pb-3">
                      <div className={clsx('text-[12px] font-medium', done ? 'text-slate-900' : 'text-slate-300')}>
                        {step.label}
                        {active && <span className="ml-2 text-[10px] text-tikexo-accent font-normal">● En cours</span>}
                      </div>
                      {done && step.date !== '—' && (
                        <div className="text-[10px] text-slate-400">{step.date}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Niveau */}
          <div className="flex items-center justify-between py-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-500">Niveau</span>
            <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {niveauLabel[dotation.lien.niveau] ?? dotation.lien.niveau}
            </span>
          </div>
        </div>

        {/* Actions drawer */}
        {dotation.statut !== 'DISTRIBUE' && (
          <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2">
            {dotation.statut === 'CALCULE' && (
              <button
                onClick={onValider}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-[#B45309] text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <CheckSquare size={15} />
                {isPending ? 'Validation…' : 'Valider cette dotation'}
              </button>
            )}
            {dotation.statut === 'VALIDE' && (
              <button
                onClick={onDistribuer}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium bg-tikexo-primary text-white hover:bg-tikexo-accent transition-colors disabled:opacity-60"
              >
                <Banknote size={15} />
                {isPending ? 'Distribution…' : 'Distribuer au bénéficiaire'}
              </button>
            )}
            <p className="text-[10px] text-slate-400 text-center">
              {dotation.statut === 'CALCULE'
                ? 'Valider pour bloquer les fonds sur le wallet entreprise'
                : 'Crédite immédiatement le wallet bénéficiaire'}
            </p>
          </div>
        )}

        {dotation.statut === 'DISTRIBUE' && (
          <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 text-[12px] text-[#3B6D11]">
              <CheckCircle size={14} />
              Distribué le {fmtDate(dotation.distribue_at)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
