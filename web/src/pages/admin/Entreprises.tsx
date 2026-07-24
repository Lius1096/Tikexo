import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  X, ShieldCheck, ShieldOff, Building2, Wallet, Users, MapPin,
  Phone, Mail, Calendar, ChevronRight, AlertCircle, CheckCircle2,
  FileText, Eye, Ban, Trash2,
} from 'lucide-react';
import api from '../../lib/api';
import { fmt, fmtDate } from '../../utils/format';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

// ── Types ──────────────────────────────────────────────────────────────────
interface EntrepriseRow {
  id: string;
  nom: string;
  nif: string;
  rccm?: string;
  secteur?: string;
  adresse?: string;
  ville: string;
  telephone_rh?: string;
  email_rh?: string;
  statut: string;
  kyb_valide: boolean;
  plan: string;
  taux_commission_defaut: string;
  createdAt: string;
  wallet?: { solde: string; solde_reserve: string };
  _count?: { liensBeneficiaires: number };
  volumeMois?: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  createdAt: string;
  user?: { nom: string; prenom: string; role: string } | null;
}

interface MembreRH {
  id: string;
  role: string;
  user: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    role: string;
    statut: string;
    createdAt: string;
  };
}

interface KybDoc {
  id: string;
  type: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  fichier_nom: string;
  fichier_taille: number;
  fichier_url: string;
  motif_rejet?: string;
  createdAt: string;
}

interface KybData {
  id: string;
  statut: string;
  kyb_deadline: string;
  jours_restants: number;
  nb_obligatoires_upload: number;
  docs_actifs: Record<string, KybDoc>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  CARTE_NIF: 'Carte NIF / Attestation DGID',
  EXTRAIT_RCCM: 'Extrait RCCM',
  PIECE_IDENTITE_DIRIGEANT: "Pièce d'identité du dirigeant",
  STATUTS_SOCIETE: 'Statuts de la société',
};

const PLAN_LABELS: Record<string, string> = {
  PME_S: 'PME · S',
  PME_M: 'PME · M',
  ETI: 'ETI',
  GE: 'Grandes Entreprises',
};

const ACTION_LABELS: Record<string, string> = {
  INSCRIPTION: 'Entreprise inscrite',
  KYB_VALIDE: 'Dossier KYB validé',
  ENTREPRISE_SUSPENDUE: 'Entreprise suspendue',
  ENTREPRISE_ARCHIVEE: 'Entreprise archivée',
};

