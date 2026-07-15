import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  X, ArrowRightLeft, Clock, CheckCircle2, AlertCircle,
  ChevronDown, Mail, Building2, RefreshCw, Archive,
} from 'lucide-react';
import api from '../../lib/api';
import { fmtDate } from '../../utils/format';

// ── Types ──────────────────────────────────────────────────────────────────
interface MutationItem {
  id: string;
  statut: 'EN_ATTENTE' | 'DETECTE' | 'REEMBAUCHE' | 'TRAITE' | 'EXPIRE';
  user: { nom: string; prenom: string; telephone: string; email_pro: string | null };
  entrepriseA: { id: string; nom: string; ville: string };
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

interface EntrepriseGroupe {
  id: string;
  nom: string;
  ville: string;
  mutations: MutationItem[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const STATUT_CFG: Record<string, { label: string; cls: string; dot: string; icon: React.ReactNode }> = {
  EN_ATTENTE:  { label: 'En attente de B',  cls: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-400',   icon: <Clock size={11} /> },
  DETECTE:     { label: 'À traiter',         cls: 'bg-blue-50 text-blue-700',     dot: 'bg-blue-500',    icon: <AlertCircle size={11} /> },
  REEMBAUCHE:  { label: 'Réembauché',        cls: 'bg-green-50 text-green-700',   dot: 'bg-green-500',   icon: <RefreshCw size={11} /> },
  TRAITE:      { label: 'Traité',            cls: 'bg-slate-100 text-slate-600',  dot: 'bg-slate-400',   icon: <CheckCircle2 size={11} /> },
  EXPIRE:      { label: 'Expiré',            cls: 'bg-red-50 text-red-400',       dot: 'bg-red-300',     icon: <Archive size={11} /> },
};

const FILTRE_TABS = [
  { key: 'ACTIF',      label: 'À gérer' },
  { key: 'DETECTE',    label: 'À traiter' },
  { key: 'EN_ATTENTE', label: 'En attente' },
  { key: 'REEMBAUCHE', label: 'Réembauché' },
  { key: 'TRAITE',     label: 'Traité' },
  { key: 'EXPIRE',     label: 'Expiré' },
] as const;

type FiltreKey = typeof FILTRE_TABS[number]['key'];

function groupParEntreprise(items: MutationItem[]): EntrepriseGroupe[] {
  const map = new Map<string, EntrepriseGroupe>();
  for (const m of items) {
    const key = m.entrepriseA.id;
    if (!map.has(key)) {
      map.set(key, { id: key, nom: m.entrepriseA.nom, ville: m.entrepriseA.ville, mutations: [] });
    }
    map.get(key)!.mutations.push(m);
  }
  // Trier : entreprises avec DETECTE en tête
  return Array.from(map.values()).sort((a, b) => {
    const aDetecte = a.mutations.filter((m) => m.statut === 'DETECTE').length;
    const bDetecte = b.mutations.filter((m) => m.statut === 'DETECTE').length;
    return bDetecte - aDetecte;
  });
}

// ── Page principale ──────────────────────────────────────────────────────────
export default function AdminMutations() {
  const [filtre, setFiltre] = useState<FiltreKey>('ACTIF');
  const [selected, setSelected] = useState<MutationItem | null>(null);
  const [ouverts, setOuverts] = useState<Set<string>>(new Set());

  const queryKey = ['admin-mutations', filtre];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const statut = filtre === 'ACTIF' ? '' : `?statut=${filtre}`;
      return api.get(`/mutations${statut}&limit=200`).then((r) => r.data.data);
    },
  });

  const allItems: MutationItem[] = data?.items || [];

  // Pour "À gérer" : DETECTE + EN_ATTENTE uniquement
  const items = filtre === 'ACTIF'
    ? allItems.filter((m) => m.statut === 'DETECTE' || m.statut === 'EN_ATTENTE')
    : allItems;

  const groupes = groupParEntreprise(items);
  const nbDetecte = allItems.filter((m) => m.statut === 'DETECTE').length;

