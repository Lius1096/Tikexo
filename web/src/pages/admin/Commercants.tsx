import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  X, Store, Wallet, Phone, Mail, MapPin, FileText, Star,
  ShieldCheck, ShieldOff, Zap, Ban, ChevronRight, QrCode, AlertCircle,
  Eye, CheckCircle2, Receipt, Banknote,
} from 'lucide-react';
import api from '../../lib/api';
import { fmt, fmtDate } from '../../utils/format';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface CommercantDocument {
  id: string;
  type: 'PIECE_IDENTITE_GERANT' | 'JUSTIFICATIF_IFU';
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  fichier_nom: string;
  fichier_url: string;
  motif_rejet?: string;
  createdAt: string;
}

interface CommercantTransaction {
  id: string;
  montant_total: string;
  statut: string;
  createdAt: string;
  beneficiaire?: { nom: string; prenom: string };
}

interface CommercantPayout {
  id: string;
  montant: string;
  statut: string;
  fedapay_transaction_id: string;
  createdAt: string;
}

const DOC_LABELS: Record<string, string> = {
  PIECE_IDENTITE_GERANT: "Pièce d'identité du gérant",
  JUSTIFICATIF_IFU: 'Justificatif IFU',
};

const DOC_STATUT: Record<string, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  VALIDE:     { label: 'Validé',     cls: 'bg-[#EAF3DE] text-[#3B6D11]' },
  REJETE:     { label: 'Rejeté',     cls: 'bg-[#FCEBEB] text-[#A32D2D]' },
};

const PAYOUT_STATUT_CLS: Record<string, string> = {
  EN_ATTENTE: 'bg-[#FAEEDA] text-[#854F0B]',
  VALIDE:     'bg-[#EAF3DE] text-[#3B6D11]',
  ECHOUE:     'bg-[#FCEBEB] text-[#A32D2D]',
  REMBOURSE:  'bg-[#DBEAFE] text-[#185FA5]',
};
function statutPayoutCls(statut: string): string {
  return PAYOUT_STATUT_CLS[statut] ?? 'bg-slate-100 text-slate-700';
}

// ── Types ──────────────────────────────────────────────────────────────────
interface CommercantRow {
  id: string;
  nom: string;
  type: string;
  niveau: string;
  adresse?: string;
  ville: string;
  statut: string;
  note_moyenne: string;
  ifu?: string;
  mobile_money_numero?: string;
  mobile_money_operateur?: string;
  qr_code_url?: string;
  taux_commission: string;
  createdAt: string;
  user?: {
    id: string;
    telephone: string;
    nom: string;
    statut: string;
    wallet?: { solde: string; solde_reserve: string };
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUT = {
  SOUMIS:        { label: 'En attente',  cls: 'bg-[#FAEEDA] text-[#854F0B]' },
  VALIDE:        { label: 'Validé',      cls: 'bg-[#DBEAFE] text-[#185FA5]' },
  ACTIF:         { label: 'Actif',       cls: 'bg-[#EAF3DE] text-[#3B6D11]' },
  SUSPENDU:      { label: 'Suspendu',    cls: 'bg-[#FCEBEB] text-[#A32D2D]' },
  EN_VERIFICATION: { label: 'En vérif.', cls: 'bg-[#DBEAFE] text-[#185FA5]' },
};

const NIVEAU = {
  SIMPLIFIE: { label: 'Simplifié', cls: 'bg-[#F1F5F9] text-[#64748B]' },
  VERIFIE:   { label: 'Vérifié',   cls: 'bg-[#EAF3DE] text-[#3B6D11]' },
};

const TYPE_LABELS: Record<string, string> = {
  RESTAURANT: 'Restaurant', SUPERMARCHE: 'Supermarché', PHARMACIE: 'Pharmacie',
  BOULANGERIE: 'Boulangerie', STATION: 'Station-service', HOTEL: 'Hôtel',
  SANTE: 'Santé', AUTRE: 'Autre',
};

const LIMIT = 20;

// ── Page principale ────────────────────────────────────────────────────────
export default function AdminCommercants() {
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
    queryKey: ['admin-commercants', page, debouncedSearch],
    queryFn: () => api.get('/commercants', { params: { page, limit: LIMIT, q: debouncedSearch || undefined } }).then((r) => r.data.data),
  });

