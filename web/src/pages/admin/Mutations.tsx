import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { X, ArrowRightLeft, Clock, CheckCircle2, AlertCircle, ChevronRight, Mail } from 'lucide-react';
import api from '../../lib/api';

// ── Types ──────────────────────────────────────────────────────────────────
interface MutationItem {
  id: string;
  statut: 'EN_ATTENTE' | 'DETECTE' | 'TRAITE' | 'EXPIRE';
  user: { nom: string; prenom: string; telephone: string; email_pro: string | null };
  entrepriseA: { nom: string; ville: string };
  entrepriseB: { nom: string; ville: string } | null;
  option_solde: 'CONSERVATION' | 'REMBOURSEMENT' | null;
  montant_rembourse: string | null;
  email_pro_avant: string | null;
  email_pro_apres: string | null;
  date_depart_a: string | null;
  archive_planifie_at: string;
  traite_par: string | null;
  traite_at: string | null;
  createdAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const STATUT_CFG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700',  icon: <Clock size={11} /> },
  DETECTE:    { label: 'À traiter',  cls: 'bg-blue-50 text-blue-700',    icon: <AlertCircle size={11} /> },
  TRAITE:     { label: 'Traité',     cls: 'bg-green-50 text-green-700',  icon: <CheckCircle2 size={11} /> },
  EXPIRE:     { label: 'Expiré',     cls: 'bg-slate-100 text-slate-500', icon: <X size={11} /> },
};

const STATUT_TABS = ['TOUS', 'DETECTE', 'EN_ATTENTE', 'TRAITE', 'EXPIRE'] as const;

