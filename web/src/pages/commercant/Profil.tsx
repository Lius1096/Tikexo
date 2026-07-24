import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Store, Phone, MapPin, Percent, CreditCard, Shield, Pencil, X, Check,
  FileText, Upload, Eye, Banknote, Loader2,
} from 'lucide-react';
import api from '../../lib/api';
import { fmt, fmtDate } from '../../utils/format';

const DOC_LABELS: Record<string, string> = {
  PIECE_IDENTITE_GERANT: "Pièce d'identité du gérant",
  JUSTIFICATIF_IFU: 'Justificatif IFU',
};

const DOC_STATUT: Record<string, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  VALIDE:     { label: 'Validé',     cls: 'bg-emerald-50 text-emerald-700' },
  REJETE:     { label: 'Rejeté',     cls: 'bg-red-50 text-red-700' },
};

const PAYOUT_STATUT: Record<string, { label: string; cls: string }> = {
  EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-50 text-amber-700' },
  VALIDE:     { label: 'Traité',     cls: 'bg-emerald-50 text-emerald-700' },
  ECHOUE:     { label: 'Échoué',     cls: 'bg-red-50 text-red-700' },
  REMBOURSE:  { label: 'Remboursé',  cls: 'bg-blue-50 text-blue-700' },
};

interface Fiche {
  id: string;
  nom: string;
  type: string;
  ifu?: string;
  niveau: string;
  statut: string;
  mobile_money_numero: string;
  mobile_money_operateur: string;
  adresse?: string;
  ville: string;
  taux_commission: string;
  mode_reversement: string;
}

interface CommercantDocument {
  id: string;
  type: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'REJETE';
  fichier_nom: string;
  fichier_url: string;
  motif_rejet?: string;
  createdAt: string;
}

interface Payout {
  id: string;
  montant: string;
  statut: string;
  createdAt: string;
}