const STATUT_ENT = {
  ACTIF:      { label: 'Actif',      cls: 'bg-[#EAF3DE] text-[#3B6D11]' },
  EN_ATTENTE: { label: 'En attente', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  SUSPENDU:   { label: 'Suspendu',   cls: 'bg-[#FCEBEB] text-[#A32D2D]' },
  ARCHIVE:    { label: 'Archivé',    cls: 'bg-[#F1F5F9] text-[#64748B]' },
};

const STATUT_KYB = {
  NON_SOUMIS: { label: 'Non soumis',   cls: 'bg-[#F1F5F9] text-[#64748B]' },
  EN_COURS:   { label: 'En cours',     cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  EN_REVUE:   { label: 'En revue',     cls: 'bg-[#DBEAFE] text-[#185FA5]' },
  VALIDE:     { label: 'KYB validé',   cls: 'bg-[#EAF3DE] text-[#3B6D11]' },
  REJETE:     { label: 'Rejeté',       cls: 'bg-[#FCEBEB] text-[#A32D2D]' },
};

const DOC_STATUT = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  VALIDE:     { label: 'Validé',     cls: 'bg-[#EAF3DE] text-[#3B6D11]' },
  REJETE:     { label: 'Rejeté',     cls: 'bg-[#FCEBEB] text-[#A32D2D]' },
};

// ── Page principale ────────────────────────────────────────────────────────
const LIMIT = 20;

export default function AdminEntreprises() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  React.useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-entreprises', page, debouncedSearch],
    queryFn: () => api.get('/entreprises', { params: { page, limit: LIMIT, q: debouncedSearch || undefined } }).then((r) => r.data.data),
  });

  const items: EntrepriseRow[] = data?.items || [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Entreprises</div>
          <div className="text-xs text-slate-500">{total} entreprise{total > 1 ? 's' : ''}</div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou NIF…"
          className="w-64 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1A3C5E]/20 focus:border-[#1A3C5E]"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['NOM', 'PLAN', 'VILLE', 'SALARIÉS', 'TRAFIC/MOIS', 'WALLET', 'STATUT', 'KYB', 'INSCRIPTION', ''].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-slate-400">Aucune entreprise</td></tr>
            ) : items.map((e) => {
              const st = STATUT_ENT[e.statut as keyof typeof STATUT_ENT] || STATUT_ENT.EN_ATTENTE;
              const kybSt = e.kyb_valide ? STATUT_KYB.VALIDE : STATUT_KYB.EN_COURS;
              return (
                <tr
                  key={e.id}
                  onClick={() => setSelectedId(e.id === selectedId ? null : e.id)}
                  className={clsx(
                    'border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
                    selectedId === e.id ? 'bg-slate-50' : 'hover:bg-slate-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1A3C5E] flex items-center justify-center flex-shrink-0">
                        <Building2 size={13} className="text-white/70" />
                      </div>
                      <div className="text-xs font-medium text-slate-900 truncate max-w-[140px]">{e.nom}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{PLAN_LABELS[e.plan] ?? e.plan}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{e.ville}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{e._count?.liensBeneficiaires ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{fmt(e.volumeMois || 0)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-900">
                    {fmt(e.wallet?.solde || 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', st.cls)}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', kybSt.cls)}>{kybSt.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(e.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className={clsx('text-slate-300 transition-transform', selectedId === e.id && 'rotate-90')} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">Page {page} sur {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <EntrepriseDrawer
          entrepriseId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-entreprises'] })}
        />
      )}
    </div>
  );
}

// ── Drawer détail entreprise ───────────────────────────────────────────────
function EntrepriseDrawer({
  entrepriseId,
  onClose,
  onUpdated,
}: {
  entrepriseId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const [rejetModal, setRejetModal] = useState<{ docId: string; label: string } | null>(null);
  const [motif, setMotif] = useState('');
  const [motifErr, setMotifErr] = useState('');
  const [confirmModal, setConfirmModal] = useState<{ titre: string; message: string; onConfirmer: () => void } | null>(null);

  const { data: ent, isLoading: entLoading } = useQuery<EntrepriseRow>({
    queryKey: ['admin-entreprise-detail', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}`).then((r) => r.data.data),
  });

  const { data: kyb, isLoading: kybLoading } = useQuery<KybData>({
    queryKey: ['admin-kyb-dossier', entrepriseId],
    queryFn: () => api.get(`/kyb/admin/dossiers/${entrepriseId}`).then((r) => r.data.data),
  });

  const { data: equipeRH } = useQuery<MembreRH[]>({
    queryKey: ['admin-equipe-rh', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/equipe-rh`).then((r) => r.data.data),
  });

  const { data: stats } = useQuery<{ parMois: { mois: number; total: number }[] }>({
    queryKey: ['admin-entreprise-stats', entrepriseId],
    queryFn: () => api.get(`/entreprises/${entrepriseId}/stats`).then((r) => r.data.data),
  });
  const dotationsMoisEnCours = stats?.parMois?.[new Date().getMonth()]?.total ?? 0;

  const { data: activite } = useQuery<{ items: AuditLogEntry[] }>({
    queryKey: ['admin-entreprise-activite', entrepriseId],
    queryFn: () => api.get('/admin/audit-logs', { params: { entite: 'Entreprise', entite_id: entrepriseId, limit: 20 } }).then((r) => r.data.data),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['admin-entreprise-detail', entrepriseId] });
    qc.invalidateQueries({ queryKey: ['admin-kyb-dossier', entrepriseId] });
    qc.invalidateQueries({ queryKey: ['admin-equipe-rh', entrepriseId] });
    qc.invalidateQueries({ queryKey: ['admin-entreprise-activite', entrepriseId] });
    onUpdated();
  };

  const toggleStatutMut = useMutation({
    mutationFn: (userId: string) =>
      api.post(`/entreprises/${entrepriseId}/users/${userId}/toggle-statut`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-equipe-rh', entrepriseId] }),
  });

  const validerGlobalMut = useMutation({
    mutationFn: () => api.patch(`/kyb/admin/dossiers/${kyb!.id}/valider-global`),
    onSuccess: invalidateAll,
  });

  const validerDocMut = useMutation({
    mutationFn: (docId: string) => api.patch(`/kyb/admin/documents/${docId}/valider`),
    onSuccess: invalidateAll,
  });

  const rejeterDocMut = useMutation({
    mutationFn: ({ docId, motif_rejet }: { docId: string; motif_rejet: string }) =>
      api.patch(`/kyb/admin/documents/${docId}/rejeter`, { motif_rejet }),
    onSuccess: () => { invalidateAll(); setRejetModal(null); setMotif(''); },
  });

  const suspendMut = useMutation({
    mutationFn: () => api.post(`/entreprises/${entrepriseId}/suspendre`),
    onSuccess: invalidateAll,
  });

  const archiverMut = useMutation({
    mutationFn: () => api.post(`/entreprises/${entrepriseId}/archiver`),
    onSuccess: () => { invalidateAll(); onClose(); },
  });

  function soumettrRejet() {
    if (motif.trim().length < 20) { setMotifErr('Minimum 20 caractères'); return; }
    rejeterDocMut.mutate({ docId: rejetModal!.docId, motif_rejet: motif.trim() });
  }

  const isLoading = entLoading || kybLoading;
  const kybStatut = kyb?.statut as keyof typeof STATUT_KYB | undefined;
  const kybBadge = kybStatut ? STATUT_KYB[kybStatut] : STATUT_KYB.NON_SOUMIS;
  const docsActifs = Object.values(kyb?.docs_actifs || {}) as KybDoc[];

  return (
    <>
      <div className="fixed inset-0 z-40 flex">
        <div className="flex-1" onClick={onClose} />

        <div className="w-[480px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1A3C5E] flex items-center justify-center">
                <Building2 size={16} className="text-white/70" />
              </div>
              <div>
                <div className="text-[13px] font-medium text-slate-900">
                  {isLoading ? '…' : ent?.nom}
                </div>
                <div className="text-[11px] text-slate-400 font-mono">{ent?.nif}</div>
              </div>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100">
              <X size={14} className="text-slate-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-slate-400">Chargement…</div>
            ) : !ent ? null : (
              <>
                {/* ── Infos entreprise ────────────────────────────────── */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">INFORMATIONS</div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <InfoRow icon={<Building2 size={12} />} label="Entreprise" value={ent.nom} />
                    <InfoRow icon={<FileText size={12} />} label="NIF" value={ent.nif} mono />
                    {ent.rccm && <InfoRow icon={<FileText size={12} />} label="RCCM" value={ent.rccm} mono />}
                    {ent.secteur && <InfoRow icon={<Building2 size={12} />} label="Secteur" value={ent.secteur} />}
                    <InfoRow icon={<MapPin size={12} />} label="Ville" value={ent.ville} />
                    {ent.adresse && <InfoRow icon={<MapPin size={12} />} label="Adresse" value={ent.adresse} />}
                    {ent.telephone_rh && <InfoRow icon={<Phone size={12} />} label="Téléphone RH" value={ent.telephone_rh} mono />}
                    {ent.email_rh && <InfoRow icon={<Mail size={12} />} label="Email RH" value={ent.email_rh} />}
                    <InfoRow icon={<Calendar size={12} />} label="Inscription" value={fmtDate(ent.createdAt)} />
                    <InfoRow icon={<Users size={12} />} label="Salariés actifs" value={String(ent._count?.liensBeneficiaires ?? '—')} />
                  </div>

                  {/* Wallet */}
                  <div className="bg-[#1A3C5E] rounded-xl px-4 py-3 text-white mt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-white/40 mb-0.5">Solde wallet</div>
                        <div className="font-mono text-lg font-medium">{fmt(ent.wallet?.solde || 0)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-white/40 mb-0.5">Réservé</div>
                        <div className="font-mono text-sm text-amber-300">{fmt(ent.wallet?.solde_reserve || 0)}</div>
                      </div>
                      <Wallet size={20} className="text-white/20" />
                    </div>
                  </div>

                  {/* Dotations du mois en cours */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 mt-2">
                    <div className="text-[11px] text-slate-500">Dotations distribuées ce mois-ci</div>
                    <div className="font-mono text-sm font-medium text-slate-900">{fmt(dotationsMoisEnCours)}</div>
                  </div>

                  {/* Statuts */}
                  <div className="flex gap-2 mt-3">
                    {(() => {
                      const st = STATUT_ENT[ent.statut as keyof typeof STATUT_ENT] || STATUT_ENT.EN_ATTENTE;
                      return <span className={clsx('text-[10px] px-2.5 py-1 rounded-full font-medium', st.cls)}>{st.label}</span>;
                    })()}
                    <span className={clsx('text-[10px] px-2.5 py-1 rounded-full font-medium', kybBadge.cls)}>
                      {kybBadge.label}
                    </span>
                  </div>
                </div>

                {/* ── Dossier KYB ─────────────────────────────────────── */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] text-slate-400 tracking-[1.5px]">DOSSIER KYB</div>
                    {kyb && (
                      <div className="text-[10px] text-slate-500">
                        {kyb.nb_obligatoires_upload}/3 docs · {kyb.jours_restants}j restants
                      </div>
                    )}
                  </div>

                  {!kyb ? (
                    <div className="text-xs text-slate-400 py-2">Aucun dossier KYB</div>
                  ) : docsActifs.length === 0 ? (
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                      <AlertCircle size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-500">Aucun document uploadé</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {docsActifs.map((doc) => {
                        const ds = DOC_STATUT[doc.statut];
                        return (
                          <div key={doc.id} className="border border-slate-100 rounded-xl overflow-hidden">
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-slate-50">
                              <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                                <FileText size={13} className="text-slate-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] font-medium text-slate-900 truncate">
                                  {DOC_LABELS[doc.type] || doc.type}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {doc.fichier_nom} · {fmtDate(doc.createdAt)}
                                </div>
                              </div>
                              <span className={clsx('text-[9px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', ds.cls)}>
                                {ds.label}
                              </span>
                            </div>

                            {doc.motif_rejet && (
                              <div className="px-3 py-2 bg-[#FEF2F2] border-t border-red-100 flex items-start gap-2">
                                <AlertCircle size={11} className="text-red-400 flex-shrink-0 mt-0.5" />
                                <span className="text-[10px] text-red-700 leading-relaxed">{doc.motif_rejet}</span>
                              </div>
                            )}

                            {doc.statut === 'EN_ATTENTE' && (
                              <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-white">
                                <a
                                  href={`http://localhost:3001${doc.fichier_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-[#0EA5E9] hover:underline mr-auto"
                                >
                                  <Eye size={11} /> Voir le fichier
                                </a>
                                <button
                                  onClick={() => validerDocMut.mutate(doc.id)}
                                  disabled={validerDocMut.isPending}
                                  className="flex items-center gap-1 text-[10px] font-medium text-[#3B6D11] bg-[#EAF3DE] px-2.5 py-1 rounded-lg hover:bg-[#d4ecbc] transition-colors disabled:opacity-50"
                                >
                                  <CheckCircle2 size={11} /> Valider
                                </button>
                                <button
                                  onClick={() => { setRejetModal({ docId: doc.id, label: DOC_LABELS[doc.type] || doc.type }); setMotif(''); setMotifErr(''); }}
                                  className="flex items-center gap-1 text-[10px] font-medium text-[#A32D2D] bg-[#FCEBEB] px-2.5 py-1 rounded-lg hover:bg-[#f5d0d0] transition-colors"
                                >
                                  <X size={11} /> Rejeter
                                </button>
                              </div>
                            )}

                            {doc.statut === 'VALIDE' && (
                              <div className="flex items-center gap-2 px-3 py-1.5 border-t border-slate-100 bg-white">
                                <a
                                  href={`http://localhost:3001${doc.fichier_url}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[10px] text-[#0EA5E9] hover:underline"
                                >
                                  <Eye size={11} /> Voir le fichier
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Équipe RH ───────────────────────────────────────── */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">ÉQUIPE RH</div>
                  {!equipeRH || equipeRH.length === 0 ? (
                    <div className="text-[11px] text-slate-400">Aucun compte RH rattaché</div>
                  ) : (
                    <div className="space-y-2">
                      {equipeRH.map((m) => {
                        const isBloque = m.user.statut === 'BLOQUE';
                        const initials = `${m.user.prenom?.[0] ?? ''}${m.user.nom?.[0] ?? ''}`.toUpperCase() || '?';
                        return (
                          <div key={m.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                            <div className={clsx(
                              'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0',
                              isBloque ? 'bg-[#FCEBEB] text-[#A32D2D]' : 'bg-[#DBEAFE] text-[#185FA5]'
                            )}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-medium text-slate-900">
                                  {m.user.prenom} {m.user.nom}
                                </span>
                                <span className={clsx(
                                  'text-[9px] px-1.5 py-0.5 rounded-full font-medium',
                                  m.user.role === 'ADMIN_RH'
                                    ? 'bg-[#DBEAFE] text-[#185FA5]'
                                    : 'bg-[#F1F5F9] text-[#64748B]'
                                )}>
                                  {m.user.role === 'ADMIN_RH' ? 'Admin RH' : 'Gestionnaire RH'}
                                </span>
                              </div>
                              <div className="font-mono text-[10px] text-slate-400 mt-0.5">{m.user.telephone}</div>
                            </div>
                            <button
                              onClick={() => {
                                const action = isBloque ? 'Réactiver' : 'Bloquer';
                                setConfirmModal({
                                  titre: `${action} le compte`,
                                  message: `Voulez-vous ${action.toLowerCase()} le compte de ${m.user.prenom} ${m.user.nom} ?`,
                                  onConfirmer: () => toggleStatutMut.mutate(m.user.id),
                                });
                              }}
                              disabled={toggleStatutMut.isPending}
                              className={clsx(
                                'text-[10px] px-2.5 py-1 rounded-lg font-medium flex-shrink-0 transition-colors disabled:opacity-50',
                                isBloque
                                  ? 'bg-[#EAF3DE] text-[#3B6D11] hover:bg-[#d4ecbc]'
                                  : 'bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#f5d0d0]'
                              )}
                            >
                              {isBloque ? 'Réactiver' : 'Bloquer'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Historique d'activité ─────────────────────────────── */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">HISTORIQUE D'ACTIVITÉ</div>
                  {!activite?.items || activite.items.length === 0 ? (
                    <div className="text-[11px] text-slate-400">Aucune activité enregistrée</div>
                  ) : (
                    <div className="space-y-2.5">
                      {activite.items.map((log) => (
                        <div key={log.id} className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-slate-700">{ACTION_LABELS[log.action] ?? log.action}</div>
                            <div className="text-[10px] text-slate-400">
                              {fmtDate(log.createdAt)}
                              {log.user && ` · ${log.user.prenom} ${log.user.nom}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Actions ─────────────────────────────────────────── */}
                <div className="px-5 py-4 space-y-2">
                  <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">ACTIONS</div>

                  {!ent.kyb_valide && kyb && kyb.nb_obligatoires_upload >= 3 && (
                    <button
                      onClick={() => validerGlobalMut.mutate()}
                      disabled={validerGlobalMut.isPending}
                      className="w-full flex items-center justify-center gap-2 bg-[#EAF3DE] text-[#3B6D11] text-sm font-medium py-2.5 rounded-lg hover:bg-[#d4ecbc] transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck size={15} />
                      {validerGlobalMut.isPending ? 'Validation…' : 'Valider le dossier KYB complet'}
                    </button>
                  )}

                  {!ent.kyb_valide && (!kyb || kyb.nb_obligatoires_upload < 3) && (
                    <div className="flex items-center gap-2 bg-[#FAEEDA] rounded-lg px-3 py-2.5">
                      <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                      <span className="text-[11px] text-amber-800">
                        {kyb
                          ? `${3 - kyb.nb_obligatoires_upload} document${3 - kyb.nb_obligatoires_upload > 1 ? 's' : ''} obligatoire${3 - kyb.nb_obligatoires_upload > 1 ? 's' : ''} manquant${3 - kyb.nb_obligatoires_upload > 1 ? 's' : ''} avant validation`
                          : 'Aucun document soumis'}
                      </span>
                    </div>
                  )}

                  {ent.kyb_valide && (
                    <div className="flex items-center gap-2 bg-[#EAF3DE] rounded-lg px-3 py-2.5">
                      <ShieldCheck size={13} className="text-[#3B6D11]" />
                      <span className="text-[11px] text-[#27500A] font-medium">KYB validé — accès complet débloqué</span>
                    </div>
                  )}

                  {ent.statut !== 'SUSPENDU' && (
                    <button
                      onClick={() => setConfirmModal({
                        titre: 'Suspendre l\'entreprise',
                        message: `Voulez-vous vraiment suspendre ${ent.nom} ? Ses employés ne pourront plus effectuer de transactions.`,
                        onConfirmer: () => suspendMut.mutate(),
                      })}
                      disabled={suspendMut.isPending}
                      className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Ban size={14} />
                      Suspendre l'entreprise
                    </button>
                  )}

                  {ent.statut !== 'ARCHIVE' && (
                    <button
                      onClick={() => setConfirmModal({
                        titre: 'Supprimer l\'entreprise',
                        message: `Voulez-vous vraiment supprimer ${ent.nom} ? L'entreprise sera archivée — ses données (wallet, historique, bénéficiaires) sont conservées mais elle disparaît des listes actives et ses employés perdent l'accès.`,
                        onConfirmer: () => archiverMut.mutate(),
                      })}
                      disabled={archiverMut.isPending}
                      className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Supprimer
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {confirmModal && (
        <ConfirmModal
          titre={confirmModal.titre}
          message={confirmModal.message}
          danger
          onConfirmer={() => { confirmModal.onConfirmer(); setConfirmModal(null); }}
          onAnnuler={() => setConfirmModal(null)}
        />
      )}

      {/* Modale rejet */}
      {rejetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[13px] font-medium text-slate-900">Rejeter le document</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{rejetModal.label}</div>
              </div>
              <button onClick={() => setRejetModal(null)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100">
                <X size={14} className="text-slate-500" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Motif de rejet <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal"> (min 20 caractères)</span>
                </label>
                <textarea
                  value={motif}
                  onChange={(e) => { setMotif(e.target.value); setMotifErr(''); }}
                  placeholder="ex : L'image est floue et le numéro est illisible…"
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400"
                />
                <div className="flex justify-between mt-1">
                  {motifErr && <span className="text-[10px] text-red-500">{motifErr}</span>}
                  <span className={clsx('text-[10px] ml-auto', motif.length >= 20 ? 'text-[#3B6D11]' : 'text-slate-400')}>
                    {motif.length}/20
                  </span>
                </div>
              </div>

              {/* Suggestions */}
              <div>
                <div className="text-[10px] text-slate-400 mb-1.5">Suggestions</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Document illisible ou flou',
                    'Document expiré',
                    'Ne correspond pas au type demandé',
                    'Informations incohérentes',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setMotif(s); setMotifErr(''); }}
                      className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full hover:bg-slate-200 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setRejetModal(null)}
                  className="flex-1 border border-slate-200 text-slate-600 text-sm py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={soumettrRejet}
                  disabled={rejeterDocMut.isPending}
                  className="flex-1 bg-[#FCEBEB] text-[#A32D2D] text-sm font-medium py-2.5 rounded-lg hover:bg-[#f5d0d0] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ShieldOff size={14} />
                  {rejeterDocMut.isPending ? 'Envoi…' : 'Envoyer le rejet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Composant helper ligne info ────────────────────────────────────────────
function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-slate-400 mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-[10px] text-slate-400">{label}</div>
        <div className={clsx('text-[11px] text-slate-800', mono && 'font-mono')}>{value}</div>
      </div>
    </div>
  );
}