export default function AdminMutations() {
  const [tabStatut, setTabStatut] = useState<typeof STATUT_TABS[number]>('TOUS');
  const [selected, setSelected] = useState<MutationItem | null>(null);

  const queryKey = ['admin-mutations', tabStatut];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = tabStatut !== 'TOUS' ? `?statut=${tabStatut}` : '';
      return api.get(`/mutations${params}`).then((r) => r.data.data);
    },
  });

  const items: MutationItem[] = data?.items || [];
  const nbDetecte = items.filter((m) => m.statut === 'DETECTE').length;

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-medium text-slate-900 flex items-center gap-2">
            Mutations employés
            {nbDetecte > 0 && (
              <span className="bg-blue-600 text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                {nbDetecte} à traiter
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Vue interne TIKEXO — invisible pour les employeurs</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
        {STATUT_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTabStatut(t)}
            className={clsx(
              'text-[11px] font-medium px-3 py-1.5 rounded-md transition-colors',
              tabStatut === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t === 'TOUS' ? 'Tous' : STATUT_CFG[t].label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['EMPLOYÉ', 'ANCIEN EMPLOYEUR', 'NOUVEL EMPLOYEUR', 'SOLDE', 'DÉPART', 'STATUT', ''].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center">
                  <ArrowRightLeft size={20} className="text-slate-200 mx-auto mb-2" />
                  <div className="text-xs text-slate-400">Aucune mutation</div>
                </td>
              </tr>
            ) : (
              items.map((m) => {
                const cfg = STATUT_CFG[m.statut];
                const initials = `${m.user.prenom[0] ?? ''}${m.user.nom[0] ?? ''}`.toUpperCase();
                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelected(m)}
                    className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[10px] font-medium text-[#185FA5] flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-slate-900">{m.user.prenom} {m.user.nom}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{m.user.telephone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{m.entrepriseA.nom}</td>
                    <td className="px-4 py-3">
                      {m.entrepriseB
                        ? <span className="text-xs text-slate-700">{m.entrepriseB.nom}</span>
                        : <span className="text-[10px] text-slate-400 italic">En attente</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        m.option_solde === 'CONSERVATION' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      )}>
                        {m.option_solde === 'CONSERVATION' ? 'Conservé' : m.option_solde === 'REMBOURSEMENT' ? 'Remboursé' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(m.date_depart_a)}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium', cfg.cls)}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight size={13} className="text-slate-300" /></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <MutationDrawer mutation={selected} queryKey={queryKey} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

// ── Drawer détail + action traitement ────────────────────────────────────────
function MutationDrawer({ mutation: m, queryKey, onClose }: {
  mutation: MutationItem;
  queryKey: unknown[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [emailPro, setEmailPro] = useState('');
  const cfg = STATUT_CFG[m.statut];
  const initials = `${m.user.prenom[0] ?? ''}${m.user.nom[0] ?? ''}`.toUpperCase();

  const traiterMut = useMutation({
    mutationFn: () => api.post(`/mutations/${m.id}/traiter`, { emailProApres: emailPro || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); onClose(); },
  });

  const jours = Math.ceil(
    (new Date(m.archive_planifie_at).getTime() - Date.now()) / 86400000
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[420px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full overflow-y-auto">

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[13px] font-medium text-[#185FA5]">
              {initials}
            </div>
            <div>
              <div className="text-[13px] font-medium text-slate-900">{m.user.prenom} {m.user.nom}</div>
              <div className="font-mono text-[11px] text-slate-400">{m.user.telephone}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 px-5 py-5 space-y-5 overflow-y-auto">

          {/* Transition visuelle A → B */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Ancien employeur</div>
              <div className="text-[12px] font-medium text-slate-900">{m.entrepriseA.nom}</div>
              <div className="text-[10px] text-slate-400">{m.entrepriseA.ville}</div>
            </div>
            <ArrowRightLeft size={16} className="text-slate-300 flex-shrink-0" />
            <div className="flex-1 bg-slate-50 rounded-xl px-4 py-3 text-center">
              <div className="text-[10px] text-slate-400 mb-1">Nouvel employeur</div>
              {m.entrepriseB ? (
                <>
                  <div className="text-[12px] font-medium text-slate-900">{m.entrepriseB.nom}</div>
                  <div className="text-[10px] text-slate-400">{m.entrepriseB.ville}</div>
                </>
              ) : (
                <div className="text-[11px] text-slate-400 italic">Non détecté</div>
              )}
            </div>
          </div>

          {/* Détails */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Statut', value: <span className={clsx('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium', cfg.cls)}>{cfg.icon} {cfg.label}</span> },
              { label: 'Départ A', value: fmtDate(m.date_depart_a) },
              { label: 'Option solde', value: m.option_solde === 'CONSERVATION' ? 'Conservé' : m.option_solde === 'REMBOURSEMENT' ? 'Remboursé' : '—' },
              { label: 'Limbo restant', value: jours > 0 ? `${jours} j` : 'Expiré' },
              { label: 'Email pro avant', value: m.email_pro_avant || '—' },
              { label: 'Email pro après', value: m.email_pro_apres || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-lg px-3 py-2">
                <div className="text-[10px] text-slate-400 mb-0.5">{label}</div>
                <div className="text-[11px] text-slate-900 font-medium">{value}</div>
              </div>
            ))}
          </div>

          {/* Action DETECTE */}
          {m.statut === 'DETECTE' && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-4 space-y-3">
              <div className="text-[11px] font-medium text-blue-900">
                Détecté chez <strong>{m.entrepriseB?.nom}</strong>. Renseignez le nouvel email pro et validez.
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1.5">
                  <Mail size={11} className="inline mr-1" />
                  Nouvel email professionnel
                </label>
                <input
                  type="email"
                  value={emailPro}
                  onChange={(e) => setEmailPro(e.target.value)}
                  placeholder={`prenom.nom@${(m.entrepriseB?.nom ?? '').toLowerCase().replace(/\s+/g, '')}.bj`}
                  className="w-full border border-blue-200 bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <p className="text-[10px] text-slate-400 mt-1">Laisser vide si pas encore communiqué</p>
              </div>
              {traiterMut.isError && (
                <div className="text-[11px] text-red-600">
                  {(traiterMut.error as any)?.response?.data?.message || 'Erreur'}
                </div>
              )}
              <button
                onClick={() => traiterMut.mutate()}
                disabled={traiterMut.isPending}
                className="w-full bg-[#1A3C5E] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#1A3C5E]/90 transition-colors"
              >
                {traiterMut.isPending ? 'Traitement…' : 'Valider — envoyer le mail de bienvenue'}
              </button>
            </div>
          )}

          {/* Info EN_ATTENTE */}
          {m.statut === 'EN_ATTENTE' && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[11px] text-amber-800">
              En attente que le nouvel employeur enregistre cet employé.
              Archivage automatique dans <strong>{jours > 0 ? `${jours} jours` : 'moins d\'un jour'}</strong>.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
