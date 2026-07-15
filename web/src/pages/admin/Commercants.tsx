import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  X, Store, Wallet, Phone, Mail, MapPin, FileText, Star,
  ShieldCheck, ShieldOff, Zap, Ban, ChevronRight, QrCode, AlertCircle,
} from 'lucide-react';
import api from '../../lib/api';
import { fmt, fmtDate } from '../../utils/format';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

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

// ── Page principale ────────────────────────────────────────────────────────
export default function AdminCommercants() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-commercants'],
    queryFn: () => api.get('/commercants?statut=&limit=100').then((r) => r.data.data),
  });

  const items: CommercantRow[] = data?.items || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[15px] font-medium text-slate-900">Commerçants</div>
          <div className="text-xs text-slate-500">{items.length} commerçant{items.length > 1 ? 's' : ''}</div>
        </div>
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

  const { data: c, isLoading } = useQuery<CommercantRow>({
    queryKey: ['admin-commercant-detail', commercantId],
    queryFn: () => api.get(`/commercants/${commercantId}`).then((r) => r.data.data),
  });

  const inv = () => {
    qc.invalidateQueries({ queryKey: ['admin-commercant-detail', commercantId] });
    onUpdated();
  };

  const validerMut  = useMutation({ mutationFn: () => api.post(`/commercants/${commercantId}/valider`), onSuccess: inv });
  const activerMut  = useMutation({ mutationFn: () => api.post(`/commercants/${commercantId}/activer`), onSuccess: inv });
  const suspendreMut = useMutation({ mutationFn: () => api.post(`/commercants/${commercantId}/suspendre`), onSuccess: inv });

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

              {/* ── Vérification KYB ──────────────────────────────── */}
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="text-[10px] text-slate-400 tracking-[1.5px] mb-3">VÉRIFICATION</div>

                <div className="space-y-2">
                  <VerifItem
                    label="Identité du gérant"
                    ok={true}
                    desc="Nom enregistré à la création du compte"
                  />
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