  const items: CommercantRow[] = data?.items || [];
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Commerçants</div>
          <div className="text-xs text-slate-500">{total} commerçant{total > 1 ? 's' : ''}</div>
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou IFU…"
          className="w-64 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-600/20 focus:border-amber-600"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-100">
              {['NOM', 'TYPE', 'VILLE', 'NIVEAU', 'STATUT', 'NOTE', ''].map((h) => (
                <th key={h} className="text-[10px] text-slate-500 text-left px-4 py-2.5 font-normal tracking-[0.5px]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Chargement…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">Aucun commerçant</td></tr>
            ) : items.map((c) => {
              const st = STATUT[c.statut as keyof typeof STATUT] || STATUT.SOUMIS;
              const nv = NIVEAU[c.niveau as keyof typeof NIVEAU] || NIVEAU.SIMPLIFIE;
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                  className={clsx(
                    'border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
                    selectedId === c.id ? 'bg-slate-50' : 'hover:bg-slate-50'
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center flex-shrink-0">
                        <Store size={13} className="text-white/80" />
                      </div>
                      <div className="text-xs font-medium text-slate-900 truncate max-w-[140px]">{c.nom}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{TYPE_LABELS[c.type] || c.type}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{c.ville}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', nv.cls)}>{nv.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', st.cls)}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-xs font-mono text-slate-700">
                      <Star size={11} className="text-amber-400 fill-amber-400" />
                      {parseFloat(c.note_moyenne || '0').toFixed(1)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className={clsx('text-slate-300 transition-transform', selectedId === c.id && 'rotate-90')} />
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
        <CommercantDrawer
          commercantId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={() => qc.invalidateQueries({ queryKey: ['admin-commercants'] })}
        />
      )}
    </div>
  );
}

// ── Drawer détail commerçant ───────────────────────────────────────────────
function CommercantDrawer({
  commercantId, onClose, onUpdated,
}: {
  commercantId: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const qc = useQueryClient();
  const [confirmModal, setConfirmModal] = useState<{ titre: string; message: string; onConfirmer: () => void } | null>(null);
  const [rejetModal, setRejetModal] = useState<{ docId: string; label: string } | null>(null);
  const [motif, setMotif] = useState('');
  const [motifErr, setMotifErr] = useState('');

  const { data: c, isLoading } = useQuery<CommercantRow>({
    queryKey: ['admin-commercant-detail', commercantId],
    queryFn: () => api.get(`/commercants/${commercantId}`).then((r) => r.data.data),
  });

  const { data: documents } = useQuery<CommercantDocument[]>({
    queryKey: ['admin-commercant-documents', commercantId],
    queryFn: () => api.get(`/commercants/${commercantId}/documents`).then((r) => r.data.data),
  });

  const { data: transactions } = useQuery<{ items: CommercantTransaction[] }>({
    queryKey: ['admin-commercant-transactions', commercantId],
    queryFn: () => api.get(`/commercants/${commercantId}/transactions`, { params: { limit: 10 } }).then((r) => r.data.data),
  });

  const { data: payouts } = useQuery<CommercantPayout[]>({
    queryKey: ['admin-commercant-payouts', commercantId],
    queryFn: () => api.get(`/commercants/${commercantId}/payouts`).then((r) => r.data.data),
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['admin-commercant-detail', commercantId] });
    onUpdated();
  };

  const validerMut  = useMutation({ mutationFn: () => api.post(`/commercants/${commercantId}/valider`), onSuccess: inv });
  const activerMut  = useMutation({ mutationFn: () => api.post(`/commercants/${commercantId}/activer`), onSuccess: inv });
  const suspendreMut = useMutation({ mutationFn: () => api.post(`/commercants/${commercantId}/suspendre`), onSuccess: inv });

  const validerDocMut = useMutation({
    mutationFn: (docId: string) => api.patch(`/commercants/documents/${docId}/valider`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-commercant-documents', commercantId] }),
  });
  const rejeterDocMut = useMutation({
    mutationFn: ({ docId, motif_rejet }: { docId: string; motif_rejet: string }) =>
      api.patch(`/commercants/documents/${docId}/rejeter`, { motif: motif_rejet }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-commercant-documents', commercantId] });
      setRejetModal(null); setMotif('');
    },
  });

  function soumettreRejet() {
    if (motif.trim().length < 10) { setMotifErr('Minimum 10 caractères'); return; }
    rejeterDocMut.mutate({ docId: rejetModal!.docId, motif_rejet: motif.trim() });
  }

  const st = c ? (STATUT[c.statut as keyof typeof STATUT] || STATUT.SOUMIS) : null;
  const nv = c ? (NIVEAU[c.niveau as keyof typeof NIVEAU] || NIVEAU.SIMPLIFIE) : null;
  const wallet = c?.user?.wallet;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-[460px] bg-white shadow-2xl border-l border-slate-100 flex flex-col h-full z-50">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center">
              <Store size={16} className="text-white/80" />
            </div>
            <div>
              <div className="text-[13px] font-medium text-slate-900">{isLoading ? '…' : c?.nom}</div>
              <div className="text-[11px] text-slate-400">{c ? (TYPE_LABELS[c.type] || c.type) : ''}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100">
            <X size={14} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 text-center text-sm text-slate-400">Chargement…</div>
          ) : !c ? null : (
            <>
              {/* ── Infos ─────────────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">INFORMATIONS</div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <InfoRow icon={<Store size={12} />} label="Commerce" value={c.nom} />
                  <InfoRow icon={<MapPin size={12} />} label="Ville" value={c.ville} />
                  {c.adresse && <InfoRow icon={<MapPin size={12} />} label="Adresse" value={c.adresse} />}
                  {c.ifu && <InfoRow icon={<FileText size={12} />} label="IFU" value={c.ifu} mono />}
                  {c.user?.telephone && <InfoRow icon={<Phone size={12} />} label="Téléphone" value={c.user.telephone} mono />}
                  {c.mobile_money_numero && (
                    <InfoRow icon={<Phone size={12} />} label={`Mobile Money (${c.mobile_money_operateur || ''})`} value={c.mobile_money_numero} mono />
                  )}
                  <InfoRow icon={<Star size={12} />} label="Note moyenne" value={`${parseFloat(c.note_moyenne || '0').toFixed(1)} / 5`} />
                  <InfoRow icon={<FileText size={12} />} label="Commission" value={`${parseFloat(c.taux_commission || '0').toFixed(1)} %`} />
                  <InfoRow icon={<FileText size={12} />} label="Inscrit le" value={fmtDate(c.createdAt)} />
                </div>

                {/* Wallet */}
                <div className="bg-amber-700 rounded-xl px-4 py-3 text-white mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-white/40 mb-0.5">Wallet commerçant</div>
                      <div className="font-mono text-lg font-medium">{fmt(wallet?.solde || 0)}</div>
                    </div>
                    <Wallet size={20} className="text-white/20" />
                  </div>
                </div>

                {/* Badges */}
                <div className="flex gap-2 mt-3">
                  {st && <span className={clsx('text-[10px] px-2.5 py-1 rounded-full font-medium', st.cls)}>{st.label}</span>}
                  {nv && <span className={clsx('text-[10px] px-2.5 py-1 rounded-full font-medium', nv.cls)}>{nv.label}</span>}
                </div>
              </div>

              {/* ── Vérification (auto, non-bloquante) ────────────── */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">VÉRIFICATION</div>

                <div className="space-y-2">
                  <VerifItem
                    label="IFU (Identifiant Fiscal Unique)"
                    ok={!!c.ifu}
                    desc={c.ifu ? c.ifu : 'Non fourni — niveau Simplifié uniquement'}
                  />
                  <VerifItem
                    label="Mobile Money enregistré"
                    ok={!!c.mobile_money_numero}
                    desc={c.mobile_money_numero ? `${c.mobile_money_operateur} · ${c.mobile_money_numero}` : 'Aucun numéro Mobile Money'}
                  />
                  <VerifItem
                    label="QR Code généré"
                    ok={!!c.qr_code_url}
                    desc={c.qr_code_url ? 'QR Code actif' : 'Généré automatiquement lors de l\'activation'}
                  />
                </div>

                {c.qr_code_url && (
                  <a
                    href={c.qr_code_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mt-3 text-[11px] text-[#0EA5E9] hover:underline"
                  >
                    <QrCode size={12} /> Voir le QR Code
                  </a>
                )}
              </div>

              {/* ── Documents KYC ─────────────────────────────────── */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">
                  DOCUMENTS KYC
                  <span className="text-slate-300 font-normal normal-case tracking-normal"> — optionnels, n'empêchent pas la validation</span>
                </div>

                {!documents || documents.length === 0 ? (
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
                    <AlertCircle size={14} className="text-slate-400" />
                    <span className="text-xs text-slate-500">Aucun document soumis par le commerçant</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => {
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
                              <div className="text-[10px] text-slate-400">{doc.fichier_nom} · {fmtDate(doc.createdAt)}</div>
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

                          <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-white">
                            <a
                              href={doc.fichier_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-[#0EA5E9] hover:underline mr-auto"
                            >
                              <Eye size={11} /> Voir le fichier
                            </a>
                            {doc.statut === 'EN_ATTENTE' && (
                              <>
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
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Transactions récentes ──────────────────────────── */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">TRANSACTIONS RÉCENTES</div>
                {!transactions?.items || transactions.items.length === 0 ? (
                  <div className="text-[11px] text-slate-400">Aucune transaction</div>
                ) : (
                  <div className="space-y-2">
                    {transactions.items.map((tx) => (
                      <div key={tx.id} className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Receipt size={11} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-slate-700 truncate">
                            {tx.beneficiaire ? `${tx.beneficiaire.prenom} ${tx.beneficiaire.nom}` : 'Bénéficiaire'}
                          </div>
                          <div className="text-[10px] text-slate-400">{fmtDate(tx.createdAt)} · {tx.statut}</div>
                        </div>
                        <div className="font-mono text-[11px] text-slate-900 flex-shrink-0">{fmt(tx.montant_total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Reversements FedaPay ───────────────────────────── */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">REVERSEMENTS</div>
                {!payouts || payouts.length === 0 ? (
                  <div className="text-[11px] text-slate-400">Aucun reversement</div>
                ) : (
                  <div className="space-y-2">
                    {payouts.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <Banknote size={11} className="text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-slate-700">{fmtDate(p.createdAt)}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{p.fedapay_transaction_id}</div>
                        </div>
                        <span className={clsx('text-[9px] px-2 py-0.5 rounded-full font-medium flex-shrink-0', statutPayoutCls(p.statut))}>
                          {p.statut}
                        </span>
                        <div className="font-mono text-[11px] text-slate-900 flex-shrink-0">{fmt(p.montant)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Actions ─────────────────────────────────────────── */}
              <div className="px-5 py-4 space-y-2">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">ACTIONS</div>

                {c.statut === 'SOUMIS' && (
                  <button
                    onClick={() => validerMut.mutate()}
                    disabled={validerMut.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-[#DBEAFE] text-[#185FA5] text-sm font-medium py-2.5 rounded-lg hover:bg-[#bfdbfe] transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck size={15} />
                    {validerMut.isPending ? 'Validation…' : 'Valider le dossier'}
                  </button>
                )}

                {c.statut === 'VALIDE' && (
                  <button
                    onClick={() => activerMut.mutate()}
                    disabled={activerMut.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-[#EAF3DE] text-[#3B6D11] text-sm font-medium py-2.5 rounded-lg hover:bg-[#d4ecbc] transition-colors disabled:opacity-50"
                  >
                    <Zap size={15} />
                    {activerMut.isPending ? 'Activation…' : 'Activer le compte + générer QR Code'}
                  </button>
                )}

                {c.statut === 'SUSPENDU' && (
                  <button
                    onClick={() => activerMut.mutate()}
                    disabled={activerMut.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-[#EAF3DE] text-[#3B6D11] text-sm font-medium py-2.5 rounded-lg hover:bg-[#d4ecbc] transition-colors disabled:opacity-50"
                  >
                    <Zap size={15} />
                    {activerMut.isPending ? 'Réactivation…' : 'Réactiver le compte'}
                  </button>
                )}

                {c.statut === 'ACTIF' && (
                  <div className="flex items-center gap-2 bg-[#EAF3DE] rounded-lg px-3 py-2.5">
                    <ShieldCheck size={13} className="text-[#3B6D11]" />
                    <span className="text-[11px] text-[#27500A] font-medium">Compte actif — QR Code opérationnel</span>
                  </div>
                )}

                {(c.statut === 'SOUMIS' || c.statut === 'VALIDE') && !c.ifu && (
                  <div className="flex items-center gap-2 bg-[#FAEEDA] rounded-lg px-3 py-2.5">
                    <AlertCircle size={13} className="text-amber-600 flex-shrink-0" />
                    <span className="text-[11px] text-amber-800">Sans IFU — limité au niveau Simplifié (plafond de transactions réduit)</span>
                  </div>
                )}

                {c.statut !== 'SUSPENDU' && (
                  <button
                    onClick={() => setConfirmModal({
                      titre: 'Suspendre le commerçant',
                      message: `Voulez-vous vraiment suspendre ${c.nom} ? Il ne pourra plus accepter de paiements TIKEXO.`,
                      onConfirmer: () => suspendreMut.mutate(),
                    })}
                    disabled={suspendreMut.isPending}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 text-sm font-medium py-2.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Ban size={14} />
                    Suspendre le commerçant
                  </button>
                )}
              </div>
            </>
          )}
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
                  <span className="text-slate-400 font-normal"> (min 10 caractères)</span>
                </label>
                <textarea
                  value={motif}
                  onChange={(e) => { setMotif(e.target.value); setMotifErr(''); }}
                  placeholder="ex : Document illisible…"
                  rows={4}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300/40 focus:border-red-400"
                />
                {motifErr && <span className="text-[10px] text-red-500">{motifErr}</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setRejetModal(null)}
                  className="flex-1 border border-slate-200 text-slate-600 text-sm py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={soumettreRejet}
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
    </div>
  );
}

// ── Composants helpers ─────────────────────────────────────────────────────
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

function VerifItem({ label, ok, desc }: { label: string; ok: boolean; desc: string }) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
      <div className={clsx(
        'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        ok ? 'bg-[#EAF3DE]' : 'bg-[#F1F5F9]'
      )}>
        <div className={clsx('w-1.5 h-1.5 rounded-full', ok ? 'bg-[#3B6D11]' : 'bg-slate-400')} />
      </div>
      <div>
        <div className="text-[11px] font-medium text-slate-800">{label}</div>
        <div className="text-[10px] text-slate-500 mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