  function toggleAccordeon(id: string) {
    setOuverts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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

      {/* Tabs filtre */}
      <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-lg w-fit">
        {FILTRE_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setFiltre(t.key); setOuverts(new Set()); }}
            className={clsx(
              'text-[11px] font-medium px-3 py-1.5 rounded-md transition-colors',
              filtre === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Corps */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}
        </div>
      ) : groupes.length === 0 ? (
        <div className="py-16 text-center">
          <ArrowRightLeft size={24} className="text-slate-200 mx-auto mb-3" />
          <div className="text-sm text-slate-400">Aucune mutation dans cette catégorie</div>
        </div>
      ) : (
        <div className="space-y-3">
          {groupes.map((g) => {
            const ouvert = ouverts.has(g.id);
            const nbAction  = g.mutations.filter((m) => m.statut === 'DETECTE').length;
            const nbAttente = g.mutations.filter((m) => m.statut === 'EN_ATTENTE').length;
            const nbReemb   = g.mutations.filter((m) => m.statut === 'REEMBAUCHE').length;
            const nbTraite  = g.mutations.filter((m) => m.statut === 'TRAITE').length;
            const nbExpire  = g.mutations.filter((m) => m.statut === 'EXPIRE').length;

            return (
              <div key={g.id} className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                {/* En-tête accordéon */}
                <button
                  onClick={() => toggleAccordeon(g.id)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] flex items-center justify-center flex-shrink-0">
                      <Building2 size={16} className="text-[#185FA5]" />
                    </div>
                    <div className="text-left">
                      <div className="text-[13px] font-medium text-slate-900">{g.nom}</div>
                      <div className="text-[10px] text-slate-400">{g.ville} · {g.mutations.length} mutation{g.mutations.length > 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Badges de synthèse */}
                    {nbAction > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                        <AlertCircle size={9} /> {nbAction} à traiter
                      </span>
                    )}
                    {nbAttente > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-700">
                        <Clock size={9} /> {nbAttente} en attente
                      </span>
                    )}
                    {nbReemb > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700">
                        <RefreshCw size={9} /> {nbReemb} réembauché
                      </span>
                    )}
                    {nbTraite > 0 && !nbAction && !nbAttente && !nbReemb && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500">
                        <CheckCircle2 size={9} /> {nbTraite} traité{nbTraite > 1 ? 's' : ''}
                      </span>
                    )}
                    {nbExpire > 0 && !nbAction && !nbAttente && !nbReemb && !nbTraite && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-50 text-red-400">
                        <Archive size={9} /> {nbExpire} expiré{nbExpire > 1 ? 's' : ''}
                      </span>
                    )}
                    <ChevronDown size={14} className={clsx('text-slate-400 transition-transform ml-1', ouvert && 'rotate-180')} />
                  </div>
                </button>

                {/* Contenu accordéon */}
                {ouvert && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {g.mutations.map((m) => {
                      const cfg = STATUT_CFG[m.statut];
                      const initials = `${m.user.prenom[0] ?? ''}${m.user.nom[0] ?? ''}`.toUpperCase();
                      const jours = Math.ceil(
                        (new Date(m.archive_planifie_at).getTime() - Date.now()) / 86400000
                      );
                      return (
                        <div
                          key={m.id}
                          onClick={() => m.statut !== 'REEMBAUCHE' && m.statut !== 'EXPIRE' && setSelected(m)}
                          className={clsx(
                            'flex items-center justify-between px-5 py-3.5 transition-colors',
                            (m.statut !== 'REEMBAUCHE' && m.statut !== 'EXPIRE') && 'cursor-pointer hover:bg-slate-50'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-medium text-slate-500 flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="text-[12px] font-medium text-slate-900">
                                {m.user.prenom} {m.user.nom}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">{m.user.telephone}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Info nouvel employeur */}
                            <div className="text-right hidden sm:block">
                              {m.statut === 'REEMBAUCHE' ? (
                                <div className="text-[10px] text-green-600">Retour dans l'entreprise</div>
                              ) : m.entrepriseB ? (
                                <div className="text-[10px] text-slate-500">→ {m.entrepriseB.nom}</div>
                              ) : m.statut === 'EN_ATTENTE' ? (
                                <div className="text-[10px] text-slate-400 italic">
                                  Limbo : {jours > 0 ? `${jours}j restants` : 'expiré'}
                                </div>
                              ) : null}
                            </div>

                            <span className={clsx('inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium', cfg.cls)}>
                              {cfg.icon} {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

          {/* Transition A → B */}
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

          {/* Statut badge */}
          <div className="flex justify-center">
            <span className={clsx('inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full font-medium', cfg.cls)}>
              {cfg.icon} {cfg.label}
            </span>
          </div>

          {/* Détails */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Départ A',        value: fmtDate(m.date_depart_a) },
              { label: 'Option solde',    value: m.option_solde === 'CONSERVATION' ? 'Conservé' : m.option_solde === 'REMBOURSEMENT' ? 'Remboursé' : '—' },
              { label: 'Limbo restant',   value: jours > 0 ? `${jours} j` : 'Expiré' },
              { label: 'Email pro avant', value: m.email_pro_avant || '—' },
              { label: 'Email pro après', value: m.email_pro_apres || '—' },
              { label: 'Traité le',       value: fmtDate(m.traite_at) },
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
                  {(traiterMut.error as any)?.response?.data?.error || 'Erreur'}
                </div>
              )}
              <button
                onClick={() => traiterMut.mutate()}
                disabled={traiterMut.isPending}
                className="w-full bg-[#1A3B8C] text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#15306e] transition-colors"
              >
                {traiterMut.isPending ? 'Traitement…' : 'Valider — envoyer le mail de bienvenue'}
              </button>
            </div>
          )}

          {/* Info EN_ATTENTE */}
          {m.statut === 'EN_ATTENTE' && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-[11px] text-amber-800">
              En attente que le nouvel employeur enregistre cet employé dans TIKEXO.
              Archivage automatique dans <strong>{jours > 0 ? `${jours} jours` : 'moins d\'un jour'}</strong>.
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