export default function CommercantProfil() {
  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Partial<Fiche>>({});

  const { data: fiche, isLoading } = useQuery<Fiche>({
    queryKey: ['commercant-moi'],
    queryFn: () => api.get('/commercants/moi').then((r) => r.data.data),
  });

  const { data: documents } = useQuery<CommercantDocument[]>({
    queryKey: ['commercant-documents', fiche?.id],
    queryFn: () => api.get(`/commercants/${fiche!.id}/documents`).then((r) => r.data.data),
    enabled: !!fiche?.id,
  });

  const { data: payouts } = useQuery<Payout[]>({
    queryKey: ['commercant-payouts', fiche?.id],
    queryFn: () => api.get(`/commercants/${fiche!.id}/payouts`).then((r) => r.data.data),
    enabled: !!fiche?.id,
  });

  const modifierMut = useMutation({
    mutationFn: () => api.put(`/commercants/${fiche!.id}`, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['commercant-moi'] }); setEditMode(false); },
  });

  const uploadMut = useMutation({
    mutationFn: ({ type, fichier }: { type: string; fichier: File }) => {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('fichier', fichier);
      return api.post('/commercants/moi/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commercant-documents', fiche?.id] }),
  });

  function startEdit() {
    if (!fiche) return;
    setForm({
      nom: fiche.nom, type: fiche.type,
      mobile_money_numero: fiche.mobile_money_numero, mobile_money_operateur: fiche.mobile_money_operateur,
      adresse: fiche.adresse, ville: fiche.ville,
    });
    setEditMode(true);
  }

  function onFileSelected(type: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) uploadMut.mutate({ type, fichier: f });
    e.target.value = '';
  }

  const docParType = (type: string) => documents?.find((d) => d.type === type);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[15px] font-medium text-slate-900 mb-0.5">Mon profil</div>
          <div className="text-xs text-slate-500">Informations de votre boutique TIKEXO</div>
        </div>
        {fiche && !editMode && (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-[12px] font-medium text-tikexo-primary border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Pencil size={12} /> Modifier
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 bg-slate-200 animate-pulse rounded-lg" />)}
        </div>
      ) : !fiche ? (
        <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-sm text-slate-400">
          Profil commerçant introuvable.
        </div>
      ) : editMode ? (
        <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
          <Field label="Nom du commerce" value={form.nom ?? ''} onChange={(v) => setForm((f) => ({ ...f, nom: v }))} />
          <Field label="Numéro Mobile Money" value={form.mobile_money_numero ?? ''} onChange={(v) => setForm((f) => ({ ...f, mobile_money_numero: v }))} />
          <div>
            <label className="block text-[11px] text-slate-500 mb-1">Opérateur Mobile Money</label>
            <select
              value={form.mobile_money_operateur ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, mobile_money_operateur: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20"
            >
              <option value="MTN">MTN</option>
              <option value="MOOV">Moov</option>
            </select>
          </div>
          <Field label="Adresse" value={form.adresse ?? ''} onChange={(v) => setForm((f) => ({ ...f, adresse: v }))} />
          <Field label="Ville" value={form.ville ?? ''} onChange={(v) => setForm((f) => ({ ...f, ville: v }))} />

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setEditMode(false)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 text-slate-600 text-sm py-2.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <X size={14} /> Annuler
            </button>
            <button
              onClick={() => modifierMut.mutate()}
              disabled={modifierMut.isPending}
              className="flex-1 flex items-center justify-center gap-1.5 bg-tikexo-primary text-white text-sm font-medium py-2.5 rounded-lg hover:opacity-90 transition-colors disabled:opacity-50"
            >
              {modifierMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Enregistrer
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Store size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Informations boutique</span>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { icon: Store, label: 'Nom',            value: fiche.nom },
              { icon: Store, label: 'Type',           value: fiche.type },
              { icon: Phone, label: 'Mobile Money',   value: `${fiche.mobile_money_numero} (${fiche.mobile_money_operateur})` },
              { icon: MapPin, label: 'Adresse',       value: fiche.adresse ?? '—' },
              { icon: MapPin, label: 'Ville',         value: fiche.ville },
              { icon: Percent, label: 'Commission',   value: `${fiche.taux_commission}%` },
              { icon: CreditCard, label: 'Reversement', value: fiche.mode_reversement?.replace(/_/g, ' ') ?? '—' },
              { icon: Shield, label: 'Niveau',        value: fiche.niveau },
              { icon: Shield, label: 'Statut',        value: fiche.statut },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3">
                <Icon size={13} className="text-slate-300 flex-shrink-0" />
                <span className="text-[11px] text-slate-400 w-28 flex-shrink-0">{label}</span>
                <span className="text-xs text-slate-800 font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents KYC */}
      {fiche && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <FileText size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Documents</span>
            <span className="text-[10px] text-slate-400 ml-auto">Optionnel</span>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(DOC_LABELS).map(([type, label]) => {
              const doc = docParType(type);
              const st = doc ? DOC_STATUT[doc.statut] : null;
              return (
                <div key={type} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800">{label}</div>
                      {doc && <div className="text-[10px] text-slate-400 mt-0.5">{doc.fichier_nom} · {fmtDate(doc.createdAt)}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {st && <span className={clsx('text-[9px] px-2 py-0.5 rounded-full font-medium', st.cls)}>{st.label}</span>}
                      {doc && (
                        <a href={doc.fichier_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-tikexo-primary">
                          <Eye size={14} />
                        </a>
                      )}
                      <label className="flex items-center gap-1 text-[11px] font-medium text-tikexo-primary cursor-pointer hover:underline">
                        <Upload size={12} />
                        {doc ? 'Remplacer' : 'Ajouter'}
                        <input type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
                          onChange={(e) => onFileSelected(type, e)} disabled={uploadMut.isPending} />
                      </label>
                    </div>
                  </div>
                  {doc?.statut === 'REJETE' && doc.motif_rejet && (
                    <div className="mt-2 text-[10px] text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">{doc.motif_rejet}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reversements */}
      {fiche && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Banknote size={14} className="text-slate-400" />
            <span className="text-[13px] font-medium text-slate-900">Historique des reversements</span>
          </div>
          {!payouts || payouts.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">Aucun reversement pour l'instant</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {payouts.map((p) => {
                const st = PAYOUT_STATUT[p.statut] ?? { label: p.statut, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-xs font-medium text-slate-800">{fmt(p.montant)}</div>
                      <div className="text-[10px] text-slate-400">{fmtDate(p.createdAt)}</div>
                    </div>
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-medium', st.cls)}>{st.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[11px] text-slate-500 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tikexo-primary/20"
      />
    </div>
  );
}
